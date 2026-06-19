#pragma once
#include <string>
#include "sha256.h"

const std::string JWT_SECRET = "my-super-secret-key-change-me";

inline std::string generateToken(int userId, const std::string& username) {
    std::string payload = std::to_string(userId) + ":" + username;
    std::string sig = hmacSha256(payload, JWT_SECRET);
    return payload + ":" + sig;
}

inline int verifyToken(const std::string& token) {
    size_t lastColon = token.rfind(':');
    if (lastColon == std::string::npos) return -1;
    std::string payload = token.substr(0, lastColon);
    std::string sig = token.substr(lastColon + 1);
    if (hmacSha256(payload, JWT_SECRET) == sig) {
        size_t firstColon = payload.find(':');
        if (firstColon == std::string::npos) return -1;
        return std::stoi(payload.substr(0, firstColon));
    }
    return -1;
}
