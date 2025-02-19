import os
import json
import urllib.parse
import boto3
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from pymongo.errors import PyMongoError

s3 = boto3.client('s3')

# Initialize MongoDB client outside handler for reuse
client = MongoClient(os.environ.get("ATLAS_URI"))
db = client[os.environ.get("DB_NAME")]
collection = db.Job

def lambda_handler(event, context):
    try:
        # Log the incoming event for debugging
        print("Received event: " + json.dumps(event))
        
        bucket = event['Records'][0]['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
        print(f"Processing file - Bucket: {bucket}, Key: {key}")

        # Fetch S3 object
        response = s3.get_object(Bucket=bucket, Key=key)
        print(f"Content Type: {response['ContentType']}")
        
        # Parse payload
        payload = response['Body'].read().decode('utf-8')
        data = json.loads(payload)
        print(f"Data structure type: {type(data)}, Sample: {data[:1]}")  # Log data structure
        
        # Extract first_item (adjust indices based on actual data structure)
        first_item = data[0][0][0]  # Verify this path matches your JSON structure
        failure_threshold = float(os.environ.get("FAILURE_THRESHOLD", 0.0))
        print(f"First item: {first_item}, Failure Threshold: {failure_threshold}")

        # Determine if failure is probable
        prob_failure = first_item > failure_threshold  # Fixed comparison
        message = "Vehicle in good health. No maintenance required."
        print(f"Probable failure: {prob_failure}")

        if prob_failure:
            # Extract vehicle ID from key (adjust slicing based on key structure)
            # Example key: 'vehicles/507f1f77bcf86cd799439011/data.json'
            vehicle_id_str = key.split('/')[1]  # Split by '/' and take second part
            vehicle_id_str = vehicle_id_str.split('.')[0] 
            print(f"Extracted Vehicle ID string: {vehicle_id_str}")
            vehicle_id = ObjectId(vehicle_id_str)
            print(f"Vehicle ID ObjectId: {vehicle_id}")

            # Prepare job document
            job = {
                "assignedTo": ObjectId('6537c7b54a4588f9fd2ff8aa'),
                "createdAt": datetime.now(),
                "notes": "",
                "status": "TODO",
                "type": "MAINTENANCE",
                "vehicleId": vehicle_id
            }
            print(f"Job document: {job}")

            # Update or insert job
            result = collection.update_one(
                {"vehicleId": vehicle_id, "status": "TODO"},
                {"$set": job},
                upsert=True
            )
            print(f"MongoDB Update Result: {vars(result)}")  # Log raw result

            # Determine result message
            if result.upserted_id:
                message = "Maintenance job created successfully"
            elif result.modified_count > 0:
                message = "Maintenance job updated successfully"
            else:
                message = "No changes made to maintenance job"
            print(message)

        return {
            "statusCode": 200,
            "body": json.dumps({"message": message})
        }

    except PyMongoError as e:
        print(f"MongoDB Error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Database error occurred"})
        }
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        raise e