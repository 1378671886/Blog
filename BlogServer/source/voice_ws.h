#pragma once
#include "mongoose.h"
#include "auth.h"
#include "json.hpp"
#include <cstdio>
#include <string>
#include <vector>
#include <map>
#include <thread>

using json = nlohmann::json;

struct VoiceClient {
    struct mg_connection *conn;
    int userId;
    std::string username;
    std::string roomId;
};

// roomId → clients
inline std::map<std::string, std::vector<VoiceClient>> g_rooms;
// pending connections (before WS handshake completes)
inline std::map<struct mg_connection*, VoiceClient> g_pending;
// roomId → voice mode ("p2p" | "sfu")
inline std::map<std::string, std::string> g_room_modes;

static VoiceClient* find_client_in_room(const std::string& roomId, int userId) {
    auto it = g_rooms.find(roomId);
    if (it == g_rooms.end()) return nullptr;
    for (auto& vc : it->second) {
        if (vc.userId == userId) return &vc;
    }
    return nullptr;
}

static void broadcast_peer_event(const std::string& roomId, const std::string& type,
                                  int userId, const std::string& username,
                                  struct mg_connection* exclude) {
    json msg = {{"type", type}, {"userId", userId}, {"username", username}};
    std::string text = msg.dump();
    auto it = g_rooms.find(roomId);
    if (it == g_rooms.end()) return;
    for (auto& vc : it->second) {
        if (vc.conn != exclude) {
            mg_ws_send(vc.conn, text.c_str(), text.size(), WEBSOCKET_OP_TEXT);
        }
    }
}

static void send_user_list(const std::string& roomId) {
    auto it = g_rooms.find(roomId);
    if (it == g_rooms.end()) return;

    json arr = json::array();
    for (auto& vc : it->second) {
        arr.push_back({{"userId", vc.userId}, {"username", vc.username}});
    }
    json msg = {{"type", "users"}, {"users", arr}};
    std::string text = msg.dump();

    fprintf(stderr,"[VOICE] 发送用户列表到房间 %s: %s\n", roomId.c_str(), text.c_str());

    for (auto& vc : it->second) {
        mg_ws_send(vc.conn, text.c_str(), text.size(), WEBSOCKET_OP_TEXT);
    }
}

static void broadcast_chat(const std::string& roomId, const std::string& jsonStr, struct mg_connection *sender) {
    auto it = g_rooms.find(roomId);
    if (it == g_rooms.end()) return;
    for (auto &c : it->second) {
        if (c.conn != sender) {
            mg_ws_send(c.conn, jsonStr.c_str(), jsonStr.size(), WEBSOCKET_OP_TEXT);
        }
    }
}

static void broadcast_audio(const std::string& roomId, const void *data, size_t len,
                             struct mg_connection *sender, int senderUserId) {
    auto it = g_rooms.find(roomId);
    if (it == g_rooms.end()) return;
    // 构造带 userId 头的二进制帧: [4字节 userId LE] [opus 数据]
    std::vector<char> buf(4 + len);
    buf[0] = (senderUserId) & 0xff;
    buf[1] = (senderUserId >> 8) & 0xff;
    buf[2] = (senderUserId >> 16) & 0xff;
    buf[3] = (senderUserId >> 24) & 0xff;
    memcpy(buf.data() + 4, data, len);
    for (auto &c : it->second) {
        if (c.conn != sender) {
            mg_ws_send(c.conn, buf.data(), buf.size(), WEBSOCKET_OP_BINARY);
        }
    }
}

