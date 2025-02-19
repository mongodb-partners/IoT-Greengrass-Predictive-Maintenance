import * as fs from "fs";
import * as path from "path";

import { input } from "@inquirer/prompts";
import { MongoClient } from "mongodb";
import { SageMakerClient } from "@aws-sdk/client-sagemaker";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { askUserForInput, createIoTTopicKafkaRule, createIoTTopicLambdaRule, createMskConnector, createVpcDestination, deleteLambdaDirectoryContents, executePythonFile, installPythonDependencies, preprocessJsonFile, setupPrivateLink, spawnProcess, updateLambdaEnvironmentVariables } from "./helpers";
import {
  connectAtlasToLambda,
} from "./mongo";
import { spawn } from "child_process";
import { setupSagemaker } from "./aws";


async function runNpmInstall(directory: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["install"], {
      cwd: directory,
      stdio: "inherit", // Ensures output is displayed in the console
      shell: true, // Ensures compatibility with Windows
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install failed in directory: ${directory}`));
      }
    });
  });
}


async function deployStack() {
  const solution = "iot-greengrass-demo";
  const stackName = "FirstStepStack";

  try {
    let filePath = path.join("resources", "mongodb-connector", "mongo-kafka-connect-1.15.0-confluent.jar");

    if (!fs.existsSync(filePath)) {
      throw new Error(`Error: deps.zip not found in infra/resources/mongodb-connector/`);
    }
    // Run `npm install` in required directories
    const subscriptionNotifierPath = path.resolve(
      __dirname,
      "../resources/lambdas/app-sync-lambda/lambda_subscription_notifier"
    );
    const dataSourcePath = path.resolve(
      __dirname,
      "../resources/lambdas/app-sync-lambda/lambda-data-source"
    );

    const telemetryLambdaPath = path.resolve(
      __dirname,
      "../resources/lambdas/telemetry-lambda"
    );

    const mdbS3Path = path.resolve(
      __dirname,
      "../resources/lambdas/mdb-s3"
    );

    console.log("Running npm install in lambda_subscription_notifier...");
    await runNpmInstall(subscriptionNotifierPath);

    console.log("Running npm install in lambda-data-source...");
    await runNpmInstall(dataSourcePath);

    console.log("Running npm install in telemetry-lambda...");
    await runNpmInstall(telemetryLambdaPath);

    console.log("Running npm install in mdb-s3 lambda...");
    await runNpmInstall(mdbS3Path);


    // Installing Python Dependencies for Lambdas

    console.log("Intsalling dependencies for : avs-endpoint lambda");
    installPythonDependencies('resources/lambdas/avs-endpoint/lambda_function.py', ['boto3', 'pymongo==4.6.0']);





    const containerUri =
      "663277389841.dkr.ecr.us-east-1.amazonaws.com/sagemaker-data-wrangler-container:2.x";
    const notebookInstanceName = solution + "-notebook-instance";
    const lifecycleConfigName = solution + "-lifecycle-config";

    const awsAccountId = await input({
      message: "Enter your AWS Account ID",
    });

    const awsRegion = await input({
      message: "Enter your AWS Region",
    });

    const atlasOrgId = await input({
      message: "Enter your MongoDB Organization ID",
    });

    const atlasOrgPublicKey = await input({
      message: "Enter your MongoDB Atlas Public Key",
    });

    const atlasOrgPrivateKey = await input({
      message: "Enter your MongoDB Atlas Private Key",
    });

    const awsAccessKey = await input({
      message: "Enter your AWS access Key",
    });

    const awsSecretKey = await input({
      message: "Enter your AWS secret Key",
    });



    // Deploy AWS + Mongodb CDK Infra 


    const command = "cdk";
    const args = [
      "deploy",
      stackName,
      "--require-approval", "never",
      `--context`, `orgId=${atlasOrgId}`,
      `--context`, `ip=0.0.0.0`,
      `--context`, `atlasOrgPublicKey=${atlasOrgPublicKey}`,
      `--context`, `atlasOrgPrivateKey=${atlasOrgPrivateKey}`,
      `--context`, `solution=${solution}`,
      "--outputs-file", "outputs.json",
    ];



    await spawnProcess(command, args, awsAccountId, awsRegion, stackName);


    deleteLambdaDirectoryContents('resources/lambdas/avs-endpoint/lambda_function.py');
   


    // Sagemaker Implementation
    // Create Lifecycle Script + Notebook Instance for Sagemaker

    // try {
    //   const sagemakerClient = new SageMakerClient({ region: awsRegion });
    //   await setupSagemaker(solution, awsAccountId, awsRegion, sagemakerClient, lifecycleConfigName, notebookInstanceName);
    // } catch (error) {
    //   console.log("Error Setting Up Sagemaker : ", error);
    // }



    // Upload Mongo Connector Apache Kafka Plugin to S3

    const s3Client = new S3Client({ region: awsRegion });

    const fileStream = fs.createReadStream(filePath);

    const uploadParams = {
      Bucket: 'iot-greengrass-connector-bucket',
      Key: path.basename(filePath),
      Body: fileStream,
    };
    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      console.log("Mongo Connector Plugin uploaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }


    // Create Custom MSK plugin for Mongodb Sink Connector


    const outputfilePath = "outputs.json";
    const data = fs.readFileSync(outputfilePath, "utf8");


    const jsonData = JSON.parse(data);
    const details = jsonData.FirstStepStack;

    const mongoConnStr = `mongodb+srv://${details.DbUsername}:${details.DbPassword}@${details.ConnectionString.split('//')[1]}`;

    console.log('Mongo Connection string: ', mongoConnStr);



    // Setup Mongodb Private Link With AWS 

    try {

      if (details) {
        const vpcId = details.vpcId;
        const subnetIds = JSON.parse(details.VpcSubnetIds);
        const atlasProjectId = details.AtlasProjectId;

        await setupPrivateLink({ atlasProjectId, region: awsRegion, subnetIds, vpcId })

      }
    } catch (error) {
      console.log("Error setting up private endpoint: ", error);
    }


    // Ask for private endpoint connection string

    const privateMongoConnStr = await askUserForInput("Enter the private endpoint connection string: ");

    // Construct the connector configuration JSON
    const connectorConfig = JSON.stringify({
      "connector.class": "com.mongodb.kafka.connect.MongoSinkConnector",
      database: "GreengrassIot",
      "tasks.max": "1",
      topics: "test-topic",
      "connection.uri": privateMongoConnStr,
      collection: "SensorData",
      "value.converter": "org.apache.kafka.connect.storage.StringConverter",
      "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    });

    try {


      await createMskConnector({
        connectorName: "msk-mdb-connector",
        kafkaClusterArn: details.mskClusterArn,
        vpcConfig: {
          securityGroups: Array.isArray(details.MskSecurityGroupId)
            ? details.MskSecurityGroupId
            : [details.MskSecurityGroupId],
          subnets: typeof details.VpcSubnetIds === "string"
            ? JSON.parse(details.VpcSubnetIds)
            : details.VpcSubnetIds,
        },
        pluginS3BucketArn: details.ConnectorBucketArn,
        pluginS3Bucket: "iot-greengrass-connector-bucket",
        pluginS3Key: "mongo-kafka-connect-1.15.0-confluent.jar",
        roleArn: details.SinkConnectorRoleArn,
        connectorConfig: connectorConfig,
      });


    } catch (error) {
      console.error("Error creating MSK connector:", error);
      throw error;
    }


    // Create IOT rule for Kafka & Lambda

    try {

      console.log('You need to associate secrets to kafka cluster , before creating IOT Kafka Rule, Follow guidelines provided in infra readme to associate secrets');

      const secretsAssociated = await askUserForInput("Secrets Associated ? (y/n): ");
      if (!secretsAssociated || secretsAssociated.toLowerCase() !== "y") {
        throw new Error("You need to associate secrets to your Kafka cluster before creating the IoT Rule.");
      }

      await createVpcDestination(
        awsRegion,
        details.VpcSubnetIds,
        Array.isArray(details.MskSecurityGroupId)
          ? details.MskSecurityGroupId
          : [details.MskSecurityGroupId],
        details.vpcId,
        details.IotRoleArn
      );

      console.log("Please retrieve VPC Destination ARN: ");
      console.log(
        "Navigate to AWS > IOT Core Messaging > destinations . Check if the status is 'In-Progress'. Wait for it to be 'ENABLED' and then copy the 'VPC Destination ARN"
      );
      const vpcDestinationArn = await askUserForInput("Enter VPC Destination ARN: ");
      if (!vpcDestinationArn) {
        throw new Error("VPC Destination ARN is required to proceed.");
      }
      console.log(`VPC Destination ARN: ${vpcDestinationArn}`);



      createIoTTopicKafkaRule('all_events_rule', details.mskClusterArn, vpcDestinationArn, details.IotRoleArn);


      // Create IOT rule for Lambda (Telemetry)

      createIoTTopicLambdaRule('logs_rule', details.telemetrylambdaArn, details.IotRoleArn);

    } catch (error) {
      console.log('Error creating IOT Kafka Rule', error);
      throw error;
    }



    //  Update Environment Variables For Lambdas

    try {
      // AVS-Endpoint
      await updateLambdaEnvironmentVariables({
        lambdaArn: details.avslambdaArn, envVariables:
        {
          'ATLAS_URI': mongoConnStr,
          'DB_NAME': 'GreengrassIot',
          'FAILURE_THRESHOLD': '0.5',
          'SAGEMAKER_ENDPOINT': 'fpm-endpoint'
        }
      });
      // Greengrass-ChatEndpoint
      await updateLambdaEnvironmentVariables({
        lambdaArn: details.greengrasschatlambdaArn, envVariables:

        {
          'ATLAS_VECTOR_SEARCH_INDEX_NAME': 'vector_index',
          'MODEL_ID': 'amazon.titan-text-lite-v1',
          'MONGODB_CONNECTION_STRING': mongoConnStr,
          'MONGODB_DB': 'GreengrassIot',
          'MONGODB_DB_COLLECTION': 'iot-chat',
          'EMBEDDING_FIELD': 'embedding',
        }

      });

    } catch (error) {
      console.log('Error updating lambda environment variables: ', error);
    }


  //  Setup EventBridge & Mongodb Triggers

    try {

      const eventBridgeClient = new EventBridgeClient({ region: awsRegion });
      const lambdaClient = new LambdaClient({ region: awsRegion });

      await connectAtlasToLambda(
        awsAccountId,
        awsRegion,
        eventBridgeClient,
        lambdaClient
      );

    } catch (err) {
      console.error(`Error: ${err}`);
    }

  // Create Vector Index & Import Seed Data to Mongodb & Generate Embeddings

    const client = new MongoClient(mongoConnStr, {});

    try {

      await client.connect();
      console.log("Connected to MongoDB");
      const database = client.db("GreengrassIot");


      try {

        // Create vector search Index
        const collections = await database.listCollections({ name: 'iot_chat' }).toArray();
        if (collections.length === 0) {
          console.log(`Collection iot_chat does not exist. Creating it now...`);
          await database.createCollection('iot_chat');
          console.log(`Collection iot_chat created successfully.`);
        } else {
          console.log(`Collection iot_chat already exists.`);
        }

        const iotChatCollection = database.collection("iot_chat");
        const indexSpec = {
          name: "vector_index",
          type: "vectorSearch",
          definition: {
            fields: [
              {
                numDimensions: 1536,
                path: "embedding",
                similarity: "cosine",
                type: "vector",
              },
            ],
          },
        };

        await iotChatCollection.createSearchIndex(indexSpec);

      } catch (err) {
        console.error("Error creating vector index", err);
      }



      try {

        // Import seed data to vehicle_knowledge_base_sample collection
        const inputFilePath = path.resolve("resources/data/vehicle_knowledge_base_sample.json");
        const outputFilePath = path.resolve("resources/data/processed_vehicle_knowledge_base_sample.json");

        // Check if the collection already contains documents
        const vehicleKnowledgeCollection = database.collection("vehicle_knowledge_base_sample");
        const existingDocumentCount = await vehicleKnowledgeCollection.countDocuments();

        if (existingDocumentCount > 0) {
          console.log("Data import skipped: vehicle_knowledge_base_sample collection already contains documents.");
        } else {

          // Preprocess and import data
          preprocessJsonFile(inputFilePath, outputFilePath);

          const fileData = fs.readFileSync(outputFilePath, "utf8");
          const seedData = JSON.parse(fileData);

          console.log("Inserting data into the vehicle_knowledge_base_sample collection...");
          const result = await vehicleKnowledgeCollection.insertMany(seedData);

          console.log(`Inserted ${result.insertedCount} documents into the collection.`);
        }

      } catch (err) {
        console.error("Error importing data", err);
      }

      // Importing seed data user & vehicle data

      try {
        // Import seed data to User collection
        const userFilePath = path.resolve("resources/data/User.json");
        const userCollection = database.collection("User");
        const userDocumentCount = await userCollection.countDocuments();
      
        if (userDocumentCount > 0) {
          console.log("Data import skipped: User collection already contains documents.");
        } else {
          const userData = JSON.parse(fs.readFileSync(userFilePath, "utf8"));
          console.log("Inserting data into the User collection...");
          const result = await userCollection.insertMany(userData);
          console.log(`Inserted ${result.insertedCount} documents into the User collection.`);
        }
      } catch (err) {
        console.error("Error importing data into User collection", err);
      }
      
      try {
        // Import seed data to Vehicle collection
        const vehicleFilePath = path.resolve("resources/data/Vehicle.json");
        const vehicleCollection = database.collection("Vehicle");
        const vehicleDocumentCount = await vehicleCollection.countDocuments();
      
        if (vehicleDocumentCount > 0) {
          console.log("Data import skipped: Vehicle collection already contains documents.");
        } else {
          const vehicleData = JSON.parse(fs.readFileSync(vehicleFilePath, "utf8"));
          console.log("Inserting data into the Vehicle collection...");
          const result = await vehicleCollection.insertMany(vehicleData);
          console.log(`Inserted ${result.insertedCount} documents into the Vehicle collection.`);
        }
      } catch (err) {
        console.error("Error importing data into Vehicle collection", err);
      }




      // Generate Embeddings
      try {
        const envVars = {
          AWS_SERVER_PUBLIC_KEY: awsAccessKey,
          AWS_SERVER_SECRET_KEY: awsSecretKey,
          MONGODB_CONNECTION_STRING: mongoConnStr,
          MONGODB_DB: "GreengrassIot",
          MONGODB_DB_KB_COLLECTION: "vehicle_knowledge_base_sample",
          ATLAS_VECTOR_SEARCH_INDEX_NAME: "vector_index",
          MONGODB_DB_EMBEDDING_COLLECTION: "iot_chat",
          EMBEDDING_MODEL_ID: "amazon.titan-embed-text-v1",
        };

        const iotChatCollection = database.collection("iot_chat");

        // Check if 'iot_chat' collection has more than 0 documents
        const count = await iotChatCollection.countDocuments();

        if (count > 0) {
          console.log("Skipping Python script execution as 'iot_chat' collection has documents.");
        } else {

          const filePath = "resources/embeddings-generator/generate_embeddings.py";

          await executePythonFile(filePath, envVars);
        }
      } catch (error) {
        console.error("Error Generating Embeddings:", error);
      }



    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      throw error;
    } finally {
      await client.close();
      console.log("Connection closed");
    }

  }
  catch (err) {
    console.error("Stack deployment failed:", err);
  }
}

deployStack();
