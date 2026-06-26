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
             const std::string& dbname)
        : host_(host), port_(port), user_(user), password_(password), dbname_(dbname) {
        connect();
    }

    ~Database() {
        if (conn_) mysql_close(conn_);
    }

private:
    std::string host_, user_, password_, dbname_;
    int port_;

    void connect() {
        if (conn_) mysql_close(conn_);
        conn_ = mysql_init(nullptr);
        if (!conn_) throw std::runtime_error("mysql_init failed");
        if (!mysql_real_connect(conn_, host_.c_str(), user_.c_str(),
                                password_.c_str(), dbname_.c_str(),
                                port_, nullptr, 0)) {
            std::string err = mysql_error(conn_);
            mysql_close(conn_);
            conn_ = nullptr;
            throw std::runtime_error("mysql_connect: " + err);
        }
    }

    bool ensureConnected() {
        if (!conn_) return false;
        if (mysql_ping(conn_) == 0) return true;
        // 连接已断开，尝试重连
        try {
            connect();
            return true;
        } catch (...) {
            return false;
        }
    }

public:
    // 注册用户，返回 id，失败返回 -1
    int createUser(const std::string& username,
                   const std::string& passwordHash,
                   const std::string& salt) {
        if (!ensureConnected()) return -1;
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
        if (!ensureConnected()) return {-1, "", ""};
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
        if (!ensureConnected()) return results;
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

    // ────── 房间管理 ──────
    struct Room { int id; std::string roomId; int creatorId; std::string createdAt; };

    int createRoom(const std::string& roomId, int creatorId) {
        if (!ensureConnected()) return -1;
        const char* sql = "INSERT INTO rooms (room_id, creator_id) VALUES (?, ?)";
        MYSQL_STMT* stmt = mysql_stmt_init(conn_);
        if (!stmt) return -1;
        mysql_stmt_prepare(stmt, sql, strlen(sql));
        MYSQL_BIND bind[2];
        memset(bind, 0, sizeof(bind));
        bind[0].buffer_type = MYSQL_TYPE_STRING;
        bind[0].buffer = (char*)roomId.c_str();
        bind[0].buffer_length = roomId.size();
        bind[1].buffer_type = MYSQL_TYPE_LONG;
        bind[1].buffer = &creatorId;
        mysql_stmt_bind_param(stmt, bind);
        if (mysql_stmt_execute(stmt) != 0) {
            mysql_stmt_close(stmt);
            return -1;
        }
        int id = (int)mysql_stmt_insert_id(stmt);
        mysql_stmt_close(stmt);
        return id;
    }

    Room findRoom(const std::string& roomId) {
        Room r{-1, "", 0, ""};
        if (!ensureConnected()) return r;
        MYSQL_STMT* stmt = mysql_stmt_init(conn_);
        if (!stmt) return r;
        const char* sql = "SELECT id, room_id, creator_id, created_at FROM rooms WHERE room_id = ?";
        mysql_stmt_prepare(stmt, sql, strlen(sql));
        MYSQL_BIND bind[1];
        memset(bind, 0, sizeof(bind));
        bind[0].buffer_type = MYSQL_TYPE_STRING;
        bind[0].buffer = (char*)roomId.c_str();
        bind[0].buffer_length = roomId.size();
        mysql_stmt_bind_param(stmt, bind);

        int id, cid;
        char rid[51] = {}, cat[32] = {};
        MYSQL_BIND rb[4];
        memset(rb, 0, sizeof(rb));
        rb[0].buffer_type = MYSQL_TYPE_LONG; rb[0].buffer = &id;
        rb[1].buffer_type = MYSQL_TYPE_STRING; rb[1].buffer = rid; rb[1].buffer_length = sizeof(rid) - 1;
        rb[2].buffer_type = MYSQL_TYPE_LONG; rb[2].buffer = &cid;
        rb[3].buffer_type = MYSQL_TYPE_STRING; rb[3].buffer = cat; rb[3].buffer_length = sizeof(cat) - 1;
        mysql_stmt_bind_result(stmt, rb);

        mysql_stmt_execute(stmt);
        mysql_stmt_store_result(stmt);
        if (mysql_stmt_fetch(stmt) == 0) {
            r = {id, rid, cid, cat};
        }
        mysql_stmt_close(stmt);
        return r;
    }

    std::vector<Room> listRooms() {
        std::vector<Room> results;
        if (!ensureConnected()) return results;
        MYSQL_STMT* stmt = mysql_stmt_init(conn_);
        if (!stmt) return results;
        const char* sql = "SELECT id, room_id, creator_id, created_at FROM rooms ORDER BY created_at DESC";
        mysql_stmt_prepare(stmt, sql, strlen(sql));
        int id, cid;
        char rid[51] = {}, cat[32] = {};
        MYSQL_BIND rb[4];
        memset(rb, 0, sizeof(rb));
        rb[0].buffer_type = MYSQL_TYPE_LONG; rb[0].buffer = &id;
        rb[1].buffer_type = MYSQL_TYPE_STRING; rb[1].buffer = rid; rb[1].buffer_length = sizeof(rid) - 1;
        rb[2].buffer_type = MYSQL_TYPE_LONG; rb[2].buffer = &cid;
        rb[3].buffer_type = MYSQL_TYPE_STRING; rb[3].buffer = cat; rb[3].buffer_length = sizeof(cat) - 1;
        mysql_stmt_bind_result(stmt, rb);
        mysql_stmt_execute(stmt);
        mysql_stmt_store_result(stmt);
        while (mysql_stmt_fetch(stmt) == 0) {
            results.push_back({id, rid, cid, cat});
        }
        mysql_stmt_close(stmt);
        return results;
    }

    bool deleteRoom(const std::string& roomId, int creatorId) {
        if (!ensureConnected()) return false;
        const char* sql = "DELETE FROM rooms WHERE room_id = ? AND creator_id = ?";
        MYSQL_STMT* stmt = mysql_stmt_init(conn_);
        if (!stmt) return false;
        mysql_stmt_prepare(stmt, sql, strlen(sql));
        MYSQL_BIND bind[2];
        memset(bind, 0, sizeof(bind));
        bind[0].buffer_type = MYSQL_TYPE_STRING;
        bind[0].buffer = (char*)roomId.c_str();
        bind[0].buffer_length = roomId.size();
        bind[1].buffer_type = MYSQL_TYPE_LONG;
        bind[1].buffer = &creatorId;
        mysql_stmt_bind_param(stmt, bind);
        bool ok = mysql_stmt_execute(stmt) == 0 && mysql_stmt_affected_rows(stmt) > 0;
        mysql_stmt_close(stmt);
        return ok;
    }

private:
    MYSQL* conn_;
};
