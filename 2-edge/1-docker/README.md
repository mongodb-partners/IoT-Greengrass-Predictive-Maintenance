# Greengrass | MQTT

## Prerequisites

* [Docker](https://www.docker.com/products/docker-desktop/)
* MacOS / Ubuntu

## Overview

Here we are building a docker container
  
**1. CONSUMER CONTAINER** [./greengrass](./greengrass/) acts as an MQTT message consumer and once it receives the data from vehicle sensors it reads and stores them in the realm database which then syncs it back to Atlas via device sync in real-time. This application is built using C++ with Realm dependency, JSON lib dependency, and MQTT dependency.
