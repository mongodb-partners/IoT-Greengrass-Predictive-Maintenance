import * as path from "path";
import { execSync, spawn } from "child_process";
import readline from "readline";
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';


export function installPythonDependencies(filePath: string, dependencies: string[]): void {
  // Store the current working directory
  const originalDirectory = process.cwd();

  console.log('current directory', originalDirectory);

  // Ensure the directory exists
  if (!fs.existsSync(filePath)) {
    console.error(`Directory ${filePath} does not exist.`);
    return;
  }

  const fileDir = path.dirname(filePath);
  const venvPath = path.join(fileDir, "venv");

  // Step 1: Create a virtual environment if it doesn't already exist
  if (!fs.existsSync(venvPath)) {
    console.log("Creating virtual environment...");
    execSync(`python3 -m venv ${venvPath}`, { stdio: "inherit" });
  }

  const activateVenv = path.join(venvPath, "bin", "activate");
  const pipInstallCmd = `${path.join(venvPath, "bin", "pip")} install`;

  // Step 2: Install required dependencies inside the virtual environment
  console.log("Installing dependencies in the virtual environment...");
  execSync(
    `${pipInstallCmd} ${dependencies.join(" ")}`,
    { stdio: "inherit" }
  );

  console.log("Dependencies installed successfully.");

    // Step 3: Copy site-packages to the root directory
    const sitePackagesPath = path.join(venvPath, "lib", "python3.13", "site-packages"); // Adjust python3.X based on your environment
    if (fs.existsSync(sitePackagesPath)) {
      console.log("Copying dependencies to the root directory...");
  
      // List all files and copy them
      const files = fs.readdirSync(sitePackagesPath);
      files.forEach(file => {
        const filePath = path.join(sitePackagesPath, file);
        const destPath = path.join(fileDir, file);  // Destination in root directory
        if (fs.lstatSync(filePath).isDirectory()) {
          // Copy directory recursively
          execSync(`cp -r ${filePath} ${destPath}`, { stdio: "inherit" });
        } else {
          // Copy file
          execSync(`cp ${filePath} ${destPath}`, { stdio: "inherit" });
        }
      });
  
      console.log("Dependencies copied successfully.");
    } else {
      console.error("site-packages directory not found.");
    }
  
    // Step 4: Clean up by deleting the venv folder
    console.log("Cleaning up by deleting the virtual environment...");
    execSync(`rm -rf ${venvPath}`, { stdio: "inherit" });
  
    console.log("Virtual environment deleted successfully.");

  // Change back to the original directory
  process.chdir(originalDirectory);
}

export const executePythonFile = async (filePath: string, envVars: Record<string, string>): Promise<void> => {
  try {
    // Ensure the Python file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Python file not found: ${filePath}`);
    }

    const fileDir = path.dirname(filePath);
    const venvPath = path.join(fileDir, "venv");

    // Step 1: Create a virtual environment if it doesn't already exist
    if (!fs.existsSync(venvPath)) {
      console.log("Creating virtual environment...");
      execSync(`python3 -m venv ${venvPath}`, { stdio: "inherit" });
    }

    const activateVenv = path.join(venvPath, "bin", "activate");
    const pipInstallCmd = `${path.join(venvPath, "bin", "pip")} install`;

    // Step 2: Install required dependencies inside the virtual environment
    console.log("Installing dependencies in the virtual environment...");
    execSync(
      `${pipInstallCmd} langchain-community langchain pymongo boto3 motor`,
      { stdio: "inherit" }
    );

    // Step 3: Set environment variables
    const env = {
      ...process.env,
      ...envVars,
      PATH: `${path.join(venvPath, "bin")}:${process.env.PATH}`, // Add virtual environment's bin to PATH
    };

    // Step 4: Execute the Python script
    console.log("Executing Python script...");
    execSync(`source ${activateVenv} && python3 ${filePath}`, {
      env,
      stdio: "inherit",
    });

    console.log("Python script executed successfully!");
  } catch (error) {
    console.error("Error during execution:", error);
    throw error;
  }
};


