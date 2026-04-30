// Input:  Array of path patterns to invalidate
// Output: Invalidation ID for tracking

import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront"; // @aws-sdk/client-cloudfront@3.500.0

const client = new CloudFrontClient({ region: "us-east-1" });

async function invalidateCloudFront(
  distributionId: string,
  paths: string[]
): Promise<string> {
  const command = new CreateInvalidationCommand({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: `invalidation-${Date.now()}`,
      Paths: {
        Quantity: paths.length,
        Items: paths, // e.g., ["/products/*", "/index.html"]
      },
    },
  });

  const response = await client.send(command);
  const invalidationId = response.Invalidation?.Id ?? "unknown";
  console.log(`Invalidation created: ${invalidationId}`);
  // Note: CloudFront invalidations take 5-15 minutes to propagate
  // First 1,000 paths/month are free; $0.005 per path after
  return invalidationId;
}
