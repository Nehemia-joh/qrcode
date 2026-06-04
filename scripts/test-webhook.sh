#!/usr/bin/env bash
# Test Operations attendance webhook (item 1 in backlog)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API="${OPS_API_URL:-http://localhost:4000}"
SECRET="${WEBHOOK_SECRET:-dev-webhook-secret}"

echo "→ Health check"
curl -s "$API/api/webhooks/health" | python3 -m json.tool

echo ""
echo "→ Simulated scan (in credit, with parent phone)"
curl -s -X POST "$API/api/webhooks/attendance" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $SECRET" \
  -d '{
    "student_id": "TEST-WEBHOOK-001",
    "full_name": "Webhook Test Student",
    "attendance_type": "morning_pickup",
    "is_in_credit": 1,
    "current_balance": -15000,
    "parent_phone": "0712345678",
    "source": "test_script"
  }' | python3 -m json.tool

echo ""
echo "Done. Check Transport → Summary live attendance and data/sms-log.json if SMS mock."
