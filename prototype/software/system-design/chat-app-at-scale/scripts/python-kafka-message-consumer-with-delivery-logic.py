# Input:  Kafka messages from chat service
# Output: Routes messages to online users (via Redis) or push notifications (offline)
# Deps:   pip install confluent-kafka==2.3.0 redis==5.0.0 firebase-admin==6.4.0

import json
import time
from confluent_kafka import Consumer, KafkaError
import redis
import firebase_admin
from firebase_admin import messaging

# Initialize Redis for presence checks and cross-server routing
redis_client = redis.Redis.from_url("redis://localhost:6379", decode_responses=True)

# Initialize Firebase for push notifications
firebase_admin.initialize_app()

# Kafka consumer configuration
consumer = Consumer({
    'bootstrap.servers': 'kafka:9092',
    'group.id': 'message-delivery-group',
    'auto.offset.reset': 'earliest',
    'enable.auto.commit': False,       # manual commit for at-least-once
    'max.poll.interval.ms': 300000,
})
consumer.subscribe(['chat.messages'])

def get_conversation_members(conversation_id: str) -> list[str]:
    """Fetch members from cache or database."""
    cached = redis_client.smembers(f"conv_members:{conversation_id}")
    if cached:
        return list(cached)
    # Fallback: query PostgreSQL for conversation_members table
    # members = db.query("SELECT user_id FROM conversation_members WHERE conversation_id = %s", conversation_id)
    # redis_client.sadd(f"conv_members:{conversation_id}", *members)
    # redis_client.expire(f"conv_members:{conversation_id}", 3600)
    return []

def is_user_online(user_id: str) -> bool:
    """Check Redis presence key."""
    return redis_client.exists(f"presence:{user_id}") > 0

def deliver_to_online_user(user_id: str, message: dict):
    """Push message to the user's gateway server via Redis Pub/Sub."""
    redis_client.publish(f"deliver:{user_id}", json.dumps(message))

def send_push_notification(user_id: str, message: dict):
    """Send push notification via FCM for offline users."""
    # Fetch device token from user DB (cached in Redis)
    token = redis_client.get(f"device_token:{user_id}")
    if not token:
        return  # User has no registered device

    notification = messaging.Message(
        token=token,
        notification=messaging.Notification(
            title=f"New message from {message.get('sender_name', 'Someone')}",
            body=message.get('content', '')[:100],  # truncate for push
        ),
        data={'conversation_id': str(message['conversation_id']),
              'message_id': str(message['message_id'])},
    )
    try:
        messaging.send(notification)
    except Exception as e:
        print(f"Push notification failed for {user_id}: {e}")

def store_for_sync(user_id: str, message: dict):
    """Store message for later sync when user comes back online."""
    redis_client.lpush(f"unread:{user_id}", json.dumps(message))
    redis_client.expire(f"unread:{user_id}", 86400 * 7)  # 7 day TTL

def process_message(raw_message: str):
    """Route a single message to all conversation members."""
    message = json.loads(raw_message)
    sender_id = str(message['sender_id'])
    conversation_id = str(message['conversation_id'])

    members = get_conversation_members(conversation_id)

    for member_id in members:
        if member_id == sender_id:
            continue  # Don't deliver back to sender

        if is_user_online(member_id):
            deliver_to_online_user(member_id, message)
        else:
            send_push_notification(member_id, message)
            store_for_sync(member_id, message)

# Main consumer loop
print("Message delivery consumer started...")
try:
    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            if msg.error().code() == KafkaError._PARTITION_EOF:
                continue
            print(f"Kafka error: {msg.error()}")
            continue

        process_message(msg.value().decode('utf-8'))
        consumer.commit(msg)  # manual commit after processing
except KeyboardInterrupt:
    pass
finally:
    consumer.close()
