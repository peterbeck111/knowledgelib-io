# Run comprehensive Prowler security assessment
prowler aws --compliance cis_3.0_aws -M json html

# Check IAM credential report (users, MFA, key age)
aws iam generate-credential-report && sleep 5
aws iam get-credential-report --query 'Content' --output text | base64 -d

# Find IAM policies with wildcard actions
aws iam list-policies --scope Local --query 'Policies[*].Arn' --output text | \
  xargs -I{} aws iam get-policy-version --policy-arn {} \
    --version-id $(aws iam get-policy --policy-arn {} --query 'Policy.DefaultVersionId' --output text) \
    --query 'PolicyVersion.Document'

# Check S3 Block Public Access at account level
aws s3control get-public-access-block \
  --account-id $(aws sts get-caller-identity --query Account --output text)

# List S3 buckets without encryption
aws s3api list-buckets --query 'Buckets[*].Name' --output text | tr '\t' '\n' | \
  while read bucket; do
    enc=$(aws s3api get-bucket-encryption --bucket "$bucket" 2>/dev/null)
    [ -z "$enc" ] && echo "UNENCRYPTED: $bucket"
  done

# Check CloudTrail status
aws cloudtrail describe-trails --query 'trailList[*].{Name:Name,Multi:IsMultiRegionTrail,Log:LogFileValidationEnabled}'

# List GuardDuty detectors
aws guardduty list-detectors

# Check Security Hub compliance score
aws securityhub get-findings --filters '{"ComplianceStatus":[{"Value":"FAILED","Comparison":"EQUALS"}]}' \
  --query 'length(Findings)'

# Find security groups with 0.0.0.0/0 ingress
aws ec2 describe-security-groups \
  --filters Name=ip-permission.cidr,Values=0.0.0.0/0 \
  --query 'SecurityGroups[*].{ID:GroupId,Name:GroupName,Ports:IpPermissions[?contains(IpRanges[].CidrIp,`0.0.0.0/0`)].{From:FromPort,To:ToPort}}'

# Check for publicly accessible RDS instances
aws rds describe-db-instances \
  --query 'DBInstances[?PubliclyAccessible==`true`].{ID:DBInstanceIdentifier,Public:PubliclyAccessible}'

# Check EBS default encryption
aws ec2 get-ebs-encryption-by-default

# Audit VPC Flow Logs
aws ec2 describe-flow-logs --query 'FlowLogs[*].{VPC:ResourceId,Status:FlowLogStatus}'
