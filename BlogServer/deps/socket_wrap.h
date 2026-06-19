#pragma once

#ifdef _WIN32
    #include <winsock2.h>
    #pragma comment(lib, "ws2_32.lib")

    inline void initNet() {
        WSADATA wsa;
        WSAStartup(MAKEWORD(2, 2), &wsa);
    }
    inline void closeSocket(int sock) { closesocket(sock); }
    inline void cleanupNet() { WSACleanup(); }

    // Winsock2 的 setsockopt 第4参数是 const char*
    inline int setSockOpt(int sock, int level, int optname, const void* optval, int optlen) {
        return setsockopt(sock, level, optname, (const char*)optval, optlen);
    }

#elif defined(__linux__)
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <unistd.h>

    inline void initNet() {}
    inline void closeSocket(int sock) { close(sock); }
    inline void cleanupNet() {}

    inline int setSockOpt(int sock, int level, int optname, const void* optval, int optlen) {
        return setsockopt(sock, level, optname, optval, optlen);
    }

#else
    #error "Unsupported platform"
#endif
