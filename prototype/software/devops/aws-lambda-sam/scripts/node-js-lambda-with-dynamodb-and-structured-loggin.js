// Input:  API Gateway event (HttpApi v2 format)
// Output: HTTP response object

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) };
  }

  try {
    const { Item } = await ddb.send(new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { id }
    }));

    if (!Item) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
    }

    return { statusCode: 200, body: JSON.stringify(Item) };
  } catch (err) {
    console.error('DDB error:', JSON.stringify({ error: err.message, id }));
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
