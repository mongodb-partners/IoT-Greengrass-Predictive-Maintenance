# Set up Edge Gateway and Vehicle Simulator

## 1. Set up Edge Gateway

Let's set up the Docker containers to create the Greengrass components such as things, thing types, and devices on AWS Greengrass.

[docker](./1-docker/) holds the docker files needed to create and run the container needed for the edge.

## 2. Deploy MQTT Consumer to Edge Gateway

[Deploy MQTT Consumer to Edge Gateway](./2-edge/cpp/consumer/README.md)


## 3. Set up Vehicle Simulator to send Telemetry

After deploying the MQTT consumer application via AWS,

[Set up Vehicle Simulator to send Telemetry](./1-docker/vehicle1/README.md)


