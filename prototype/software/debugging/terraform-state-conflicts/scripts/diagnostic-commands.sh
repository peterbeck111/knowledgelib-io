# Check who holds the state lock (error output includes lock info)
terraform plan 2>&1 | grep -A 10 "Lock Info"

# Inspect current state serial and lineage
terraform state pull | jq '{serial, lineage, terraform_version}'

# List all resources in current state
terraform state list

# Show state for a specific resource
terraform state show aws_instance.web

# Check DynamoDB lock table entries (S3 backend)
aws dynamodb scan --table-name terraform-state-locks \
  --projection-expression "LockID,Info"

# Check S3 lock files (native S3 locking)
aws s3 ls s3://my-state-bucket/ --recursive | grep ".tflock"

# List S3 state file versions for recovery
aws s3api list-object-versions --bucket my-state-bucket \
  --prefix "production/terraform.tfstate" \
  --query 'Versions[0:5].{VersionId:VersionId,LastModified:LastModified,Size:Size}'

# Verify state file is valid JSON
terraform state pull | python3 -c "import sys,json; json.load(sys.stdin); print('Valid')"

# Check Terraform Cloud workspace lock status
curl -s -H "Authorization: Bearer $TFC_TOKEN" \
  "https://app.terraform.io/api/v2/workspaces/$WS_ID" \
  | jq '.data.attributes.locked'

# Check for hung terraform processes
ps aux | grep "[t]erraform"

# Azure Blob lease status
az storage blob show --container-name tfstate --name terraform.tfstate \
  --account-name mystorageaccount --query properties.lease
