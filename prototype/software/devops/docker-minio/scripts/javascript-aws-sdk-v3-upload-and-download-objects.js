// npm install @aws-sdk/client-s3@^3.500.0
const { S3Client, PutObjectCommand, GetObjectCommand }
  = require("@aws-sdk/client-s3");
const fs = require("fs");

// Input:  MinIO endpoint, credentials, file buffer
// Output: Object stored/retrieved from MinIO bucket

const s3 = new S3Client({
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin123",
  },
  forcePathStyle: true,  // Required for MinIO
});

// Upload
await s3.send(new PutObjectCommand({
  Bucket: "my-bucket",
  Key: "hello.txt",
  Body: Buffer.from("Hello MinIO!"),
}));

// Download
const { Body } = await s3.send(new GetObjectCommand({
  Bucket: "my-bucket", Key: "hello.txt",
}));
const content = await Body.transformToString();
