"""
RabbitMQ producer and consumer using pika.
Source: knowledgelib.io -- AI Knowledge Library (verified 2026-02-27)

Requirements: pip install pika==1.3.2

Usage:
    python python-pika-producer-consumer.py produce "Hello World"
    python python-pika-producer-consumer.py consume
"""
import sys
import json
import pika  # pika==1.3.2


RABBITMQ_HOST = 'localhost'
RABBITMQ_PORT = 5672
RABBITMQ_USER = 'myuser'
RABBITMQ_PASS = 'mypassword'
QUEUE_NAME = 'task_queue'


def get_connection():
    """Create a blocking connection with heartbeat and timeout."""
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,                    # Keep connection alive
        blocked_connection_timeout=300,   # Timeout if broker blocks us
    )
    return pika.BlockingConnection(parameters)


def produce(message: str):
    """Publish a persistent message to a durable quorum queue."""
    connection = get_connection()
    channel = connection.channel()

    # Declare a durable quorum queue (RabbitMQ 4.0+ recommended)
    channel.queue_declare(
        queue=QUEUE_NAME,
        durable=True,
        arguments={'x-queue-type': 'quorum'},
    )

    channel.basic_publish(
        exchange='',
        routing_key=QUEUE_NAME,
        body=json.dumps({'task': message}),
        properties=pika.BasicProperties(
            delivery_mode=pika.DeliveryMode.Persistent,  # Message survives broker restart
            content_type='application/json',
        ),
    )
    print(f" [x] Sent: {message}")
    connection.close()


def consume():
    """Consume messages with manual acknowledgment."""
    connection = get_connection()
    channel = connection.channel()

    channel.queue_declare(
        queue=QUEUE_NAME,
        durable=True,
        arguments={'x-queue-type': 'quorum'},
    )

    # Fair dispatch: don't give more than 1 unacked message per worker
    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body):
        data = json.loads(body)
        print(f" [x] Received: {data}")
        # Acknowledge after processing -- message removed from queue
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
    print(' [*] Waiting for messages. Press Ctrl+C to exit.')
    channel.start_consuming()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python script.py [produce <msg> | consume]")
        sys.exit(1)
    if sys.argv[1] == 'produce':
        msg = sys.argv[2] if len(sys.argv) > 2 else 'Hello World'
        produce(msg)
    elif sys.argv[1] == 'consume':
        consume()
