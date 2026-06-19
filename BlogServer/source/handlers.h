#pragma once
#include "db.h"
#include "auth.h"
#include "json.hpp"
#include <memory>
#include <string>
#include <cstring>
#include <cstdio>

using json = nlohmann::json;

inline std::shared_ptr<Database> g_db;

// ────── 底层 HTTP 解析 ──────

struct Request {
    std::string method;
    std::string uri;
    std::string body;
    std::string headers; // 整个头部区块

    // 从头部里拿指定字段的值
    std::string header(const std::string& name) const {
        std::string key = name + ": ";
        size_t pos = headers.find(key);
        if (pos == std::string::npos) return "";
        pos += key.size();
        size_t end = headers.find("\r\n", pos);
        return headers.substr(pos, end - pos);
    }
};

// 从原始 HTTP 字符串里拆出 method / uri / headers / body
inline Request parseHttp(const char* raw) {
    Request req;
    const char* split = strstr(raw, "\r\n\r\n");
    if (!split) return req;

    std::string head(raw, split - raw);
    req.body = split + 4;
    req.headers = head;

    // 拆请求行: "POST /api/login HTTP/1.1"
    size_t eol = head.find("\r\n");
    std::string line = head.substr(0, eol);

    size_t s1 = line.find(' ');
    size_t s2 = line.rfind(' ');
    if (s1 != std::string::npos && s2 != std::string::npos && s1 != s2) {
        req.method = line.substr(0, s1);
        req.uri    = line.substr(s1 + 1, s2 - s1 - 1);
    }
    return req;
}

// ────── 底层 HTTP 响应拼接 ──────

inline std::string corsHeaders() {
    return
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET,POST,OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type,Authorization\r\n"
        "Content-Type: application/json\r\n";
}

inline std::string buildHttp(int code, const std::string& body) {
    const char* status;
    switch (code) {
    case 200: status = "200 OK"; break;
    case 204: status = "204 No Content"; break;
    case 400: status = "400 Bad Request"; break;
    case 401: status = "401 Unauthorized"; break;
    case 404: status = "404 Not Found"; break;
    case 409: status = "409 Conflict"; break;
    case 500: status = "500 Internal Server Error"; break;
    default:  status = "500 Internal Server Error"; break;
    }
    std::string resp = "HTTP/1.1 ";
    resp += status;
    resp += "\r\n";
    resp += corsHeaders();
    resp += "\r\n";
    resp += body;
    return resp;
}

// ────── 路由处理（业务逻辑不变）──────

// 传入原始 HTTP 字符串，返回完整 HTTP 响应字符串
inline std::string handleRequest(const char* raw) {
    Request req = parseHttp(raw);

    if (req.method == "OPTIONS")
        return buildHttp(204, "");

    // POST /api/register
    if (req.method == "POST" && req.uri == "/api/register") {
        try {
            json j = json::parse(req.body);
            std::string username = j["username"];
            std::string password = j["password"];

            if (username.empty() || password.empty())
                return buildHttp(400, "{\"error\":\"用户名和密码不能为空\"}");
            if (username.size() > 50 || password.size() < 6)
                return buildHttp(400, "{\"error\":\"用户名最长50字符，密码最少6字符\"}");

            auto users = g_db->findAllByUsername(username);
            for (const auto& u : users) {
                if (verifyPassword(password, u.salt, u.passwordHash))
                    return buildHttp(409, "{\"error\":\"用户名和密码组合已存在\"}");
            }

            std::string salt = generateSalt();
            std::string hash = hashPassword(password, salt);
            int id = g_db->createUser(username, hash, salt);
            if (id == -1)
                return buildHttp(500, "{\"error\":\"注册失败\"}");

            json resp = {{"message", "注册成功"}, {"userId", id}};
            return buildHttp(200, resp.dump());
        } catch (...) {
            return buildHttp(400, "{\"error\":\"请求格式错误\"}");
        }
    }

    // POST /api/login
    if (req.method == "POST" && req.uri == "/api/login") {
        try {
            json j = json::parse(req.body);
            std::string username = j["username"];
            std::string password = j["password"];

            auto users = g_db->findAllByUsername(username);
            if (users.empty())
                return buildHttp(401, "{\"error\":\"用户不存在\"}");

            for (const auto& user : users) {
                if (verifyPassword(password, user.salt, user.passwordHash)) {
                    std::string token = generateToken(user.id, username);
                    json resp = {
                        {"message", "登录成功"},
                        {"token", token},
                        {"userId", user.id},
                        {"username", username}
                    };
                    return buildHttp(200, resp.dump());
                }
            }
            return buildHttp(401, "{\"error\":\"密码错误\"}");
        } catch (...) {
            return buildHttp(400, "{\"error\":\"请求格式错误\"}");
        }
    }

    // GET /api/user/me
    if (req.method == "GET" && req.uri == "/api/user/me") {
        std::string auth = req.header("Authorization");
        if (auth.size() < 8 || auth.substr(0, 7) != "Bearer ")
            return buildHttp(401, "{\"error\":\"未登录\"}");

        std::string token = auth.substr(7);
        int userId = verifyToken(token);
        if (userId == -1)
            return buildHttp(401, "{\"error\":\"token无效或已过期\"}");

        json resp = {{"userId", userId}, {"message", "已登录"}};
        return buildHttp(200, resp.dump());
    }

    return buildHttp(404, "{\"error\":\"Not Found\"}");
}
