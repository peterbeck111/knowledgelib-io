// Input:  API Gateway proxy request
// Output: API Gateway proxy response
// Requires: Java 11+ runtime with SnapStart enabled

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import org.crac.Core;
import org.crac.Resource;
import software.amazon.awssdk.services.dynamodb.DynamoDBClient;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Map;

public class Handler implements RequestHandler<APIGatewayProxyRequestEvent,
        APIGatewayProxyResponseEvent>, Resource {

    // Initialized once during INIT (before SnapStart snapshot)
    private final DynamoDBClient dynamodb = DynamoDBClient.create();
    private final String tableName = System.getenv("TABLE_NAME");

    public Handler() {
        // Register for SnapStart CRaC hooks
        Core.getGlobalContext().register(this);
    }

    @Override
    public void beforeCheckpoint(org.crac.Context<? extends Resource> context) {
        // Called before snapshot — pre-warm connections
        dynamodb.describeEndpoints();
    }

    @Override
    public void afterRestore(org.crac.Context<? extends Resource> context) {
        // Called after restore — re-validate connections
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(
            APIGatewayProxyRequestEvent event, Context context) {
        String id = event.getPathParameters().get("id");
        GetItemResponse resp = dynamodb.getItem(GetItemRequest.builder()
                .tableName(tableName)
                .key(Map.of("id", AttributeValue.fromS(id)))
                .build());
        // Return response (simplified)
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(resp.hasItem() ? 200 : 404)
                .withBody(resp.hasItem() ? resp.item().toString() : "{\"error\":\"Not found\"}");
    }
}
