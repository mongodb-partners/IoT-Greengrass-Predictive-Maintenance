import {
  SageMakerClient,
  CreateNotebookInstanceCommand,
  CreateNotebookInstanceLifecycleConfigCommand,
  ProcessingInstanceType,
  DescribeNotebookInstanceLifecycleConfigCommand,
} from "@aws-sdk/client-sagemaker";

import {
  EventBridgeClient,
  CreateEventBusCommand,
  PutRuleCommand,
  PutTargetsCommand,
} from "@aws-sdk/client-eventbridge";
import { LambdaClient, AddPermissionCommand } from "@aws-sdk/client-lambda";





export const createLifecycleConfig = async (
  sagemakerClient: SageMakerClient,
  lifecycleConfigScript: string,
  lifecycleConfigName: string
) => {
  const command = new CreateNotebookInstanceLifecycleConfigCommand({
    NotebookInstanceLifecycleConfigName: lifecycleConfigName,
    OnCreate: [
      {
        Content: Buffer.from(lifecycleConfigScript).toString("base64"),
      },
    ],
  });

  try {
    const result = await sagemakerClient.send(command);
    console.log("Lifecycle Configuration Created:", result);
    return result.NotebookInstanceLifecycleConfigArn;
  } catch (error: any) {
    if (
      error.name === "ResourceInUseException" || // Check if the error indicates the resource already exists
      error.message.includes("already exists")
    ) {
      console.warn(
        `Lifecycle Configuration '${lifecycleConfigName}' already exists. Fetching details...`
      );

      // Fetch existing lifecycle configuration details
      const describeCommand = new DescribeNotebookInstanceLifecycleConfigCommand({
        NotebookInstanceLifecycleConfigName: lifecycleConfigName,
      });

      try {
        const existingConfig = await sagemakerClient.send(describeCommand);
        console.log("Existing Lifecycle Configuration:", existingConfig);
        return existingConfig.NotebookInstanceLifecycleConfigArn;
      } catch (describeError) {
        console.error(
          "Error fetching existing lifecycle configuration:",
          describeError
        );
        throw describeError;
      }
    }

    // If the error is not related to an existing resource, rethrow it
    console.error("Error creating lifecycle configuration:", error);
    throw error;
  }
};

export const createNotebookInstance = async (
  accountId: string,
  sagemakerClient: SageMakerClient,
  notebookInstanceName: string,
  lifecycleConfigName: string
) => {
  const command = new CreateNotebookInstanceCommand({
    NotebookInstanceName: notebookInstanceName,
    InstanceType: ProcessingInstanceType.ML_T3_MEDIUM, // 'ml.t3.medium',
    RoleArn:
      "arn:aws:iam::" + accountId + ":role/GreengrassIotSageMakerExecutionRole",
    VolumeSizeInGB: 30,
    LifecycleConfigName: lifecycleConfigName,
  });

  try {
    const result = await sagemakerClient.send(command);
    console.log("Notebook Instance Created:", result);
  } catch (error) {
    console.error("Error creating notebook instance:", error);
    throw error;
  }
};

// Function to create EventBus
export const createEventBus = async (
  client: EventBridgeClient,
  eventBusName: string
): Promise<void> => {
  try {
    const command = new CreateEventBusCommand({
      Name: eventBusName,
      EventSourceName: eventBusName,
    });
    const response = await client.send(command);
    console.log("EventBus created successfully:", response);
  } catch (error) {
    console.error("Error creating EventBus:", error);
    throw error;
  }
};

// Function to put Rule
export const putRule = async (
  client: EventBridgeClient,
  ruleName: string,
  eventPattern: string,
  eventBusName: string
): Promise<void> => {
  try {
    const command = new PutRuleCommand({
      Name: ruleName,
      EventPattern: eventPattern,
      EventBusName: eventBusName,
    });
    const response = await client.send(command);
    console.log("Rule created successfully:", response);
  } catch (error) {
    console.error("Error creating Rule:", error);
    throw error;
  }
};

