#include <iostream>
#include <sqlite3.h>
#include <stdio.h>
#include <cstdlib>
#include <string>
#include <cstring>
#include <cctype>
#include <thread>
#include <chrono>
#include "mqtt/async_client.h"
#include <nlohmann/json.hpp>  

using namespace std::chrono;
using json = nlohmann::json;

// MQTT Configuration
const std::string DFLT_ADDRESS{"host.docker.internal:1883"};
const std::string CLIENT_ID{""};
const std::string TOPIC{"topic"};
const auto PERIOD = seconds(5);
const int MAX_BUFFERED_MSGS = 120;
const int QOS = 1;

// SQLite Database and Table
const std::string DB_NAME{"sensor_data.db"};
const std::string CREATE_TABLE_SQL = R"(
CREATE TABLE IF NOT EXISTS SensorDatum (
    _id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    voltage REAL NOT NULL,
    current REAL NOT NULL
);
)";

// Function to initialize SQLite database
bool initializeDatabase(sqlite3* &db) {
    int rc = sqlite3_open(DB_NAME.c_str(), &db);
    if (rc) {
        std::cerr << "Error opening SQLite database: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }

    char* errMsg = nullptr;
    rc = sqlite3_exec(db, CREATE_TABLE_SQL.c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "Error creating table: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }

    return true;
}

// Function to insert data into SQLite database
bool insertSensorData(sqlite3* db, const std::string& id, const std::string& vehicleId, int64_t timestamp, double voltage, double current) {
    const std::string INSERT_SQL = R"(
        INSERT INTO SensorDatum (_id, vehicleId, timestamp, voltage, current)
        VALUES (?, ?, ?, ?, ?);
    )";

    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db, INSERT_SQL.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Error preparing insert statement: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }

    // Bind parameters
    sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, vehicleId.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 3, timestamp);
    sqlite3_bind_double(stmt, 4, voltage);
    sqlite3_bind_double(stmt, 5, current);

    // Execute statement
    rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        std::cerr << "Error inserting data: " << sqlite3_errmsg(db) << std::endl;
        sqlite3_finalize(stmt);
        return false;
    }

    sqlite3_finalize(stmt);
    return true;
}

int main(int argc, char* argv[]) {
    mqtt::async_client cli(DFLT_ADDRESS, CLIENT_ID);

    mqtt::connect_options connOpts;
    connOpts.set_keep_alive_interval(MAX_BUFFERED_MSGS * PERIOD);
    connOpts.set_clean_session(true);
    connOpts.set_automatic_reconnect(true);

    sqlite3* db = nullptr;

    try {
        // Initialize SQLite database
        if (!initializeDatabase(db)) {
            throw std::runtime_error("Failed to initialize SQLite database");
        }

        // Start MQTT client
        cli.start_consuming();
        std::cout << "Connecting to the MQTT server..." << std::flush;
        auto tok = cli.connect(connOpts);
        auto rsp = tok->get_connect_response();

        if (!rsp.is_session_present()) {
            cli.subscribe(TOPIC, QOS)->wait();
        }
        std::cout << "Connected to MQTT server" << std::endl;

        // Consume MQTT messages
        std::cout << "Waiting for messages on topic: '" << TOPIC << "'" << std::endl;

        while (true) { 

            auto msg = cli.consume_message();
            if (!msg) break;

            try {
                std::string messageString = msg->to_string();
                json jsonMessage = json::parse(messageString);

                std::string id = std::to_string(std::time(nullptr)) + "-" + std::to_string(rand()); // Generate a pseudo-unique ID
                std::string vehicleId = jsonMessage["vehicleId"];
                int64_t timestamp = jsonMessage["timestamp"];
                double voltage = jsonMessage["voltage"];
                double current = jsonMessage["current"];

                // Insert into SQLite database
                if (insertSensorData(db, id, vehicleId, timestamp, voltage, current)) {
                    std::cout << "Data inserted successfully: " << messageString << std::endl;
                } else {
                    std::cerr << "Failed to insert data into SQLite" << std::endl;
                }
            } catch (const std::exception& ex) {
                std::cerr << "Error processing message: " << ex.what() << std::endl;
            }
        }

        // Clean up
        if (cli.is_connected()) {
            cli.unsubscribe(TOPIC)->wait();
            cli.stop_consuming();
            cli.disconnect()->wait();
        }
    } catch (const mqtt::exception& exc) {
        std::cerr << "MQTT error: " << exc.what() << std::endl;
    } catch (const std::exception& ex) {
        std::cerr << "Error: " << ex.what() << std::endl;
    }

    // Close SQLite database
    if (db) {
        sqlite3_close(db);
    }

    return 0;
}
