# IoT Message Routing to AWS MSK and MongoDB Integration

This guide outlines the steps to set up IoT message routing to send data to **AWS MSK** (Managed Streaming for Apache Kafka) and use the **MongoDB Source Connector** to route the data from MSK to **MongoDB**.


## Steps

### 1. Set Up IoT Message Routing
   
   1. Create a Rule under Message Routing in AWS IoT that receives the events from MQTT Topic and send it to AWS MSK as defined in the Actions.

![Message Routing](../../media/message-routing-1.png)


   2. Create a Rule under Message Routing in AWS IoT to send the Device Telemetry to a Lambda function which will store the Telemetry data in MongoDB

![Message Routing](../../media/telemetry-emitter-iot.png)



### 2. Set Up AWS MSK Cluster

1. **Create an MSK Cluster**:
   - Navigate to the **Amazon MSK Console**.
   - Click **Create cluster**.
   - Choose **Custom create** for greater control over configuration or select **Quick create** for a simplified process.
   - Configure the cluster by selecting the desired **broker settings** and **instance types**.
   - Ensure **IAM** access is enabled for secure connections.

2. **Configure MSK Access**:
   - Set up **VPC**, **subnets**, and **security groups** for your MSK cluster.
   - Make sure that your producer application or IoT devices can access MSK via **VPC Peering** or **PrivateLink**.
   - Once the cluster is created, note down the **bootstrap servers** endpoint.

### 2. Download the [Mongo Source Connector jar](https://www.confluent.io/hub/mongodb/kafka-connect-mongodb) file and upload to S3 Bucket.

![Plugin Connector](../../media/connector-plugin.png)


### 3. Create a MSK Connector with this plugin and with below configuration

```
connector.class=com.mongodb.kafka.connect.MongoSinkConnector
database=GreengrassIot
tasks.max=1
topics=test-topic
connection.uri=mongodb+srv://whitesc:whitesc@iot-gg-pl-0.5amcr.mongodb.net/
collection=SensorData
value.converter=org.apache.kafka.connect.storage.StringConverter
key.converter=org.apache.kafka.connect.storage.StringConverter
```

![MSK Connector](../../media/msk-connector.png)


Lets move to the next step [3-aws-greensgrass-telemetry](../../3-aws-greengrass-telemetry) to generate and consume the telemetry data.