export const preprocessJsonFile = async (filePath: string, outputFilePath: string): Promise<void> => {
  try {
    const rawData = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(rawData);

    const processedData = jsonData.map((doc: any) => {
      if (doc._id && doc._id.$oid) {
        doc._id = doc._id.$oid; // Convert $oid to plain string
      }
      return doc;
    });

    fs.writeFileSync(outputFilePath, JSON.stringify(processedData, null, 2));
    console.log(`Processed JSON data saved to ${outputFilePath}`);
  } catch (error: any) {
    console.error("Error preprocessing JSON file:", error.message);
  }
};

export const spawnProcess = async (
  command: string,
  args: string[],
  awsAccountId: string,
  awsRegion: string,
  stackName: string
) => {
  return new Promise((resolve: any, reject) => {
    const spawnedProcess = spawn(command, args, {
      shell: "/bin/zsh",
      stdio: "inherit",
      cwd: path.resolve(__dirname, ".."),
      env: {
        CDK_DEFAULT_ACCOUNT: awsAccountId,
        CDK_DEFAULT_REGION: awsRegion,
        PATH: process.env.PATH,
      },
    });

    // Handle stdout
    spawnedProcess.stdout?.on("data", (data) => {
      process.stdout.write(data.toString()); // Output stdout directly
    });

    // Handle stderr
    spawnedProcess.stderr?.on("data", (data) => {
      process.stderr.write(data.toString()); // Output stderr directly
    });

    // Wait for the deployment process to complete
    spawnedProcess.on("exit", (code) => {
      if (code === 0) {
        console.log(`Stack deployment completed successfully: ${stackName}`);
        resolve();
      } else {
        reject(new Error(`Stack deployment failed with exit code ${code}`));
      }
    });
  });
};

export const executeCommands = (commands: string[]): Promise<void> => {
  let index = 0;

  function runNextCommand(): Promise<void> {
    if (index >= commands.length) {
      console.log("All commands executed successfully.");
      return Promise.resolve();
    }

    const command = commands[index];
    console.log(`Executing command: ${command}`);

    return new Promise((resolve, reject) => {
      const spawnedProcess = spawn(command, {
        shell: true,
        stdio: "inherit",
        cwd: path.resolve(__dirname, ".."),
      });

      spawnedProcess.on("exit", (code: any) => {
        if (code !== 0) {
          console.error(`Command '${command}' failed with code ${code}`);
          reject(new Error(`Command '${command}' failed`));
        } else {
          index++;
          runNextCommand().then(resolve).catch(reject);
        }
      });
    });
  }

  return runNextCommand();
};


export const askUserForInput = (question: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};


interface PrivateLinkConfig {
  atlasProjectId: string;
  region: string;
  vpcId: string;
  subnetIds: string [];
  securityGroupId: string;
}

export const setupPrivateLink = async (config: PrivateLinkConfig): Promise<void> => {
  const { atlasProjectId, region, vpcId, subnetIds, securityGroupId } = config;



  try {
    console.log("Step 1: Creating the private endpoint service in Atlas...");
    const createServiceCommand = `atlas privateEndpoints aws create --projectId ${atlasProjectId} --region ${region}`;
    const createServiceOutput = execSync(createServiceCommand, { encoding: "utf8" });
    console.log(createServiceOutput);

    const privateEndpointId = createServiceOutput.match(/'([a-f0-9]{24})'/)?.[1];
    if (!privateEndpointId) {
      throw new Error("Failed to retrieve private endpoint ID from Atlas.");
    }
    console.log(`Private endpoint service ID: ${privateEndpointId}`);

    console.log("Step 2: Please retrieve the Atlas Endpoint Service name.");
    console.log(
      "Navigate to MongoDB Atlas > Network Access > Private Endpoints. Check if the status is 'Initializing'. Wait for it to be 'Created' and then copy the 'Atlas Endpoint Service' name."
    );
    const serviceName = await askUserForInput("Enter the Atlas Endpoint Service name: ");
    if (!serviceName) {
      throw new Error("Service name is required to proceed.");
    }
    console.log(`Service name: ${serviceName}`);

    console.log("Step 3: Creating the interface endpoint in AWS...");
    const subnetIdsArray = subnetIds.join(" ");
    const createVpcEndpointCommand = `aws ec2 create-vpc-endpoint --vpc-id ${vpcId} --region ${region} --service-name ${serviceName} --vpc-endpoint-type Interface --subnet-ids ${subnetIdsArray} --security-group-ids ${securityGroupId}`;
    const createVpcEndpointOutput = execSync(createVpcEndpointCommand, { encoding: "utf8" });
    console.log(createVpcEndpointOutput);

    const vpcEndpointId = JSON.parse(createVpcEndpointOutput).VpcEndpoint.VpcEndpointId;
    if (!vpcEndpointId) {
      throw new Error("Failed to retrieve VPC Endpoint ID from AWS.");
    }
    console.log(`VPC Endpoint ID: ${vpcEndpointId}`);

    console.log("Step 4: Updating Atlas with the VPC Endpoint ID...");
    const createInterfaceCommand = `atlas privateEndpoints aws interfaces create ${privateEndpointId} --privateEndpointId ${vpcEndpointId} --projectId ${atlasProjectId}`;
    const createInterfaceOutput = execSync(createInterfaceCommand, { encoding: "utf8" });
    console.log(createInterfaceOutput);

    console.log("Step 5: Configuring AWS security groups...");
    console.log(
      "Ensure that security groups are configured to allow traffic from resources to the interface endpoint."
    );

    console.log("Step 6: Verifying the private endpoint’s availability...");
    const verifyCommand = `atlas privateEndpoints aws interfaces describe ${vpcEndpointId} --projectId ${atlasProjectId} --endpointServiceId ${privateEndpointId}`;
    const verifyOutput = execSync(verifyCommand, { encoding: "utf8" });
    console.log(verifyOutput);


  } catch (error) {
    console.error("Error during setup:", (error as Error).message);
  }
};

