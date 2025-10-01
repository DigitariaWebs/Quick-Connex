#!/bin/bash

# Test SSE system with cURL commands
echo "🧪 Testing SSE Notifications with cURL..."

# Test 1: Login and get cookies
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arselene.tests@gmail.com","password":"TestPassword123!"}')

echo "Login response: $LOGIN_RESPONSE"

# Test 2: Send test notification
echo "2. Sending test notification..."
NOTIFICATION_RESPONSE=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/test-notifications \
  -H "Content-Type: application/json" \
  -d '{"notificationType":"test"}')

echo "Notification response: $NOTIFICATION_RESPONSE"

# Test 3: Test SSE connection (with timeout)
echo "3. Testing SSE connection (5 second timeout)..."
timeout 5s curl -s -b cookies.txt -N -H "Accept: text/event-stream" \
  http://localhost:3000/api/notifications/sse || echo "SSE connection timeout (expected)"

echo "✅ SSE testing complete!"
echo "💡 Check your browser at http://localhost:3000/test-sse.html for interactive testing"

