# Input:  API Gateway event
# Output: JSON response with downstream data

import json
import os
import boto3
from botocore.config import Config

# INIT phase: runs once per cold start — keep heavy work here
# These persist across warm invocations
boto_config = Config(connect_timeout=5, read_timeout=10, retries={'max_attempts': 2})
dynamodb = boto3.resource('dynamodb', config=boto_config)
table = dynamodb.Table(os.environ['TABLE_NAME'])

def handler(event, context):
    """Handler runs on every invocation. Keep it lean."""
    remaining_ms = context.get_remaining_time_in_millis()
    if remaining_ms < 5000:
        # Safety: if less than 5s left, return early
        return {'statusCode': 503, 'body': json.dumps({'error': 'Insufficient time remaining'})}

    try:
        item_id = event.get('pathParameters', {}).get('id', '')
        response = table.get_item(Key={'id': item_id})
        item = response.get('Item')
        if not item:
            return {'statusCode': 404, 'body': json.dumps({'error': 'Not found'})}
        return {'statusCode': 200, 'body': json.dumps(item, default=str)}
    except Exception as e:
        print(f"Error: {e}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}
