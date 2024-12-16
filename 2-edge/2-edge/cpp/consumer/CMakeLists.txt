cmake_minimum_required(VERSION 3.15)

project(CppConsumer)

# Minimum C++ standard
set(CMAKE_CXX_STANDARD 17)
set(PAHO_ENABLE_TESTING false CACHE BOOL "ignore")
set(PAHO_BUILD_STATIC true CACHE BOOL "ignore")
set(PAHO_BUILD_SHARED false CACHE BOOL "ignore")

Include(FetchContent)

find_package(PahoMqttCpp REQUIRED)
find_package(SQLite3 REQUIRED)
find_package(eclipse-paho-mqtt-c REQUIRED)
find_package(OpenSSL REQUIRED)

FetchContent_Declare(json URL https://github.com/nlohmann/json/releases/download/v3.11.2/json.tar.xz)
FetchContent_MakeAvailable(json)


add_executable(consumer consumer.cpp)

target_link_libraries(consumer PahoMqttCpp::paho-mqttpp3) 
target_link_libraries(consumer eclipse-paho-mqtt-c::paho-mqtt3as)
target_link_libraries(consumer OpenSSL::SSL)
target_link_libraries(consumer SQLite::SQLite3)
target_link_libraries(consumer nlohmann_json::nlohmann_json)