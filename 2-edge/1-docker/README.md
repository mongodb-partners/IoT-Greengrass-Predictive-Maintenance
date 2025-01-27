# Greengrass | MQTT

## Prerequisites

* [Docker](https://www.docker.com/products/docker-desktop/)
* MacOS / Ubuntu

## Overview

Here we are building a docker container
  
**1. CONSUMER CONTAINER** [./greengrass](./greengrass/) acts as an MQTT message consumer and once it receives the data from vehicle sensors it reads and stores them in the SQLite database and parallelly send it to IoT Message Routing to sync to MongoDB Atlas