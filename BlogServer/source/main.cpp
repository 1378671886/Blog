#include "socket_wrap.h"
#include <iostream>
#include <memory>
#include <cstdlib>
#include <cstring>
#include "db.h"
#include "handlers.h"
#include "voice_ws.h"

int main() {
    // ────── 读环境变量（带默认值）──────
    const char* dbHost = std::getenv("DB_HOST");
    const char* dbPort = std::getenv("DB_PORT");
    const char* dbUser = std::getenv("DB_USER");
    const char* dbPass = std::getenv("DB_PASSWORD");
    const char* dbName = std::getenv("DB_NAME");
    const char* srvPort = std::getenv("SERVER_PORT");

    std::string host = dbHost ? dbHost : "localhost";
    int dbPortNum    = dbPort ? std::stoi(dbPort) : 3306;
    std::string user = dbUser ? dbUser : "root";
    std::string pass = dbPass ? dbPass : "LIUzr-040916";
    std::string name = dbName ? dbName : "blog";
    int serverPort   = srvPort ? std::stoi(srvPort) : 4000;

    // ────── 连接数据库 ──────
    try {
        g_db = std::make_shared<Database>(host, dbPortNum, user, pass, name);
        std::cout << "[OK] 数据库连接成功" << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "[ERROR] 数据库连接失败: " << e.what() << std::endl;
        return 1;
    }

    // ────── 1. 初始化网络 ──────
    initNet();

    // ────── 启动语音 WebSocket 服务器 ──────
    const char* voicePort = std::getenv("VOICE_PORT");
    int vPort = voicePort ? std::stoi(voicePort) : 4001;
    startVoiceServer(vPort);

    // ────── 2. socket：创建一个通信端点 ──────
    int serverSock = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSock == -1) {
        std::cerr << "[ERROR] socket failed" << std::endl;
        return 1;
    }

    // 端口复用，避免重启后等 TIME_WAIT
    int opt = 1;
    setSockOpt(serverSock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    // ────── 3. bind：把 socket 绑到 0.0.0.0 ──────
    sockaddr_in addr = {};
    addr.sin_family      = AF_INET;
    addr.sin_port        = htons(serverPort);          // 端口号
    addr.sin_addr.s_addr = INADDR_ANY;                  // 监听所有网卡
    if (bind(serverSock, (sockaddr*)&addr, sizeof(addr)) != 0) {
        std::cerr << "[ERROR] bind failed" << std::endl;
        return 1;
    }

    // ────── 4. listen：开始监听 ──────
    listen(serverSock, SOMAXCONN);
    std::cout << "[OK] HTTP 服务启动: http://0.0.0.0:" << serverPort << std::endl;

    // ────── 5. accept 循环：一个一个处理客户端请求 ──────
    while (true) {
        int clientSock = accept(serverSock, nullptr, nullptr);
        if (clientSock == -1) continue;

        char buf[8192] = {};
        int  n = recv(clientSock, buf, sizeof(buf) - 1, 0);

        if (n > 0) {
            buf[n] = '\0';                          // 确保字符串结束
            std::string response = handleRequest(buf); // handlers.h 处理业务
            send(clientSock, response.c_str(), response.size(), 0);
        }

        closeSocket(clientSock);
    }

    closeSocket(serverSock);
    cleanupNet();
}
