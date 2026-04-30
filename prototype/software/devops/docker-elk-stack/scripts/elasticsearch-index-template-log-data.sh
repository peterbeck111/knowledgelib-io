# Create an index template for structured log data
# Run after Elasticsearch is healthy
curl -s -X PUT -u elastic:changeme \
  http://localhost:9200/_index_template/logs-template \
  -H "Content-Type: application/json" \
  -d '{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "index.lifecycle.name": "logs-policy",
      "index.lifecycle.rollover_alias": "logs"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "message": { "type": "text" },
        "level": { "type": "keyword" },
        "service": { "type": "keyword" },
        "host": { "type": "keyword" }
      }
    }
  },
  "priority": 200
}'