const sleep = (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

interface CreateMskConnectorOptions {
  connectorName: string;
  kafkaClusterArn: string;
  pluginS3Bucket: string;
  pluginS3BucketArn: string;
  pluginS3Key: string;
  roleArn: string;
  vpcConfig: any;
  connectorConfig: string;
}

export async function createMskConnector(options: CreateMskConnectorOptions): Promise<void> {
  try {
    console.log("Retrieving bootstrap brokers from Kafka cluster...");
    // Execute the command to get the bootstrap brokers
    const getBootstrapBrokersCommand = `aws kafka get-bootstrap-brokers --cluster-arn ${options.kafkaClusterArn}`;
    const brokersOutput = execSync(getBootstrapBrokersCommand, { encoding: "utf-8" });

    // Parse the bootstrap brokers from the output
    const brokersMatch = brokersOutput.match(/"BootstrapBrokerStringSaslIam":\s*"([^"]+)"/);
    if (!brokersMatch) {
      throw new Error("Failed to retrieve bootstrap brokers.");
    }
    const bootstrapServers = brokersMatch[1]; // This will be the bootstrap server list

    console.log("Bootstrap brokers retrieved:", bootstrapServers);


    console.log("Creating custom plugin...");
    const createPluginCommand = `aws kafkaconnect create-custom-plugin \
    --name ${options.connectorName}-pluginn \
    --content-type JAR \
    --location '${JSON.stringify({
      s3Location: {
        bucketArn: options.pluginS3BucketArn,
        fileKey: options.pluginS3Key
      }
    })}'`;

    const pluginOutput = execSync(createPluginCommand, { encoding: "utf-8" });
    const pluginArnMatch = pluginOutput.match(/"customPluginArn":\s*"([^"]+)"/);
    if (!pluginArnMatch) {
      throw new Error("Failed to extract plugin ARN from response.");
    }
    const pluginArn = pluginArnMatch[1];
    console.log("Custom plugin created with ARN:", pluginArn);

    // Wait for the plugin to become active (sleep for 5 seconds)
    console.log("Waiting for the plugin to become ACTIVE...");

    console.log('Go to AWS > MSK > Plugins > Check if the new plugin is active or not');

    const pluginActivated = await askUserForInput("Plugin activated ? (y/n): ");
    if (!pluginActivated || pluginActivated.toLowerCase() !== "y") {
      throw new Error("You need check if the plugin is activated or not");
    }
   
      console.log("Proceeding with MSK connector creation...");

      console.log("Creating MSK connector...");

      // Limit subnets to 2 or 3 for MSK connector
      const limitedSubnets = options.vpcConfig.subnets.slice(0, 3);

      const createConnectorCommand = `aws kafkaconnect create-connector \
      --connector-name ${options.connectorName} \
      --kafka-connect-version "2.7.1" \
       --kafka-cluster '${JSON.stringify({
        apacheKafkaCluster: {
          bootstrapServers: bootstrapServers,
          vpc: {
            securityGroups: options.vpcConfig.securityGroups,
            subnets: limitedSubnets
          }
        }
      })}' \
      --capacity '{"provisionedCapacity":{"mcuCount":1,"workerCount":1}}' \
      --connector-configuration '${options.connectorConfig}' \
      --kafka-cluster-client-authentication '{"authenticationType":"IAM"}' \
      --kafka-cluster-encryption-in-transit '{"encryptionType":"TLS"}' \
      --plugins '[{"customPlugin":{"customPluginArn":"${pluginArn}","revision":1}}]' \
      --service-execution-role-arn ${options.roleArn}`;

      execSync(createConnectorCommand, { encoding: "utf-8" });
      console.log("MSK connector created successfully.");
    
  } catch (error) {
    console.error("Error creating MSK connector:", error);
  }
}



