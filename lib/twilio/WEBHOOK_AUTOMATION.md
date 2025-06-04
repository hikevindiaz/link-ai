# 🔧 Automatic Twilio Webhook Configuration

## Overview

The automatic webhook configuration system ensures that when a phone number is assigned to an agent/chatbot, all necessary Twilio webhooks are configured automatically. This eliminates manual configuration and ensures consistency across all deployments.

## 🌟 Key Features

1. **Automatic Configuration**: Webhooks are configured immediately when a phone number is assigned
2. **Multi-Channel Support**: Handles Voice, SMS, and WhatsApp webhooks
3. **Rollback on Failure**: Database changes are rolled back if webhook configuration fails
4. **Batch Updates**: Update all webhooks with a single API call
5. **Verification**: Verify webhook configuration at any time
6. **Audit Trail**: All operations are logged for compliance

## 🏗️ Architecture

### Core Components

1. **TwilioWebhookManager** (`lib/twilio/webhook-manager.ts`)
   - Handles direct communication with Twilio API
   - Configures voice, SMS, and WhatsApp webhooks
   - Manages webhook URLs based on environment

2. **PhoneNumberService** (`lib/twilio/phone-number-service.ts`)
   - Orchestrates phone number assignment
   - Ensures transactional integrity
   - Handles rollback on failures
   - Creates audit logs

3. **API Endpoints**
   - `/api/phone-numbers/assign` - Assign/unassign phone numbers
   - `/api/phone-numbers/webhooks` - Manage webhook configuration
   - `/api/twilio/status` - Handle Twilio status callbacks

## 📋 Webhook URLs

The system automatically configures the following webhooks:

### Voice Calls
- **URL**: `https://yourdomain.com/api/twilio/voice?agentId={agentId}`
- **Method**: POST
- **Fallback**: `https://yourdomain.com/api/twilio/voice/fallback?agentId={agentId}`

### SMS Messages
- **URL**: `https://yourdomain.com/api/twilio/webhook`
- **Method**: POST
- **Fallback**: `https://yourdomain.com/api/twilio/webhook/fallback`

### WhatsApp Messages
- **URL**: `https://yourdomain.com/api/twilio/webhook`
- **Method**: POST
- Uses the same endpoint as SMS with automatic channel detection

### Status Callbacks
- **URL**: `https://yourdomain.com/api/twilio/status`
- **Method**: POST
- Handles call completion, message delivery status

## 🚀 Usage

### Assigning a Phone Number

```javascript
// POST /api/phone-numbers/assign
const response = await fetch('/api/phone-numbers/assign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phoneNumberId: 'phone_123',
    chatbotId: 'agent_456',
    enableSms: true,
    enableWhatsApp: false
  })
});

// Response
{
  "success": true,
  "phoneNumber": {
    "id": "phone_123",
    "phoneNumber": "+1234567890",
    "chatbot": {
      "id": "agent_456",
      "name": "Support Agent"
    }
  },
  "message": "Phone number assigned and webhooks configured successfully"
}
```

### Unassigning a Phone Number

```javascript
// DELETE /api/phone-numbers/assign
const response = await fetch('/api/phone-numbers/assign', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phoneNumberId: 'phone_123'
  })
});
```

### Verifying Webhook Configuration

```javascript
// GET /api/phone-numbers/webhooks?phoneNumberId=phone_123
const response = await fetch('/api/phone-numbers/webhooks?phoneNumberId=phone_123');

// Response
{
  "phoneNumber": "+1234567890",
  "configured": true,
  "webhooks": {
    "voiceUrl": "https://yourdomain.com/api/twilio/voice?agentId=agent_456",
    "smsUrl": "https://yourdomain.com/api/twilio/webhook",
    "statusCallbackUrl": "https://yourdomain.com/api/twilio/status"
  },
  "errors": []
}
```

### Batch Update All Webhooks

```javascript
// PUT /api/phone-numbers/webhooks
const response = await fetch('/api/phone-numbers/webhooks', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    chatbotId: 'agent_456' // Optional: filter by specific agent
  })
});

// Response
{
  "success": true,
  "message": "Updated webhooks for 5 phone numbers",
  "results": {
    "success": 5,
    "failed": 0,
    "errors": []
  }
}
```

## 🔐 Security

1. **Authentication Required**: All endpoints require authentication
2. **Ownership Verification**: Users can only manage their own resources
3. **Twilio Signature Validation**: All webhook requests are validated in production
4. **Transactional Integrity**: Database and webhook changes are atomic

## 🚨 Error Handling

The system handles various error scenarios:

1. **Phone Number Already Assigned**: Returns 400 error
2. **Webhook Configuration Failure**: Rolls back database changes
3. **Invalid Credentials**: Returns 401/403 errors
4. **Resource Not Found**: Returns 404 error
5. **Twilio API Errors**: Logged and returned with details

## 📊 Monitoring

### Audit Logs

All operations create audit logs stored as special messages:

```json
{
  "type": "phone_number_audit",
  "action": "phone_assigned",
  "phoneNumberId": "phone_123",
  "chatbotId": "agent_456",
  "timestamp": "2024-01-20T10:30:00Z",
  "metadata": {
    "phoneNumber": "+1234567890",
    "capabilities": {
      "voice": true,
      "sms": true,
      "whatsapp": false
    }
  }
}
```

### Usage Tracking

The status callback automatically tracks:
- Voice minutes used
- SMS segments sent
- WhatsApp messages delivered

## 🛠️ Troubleshooting

### Common Issues

1. **Webhooks Not Updating**
   - Check Twilio credentials in environment variables
   - Verify the phone number exists in Twilio account
   - Check logs for specific error messages

2. **SSL/HTTPS Issues**
   - Ensure `NEXT_PUBLIC_APP_URL` uses HTTPS in production
   - Verify SSL certificate is valid

3. **Phone Number Not Receiving Calls/Messages**
   - Run webhook verification endpoint
   - Check Twilio console for error logs
   - Verify agent is properly configured

### Manual Webhook Update

If automatic configuration fails, you can manually update:

```javascript
// POST /api/phone-numbers/webhooks
await fetch('/api/phone-numbers/webhooks', {
  method: 'POST',
  body: JSON.stringify({
    phoneNumberId: 'phone_123'
  })
});
```

## 🔄 Migration

For existing phone numbers, run the batch update:

```bash
# Update all active phone numbers
curl -X PUT https://yourdomain.com/api/phone-numbers/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## 📱 Testing

1. **Assign a phone number** to an agent
2. **Make a test call** to verify voice webhook
3. **Send a test SMS** to verify SMS webhook
4. **Check webhook configuration** using the verification endpoint
5. **Monitor logs** for any errors

## 🎯 Best Practices

1. **Always verify** webhook configuration after assignment
2. **Use batch updates** sparingly to avoid rate limits
3. **Monitor audit logs** for unusual activity
4. **Set up alerts** for webhook configuration failures
5. **Test in staging** before production deployment

## 📚 Related Documentation

- [Agent Runtime Documentation](../agent-runtime/README.md)
- [Twilio Integration Guide](./TWILIO_INTEGRATION.md)
- [API Reference](../../docs/API.md) 