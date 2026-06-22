cmake_minimum_required(VERSION 3.14)
project(BlogServer VERSION 1.0 LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ────── 头文件路径 ──────
include_directories(${CMAKE_SOURCE_DIR}/source ${CMAKE_SOURCE_DIR}/deps)

# ────── MySQL ──────
if(WIN32)
    set(MYSQL_ROOT "D:/mysql/Server")
    set(MYSQL_INCLUDE_DIR "${MYSQL_ROOT}/include")
    set(MYSQL_LIBRARY "${MYSQL_ROOT}/lib/libmysql.lib")
else()
    set(MYSQL_INCLUDE_DIR "/usr/include/mysql")
    set(MYSQL_LIBRARY "/usr/lib/x86_64-linux-gnu/libmysqlclient.so")
endif()

# ────── 源文件 ──────
add_executable(blogserver
    source/main.cpp
    deps/mongoose.c
)

target_include_directories(blogserver PRIVATE ${MYSQL_INCLUDE_DIR})
target_link_libraries(blogserver ${MYSQL_LIBRARY})

if(WIN32)
    # MinGW 下 <sys/socket.h> 底层依赖 Winsock2
    target_link_libraries(blogserver ws2_32)
    add_custom_command(TARGET blogserver POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${MYSQL_ROOT}/lib/libmysql.dll"
        $<TARGET_FILE_DIR:blogserver>)
else()
    # Linux 下 MySQL 客户端库需要 pthread
    target_link_libraries(blogserver pthread)
endif()
