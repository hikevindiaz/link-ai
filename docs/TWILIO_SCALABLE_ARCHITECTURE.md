# Twilio Scalable Architecture

## Overview

LinkAI's Twilio integration is designed to support a scalable, multi-account architecture where:
- One agent can have multiple phone numbers
- Phone numbers can come from different Twilio accounts/subaccounts
- Webhook URLs are generic (no agent-specific parameters)
- The system automatically routes calls to the correct agent

## Key Design Principles

### 1. Generic Webhook URLs
All Twilio webhooks use generic URLs without agent-specific parameters:
```
https://dashboard.getlinkai.com/api/twilio/voice
https://dashboard.getlinkai.com/api/twilio/webhook
```

**Why?** This allows phone numbers from any Twilio account to use the same webhook endpoints.

### 2. Phone Number Lookup
When a call/message arrives, the system:
1. Extracts the "To" phone number from the request
2. Looks up which agent owns that phone number in the database
3. Routes the interaction to the correct agent

**Code Example:**
```typescript
// From /app/api/twilio/voice/route.ts
const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
  where: { phoneNumber: to },
  include: {
    chatbot: {
      include: {
        model: true,
      }
    }
  }
});

agent = phoneNumber?.chatbot;
```

### 3. Signature Validation
The system supports validating webhooks from multiple Twilio accounts:
- Main account auth token (current)
- Subaccount auth tokens (future feature)

## Database Schema

### Current Schema
```prisma
model TwilioPhoneNumber {
  id            String    @id @default(cuid())
  phoneNumber   String    @unique
  chatbotId     String?
  chatbot       Chatbot?  @relation(fields: [chatbotId], references: [id])
  // ... other fields ...
}
```

### Future Schema (with Subaccount Support)
```prisma
model TwilioPhoneNumber {
  id                    String    @id @default(cuid())
  phoneNumber          String    @unique
  chatbotId            String?
  chatbot              Chatbot?  @relation(fields: [chatbotId], references: [id])
  
  // Subaccount support
  subaccountSid        String?   // Twilio subaccount SID
  subaccountAuthToken  String?   // Auth token for signature validation
  isSubaccount         Boolean   @default(false)
  
  // ... other fields ...
}
```

## Webhook Configuration Flow

### Automatic Configuration
When a phone number is assigned to an agent:

1. **Assignment Trigger**
   ```typescript
   // When assigning a phone number to an agent
   await webhookManager.configurePhoneNumberWebhooks(
     phoneNumber,
     agentId,
     { voice: true, sms: true, whatsapp: false }
   );
   ```

2. **Webhook Setup**
   - Voice URL: `https://dashboard.getlinkai.com/api/twilio/voice`
   - SMS URL: `https://dashboard.getlinkai.com/api/twilio/webhook`
   - No agent-specific parameters in URLs

3. **Database Update**
   - Phone number is linked to the agent in the database
   - Future: Subaccount credentials are stored if applicable

### Manual Configuration
For phone numbers in external Twilio accounts:

1. **In Twilio Console:**
   - Voice webhook: `https://dashboard.getlinkai.com/api/twilio/voice`
   - SMS webhook: `https://dashboard.getlinkai.com/api/twilio/webhook`
   - Method: POST

2. **In LinkAI Dashboard:**
   - Add the phone number to the agent
   - System will recognize incoming calls/messages

## Call Flow

1. **Incoming Call**
   - Twilio sends POST to `/api/twilio/voice`
   - No agent ID in URL

2. **Phone Number Lookup**
   ```typescript
   const phoneNumber = await prisma.twilioPhoneNumber.findFirst({
     where: { phoneNumber: twilioData.To }
   });
   ```

3. **Agent Resolution**
   - System finds which agent owns the phone number
   - Loads agent configuration (prompt, voice, etc.)

4. **Media Stream Connection**
   - Connects to voice server with agent configuration
   - Voice server handles real-time conversation

## Benefits

### 1. Multi-Account Support
- Organizations can use their own Twilio accounts
- Phone numbers can be moved between accounts
- No vendor lock-in

### 2. Scalability
- One webhook URL serves all phone numbers
- No need to update webhooks when agents change
- Easy to add new phone numbers

### 3. Security
- Signature validation ensures requests are from Twilio
- Future: Per-subaccount auth tokens for enhanced security
- No sensitive data in webhook URLs

### 4. Flexibility
- Phone numbers can be reassigned between agents
- Agents can have multiple phone numbers
- Support for different number types (voice, SMS, WhatsApp)

## Troubleshooting

### Common Issues

1. **403 Unauthorized Error**
   - Check webhook URL format (no query parameters)
   - Verify auth token matches
   - Run `npm run fix-twilio-webhooks`

2. **Agent Not Found**
   - Ensure phone number is in database
   - Check phone number format matches Twilio's

3. **Signature Validation Failures**
   - Temporary: Set `TWILIO_SIGNATURE_VALIDATION=disabled`
   - Permanent: Fix webhook URLs and auth tokens

### Debugging Commands

```bash
# Fix all webhook configurations
npm run fix-twilio-webhooks

# Check specific phone number
curl -X POST https://dashboard.getlinkai.com/api/twilio/voice \
  -d "To=+1234567890" \
  -d "From=+0987654321" \
  -d "CallSid=TEST123"
```

## Future Enhancements

### 1. Full Subaccount Support
- Store subaccount credentials per phone number
- Validate signatures with appropriate auth token
- Support for Twilio Connect

### 2. Advanced Routing
- Route based on time of day
- Geographic routing
- Load balancing across agents

### 3. Enhanced Security
- Encrypted storage of subaccount tokens
- IP whitelisting for webhooks
- Rate limiting per phone number

## Migration Guide

### Adding Subaccount Support

1. **Update Database Schema**
   ```bash
   npm run add-twilio-subaccount-fields
   ```

2. **Run Migration**
   ```bash
   npx prisma migrate dev --name add-twilio-subaccount-fields
   ```

3. **Update Voice Route**
   - Uncomment subaccount auth token lookup
   - Test with subaccount phone numbers

### Moving from Agent-Specific URLs

If you have existing webhooks with `?agentId=` parameters:

1. **Run Migration Script**
   ```bash
   npm run fix-twilio-webhooks
   ```

2. **Verify Configuration**
   - Check Twilio console for updated URLs
   - Test incoming calls

3. **Update Documentation**
   - Remove references to agent-specific URLs
   - Update team training materials 