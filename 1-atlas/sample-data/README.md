# Import into MongoDB

This guide provides a simple method to import user and vehicle data into a MongoDB database using the `mongoimport` tool.

---

## Prerequisites

1. **MongoDB URI**: Ensure you have your MongoDB connection string (e.g., `mongodb+srv://username:password@cluster.mongodb.net/databaseName`).
2. **MongoDB Tools**: Install MongoDB Database Tools from [here](https://www.mongodb.com/try/download/database-tools).
---

## Import 

```
mongoimport --uri "mongodb+srv://username:password@cluster.mongodb.net/databaseName" --collection User --file User.json --jsonArray
```

```
mongoimport --uri "mongodb+srv://whitescrum:whitescrum@iot-gg.5amcr.mongodb.net/" --collection Vehicless --file Vehicle.json --jsonArray
```

Now lets move to [Edge Setup README](../../2-edge/README.md)
