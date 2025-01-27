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

async function getJobs(jobsCollection, params) {
    const { _id, assignedTo, status } = params;
    let matchQuery = {};
    if (_id) {
        matchQuery._id = new ObjectId(_id);
    }
    if (assignedTo) {
        matchQuery.assignedTo = new ObjectId(assignedTo);
    }
    if (status) {
        matchQuery.status = status;
    }
    const jobs = await jobsCollection.aggregate([
        {
            $match: matchQuery
        },
        {
            $lookup: {
                from: 'User',
                localField: 'assignedTo',
                foreignField: '_id',
                as: 'assignedTo'
            }
        },
        {
            $unwind: {
                path: '$assignedTo',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'Vehicle',
                localField: 'vehicleId',
                foreignField: '_id',
                as: 'vehicleId'
            }
        },
        {
            $unwind: {
                path: '$vehicleId',
                preserveNullAndEmptyArrays: true
            }
        }
    ]).toArray();
    return jobs;
}

export const handler = async (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    try {
        switch (event.field) {
            case "login": {
                const { email, password } = event.arguments;

                if (!email || !password) {
                    callback(null, { error: "Email and password are required!" });
                    return;
                }

                const db = await connectToDatabase();
                const usersCollection = db.collection("User");

                const user = await usersCollection.findOne({ email });

                if (!user || user.password !== password) {
                    callback(null, { error: "Invalid credentials!" });
                    return;
                }

                console.log("User found:", user);
                callback(null, { email: user.email, _id: String(user._id) });
                break;
            }
            case "getJobs": {
                const db = await connectToDatabase();
                const jobsCollection = db.collection("Job");
                let jobs = await getJobs(jobsCollection, {});
                callback(null, jobs);
                break;
            }
            case "getVehicles": {
                const db = await connectToDatabase();
                const vehiclesCollection = db.collection("Vehicle");
                const vehicles = await vehiclesCollection.find({}).toArray();
                console.log("vehicles", vehicles)
                callback(null, vehicles);
                break;
            }
            case "getJobsOfUser": {
                const { assignedTo, status } = event.arguments;
                const db = await connectToDatabase();
                const jobsCollection = db.collection("Job");
                const jobs = await getJobs(jobsCollection, { assignedTo, status });
                callback(null, jobs);
                break;
            }
            case "updateJob": {
                const { _id, status, notes } = event.arguments;
                const db = await connectToDatabase();
                const jobsCollection = db.collection("Job");
                const job = await jobsCollection.updateOne({ _id: new ObjectId(_id) }, { $set: { status, notes } });
                let jobs = await getJobs(jobsCollection, { _id });
                callback(null, jobs[0]);
                break;
            }
            case "jobUpdated": {
                callback(null, event.arguments);
                break;
            }

            default:
                callback(`Unknown field, unable to resolve ${event.field}`, null);
                break;
        }
    } catch (error) {
        console.error("Error handling request:", error);
        callback(null, { error: "Internal server error" });
    }
};
