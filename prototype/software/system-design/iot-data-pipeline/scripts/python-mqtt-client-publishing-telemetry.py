# Input:  Sensor readings from GPIO/serial
# Output: JSON messages published to MQTT broker

import paho.mqtt.client as mqtt  # paho-mqtt==1.6.1
import json, time, ssl

BROKER = "broker.example.com"
PORT = 8883  # TLS
TOPIC = "acme/site-01/temperature/sensor-001/reading"

client = mqtt.Client(protocol=mqtt.MQTTv5)
client.tls_set(
    ca_certs="/certs/ca.pem",
    certfile="/certs/device.pem",
    keyfile="/certs/device.key",
    tls_version=ssl.PROTOCOL_TLS_CLIENT
)
client.connect(BROKER, PORT)
client.loop_start()

while True:
    payload = {
        "device_id": "sensor-001",
        "metric": "temperature_c",
        "value": read_sensor(),      # Your sensor read function
        "ts": int(time.time() * 1000) # Epoch milliseconds
    }
    client.publish(TOPIC, json.dumps(payload), qos=1)
    time.sleep(10)  # 10-second reporting interval
