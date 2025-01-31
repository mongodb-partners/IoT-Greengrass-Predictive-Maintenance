import * as fs from "fs";
import { input } from "@inquirer/prompts";
import { addPermission, createEventBus, putRule, putTargets } from "./aws";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";



export const connectAtlasToLambda = async (
  awsAccountId: string,
  awsRegion: string,
  eventBridgeClient: EventBridgeClient,
  lambdaClient: LambdaClient
) => {
  const filePath = "outputs.json";
  const data = fs.readFileSync(filePath, "utf8");

  // Parse the JSON data
  const jsonData = JSON.parse(data);
  const lambdaDetails = jsonData.FirstStepStack;

  if (lambdaDetails) {
    const mdbS3Lambda = lambdaDetails.mdbS3lambdaArn;
    const subscriptionLambdaArn = lambdaDetails.subscriptionLambdaArn;


    const triggerId = await input({
      message: "Please provide the Mongodb Trigger ID For App Sync Lambdas",
    });

    const eventPattern = JSON.stringify({
      source: [{ prefix: "aws.partner/mongodb.com" }],
    });

    const eventBusName = `aws.partner/mongodb.com/stitch.trigger/${triggerId}`;
    const ruleName = "atlas-to-lambda";
    const sourceArn = `arn:aws:events:${awsRegion}:${awsAccountId}:rule/aws.partner/mongodb.com/stitch.trigger/${triggerId}/${ruleName}`;

    await createEventBus(eventBridgeClient, eventBusName);
    await putRule(eventBridgeClient, ruleName, eventPattern, eventBusName);
    await putTargets(eventBridgeClient, ruleName, [subscriptionLambdaArn], eventBusName);

    await addPermission(
      lambdaClient,
      subscriptionLambdaArn,
      "events.amazonaws.com",
      "AllowEventBridgeInvoke_2",
      "lambda:InvokeFunction",
      sourceArn
    );



    const mdbS3triggerId = await input({
      message: "Please provide the Mongodb Trigger ID For mdb-s3 scheduled trigger",
    });

    const mdbS3eventPattern = JSON.stringify({
      source: [{ prefix: "aws.partner/mongodb.com" }],
    });

    const mdbS3eventBusName = `aws.partner/mongodb.com/stitch.trigger/${mdbS3triggerId}`;
    const mdbS3ruleName = "atlas-to-lambda";
    const mdbS3sourceArn = `arn:aws:events:${awsRegion}:${awsAccountId}:rule/aws.partner/mongodb.com/stitch.trigger/${mdbS3triggerId}/${mdbS3ruleName}`;

    await createEventBus(eventBridgeClient, mdbS3eventBusName);
    await putRule(eventBridgeClient, ruleName, mdbS3eventPattern, mdbS3eventBusName);
    await putTargets(eventBridgeClient, mdbS3ruleName, [mdbS3Lambda], mdbS3eventBusName);

    await addPermission(
      lambdaClient,
      mdbS3Lambda,
      "events.amazonaws.com",
      "AllowEventBridgeInvoke_2",
      "lambda:InvokeFunction",
      mdbS3sourceArn
    );



  } else {
    throw new Error("Lambda details not found in the JSON.");
  }
};

