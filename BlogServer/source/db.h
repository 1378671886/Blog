#pragma once
#include <mysql.h>
#include <string>
#include <vector>
#include <memory>
#include <stdexcept>

class Database {
public:
    Database(const std::string& host, int port,
             const std::string& user, const std::string& password,
             const std::string& dbname) {
        conn_ = mysql_init(nullptr);
        if (!conn_) throw std::runtime_error("mysql_init failed");
        if (!mysql_real_connect(conn_, host.c_str(), user.c_str(),
                                password.c_str(), dbname.c_str(),
                                port, nullptr, 0)) {
            std::string err = mysql_error(conn_);
            mysql_close(conn_);
            throw std::runtime_error("mysql_connect: " + err);
        }
    }

    ~Database() {
        if (conn_) mysql_close(conn_);
    }

    // 注册用户，返回 id，失败返回 -1
    int createUser(const std::string& username,
                   const std::string& passwordHash,
                   const std::string& salt) {
        const char* sql =
            "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)";
        MYSQL_STMT* stmt = mysql_stmt_init(conn_);
        if (!stmt) return -1;

        mysql_stmt_prepare(stmt, sql, strlen(sql));

        MYSQL_BIND bind[3];
        memset(bind, 0, sizeof(bind));
        bind[0].buffer_type = MYSQL_TYPE_STRING;
        bind[0].buffer = (char*)username.c_str();
        bind[0].buffer_length = username.size();
        bind[1].buffer_type = MYSQL_TYPE_STRING;
        bind[1].buffer = (char*)passwordHash.c_str();
        bind[1].buffer_length = passwordHash.size();
        bind[2].buffer_type = MYSQL_TYPE_STRING;
        bind[2].buffer = (char*)salt.c_str();
        bind[2].buffer_length = salt.size();

        mysql_stmt_bind_param(stmt, bind);

        if (mysql_stmt_execute(stmt) != 0) {
            mysql_stmt_close(stmt);
            return -1;
        }
        int id = (int)mysql_stmt_insert_id(stmt);
        mysql_stmt_close(stmt);
        return id;
    }

    // 根据用户名查找用户，返回 (id, password_hash, salt)，不存在返回 (-1, "", "")
    struct User { int id; std::string passwordHash; std::string salt; };

    User findByUsername(const std::string& username) {
        MYSQL_STMT* stmt = mysql_stmt_init(conn_);
        User result{-1, "", ""};
        if (!stmt) return result;

        const char* sql = "SELECT id, password_hash, salt FROM users WHERE username = ?";
        mysql_stmt_prepare(stmt, sql, strlen(sql));

        MYSQL_BIND bind[1];
        memset(bind, 0, sizeof(bind));
        bind[0].buffer_type = MYSQL_TYPE_STRING;
        bind[0].buffer = (char*)username.c_str();
        bind[0].buffer_length = username.size();
        mysql_stmt_bind_param(stmt, bind);

        int id;
        char ph[129] = {};
        char sl[33] = {};
        MYSQL_BIND result_bind[3];
        memset(result_bind, 0, sizeof(result_bind));
        result_bind[0].buffer_type = MYSQL_TYPE_LONG;
        result_bind[0].buffer = &id;
        result_bind[1].buffer_type = MYSQL_TYPE_STRING;
        result_bind[1].buffer = ph;
        result_bind[1].buffer_length = sizeof(ph) - 1;
        result_bind[2].buffer_type = MYSQL_TYPE_STRING;
        result_bind[2].buffer = sl;
        result_bind[2].buffer_length = sizeof(sl) - 1;
        mysql_stmt_bind_result(stmt, result_bind);

        mysql_stmt_execute(stmt);
        mysql_stmt_store_result(stmt);

        if (mysql_stmt_fetch(stmt) == 0) {
            ph[sizeof(ph) - 1] = '\0';
            sl[sizeof(sl) - 1] = '\0';
            result.id = id;
            result.passwordHash = ph;
            result.salt = sl;
        }
        mysql_stmt_close(stmt);
        return result;
    }

    std::vector<User> findAllByUsername(const std::string& username) {
        std::vector<User> results;
        MYSQL_STMT* stmt = mysql_stmt_init(conn_);
        if (!stmt) return results;

        const char* sql = "SELECT id, password_hash, salt FROM users WHERE username = ?";
        mysql_stmt_prepare(stmt, sql, strlen(sql));

        MYSQL_BIND bind[1];
        memset(bind, 0, sizeof(bind));
        bind[0].buffer_type = MYSQL_TYPE_STRING;
        bind[0].buffer = (char*)username.c_str();
        bind[0].buffer_length = username.size();
        mysql_stmt_bind_param(stmt, bind);

        int id;
        char ph[129] = {};
        char sl[33] = {};
        MYSQL_BIND result_bind[3];
        memset(result_bind, 0, sizeof(result_bind));
        result_bind[0].buffer_type = MYSQL_TYPE_LONG;
        result_bind[0].buffer = &id;
        result_bind[1].buffer_type = MYSQL_TYPE_STRING;
        result_bind[1].buffer = ph;
        result_bind[1].buffer_length = sizeof(ph) - 1;
        result_bind[2].buffer_type = MYSQL_TYPE_STRING;
        result_bind[2].buffer = sl;
        result_bind[2].buffer_length = sizeof(sl) - 1;
        mysql_stmt_bind_result(stmt, result_bind);

        mysql_stmt_execute(stmt);
        mysql_stmt_store_result(stmt);

        while (mysql_stmt_fetch(stmt) == 0) {
            ph[sizeof(ph) - 1] = '\0';
            sl[sizeof(sl) - 1] = '\0';
            results.push_back({id, ph, sl});
        }
        mysql_stmt_close(stmt);
        return results;
    }

private:
    MYSQL* conn_;
};
