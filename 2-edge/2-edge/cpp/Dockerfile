# Use Ubuntu as the base image
FROM ubuntu:20.04

# Set non-interactive mode for apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libsqlite3-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy the SDK source code
RUN git clone --recursive https://github.com/aws/aws-iot-device-sdk-cpp-v2.git

# Create a build directory for the SDK
RUN mkdir aws-iot-device-sdk-cpp-v2-build

# Set environment variables
ENV SDK_WORKSPACE=/workspace
ENV BUILD_DIR=$SDK_WORKSPACE/aws-iot-device-sdk-cpp-v2-build

# Build the SDK
RUN cd $BUILD_DIR && \
    cmake -DCMAKE_INSTALL_PREFIX=$SDK_WORKSPACE -DCMAKE_BUILD_TYPE="Release" ../aws-iot-device-sdk-cpp-v2 && \
    cmake --build . --target install

# Copy the consumer folder into the container
COPY consumer /workspace/consumer

WORKDIR /workspace/consumer
RUN cmake -B build -S . -DCMAKE_PREFIX_PATH=$SDK_WORKSPACE -DCMAKE_BUILD_TYPE="Release" 
RUN cmake --build ./build --config "Release"

ENTRYPOINT ["tail", "-f", "/dev/null"]
