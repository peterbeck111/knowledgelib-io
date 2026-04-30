# === Check current function configuration ===
aws lambda get-function-configuration --function-name my-function \
  --query '{Memory: MemorySize, Timeout: Timeout, Runtime: Runtime, VPC: VpcConfig.SubnetIds, SnapStart: SnapStart}'

# === Find recent timeouts in CloudWatch Logs Insights ===
# (Run in CloudWatch console, select your Lambda log group)
fields @timestamp, @message
| filter @message like /Task timed out/
| sort @timestamp desc
| limit 50

# === Analyze cold start frequency and duration ===
fields @timestamp, @initDuration, @duration, @maxMemoryUsed, @memorySize
| filter ispresent(@initDuration)
| stats count(*) as coldStarts,
        avg(@initDuration) as avgInitMs,
        max(@initDuration) as maxInitMs,
        pct(@initDuration, 99) as p99InitMs
  by bin(1h)

# === Check memory utilization (are you CPU-starved?) ===
fields @maxMemoryUsed, @memorySize, @duration
| stats avg(@maxMemoryUsed) as avgMemUsed,
        max(@maxMemoryUsed) as maxMemUsed,
        avg(@duration) as avgDuration,
        max(@duration) as maxDuration
| filter @memorySize > 0

# === Check provisioned concurrency status ===
aws lambda get-provisioned-concurrency-config \
  --function-name my-function \
  --qualifier live

# === List SnapStart-enabled functions ===
aws lambda get-function-configuration --function-name my-function \
  --query 'SnapStart'

# === Check VPC configuration and NAT gateway ===
# Get function VPC config
aws lambda get-function-configuration --function-name my-function \
  --query 'VpcConfig'

# Check route table for NAT gateway
aws ec2 describe-route-tables --filters "Name=association.subnet-id,Values=subnet-xxxxx" \
  --query 'RouteTables[*].Routes[?DestinationCidrBlock==`0.0.0.0/0`]'

# === Test invocation and check for timeout ===
aws lambda invoke --function-name my-function \
  --payload '{"test": true}' \
  --cli-read-timeout 60 \
  response.json && cat response.json
