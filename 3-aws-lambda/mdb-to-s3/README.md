# MDB to S3 Moving Sensor Data

This lambda function is responsible for moving the Sensor data in the MongoDB Collection to the S3 Bucket in regular intervals. Which is triggered by Atlas triggers and Event Bridge

Create the lambda function `mdb-to-s3` and set the below environment variables

```
MONGO_URI=
DB_NAME=
S3_BUCKET_NAME=
```
