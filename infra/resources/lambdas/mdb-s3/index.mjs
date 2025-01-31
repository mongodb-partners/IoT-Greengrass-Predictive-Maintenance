import AWS from "aws-sdk";
import { MongoClient } from "mongodb";

const s3 = new AWS.S3();
const S3_BUCKET_NAME = process.env.S3_BUCKET || "S3_IIoT";

let client;

const uri = `${process.env.ATLAS_CONNECTION_STRING}/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const dbName = process.env.DB_NAME || 'GreengrassIot';


async function connectToDatabase() {
    if (!client) {
        client = new MongoClient(uri, {
            auth: {
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD
            }
        });
        await client.connect();
    }
    return client.db(dbName);
}

export const handler = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        const db = await connectToDatabase();
        const collection = db.collection('SensorData');

        const doc = await collection.aggregate([
            {
                $sort: { vehicleId: -1, timestamp: -1 }
            },
            {
                $group: { _id: "$vehicleId", items: { $push: { voltage: "$voltage", current: "$current" } } }
            },
            {
                $project: { items: { $slice: ["$items", 20] } }
            }
        ]).toArray();

        doc.forEach((value, index, array) => {
            const body = value.items.map(function (obj) {
                return [obj.voltage, obj.current];
            });
            const params = {
                Bucket: S3_BUCKET_NAME,
                Key: `IIoT/${String(value._id)}.txt`,
                Body: `[${JSON.stringify(body)}]`
            }
            s3.upload(params).promise();
        })


        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Aggregation results uploaded to S3 successfully.",
                data: doc,
            }),
        };
    } catch (error) {
        console.error("Error in Lambda function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "An error occurred",
                error: error.message,
            }),
        };
    }
}; 