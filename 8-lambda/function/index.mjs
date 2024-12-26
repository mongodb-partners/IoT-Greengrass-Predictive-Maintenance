import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedDb = null;

const DB_NAME = "GreengrassIot";
const MONGO_URI = "mongodb+srv://purplescrum:purplescrum@iot.trag1.mongodb.net/";

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
                const jobs = await jobsCollection.aggregate([
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

            default:
                callback(`Unknown field, unable to resolve ${event.field}`, null);
                break;
        }
    } catch (error) {
        console.error("Error handling request:", error);
        callback(null, { error: "Internal server error" });
    }
};