// Function to put Targets
export const putTargets = async (
  client: EventBridgeClient,
  ruleName: string,
  lambdaArns: string[],
  eventBusName: string
): Promise<void> => {
  try {
    const targets = lambdaArns.map((arn, index) => ({
      Id: `${index + 1}`,
      Arn: arn,
    }));

    const command = new PutTargetsCommand({
      Rule: ruleName,
      Targets: targets,
      EventBusName: eventBusName,
    });

    const response = await client.send(command);
    console.log("Targets added successfully:", response);
  } catch (error) {
    console.error("Error adding Targets:", error);
    throw error;
  }
};


// Function to add Lambda Permission
export const addPermission = async (
  client: LambdaClient,
  functionName: string,
  principal: string,
  statementId: string,
  action: string,
  sourceArn: string
): Promise<void> => {
  try {
    const command = new AddPermissionCommand({
      FunctionName: functionName,
      Principal: principal,
      StatementId: statementId,
      Action: action,
      SourceArn: sourceArn,
    });
    const response = await client.send(command);
    console.log("Permission added successfully:", response);
  } catch (error) {
    console.error("Error adding Permission:", error);
    throw error;
  }
};




const generateSagemakerLifecycleScript = (solution: string, awsAccountId: string, awsRegion: string) => {
  return `
#!/bin/bash
set -e
# Perform following actions as ec2-user.

sudo -u ec2-user -i <<EOF
cd /home/ec2-user/SageMaker

# Copy source files.

aws s3 cp s3://${solution}/sagemaker/ . --recursive
# Set useful solution specific variables via config file.

echo -e "\n" >> config/config.yaml
echo "# AWS and solution specific configurations" >> config/config.yaml
echo "AWS_ACCOUNT_ID: ${awsAccountId}" >> config/config.yaml
echo "AWS_REGION: ${awsRegion}" >> config/config.yaml
echo "S3_BUCKET: ${solution}" >> config/config.yaml
echo "SOLUTION_PREFIX: ${solution}" >> config/config.yaml

which conda

conda create -n myenv python=3.6 -y

source /home/ec2-user/anaconda3/etc/profile.d/conda.sh
conda activate myenv

# Install Jupyter and other dependencies
pip install jupyter pandas boto3 matplotlib torch==1.8.0 torchvision==0.9.0 torchaudio==0.8.0 pyyaml sagemaker==2.44.0 scipy==1.5.4 scikit-learn

# Install dependencies from requirements.txt if it exists
if [ -f requirements.txt ]; then
    echo "Installing dependencies from requirements.txt"
    pip install -r requirements.txt
else
    echo "requirements.txt not found, skipping installation of dependencies"
fi

# Install dependencies from the second requirements.txt inside dl_utils
if [ -f source/dl_utils/requirements.txt ]; then
    echo "Installing dependencies from sagemaker/source/dl_utils/requirements.txt"
    pip install -r source/dl_utils/requirements.txt
else
    echo "source/dl_utils/requirements.txt not found, skipping installation"
fi

jupyter nbconvert --to python 1_introduction.ipynb --output introduction.py
jupyter nbconvert --to python 2_data_preparation.ipynb --output data_preparation.py
jupyter nbconvert --to python 3_data_visualization.ipynb --output data_visualization.py
jupyter nbconvert --to python 4_model_training.ipynb --output model_training.py
jupyter nbconvert --to python 5_results_analysis.ipynb --output results_analysis.py

python introduction.py
python data_preparation.py
python data_visualization.py
python model_training.py
python results_analysis.py

conda deactivate

EOF
`;
}

export const setupSagemaker = async (solution: string, awsAccountId: string, awsRegion: string, sagemakerClient: any, lifecycleConfigName: string, notebookInstanceName: string) => {


  // Generate Lifecycle script
  const lifecycleConfigScript = generateSagemakerLifecycleScript(solution, awsAccountId, awsRegion);

  // Create Lifecycle Configuration & Notebook Instance
  const lifecycleConfigArn = await createLifecycleConfig(
    sagemakerClient,
    lifecycleConfigScript,
    lifecycleConfigName
  );
  if (lifecycleConfigArn) {
    await createNotebookInstance(
      awsAccountId,
      sagemakerClient,
      notebookInstanceName,
      lifecycleConfigName
    );
  }

}