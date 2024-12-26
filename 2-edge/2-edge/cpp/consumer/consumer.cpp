#include <aws/crt/Api.h>
#include <aws/crt/StlAllocator.h>
#include <aws/crt/auth/Credentials.h>
#include <aws/crt/io/TlsOptions.h>
#include <iostream>

#include <aws/iot/MqttClient.h>

#include <algorithm>
#include <aws/crt/UUID.h>
#include <chrono>
#include <mutex>
#include <thread>
#include <nlohmann/json.hpp>  
#include <sqlite3.h>  
#include "./utils/CommandLineUtils.h"

using namespace Aws::Crt;
using json = nlohmann::json;

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

    sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_text(stmt, 2, vehicleId.c_str(), -1, SQLITE_STATIC);
    sqlite3_bind_int64(stmt, 3, timestamp);
    sqlite3_bind_double(stmt, 4, voltage);
    sqlite3_bind_double(stmt, 5, current);

    rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        std::cerr << "Error inserting data: " << sqlite3_errmsg(db) << std::endl;
        sqlite3_finalize(stmt);
        return false;
    }

    sqlite3_finalize(stmt);
    return true;
}

int main(int argc, char *argv[]) {
    sqlite3* db = nullptr;

    if (!initializeDatabase(db)) {
        throw std::runtime_error("Failed to initialize SQLite database");
    }

    ApiHandle apiHandle;

    // Parse command line input.
    Utils::cmdData cmdData = Utils::parseSampleInputPubSub(argc, argv, &apiHandle, "consumer");
    String messagePayload = "\"" + cmdData.input_message + "\"";

    // Set up MQTT client.
    auto clientConfigBuilder =
        Aws::Iot::MqttClientConnectionConfigBuilder(cmdData.input_cert.c_str(), cmdData.input_key.c_str());
    clientConfigBuilder.WithEndpoint(cmdData.input_endpoint);
    if (!cmdData.input_ca.empty()) {
        clientConfigBuilder.WithCertificateAuthority(cmdData.input_ca.c_str());
    }
    if (!cmdData.input_proxyHost.empty()) {
        Aws::Crt::Http::HttpClientConnectionProxyOptions proxyOptions;
        proxyOptions.HostName = cmdData.input_proxyHost;
        proxyOptions.Port = static_cast<uint32_t>(cmdData.input_proxyPort);
        proxyOptions.AuthType = Aws::Crt::Http::AwsHttpProxyAuthenticationType::None;
        clientConfigBuilder.WithHttpProxyOptions(proxyOptions);
    }
    if (cmdData.input_port != 0) {
        clientConfigBuilder.WithPortOverride(static_cast<uint32_t>(cmdData.input_port));
    }

    auto clientConfig = clientConfigBuilder.Build();
    if (!clientConfig) {
        std::cerr << "Client Configuration initialization failed with error " 
                  << Aws::Crt::ErrorDebugString(clientConfig.LastError()) << std::endl;
        exit(-1);
    }

    Aws::Iot::MqttClient client;
    auto connection = client.NewConnection(clientConfig);
    if (!*connection) {
        std::cerr << "MQTT Connection Creation failed with error "
                  << Aws::Crt::ErrorDebugString(connection->LastError()) << std::endl;
        exit(-1);
    }

    std::promise<bool> connectionCompletedPromise;
    std::promise<void> connectionClosedPromise;

    auto onConnectionCompleted = [&](Aws::Crt::Mqtt::MqttConnection&, int errorCode, Aws::Crt::Mqtt::ReturnCode returnCode, bool) {
        if (errorCode) {
            std::cerr << "Connection failed with error " << Aws::Crt::ErrorDebugString(errorCode) << std::endl;
            connectionCompletedPromise.set_value(false);
        } else {
            std::cout << "Connection completed with return code " << returnCode << std::endl;
            connectionCompletedPromise.set_value(true);
        }
    };

    auto onInterrupted = [&](Aws::Crt::Mqtt::MqttConnection&, int error) {
        std::cout << "Connection interrupted with error " << Aws::Crt::ErrorDebugString(error) << std::endl;
    };

    auto onResumed = [&](Aws::Crt::Mqtt::MqttConnection&, Aws::Crt::Mqtt::ReturnCode, bool) {
        std::cout << "Connection resumed" << std::endl;
    };

    auto onDisconnect = [&](Aws::Crt::Mqtt::MqttConnection&) {
        std::cout << "Disconnect completed" << std::endl;
        connectionClosedPromise.set_value();
    };

    connection->OnConnectionCompleted = std::move(onConnectionCompleted);
    connection->OnDisconnect = std::move(onDisconnect);
    connection->OnConnectionInterrupted = std::move(onInterrupted);
    connection->OnConnectionResumed = std::move(onResumed);

    std::cout << "Connecting...\n";
    if (!connection->Connect(cmdData.input_clientId.c_str(), false, 1000)) {
        std::cerr << "MQTT Connection failed with error " << Aws::Crt::ErrorDebugString(connection->LastError()) << std::endl;
        exit(-1);
    }

    if (connectionCompletedPromise.get_future().get()) {
        std::mutex receiveMutex;
        uint32_t receivedCount = 0;

        auto onMessage = [&](Mqtt::MqttConnection&, const String& topic, const ByteBuf& byteBuf,
                             bool /*dup*/, Mqtt::QOS /*qos*/, bool /*retain*/) {
            std::lock_guard<std::mutex> lock(receiveMutex);
            ++receivedCount;
            std::cout << "Publish #" << receivedCount << " received on topic " << topic.c_str() << std::endl;
            std::cout << "Message: ";
            fwrite(byteBuf.buffer, 1, byteBuf.len, stdout);
            std::cout << "\n";
            try {
                std::string messageStr(reinterpret_cast<const char*>(byteBuf.buffer), byteBuf.len);
                json jsonMessage = json::parse(messageStr);
                std::string id = std::to_string(std::time(nullptr)) + "-" + std::to_string(rand());
                std::string vehicleId = jsonMessage["vehicleId"];
                int64_t timestamp = jsonMessage["timestamp"];
                double voltage = jsonMessage["voltage"];
                double current = jsonMessage["current"];
                insertSensorData(db, id, vehicleId, timestamp, voltage, current);
            } catch (const json::exception& e) {
                std::cerr << "Error parsing JSON: " << e.what() << std::endl;
            }
        };

        std::promise<void> subscribeFinishedPromise;
        auto onSubAck = [&](Mqtt::MqttConnection&, uint16_t packetId, const String& topic,
                            Mqtt::QOS QoS, int errorCode) {
            if (errorCode) {
                std::cerr << "Subscribe failed with error " << aws_error_debug_str(errorCode) << std::endl;
                exit(-1);
            } else {
                if (!packetId || QoS == AWS_MQTT_QOS_FAILURE) {
                    std::cerr << "Subscribe rejected by the broker." << std::endl;
                    exit(-1);
                } else {
                    std::cout << "Subscribe on topic " << topic.c_str() << " on packetId " << packetId << " succeeded" << std::endl;
                }
            }
            subscribeFinishedPromise.set_value();
        };

        connection->Subscribe(cmdData.input_topic.c_str(), AWS_MQTT_QOS_AT_LEAST_ONCE, onMessage, onSubAck);
        subscribeFinishedPromise.get_future().wait();

        while (true) {
            std::this_thread::sleep_for(std::chrono::milliseconds(500)); 
        }

        if (connection->Disconnect()) {
            connectionClosedPromise.get_future().wait();
        }
    } else {
        exit(-1);
    }

    return 0;
}
