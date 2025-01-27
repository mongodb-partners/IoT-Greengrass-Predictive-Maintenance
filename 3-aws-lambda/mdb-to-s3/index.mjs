import AWS from "aws-sdk";
import { MongoClient } from "mongodb";

const s3 = new AWS.S3();

let cachedClient = null;
let cachedDb = null;

const MONGO_URI = "mongodb+srv://whitescrum:whitescrum@iot-gg.5amcr.mongodb.net/";
const DB_NAME = "GreengrassIot";


/**
 * Connect to the MongoDB database. Reuse connections for subsequent invocations.
 */
async function connectToDatabase() {
    if (cachedDb && cachedClient) {
        console.log("Reusing existing database connection");
        return cachedDb;
    }

    try {
        console.log("Creating a new database connection");
        cachedClient = new MongoClient(MONGO_URI);
        await cachedClient.connect();
        cachedDb = cachedClient.db(DB_NAME);
        return cachedDb;
    } catch (error) {
        console.error("Error connecting to the database:", error);
        throw new Error("Database connection failed");
    }
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
                Bucket: 'aws-iot-greengrass',
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