interface LambdaEnvUpdateOptions {
  lambdaArn: string;
  envVariables: Record<string, string>;
}

export function updateLambdaEnvironmentVariables(options: LambdaEnvUpdateOptions): void {
  try {
    console.log(`Updating environment variables for Lambda: ${options.lambdaArn}`);

    // Convert the environment variables object to AWS CLI JSON format
    const envJson = JSON.stringify({ Variables: options.envVariables });

    // Construct the AWS CLI command
    const updateCommand = `aws lambda update-function-configuration \
      --function-name ${options.lambdaArn} \
      --environment '${envJson}'`;

    // Execute the command
    const result = execSync(updateCommand, { encoding: "utf-8" });

    console.log("Lambda environment variables updated successfully:", result);
  } catch (error) {
    console.error("Error updating Lambda environment variables:", error);
  }
}



export const createIoTTopicKafkaRule = (
  ruleName: string,
  kafkaClusterArn: string,
  destinationArn: string,
  iamRoleArn: string
) => {

  try {
    console.log("Retrieving bootstrap brokers from Kafka cluster...");
    // Execute the command to get the bootstrap brokers
    const getBootstrapBrokersCommand = `aws kafka get-bootstrap-brokers --cluster-arn ${kafkaClusterArn}`;
    const brokersOutput = execSync(getBootstrapBrokersCommand, { encoding: "utf-8" });

    // Parse the bootstrap brokers from the output
    const brokersMatch = brokersOutput.match(/"BootstrapBrokerStringSaslScram":\s*"([^"]+)"/);
    if (!brokersMatch) {
      throw new Error("Failed to retrieve bootstrap brokers.");
    }
    const bootstrapServers = brokersMatch[1]; // This will be the bootstrap server list

    console.log("Bootstrap brokers retrieved:", bootstrapServers);


    const rulePayload = {
      sql: "SELECT * FROM 'test/topic'",
      actions: [
        {
          kafka: {
            destinationArn: destinationArn,
            topic: 'test-topic',
            partition: '0',
            clientProperties: {
              'bootstrap.servers': bootstrapServers,
              'security.protocol': 'SASL_SSL',
              'sasl.mechanism': 'SCRAM-SHA-512',
              'sasl.scram.username': `\${get_secret('AmazonMSK_kafka_secret', 'SecretString', 'username', '${iamRoleArn}')}`,
              'sasl.scram.password': `\${get_secret('AmazonMSK_kafka_secret', 'SecretString', 'password', '${iamRoleArn}')}`
            }
          }
        }
      ]
    };

    const rulePayloadString = JSON.stringify(rulePayload)
      .replace(/\$/g, '\\$') // Escape dollar signs
      .replace(/"/g, '\\"'); // Escape quotes for CLI

    const command = `aws iot create-topic-rule --rule-name ${ruleName} --topic-rule-payload "${rulePayloadString}"`;

    const result = execSync(command, { encoding: "utf-8" });

    console.log("IOT Rule for Kafka Created Successfully:", result);

  } catch (error) {
    console.error("Error creating IOT Rule for Kafka:", error);
  }

};


export const createVpcDestination = (
  region: string,
  subnets: string,
  securityGroups: string[],
  vpcId: string,
  roleArn: string
) => {
  try {
    // Construct the JSON string properly
    const destinationConfig = JSON.stringify({
      vpcConfiguration: {
        subnetIds: JSON.parse(subnets),
        securityGroups: securityGroups,
        vpcId: vpcId,
        roleArn: roleArn,
      },
    });

    // Construct the AWS CLI command
    const cliCommand = `aws --region ${region} iot create-topic-rule-destination --destination-configuration '${destinationConfig}'`;

    // Execute the command
    const output = execSync(cliCommand, { encoding: "utf-8" });

    console.log("VPC Destination Created:", output);
    return output;
  } catch (error) {
    console.error("Error creating VPC Destination:", error);
    return null;
  }
};


