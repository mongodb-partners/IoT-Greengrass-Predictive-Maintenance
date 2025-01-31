import { MongoClient, ObjectId } from "mongodb";

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
        const telemetryCollection = db.collection("Telemetry");
        return await telemetryCollection.insertOne({
            event
        })
    } catch (error) {
        console.error("Error handling request:", error);
        callback(null, { error: "Internal server error" });
    }
};
