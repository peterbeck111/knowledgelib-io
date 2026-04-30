# Input:  Kafka messages on 'order-created' topic
# Output: Payment processing + 'payment-completed' event

import asyncio
import json
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

async def payment_event_handler():
    consumer = AIOKafkaConsumer(
        'order-created',
        bootstrap_servers='kafka:9092',
        group_id='payment-service',
        value_deserializer=lambda m: json.loads(m.decode())
    )
    producer = AIOKafkaProducer(
        bootstrap_servers='kafka:9092',
        value_serializer=lambda v: json.dumps(v).encode()
    )
    await consumer.start()
    await producer.start()
    try:
        async for msg in consumer:
            order = msg.value
            result = await process_payment(order['order_id'], order['total_cents'])
            await producer.send('payment-completed', value={
                'order_id': order['order_id'],
                'payment_id': result['payment_id'],
                'status': 'completed'
            })
    finally:
        await consumer.stop()
        await producer.stop()