export const createIoTTopicLambdaRule = (
  ruleName: string,
  lambdaFunctionArn: string,
  iamRoleArn: string
) => {
  try {
    console.log('Creating IoT rule for Lambda...');

    const rulePayload = {
      sql: "SELECT * FROM 'greengrass/mty'", // Adjust SQL query as needed
      actions: [
        {
          lambda: {
            functionArn: lambdaFunctionArn
          }
        }
      ]
    };

    const rulePayloadString = JSON.stringify(rulePayload)
      .replace(/\$/g, '\\$') // Escape dollar signs
      .replace(/"/g, '\\"'); // Escape quotes for CLI

    const command = `aws iot create-topic-rule --rule-name ${ruleName} --topic-rule-payload "${rulePayloadString}"`;

    console.log('Running command:', command);

    // Execute the AWS CLI command to create the IoT rule
    const output = execSync(command, { encoding: 'utf-8' });

    console.log('IoT Lambda Rule created successfully:', output);

    // Extract function name from ARN
    const functionName = "LambdaTelemetry";

    // Check if permission already exists
    // try {
    //   console.log(`Checking if permission "iot-events" exists for ${functionName}...`);

    //   const getPolicyCommand = `aws lambda get-policy --function-name ${functionName}`;
    //   const policyOutput = execSync(getPolicyCommand, { encoding: 'utf-8' });

    //   if (policyOutput.includes('"iot-events"')) {
    //     console.log('Permission already exists, deleting it first...');
    //     const removePermissionCommand = `aws lambda remove-permission --function-name ${functionName} --statement-id iot-events-telemetry`;
    //     execSync(removePermissionCommand, { encoding: 'utf-8' });
    //     console.log('Existing permission removed.');
    //   }
    // } catch (policyError) {
    //   console.log('No existing permission found, proceeding to add a new one.');
    // }

    // Add new permission for IoT to invoke the Lambda function
    const statementId = `iot-events-${uuidv4()}`;
    const addPermissionCommand = `aws lambda add-permission --function-name ${functionName} \
    --statement-id ${statementId} --action "lambda:InvokeFunction" --principal iot.amazonaws.com`;

    console.log('Running command to add permission:', addPermissionCommand);

    const permissionOutput = execSync(addPermissionCommand, { encoding: 'utf-8' });

    console.log('Permission granted successfully:', permissionOutput);

  } catch (error) {
    console.error('Error creating IoT Rule for Lambda:', error);
  }
};

/**
 * Deletes the MSK Connector first, then deletes the custom plugin.
 * Uses the provided AWS account ID and region for the ARNs.
 * @param accountId The AWS Account ID.
 * @param region The AWS Region.
 * @param connectorName The name of the MSK connector.
 * @param pluginName The name of the custom plugin.
 */
export async function deleteMskConnectorAndPlugin(accountId: string, region: string, connectorName: string, pluginName: string): Promise<void> {
  try {
    console.log(`Using AWS Account ID: ${accountId}, Region: ${region}`);

    const connectorArn = `arn:aws:kafkaconnect:${region}:${accountId}:connector/${connectorName}`;
    const pluginArn = `arn:aws:kafkaconnect:${region}:${accountId}:custom-plugin/${pluginName}`;

    console.log(`Starting deletion of MSK Connector: ${connectorName}...`);

    // Execute the command to delete the connector
    execSync(`aws kafkaconnect delete-connector --connector-arn ${connectorArn}`, { encoding: "utf-8" });
    console.log(`MSK Connector ${connectorName} deleted successfully.`);

    console.log(`Starting deletion of custom plugin: ${pluginName}...`);

    // Execute the command to delete the plugin
    execSync(`aws kafkaconnect delete-custom-plugin --custom-plugin-arn ${pluginArn}`, { encoding: "utf-8" });
    console.log(`Custom plugin ${pluginName} deleted successfully.`);

  } catch (error) {
    console.error("Error deleting MSK Connector and Plugin:", error);
  }
}

export const deleteIoTTopicKafkaRule = (
  region: string,
  ruleName: string
) => {
  try {
    console.log(`Deleting IoT Topic Kafka Rule: ${ruleName} in region ${region}...`);
    
    // Command to delete the IoT Topic Rule
    const command = `aws iot delete-topic-rule --rule-name ${ruleName} --region ${region}`;

    // Execute the delete command
    const result = execSync(command, { encoding: "utf-8" });

    console.log("IoT Topic Kafka Rule Deleted Successfully:", result);
  } catch (error) {
    console.error("Error deleting IoT Topic Kafka Rule:", error);
  }
};


export const deleteVpcDestination = (
  region: string,
  destinationArn: string
) => {
  try {
    console.log(`Deleting VPC Destination: ${destinationArn} in region ${region}...`);

    // Command to delete the VPC Destination
    const command = `aws iot delete-topic-rule-destination --destination-arn ${destinationArn} --region ${region}`;

    // Execute the delete command
    const result = execSync(command, { encoding: "utf-8" });

    console.log("VPC Destination Deleted Successfully:", result);
  } catch (error) {
    console.error("Error deleting VPC Destination:", error);
  }
};


export const deleteIoTTopicLambdaRule = (
  region: string,
  ruleName: string
) => {
  try {
    console.log(`Deleting IoT Topic Lambda Rule: ${ruleName} in region ${region}...`);
    
    // Command to delete the IoT Topic Rule
    const command = `aws iot delete-topic-rule --rule-name ${ruleName} --region ${region}`;

    // Execute the delete command
    const result = execSync(command, { encoding: "utf-8" });

    console.log("IoT Topic Lambda Rule Deleted Successfully:", result);
  } catch (error) {
    console.error("Error deleting IoT Topic Lambda Rule:", error);
  }
};

export function deleteLambdaDirectoryContents(filePath: string): void {
  try {
    const directoryPath = path.dirname(filePath);

    // Check if the directory exists
    if (!fs.existsSync(directoryPath)) {
      console.error(`Directory ${directoryPath} does not exist.`);
      return;
    }

    // Read all files and subdirectories in the directory
    const filesAndDirs = fs.readdirSync(directoryPath);

    filesAndDirs.forEach((fileOrDir) => {
      const fullPath = path.join(directoryPath, fileOrDir);

      // Skip deleting 'lambda_function.py' file
      if (fileOrDir === 'lambda_function.py') {
        return;
      }

      // Check if it's a directory or a file
      if (fs.statSync(fullPath).isDirectory()) {
        // If it's a directory, recursively delete its contents
        deleteDirectoryContents(fullPath);
      } else {
        // If it's a file, delete it
        fs.unlinkSync(fullPath);
        // console.log(`Deleted file: ${fullPath}`);
      }
    });

    removeEmptyDirectories(directoryPath);

    console.log(`All contents deleted from ${directoryPath} except lambda_function.py`);

  } catch (error) {
    console.error(`Error deleting contents :`, error);
  }
}

export function deleteDirectoryContents(dirPath: string): void {
  // Read all files and subdirectories
  const items = fs.readdirSync(dirPath);

  items.forEach((item) => {
    const fullPath = path.join(dirPath, item);

    if (fs.statSync(fullPath).isDirectory()) {
      // Recursively delete directory contents
      deleteDirectoryContents(fullPath);
      // After clearing the directory, remove the directory itself
      fs.rmdirSync(fullPath);
      // console.log(`Deleted directory: ${fullPath}`);
    } else {
      // Delete file
      fs.unlinkSync(fullPath);
      // console.log(`Deleted file: ${fullPath}`);
    }
  });
}


function removeEmptyDirectories(directoryPath: string): void {
  // Get all the directories in the directoryPath
  const dirs = fs.readdirSync(directoryPath);
  
  dirs.forEach((dir) => {
    const fullDirPath = path.join(directoryPath, dir);
    
    if (fs.statSync(fullDirPath).isDirectory()) {
      try {
        // Try removing the directory if it's empty
        fs.rmdirSync(fullDirPath);
        // console.log(`Deleted empty directory: ${fullDirPath}`);
      } catch (error) {
        // Directory is not empty or failed to delete
        console.log(`Could not delete directory ${fullDirPath} or it is not empty.`);
      }
    }
  });
}