static void voice_handler(struct mg_connection *c, int ev, void *ev_data) {
    // ── HTTP 请求：验证 token 并升级 WebSocket ──
    if (ev == MG_EV_HTTP_MSG) {
        struct mg_http_message *hm = (struct mg_http_message *)ev_data;

        if (hm->uri.len >= 9 && memcmp(hm->uri.buf, "/voice/ws", 9) == 0) {
            char token[256] = {};
            char roomId[64] = {};
            mg_http_get_var(&hm->query, "token", token, sizeof(token));
            mg_http_get_var(&hm->query, "room", roomId, sizeof(roomId));

            int userId = verifyToken(std::string(token));
            if (userId == -1) {
                mg_http_reply(c, 401, "", "{\"error\":\"invalid token\"}\n");
                c->is_draining = 1;
                return;
            }
            if (roomId[0] == '\0') {
                mg_http_reply(c, 400, "", "{\"error\":\"missing room id\"}\n");
                c->is_draining = 1;
                return;
            }

            std::string tokenStr(token);
            size_t firstColon = tokenStr.find(':');
            size_t lastColon = tokenStr.rfind(':');
            std::string username = "unknown";
            if (firstColon != std::string::npos && lastColon != std::string::npos
                && firstColon != lastColon) {
                username = tokenStr.substr(firstColon + 1, lastColon - firstColon - 1);
            }

            // 先存入 pending，等 WS_OPEN 再正式加入
            VoiceClient vc;
            vc.conn = c;
            vc.userId = userId;
            vc.username = username;
            vc.roomId = roomId;
            g_pending[c] = vc;

            mg_ws_upgrade(c, hm, nullptr);
        }
    }
    // ── WebSocket 握手完成，正式加入房间 ──
    else if (ev == MG_EV_WS_OPEN) {
        auto it = g_pending.find(c);
        if (it != g_pending.end()) {
            VoiceClient& vc = it->second;
            g_rooms[vc.roomId].push_back(vc);
            fprintf(stderr,"[VOICE] %s 加入房间 %s (在线: %zu)\n",
                vc.username.c_str(), vc.roomId.c_str(), g_rooms[vc.roomId].size());
            send_user_list(vc.roomId);
            broadcast_peer_event(vc.roomId, "peer-joined", vc.userId, vc.username, c);
            // 发送当前房间模式
            auto modeIt = g_room_modes.find(vc.roomId);
            std::string curMode = modeIt != g_room_modes.end() ? modeIt->second : "p2p";
            json modeMsg = {{"type", "room-mode"}, {"mode", curMode}};
            std::string modeText = modeMsg.dump();
            mg_ws_send(c, modeText.c_str(), modeText.size(), WEBSOCKET_OP_TEXT);
            g_pending.erase(it);
        }
    }
    // ── WebSocket 消息：音频数据 ──
    else if (ev == MG_EV_WS_MSG) {
        struct mg_ws_message *wm = (struct mg_ws_message *)ev_data;
        unsigned op = wm->flags & 0x0f;
        if (op == WEBSOCKET_OP_TEXT) {
            std::string text(wm->data.buf, wm->data.len);
            try {
                json msg = json::parse(text);
                if (msg.value("type", "") == "chat") {
                    for (auto &[rid, clients] : g_rooms) {
                        for (auto &vc : clients) {
                            if (vc.conn == c) {
                                broadcast_chat(rid, text, c);
                                return;
                            }
                        }
                    }
                } else if (msg.value("type", "") == "room-mode") {
                    std::string mode = msg.value("mode", "p2p");
                    for (auto &[rid, clients] : g_rooms) {
                        for (auto &vc : clients) {
                            if (vc.conn == c) {
                                g_room_modes[rid] = mode;
                                // 广播给房间内所有人（包括发送者）
                                json modeBroadcast = {{"type", "room-mode"}, {"mode", mode}};
                                std::string mb = modeBroadcast.dump();
                                for (auto &cc : clients) {
                                    mg_ws_send(cc.conn, mb.c_str(), mb.size(), WEBSOCKET_OP_TEXT);
                                }
                                return;
                            }
                        }
                    }
                } else if (msg.value("type", "") == "sdp-offer" ||
                           msg.value("type", "") == "sdp-answer" ||
                           msg.value("type", "") == "ice-candidate") {
                    int targetUserId = msg.value("targetUserId", -1);
                    if (targetUserId == -1) return;
                    for (auto &[rid, clients] : g_rooms) {
                        for (auto &vc : clients) {
                            if (vc.conn == c) {
                                VoiceClient* target = find_client_in_room(rid, targetUserId);
                                if (target) {
                                    msg["fromUserId"] = vc.userId;
                                    std::string relayText = msg.dump();
                                    mg_ws_send(target->conn, relayText.c_str(), relayText.size(), WEBSOCKET_OP_TEXT);
                                }
                                return;
                            }
                        }
                    }
                }
            } catch (...) {}
        } else if (op == WEBSOCKET_OP_BINARY) {
            for (auto &[rid, clients] : g_rooms) {
                for (auto &vc : clients) {
                    if (vc.conn == c) {
                        broadcast_audio(rid, wm->data.buf, wm->data.len, c, vc.userId);
                        return;
                    }
                }
            }
        }
    }
    // ── 连接关闭：离开房间 ──
    else if (ev == MG_EV_CLOSE) {
        // 清理 pending（如果还没完成握手）
        g_pending.erase(c);
        // 清理 rooms
        for (auto it = g_rooms.begin(); it != g_rooms.end(); ) {
            auto &clients = it->second;
            for (auto ci = clients.begin(); ci != clients.end(); ++ci) {
                if (ci->conn == c) {
                    std::string rid = ci->roomId;
                    int leavingUserId = ci->userId;
                    std::string leavingUsername = ci->username;
                    fprintf(stderr,"[VOICE] %s 离开房间 %s\n", ci->username.c_str(), rid.c_str());
                    clients.erase(ci);
                    if (clients.empty()) {
                        it = g_rooms.erase(it);
                    } else {
                        ++it;
                    }
                    send_user_list(rid);
                    broadcast_peer_event(rid, "peer-left", leavingUserId, leavingUsername, nullptr);
                    return;
                }
            }
            ++it;
        }
    }
}

inline void startVoiceServer(int port = 4001) {
    std::thread([port]() {
        struct mg_mgr mgr;
        mg_mgr_init(&mgr);
        char url[32];
        snprintf(url, sizeof(url), "http://0.0.0.0:%d", port);
        struct mg_connection *nc = mg_http_listen(&mgr, url, voice_handler, nullptr);
        if (!nc) {
            fprintf(stderr,"[VOICE] ERROR: 端口 %d 监听失败，可能被占用\n", port);
            return;
        }
        fprintf(stderr,"[VOICE] WebSocket 服务启动: ws://0.0.0.0:%d/voice/ws\n", port);
        for (;;) {
            mg_mgr_poll(&mgr, 50);
        }
    }).detach();
}
