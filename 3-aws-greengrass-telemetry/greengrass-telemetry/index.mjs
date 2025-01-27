import { MongoClient, ObjectId } from "mongodb";

let cachedClient = null;
let cachedDb = null;

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://whitescrum:whitescrum@iot-gg.5amcr.mongodb.net/";
const DB_NAME = process.env.MONGO_DATABASE || "GreengrassIot";

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
        const telemetryCollection = db.collection("Telemetry");
        return await telemetryCollection.insertOne({
            event
        })
    } catch (error) {
        console.error("Error handling request:", error);
        callback(null, { error: "Internal server error" });
    }
};
