#!/bin/bash

# Test cron-check-subscriptions manually
# Replace SERVICE_ROLE_KEY with your actual key

SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"
PROJECT_URL="https://gdwuluiqoectlwdzbiar.supabase.co"

echo "Testing cron-check-subscriptions..."
echo "URL: $PROJECT_URL/functions/v1/cron-check-subscriptions"
echo ""

curl -X POST "$PROJECT_URL/functions/v1/cron-check-subscriptions" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  | jq '.' || echo "Response (raw):"

echo ""
echo "Check logs in Supabase Dashboard or run this SQL:"
echo "SELECT * FROM cron_execution_logs ORDER BY executed_at DESC LIMIT 10;"
