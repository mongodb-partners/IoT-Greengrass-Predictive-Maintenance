# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

FROM ubuntu:20.04

# Replace the args to lock to a specific version
ARG GREENGRASS_RELEASE_VERSION=latest
ARG GREENGRASS_ZIP_FILE=greengrass-${GREENGRASS_RELEASE_VERSION}.zip
ARG GREENGRASS_RELEASE_URI=https://d2s8p88vqu9w66.cloudfront.net/releases/${GREENGRASS_ZIP_FILE}

# Author
LABEL maintainer="AWS IoT Greengrass"
# Greengrass Version
LABEL greengrass-version=${GREENGRASS_RELEASE_VERSION}

# Set up Greengrass v2 execution parameters
ENV TINI_KILL_PROCESS_GROUP=1 \
    GGC_ROOT_PATH=/greengrass/v2 \
    PROVISION=false \
    AWS_REGION=us-east-1 \
    THING_NAME=default_thing_name \
    THING_GROUP_NAME=default_thing_group_name \
    TES_ROLE_NAME=default_tes_role_name \
    TES_ROLE_ALIAS_NAME=default_tes_role_alias_name \
    COMPONENT_DEFAULT_USER=default_component_user \
    DEPLOY_DEV_TOOLS=false \
    INIT_CONFIG=default_init_config \
    TRUSTED_PLUGIN=default_trusted_plugin_path \
    THING_POLICY_NAME=default_thing_policy_name
RUN env

# Entrypoint script to install and run Greengrass
COPY "greengrass-entrypoint.sh" /

# Install Greengrass v2 dependencies
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    tar unzip wget sudo procps passwd python3 openjdk-11-jre-headless \
    build-essential libcurl4-openssl-dev libuv1-dev libprocps-dev libssl-dev zlib1g-dev cmake git && \
    wget $GREENGRASS_RELEASE_URI && \
    chmod +x /greengrass-entrypoint.sh && \
    mkdir -p /opt/greengrassv2 $GGC_ROOT_PATH && \
    unzip $GREENGRASS_ZIP_FILE -d /opt/greengrassv2 && rm $GREENGRASS_ZIP_FILE && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN apt-get install -y build-essential libcurl4-openssl-dev libuv1-dev libprocps-dev libssl-dev zlib1g-dev cmake git

# Modify /etc/sudoers
COPY "modify-sudoers.sh" /
RUN chmod +x /modify-sudoers.sh
RUN ./modify-sudoers.sh

WORKDIR /pahocpp
RUN git clone https://github.com/eclipse/paho.mqtt.cpp.git
WORKDIR /pahocpp/paho.mqtt.cpp
RUN git checkout v1.3.2

RUN git clone https://github.com/eclipse/paho.mqtt.c.git
WORKDIR /pahocpp/paho.mqtt.cpp/paho.mqtt.c
RUN git checkout v1.3.8
RUN cmake -Bbuild -H. -DPAHO_ENABLE_TESTING=OFF -DPAHO_BUILD_STATIC=ON -DPAHO_WITH_SSL=ON -DPAHO_HIGH_PERFORMANCE=ON
RUN cmake --build build/ --target install
RUN ldconfig
WORKDIR /pahocpp/paho.mqtt.cpp
RUN cmake -Bbuild -H. -DPAHO_BUILD_STATIC=ON
RUN cmake --build build/ --target install
RUN ldconfig

ENTRYPOINT ["/greengrass-entrypoint.sh"]
