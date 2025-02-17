import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as mongodbatlas from 'awscdk-resources-mongodbatlas';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as msk from 'aws-cdk-lib/aws-msk';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as kms from 'aws-cdk-lib/aws-kms';
import { AccountRecovery, CfnIdentityPool, UserPool, UserPoolClient, VerificationEmailStyle } from 'aws-cdk-lib/aws-cognito';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import path from 'path';

const projectName = "GreengrassIot";



interface FirstStepStackProps {
  readonly orgId: string;
  readonly profile: string;
  readonly clusterName: string;
  readonly region: string;
  readonly ip: string;
  readonly dbUsername: string;
  readonly dbPassword: string;
  readonly awsRegion: string;
  readonly sagemakerModelEndpoint: string;
  readonly atlasOrgPublicKey: string;
  readonly atlasOrgPrivateKey: string;
  readonly solution: string;
}

export class FirstStepStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const setupProps = this.getContextProps();

    const bucketName = setupProps.solution;

    // 1. Setup secrets manager (For Bootstrap)

    const secret = new secretsmanager.Secret(this, 'MongoDBCredentials', {
      secretName: `cfn/atlas/profile/${setupProps.profile}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          PublicKey: setupProps.atlasOrgPublicKey,
          PrivateKey: setupProps.atlasOrgPrivateKey,
        }),
        generateStringKey: 'SecretString',
        excludePunctuation: true,
        includeSpace: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });


    // MongoDb + AppSync + Cognito Setup

    // 2. MongoDB Atlas Cluster
    const atlasBasic = new mongodbatlas.AtlasBasic(this, 'AtlasBasic', {
      clusterProps: {
        name: setupProps.clusterName,
        replicationSpecs: [
          {
            numShards: 1,
            advancedRegionConfigs: [
              {
                analyticsSpecs: {
                  ebsVolumeType: "STANDARD",
                  instanceSize: "M10",
                  nodeCount: 1
                },
                electableSpecs: {
                  ebsVolumeType: "STANDARD",
                  instanceSize: "M10",
                  nodeCount: 3
                },
                priority: 7,
                regionName: setupProps.region,
              }]
          }]
      },
      projectProps: {
        name: 'mongodb-appsync-project',
        orgId: setupProps.orgId,
      },
      dbUserProps: {
        username: setupProps.dbUsername,
        password: setupProps.dbPassword
      },
      ipAccessListProps: {
        accessList: [
          { ipAddress: setupProps.ip, comment: 'My first IP address' }
        ]
      },
      profile: setupProps.profile,
    });



    atlasBasic.node.addDependency(secret);

    const clusterLink = atlasBasic.mCluster.connectionStrings.standardSrv as string;

    // Output the MongoDB connection string
    new cdk.CfnOutput(this, 'MongoDBConnectionString', {
      value: atlasBasic.mCluster.connectionStrings?.standardSrv ?? ''
    });

    new cdk.CfnOutput(this, 'ConnectionString', {
      value: atlasBasic.mCluster.connectionStrings?.standardSrv ?? ''
    });

    new cdk.CfnOutput(this, 'AtlasProjectId', {
      value: atlasBasic.mProject.attrId
    });


    new cdk.CfnOutput(this, 'DbUsername', {
      value: setupProps.dbUsername
    });

    new cdk.CfnOutput(this, 'DbPassword', {
      value: setupProps.dbPassword
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: setupProps.clusterName
    });


    new cdk.CfnOutput(this, 'DbName', {
      value: "GreengrassIot"
    });


    // create the user pool
    const userPool = new UserPool(this, 'UserDemoPool', {
      selfSignUpEnabled: true,
      accountRecovery: AccountRecovery.PHONE_AND_EMAIL,
      userVerification: {
        emailStyle: VerificationEmailStyle.CODE,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
    })

    // create the user pool client for the frontend
    const userPoolClient = new UserPoolClient(this, 'UserListPoolClient', {
      userPool,
    })

    // create the identity pool
    const identityPool = new CfnIdentityPool(this, 'IdentityDemoPool', {
      identityPoolName: 'identityDemoForUserData',
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });


    // Create the default authenticated role
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: { 'cognito-identity.amazonaws.com:aud': identityPool.ref },
          'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'authenticated' },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Attach the policy to the authenticated role
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-identity:GetCredentialsForIdentity'],
        resources: ['*'],
      })
    );

    // Attach the authenticated role to the Identity Pool
    new cdk.aws_cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });




    // Create the Lambda execution role
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });


    // Lambda function for app sync data source
    const lambdaDataSource = new lambda.Function(this, 'LambdaDataSource', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../resources/lambdas/app-sync-lambda/lambda-data-source'), {}),
      functionName: 'LambdaDataSource',
      environment: {
        ATLAS_CONNECTION_STRING: clusterLink,
        DB_USERNAME: setupProps.dbUsername,
        DB_PASSWORD: setupProps.dbPassword,
        CLUSTER_NAME: setupProps.clusterName,
        DB_NAME: 'GreengrassIot'
      },
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30)
    });




    // Makes a GraphQL API construct
    const api = new appsync.GraphqlApi(this, 'mongodb-appsync', {
      name: 'mongodb-appsync',
      schema: appsync.SchemaFile.fromAsset(path.join(__dirname, '../schema/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.IAM,
          }
        ],
      },
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      xrayEnabled: true,
    });

    const appSyncApiArn = `arn:aws:appsync:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:apis/${api.apiId}`;

    lambdaDataSource.addPermission('AllowAppSyncInvoke', {
      action: 'lambda:InvokeFunction',
      principal: new iam.ServicePrincipal('appsync.amazonaws.com'),
      sourceArn: appSyncApiArn,
    });


    const dataSourceLambda = api.addLambdaDataSource("lambdaDataSource", lambdaDataSource);

    dataSourceLambda.createResolver('login', {
      typeName: "Mutation",
      fieldName: "login",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation": "Invoke",
          "payload": {
            "field": "login",
            "arguments":  $utils.toJson($context.arguments)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($context.result)
      `)
    });

    dataSourceLambda.createResolver('updateJob', {
      typeName: "Mutation",
      fieldName: "updateJob",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation": "Invoke",
          "payload": {
            "field": "updateJob",
            "arguments":  $utils.toJson($context.arguments)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($context.result)
      `)
    });
    dataSourceLambda.createResolver('getUser', {
      typeName: "Query",
      fieldName: "getUser",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation": "Invoke",
          "payload": {
            "field": "getUser",
            "arguments":  $utils.toJson($context.arguments)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($context.result)
      `)
    });
    dataSourceLambda.createResolver('getJobs', {
      typeName: "Query",
      fieldName: "getJobs",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation": "Invoke",
          "payload": {
            "field": "getJobs",
            "arguments":  $utils.toJson($context.arguments)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($context.result)
      `)
    });
    dataSourceLambda.createResolver('getJobsOfUser', {
      typeName: "Query",
      fieldName: "getJobsOfUser",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation": "Invoke",
          "payload": {
            "field": "getJobsOfUser",
            "arguments":  $utils.toJson($context.arguments)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($context.result)
      `)
    });
    dataSourceLambda.createResolver('getUsers', {
      typeName: "Query",
      fieldName: "getUsers",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation": "Invoke",
          "payload": {
            "field": "getUsers",
            "arguments":  $utils.toJson($context.arguments)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($context.result)
      `)
    });
    dataSourceLambda.createResolver('getVehicles', {
      typeName: "Query",
      fieldName: "getVehicles",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version" : "2017-02-28",
          "operation": "Invoke",
          "payload": {
            "field": "getVehicles",
            "arguments":  $utils.toJson($context.arguments)
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($context.result)
      `)
    });



    // Prints out URL
    new cdk.CfnOutput(this, "GraphQLAPIURL", {
      value: api.graphqlUrl
    });

    // Prints out the AppSync GraphQL API key to the terminal
    new cdk.CfnOutput(this, "GraphQLAPIKey", {
      value: api.apiKey || ''
    });

    // Prints out the stack region to the terminal
    new cdk.CfnOutput(this, "Stack Region", {
      value: this.region
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    })

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    })

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
    })


    // Lambda function for App Sync Subscription notifier
    const lambdaSubscriptionNotifier = new lambda.Function(this, 'LambdaSubscriptionNotifier', {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../resources/lambdas/app-sync-lambda/lambda_subscription_notifier'), {}),
      functionName: 'LambdaSubscriptionNotifier',
      environment: {
        endpoint: api.graphqlUrl,
        apiKey: api.apiKey || '',
        region: setupProps.region
      },
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30)
    });



    // Grant EventBridge full access to lambda subscription notifier
    lambdaSubscriptionNotifier.addToRolePolicy(new iam.PolicyStatement({
      actions: ['events:PutEvents'],
      resources: ['*']
    }));

    new cdk.CfnOutput(this, 'subscriptionLambdaArn', {
      value: lambdaSubscriptionNotifier.functionArn
    })

    new cdk.CfnOutput(this, 'subscriptionLambdaName', {
      value: lambdaSubscriptionNotifier.functionName
    })




    // IOT Core to MongoDb


    // Use default VPC and subnets if not provided in config
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true
    });

    const subnetIds = ec2.Vpc.fromLookup(this, 'DefaultSubnets', {
      isDefault: true
    }).publicSubnets.map(subnet => subnet.subnetId);

   

    // Security Group for MSK
    const mskSecurityGroup = new ec2.SecurityGroup(this, 'MskSecurityGroup', {
      vpc: vpc,
      allowAllOutbound: true,
    });

    mskSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic(), 'Allow all traffic');


    // Output the VPC ID
    new cdk.CfnOutput(this, 'vpcId', {
      value: vpc.vpcId,
      description: 'The ID of the default VPC',
      exportName: 'DefaultVpcId',
    });


    // Output the subnet IDs
    new cdk.CfnOutput(this, 'VpcSubnetIds', {
      value: JSON.stringify(subnetIds),
      description: 'The IDs of the public subnets in the default VPC',
      exportName: 'DefaultPublicSubnetIds',
    });



    // Output the Security Group ID
    new cdk.CfnOutput(this, 'MskSecurityGroupId', {
      value: mskSecurityGroup.securityGroupId,
      description: 'The ID of the MSK Security Group',
      exportName: 'MskSecurityGroupId',
    });



    // IAM role for IoT Core
    const iotRole = new iam.Role(this, 'IotToMskRole', {
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
    });

    new cdk.CfnOutput(this, 'IotRoleArn', {
      value: iotRole.roleArn,
      description: 'The ARN of the IoT to MSK Role',
      exportName: 'IotToMskRoleArn',
    });

    iotRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ['*'],
        actions: [
          'kafka:DescribeCluster',
          'kafka:GetBootstrapBrokers',
          'ec2:CreateNetworkInterface',
          'ec2:DescribeNetworkInterfaces',
          'ec2:CreateNetworkInterfacePermission',
          'ec2:DeleteNetworkInterface',
          'ec2:DescribeSubnets',
          'ec2:DescribeVpcs',
          'ec2:DescribeVpcAttribute',
          'ec2:DescribeSecurityGroups',
        ],
      })
    );

    // Create a new KMS key for the Kafka secret
    const kmsKey = new kms.Key(this, 'KafkaSecretKmsKey', {
      description: 'KMS key for Kafka Secret',
      enableKeyRotation: true, // Enable automatic key rotation
    });

    // Create a secret in AWS Secrets Manager for Kafka credentials, using the new KMS key
    const kafkaSecret = new secretsmanager.Secret(this, 'KafkaSecret', {
      secretName: 'AmazonMSK_kafka_secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'kafka-user',
        }),
        generateStringKey: 'password',
        excludeCharacters: '{}[]()"`/\\',
      },
      encryptionKey: kmsKey, // Specify the KMS key for encryption
    });



    // Grant secret access to the IoT Rule role
    kafkaSecret.grantRead(iotRole);



    // Create an MSK cluster
    const mskCluster = new msk.CfnCluster(this, 'MskCluster', {
      clusterName: 'IoTToMskCluster',
      kafkaVersion: '3.2.0',
      numberOfBrokerNodes: 4,
      brokerNodeGroupInfo: {
        instanceType: 'kafka.t3.small',
        clientSubnets: subnetIds.slice(0, 2),
        securityGroups: [mskSecurityGroup.securityGroupId],
      },
      clientAuthentication: {
        sasl: {
          iam: {
            enabled: true,
          },
          scram: {
            enabled: true // Proper ScramProperty format
          },
       
        }
      }
    });

    new cdk.CfnOutput(this, 'mskClusterArn', {
      value: mskCluster.ref as string,
      description: 'The Arn for MSK',
      exportName: 'MskClusterArn',
    });


    // Role for Sink-Msk-Connector

    // Create the IAM Role
    const sinkConnectorRole = new iam.Role(this, 'SinkConnectorRole', {
      roleName: 'sink-connector-role',
      assumedBy: new iam.ServicePrincipal('kafkaconnect.amazonaws.com'), // Trust relationship
    });

    // Define the sink-network-policy
    const sinkNetworkPolicy = new iam.Policy(this, 'SinkNetworkPolicy', {
      policyName: 'sink-network-policy',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ec2:CreateNetworkInterface'],
          resources: ['arn:aws:ec2:*:*:network-interface/*'],
          conditions: {
            'StringEquals': { 'aws:RequestTag/AmazonMSKConnectManaged': 'true' },
            'ForAllValues:StringEquals': { 'aws:TagKeys': 'AmazonMSKConnectManaged' },
          },
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ec2:CreateNetworkInterface'],
          resources: [
            'arn:aws:ec2:*:*:subnet/*',
            'arn:aws:ec2:*:*:security-group/*',
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ec2:CreateTags'],
          resources: ['arn:aws:ec2:*:*:network-interface/*'],
          conditions: {
            'StringEquals': { 'ec2:CreateAction': 'CreateNetworkInterface' },
          },
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ec2:DescribeNetworkInterfaces',
            'ec2:CreateNetworkInterfacePermission',
            'ec2:AttachNetworkInterface',
            'ec2:DetachNetworkInterface',
            'ec2:DeleteNetworkInterface',
          ],
          resources: ['arn:aws:ec2:*:*:network-interface/*'],
          conditions: {
            'StringEquals': { 'ec2:ResourceTag/AmazonMSKConnectManaged': 'true' },
          },
        }),
      ],
    });

    // Define the sink-cluster-policy
    const sinkClusterPolicy = new iam.Policy(this, 'SinkClusterPolicy', {
      policyName: 'sink-cluster-policy',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka-cluster:Connect',
            'kafka-cluster:DescribeCluster',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka-cluster:ReadData',
            'kafka-cluster:DescribeTopic',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka-cluster:WriteData',
            'kafka-cluster:DescribeTopic',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka-cluster:CreateTopic',
            'kafka-cluster:WriteData',
            'kafka-cluster:ReadData',
            'kafka-cluster:DescribeTopic',
          ],
          resources: ['*'],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'kafka-cluster:AlterGroup',
            'kafka-cluster:DescribeGroup',
          ],
          resources: ['*'],
        }),
      ],
    });

    // Attach policies to the role
    sinkConnectorRole.attachInlinePolicy(sinkNetworkPolicy);
    sinkConnectorRole.attachInlinePolicy(sinkClusterPolicy);

    // Output Role ARN
    new cdk.CfnOutput(this, 'SinkConnectorRoleArn', {
      value: sinkConnectorRole.roleArn,
      description: 'ARN of the Sink Connector Role',
    });


    // Output the MSK cluster name
    new cdk.CfnOutput(this, 'MskClusterName', {
      value: mskCluster.clusterName,
      description: 'MSK Cluster Name',
    });

    new cdk.CfnOutput(this, 'KafkaSecretArn', {
      value: kafkaSecret.secretArn,
      description: 'Kafka Secret ARN',
    });

    // Output a command to retrieve bootstrap servers
    new cdk.CfnOutput(this, 'GetBootstrapServersCommand', {
      value: `aws kafka get-bootstrap-brokers --cluster-name ${mskCluster.clusterName}`,
      description: 'Command to get bootstrap servers after deployment',
    });


    // Setup Mongodb Source Connector 

    // Create bucket for connector

    const connectorBucket = new s3.Bucket(this, `${projectName}connectorbucket`, {
      bucketName: `iot-greengrass-connector-bucket`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });



    new cdk.CfnOutput(this, 'ConnectorBucketArn', {
      value: connectorBucket.bucketArn,
      description: 'ARN of the IoT Greengrass connector bucket',
    });



    // Device Telemetry (Event Bridge + Lambda Mongodb Ingestion)

    // Lambda function for writing telemetry data to mongo
    const LambdaTelemetry = new lambda.Function(this, 'LambdaTelemetry', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../resources/lambdas/telemetry-lambda'), {}),
      functionName: 'LambdaTelemetry',
      environment: {
        ATLAS_CONNECTION_STRING: clusterLink,
        DB_USERNAME: setupProps.dbUsername,
        DB_PASSWORD: setupProps.dbPassword,
        CLUSTER_NAME: setupProps.clusterName,
        DB_NAME: 'GreengrassIot'
      },
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30)
    });



    new cdk.CfnOutput(this, 'telemetrylambdaArn', {
      value: LambdaTelemetry.functionArn
    })



    // Sagemaker - Part

    // const defaultSecurityGroup = selection.

    // Create IAM role for SageMaker execution
    const executionRole = new iam.Role(this, 'SageMakerExecutionRole', {
      assumedBy: new iam.ServicePrincipal('sagemaker.amazonaws.com'),
      roleName: `${projectName}SageMakerExecutionRole`, // Replace with your desired role name
      description: 'IAM role for SageMaker to execute tasks',
    });

    // Attach policies for SageMaker permissions
    executionRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "sagemaker:*",
        "sagemaker-geospatial:*",
        "s3:*",
      ],
      resources: ['*'],
    }));

    executionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerFullAccess'));
    executionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerCanvasFullAccess'));
    executionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerCanvasDataPrepFullAccess'));
    executionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSageMakerCanvasAIServicesAccess'));

    // Allow IAM PassRole for specific role
    executionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [executionRole.roleArn],
    }));

    // SageMaker Domain
    const sagemakerDomain = new sagemaker.CfnDomain(this, 'SageMakerDomain', {
      domainName: `${projectName}Domain`,
      vpcId: vpc.vpcId,
      subnetIds: subnetIds,
      appNetworkAccessType: 'PublicInternetOnly',
      authMode: 'IAM',
      defaultUserSettings: {
        executionRole: executionRole.roleArn,
        studioWebPortal: "ENABLED",
        defaultLandingUri: 'studio::'
      },
      defaultSpaceSettings: {
        executionRole: executionRole.roleArn
      }
    });

    // Bucket for sagemaker

    const sagemakerbucket = new s3.Bucket(this, `${projectName}sagemakerdemo`, {
      bucketName: bucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    sagemakerbucket.node.addDependency(sagemakerDomain);


    // Sagemaker deployment

    const sagemakerObject = new s3Deploy.BucketDeployment(this, 'DeploySagemaker', {
      sources: [s3Deploy.Source.asset('resources/sagemaker/')],
      destinationBucket: sagemakerbucket,
      destinationKeyPrefix: 'sagemaker',
    });

    sagemakerObject.node.addDependency(sagemakerbucket);

    // bucket for mdb-s3

    const mdbS3bucket = new s3.Bucket(this, `${projectName}mdbs3demo`, {
      bucketName: 'mdb-scheduled-s3-bucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });



    // mdb-s3

    const mdbS3lambdaFn = new lambda.Function(this, `${projectName}mdbS3`, {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('resources/lambdas/mdb-s3'),
      memorySize: 1024,
      environment: {
        ATLAS_CONNECTION_STRING: clusterLink,
        DB_USERNAME: setupProps.dbUsername,
        DB_PASSWORD: setupProps.dbPassword,
        CLUSTER_NAME: setupProps.clusterName,
        DB_NAME: 'GreengrassIot',
        S3_BUCKET: 'mdb-scheduled-s3-bucket'
      },
      role: lambdaExecutionRole,
      ephemeralStorageSize: cdk.Size.mebibytes(2048),
      timeout: cdk.Duration.minutes(5)
    });

    // // Optionally, add permissions (e.g., to log to CloudWatch)
    mdbS3lambdaFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['logs:*', 's3:*', 'bedrock:*', 'sagemaker:*'],
      resources: ['*'],
    }));

    new cdk.CfnOutput(this, 'mdbS3lambdaArn', {
      value: mdbS3lambdaFn.functionArn
    })

    new cdk.CfnOutput(this, 'mdbS3lambdaName', {
      value: mdbS3lambdaFn.functionName
    })

    // avs-endpoint lambda

    const avsEndpointlambdaFn = new lambda.Function(this, `${projectName}avsEndpoint`, {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('resources/lambdas/avs-endpoint'),
      memorySize: 1024,
      ephemeralStorageSize: cdk.Size.mebibytes(2048),
      timeout: cdk.Duration.minutes(5)
    });

    // // Optionally, add permissions (e.g., to log to CloudWatch)
    avsEndpointlambdaFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['logs:*', 's3:*', 'bedrock:*', 'sagemaker:*'],
      resources: ['*'],
    }));

    new cdk.CfnOutput(this, 'avslambdaArn', {
      value: avsEndpointlambdaFn.functionArn
    })

    new cdk.CfnOutput(this, 'avslambdaName', {
      value: avsEndpointlambdaFn.functionName
    })


    // bucket trigger

    // Add S3 event notification for object PUT to trigger Lambda function
    mdbS3bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(avsEndpointlambdaFn)
    );

    // Ensure the bucket's event source mapping is added to the Lambda function permissions
    avsEndpointlambdaFn.addPermission(`${projectName}S3TriggerPermission`, {
      principal: new iam.ServicePrincipal('s3.amazonaws.com'),
      sourceArn: mdbS3bucket.bucketArn,
    });


    // Create a user profile for the SageMaker domain
    const userProfile = new sagemaker.CfnUserProfile(this, 'SageMakerUserProfile', {
      domainId: sagemakerDomain.attrDomainId,
      userProfileName: `${projectName}UserProfile`,
      userSettings: {
        executionRole: executionRole.roleArn,
        studioWebPortal: "ENABLED",
        defaultLandingUri: 'studio::',
      },
    });

    // Output the SageMaker Studio user profile name
    new cdk.CfnOutput(this, 'SageMakerUserProfileName', {
      value: userProfile.userProfileName,
    });






    // Chat Backend

    // Lambda Function Creation (greengrass_chatendpoint)

    const greengrassChatEndpointlambdaFn = new lambda.Function(this, `${projectName}chatendpoint`, {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('resources/lambdas/greengrass-chatendpoint'),
      memorySize: 1024,
      ephemeralStorageSize: cdk.Size.mebibytes(2048),
      timeout: cdk.Duration.minutes(5)
    });

    // // Optionally, add permissions (e.g., to log to CloudWatch)
    greengrassChatEndpointlambdaFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['logs:*', 's3:*', 'bedrock:*', 'sagemaker:*'],
      resources: ['*'],
    }));

    // Enable Lambda Function URL
    const greengrassChatEndpointUrl = greengrassChatEndpointlambdaFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // Adjust authentication as needed
    });

    // Output Lambda Function URL
    new cdk.CfnOutput(this, 'greengrassChatEndpointUrl', {
      value: greengrassChatEndpointUrl.url,
    });

    new cdk.CfnOutput(this, 'greengrasschatlambdaArn', {
      value: greengrassChatEndpointlambdaFn.functionArn
    })

    new cdk.CfnOutput(this, 'greengrasschatlambdaName', {
      value: greengrassChatEndpointlambdaFn.functionName
    })



  }
  private getContextProps(): FirstStepStackProps {
    const orgId = this.node.tryGetContext('orgId');

    if (!orgId) {
      throw new Error("No context value specified for orgId. Please specify via the cdk context.")
    }

    const dbUsername = this.node.tryGetContext('dbUsername') ?? 'demo-user';
    const dbPassword = this.node.tryGetContext('dbPassword') ?? 'kjshdjkashdjasd1a27';
    const profile = this.node.tryGetContext('profile') ?? 'default';
    const clusterName = this.node.tryGetContext('clusterName') ?? `${projectName}Cluster`;
    const region = this.node.tryGetContext('region') ?? "US_EAST_1";
    const awsRegion = this.node.tryGetContext('awsRegion') ?? "us-east-1";
    const sagemakerModelEndpoint = this.node.tryGetContext('sagemakerModelEndpoint') ?? "";
    const ip = this.node.tryGetContext('ip');
    const atlasOrgPublicKey = this.node.tryGetContext('atlasOrgPublicKey') ?? "";
    const atlasOrgPrivateKey = this.node.tryGetContext('atlasOrgPrivateKey') ?? "";
    const solution = this.node.tryGetContext('solution');

    return {
      orgId,
      profile,
      clusterName,
      region,
      ip,
      dbUsername,
      dbPassword,
      awsRegion,
      sagemakerModelEndpoint,
      atlasOrgPublicKey,
      atlasOrgPrivateKey,
      solution
    }
  }
}