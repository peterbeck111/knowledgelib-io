// Input:  API Gateway event
// Output: JSON response

// INIT phase: import only what you need (not the entire AWS SDK)
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

// Reuse client across warm invocations
const client = new DynamoDBClient({
  requestHandler: { connectionTimeout: 5000, socketTimeout: 10000 },
  maxAttempts: 2
});

exports.handler = async (event, context) => {
  const remainingMs = context.getRemainingTimeInMillis();
  if (remainingMs < 5000) {
    return { statusCode: 503, body: JSON.stringify({ error: 'Insufficient time' }) };
  }

  try {
    const id = event.pathParameters?.id;
    const { Item } = await client.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id: { S: id } }
    }));

    if (!Item) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    return { statusCode: 200, body: JSON.stringify(unmarshall(Item)) };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
