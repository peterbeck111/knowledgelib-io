// Input:  bidirectional stream of ChatMessage
// Output: bidirectional stream of ChatMessage
// Requires: @grpc/grpc-js@^1.12.0, @grpc/proto-loader@^0.7.0

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const packageDef = protoLoader.loadSync("chat.proto");
const proto = grpc.loadPackageDefinition(packageDef);
const client = new proto.ChatService(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

const call = client.chat();

call.on("data", (message) => {
  console.log(`Received: ${message.text}`);
});

call.on("error", (err) => {
  if (err.code === grpc.status.UNAVAILABLE) {
    console.log("Server unavailable, reconnecting...");
  }
});

call.on("end", () => console.log("Stream ended"));

// Send messages
call.write({ text: "Hello", sender: "user1" });
call.write({ text: "How are you?", sender: "user1" });

// Signal done sending (server can still send)
// call.end();
