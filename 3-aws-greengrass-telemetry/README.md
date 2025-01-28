# Telemetry <> MongoDB

IoT Device health telemetry data helps you monitor the performance of critical operations on your Greengrass core devices. You can use these applications to gain insights into fleet health.

To set it up,

1. Deploying the Nucleus Telemetry emitter to send the telemetry data to the AWS Cloud Lambda function via Message Routing 

![Telemetry](../../media/telemetry-emitter.png)


2. Deploy the lambda function to write the telemetry data in the MongoDB Collection

Create the lambda function `greengrass-telemetry` and set the below environment variables

```
MONGO_URI=
DB_NAME=
```

3. Hurray!! completed halfway through!! Now let's switch to [Lambda](../4-aws-lambda) setup.

