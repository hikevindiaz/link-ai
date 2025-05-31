# 10DLC Implementation Documentation

## Overview

This document describes the production-ready 10DLC (10-Digit Long Code) registration implementation for LinkAI. The implementation follows Twilio's official A2P 10DLC registration process to ensure SMS compliance and deliverability.

## Architecture

### Components

1. **Trust Hub Integration**
   - Primary Customer Profile creation
   - A2P Messaging Profile management
   - Business verification

2. **Brand Registration**
   - Low-Volume Standard brand creation
   - Business identity verification
   - TCR (The Campaign Registry) integration

3. **Campaign Management**
   - MIXED use case campaigns for AI agents
   - Messaging Service creation and configuration
   - Phone number assignment

4. **Event Monitoring**
   - Webhook endpoints for status updates
   - Automatic campaign creation on brand approval
   - Real-time status synchronization

### Database Schema

The following fields have been added to support 10DLC:

#### User Model
```prisma
// Business information
companyType: String?              // 'standard' | 'sole_proprietor'
businessRegistrationNumber: String?
businessAddress: String?
businessName: String?
taxId: String?

// 10DLC Trust Hub fields
trustHubProfileSid: String?       // Primary Customer Profile SID
a2pProfileBundleSid: String?      // A2P Messaging Profile Bundle SID
a2pBrandSid: String?              // Brand Registration SID
```

#### TwilioPhoneNumber Model
```prisma
// 10DLC fields
messagingServiceSid: String?      // Messaging Service SID
a2pRegistrationStatus: String?    // not_started, pending, approved, rejected, requires_attention
a2pRegistrationError: String?
a2pRegisteredAt: DateTime?
a2pCampaignSid: String?          // Campaign SID
a2pBrandSid: String?             // Brand SID (duplicated for quick access)
```

## API Endpoints

### 1. Submit 10DLC Registration
**POST** `/api/twilio/phone-numbers/[id]/register-10dlc`

Initiates the 10DLC registration process for a phone number:
1. Creates/retrieves Trust Hub Customer Profile
2. Creates/retrieves A2P Messaging Profile
3. Creates/retrieves Brand Registration
4. Creates Messaging Service
5. Creates Campaign (if brand is approved)

**Response:**
```json
{
  "success": true,
  "message": "Phone number verification completed successfully!",
  "status": "approved|pending",
  "brandSid": "BN...",
  "campaignSid": "CM..."
}
```

### 2. Check Registration Status
**GET** `/api/twilio/phone-numbers/[id]/register-10dlc`

Returns the current registration status and checks for brand approval.

**Response:**
```json
{
  "success": true,
  "registration": {
    "status": "not_started|pending|approved|rejected|requires_attention",
    "error": "Error message if any",
    "registeredAt": "2024-01-01T00:00:00Z",
    "campaignSid": "CM...",
    "brandSid": "BN..."
  }
}
```

### 3. Webhook for Status Updates
**POST** `/api/twilio/webhook/10dlc-status`

Receives real-time updates from Twilio Event Streams about:
- Brand registration status changes
- Campaign approval/rejection
- Phone number registration updates

## User Flow

### 1. Initial Purchase
When a user purchases a phone number:
- Phone is assigned to their account
- Status shows as "Pending" with verification required
- User is notified about 10DLC requirements

### 2. Business Information Collection
User provides:
- Company name and type
- Business address
- Tax ID/EIN (for standard brands)
- Industry type
- Business website (optional)

### 3. Registration Process
1. **Trust Hub Profile Creation**
   - Validates business identity
   - Creates customer profile in Twilio Trust Hub

2. **Brand Registration**
   - Registers business with The Campaign Registry (TCR)
   - Low-Volume Standard brand for < 6,000 messages/day
   - Skips secondary vetting for faster approval

3. **Campaign Creation**
   - MIXED use case for AI agent communications
   - Sample messages for appointment reminders, notifications
   - Links phone number to campaign

### 4. Status Monitoring
- Real-time webhook updates via Event Streams
- Automatic campaign creation when brand is approved
- Status updates reflected in UI immediately

## Setup Instructions

### 1. Environment Variables
Ensure these are set in your `.env` file:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

### 2. Database Migration
Run the migration to add 10DLC fields:
```bash
npx prisma migrate deploy
```

### 3. Event Streams Setup
Configure Twilio Event Streams for webhook notifications:
```bash
node scripts/setup-10dlc-event-streams.js
```

This creates:
- Webhook sink pointing to `/api/twilio/webhook/10dlc-status`
- Subscriptions for all 10DLC-related events
- Automatic status monitoring

### 4. Testing
For development/testing:
1. Use test credentials from Twilio Console
2. Brand registration typically takes 5-15 minutes
3. Campaign approval is usually instant after brand approval

## Best Practices

### 1. Error Handling
- All API calls have proper error handling
- Failed registrations update status to `requires_attention`
- Error messages are stored and displayed to users

### 2. Data Consistency
- Brand/Campaign SIDs are stored at multiple levels
- Status is recalculated on each view
- Webhook updates ensure real-time accuracy

### 3. User Experience
- Clear messaging about verification requirements
- Step-by-step progress indicators
- Automatic progression when possible

### 4. Compliance
- Follows Twilio's A2P 10DLC guidelines
- Uses appropriate use case (MIXED)
- Includes required sample messages

## Campaign Message Samples

The implementation uses these pre-approved message templates:
1. Appointment reminders
2. Order/shipping notifications
3. Customer feedback requests
4. Subscription reminders
5. Appointment confirmations

These cover common AI agent use cases while maintaining compliance.

## Troubleshooting

### Common Issues

1. **Brand Registration Failures**
   - Verify business information accuracy
   - Ensure Tax ID/EIN is valid
   - Check address formatting

2. **Campaign Creation Errors**
   - Brand must be approved first
   - Messaging Service must exist
   - Phone number must be active

3. **Webhook Not Receiving Events**
   - Verify Event Streams configuration
   - Check webhook URL accessibility
   - Review Twilio Event Streams logs

### Debug Commands

Check brand status:
```javascript
const brand = await twilioClient.messaging.v1.a2p
  .brandRegistrations('BN...')
  .fetch();
console.log(brand.status);
```

Check campaign status:
```javascript
const campaign = await twilioClient.messaging.v1.a2p
  .usAppToPerson('QE...')
  .fetch();
console.log(campaign.campaignStatus);
```

## Future Enhancements

1. **Sole Proprietor Support**
   - Add flow for individual/hobbyist users
   - Implement email/phone OTP verification

2. **Standard Brand with Vetting**
   - Support for high-volume senders (>6,000 msgs/day)
   - Secondary vetting integration

3. **Multiple Campaigns**
   - Support different use cases per brand
   - Campaign-specific message templates

4. **Bulk Registration**
   - Register multiple phone numbers at once
   - Batch campaign creation

## References

- [Twilio A2P 10DLC Documentation](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)
- [Brand Registration API](https://www.twilio.com/docs/messaging/api/brand-registration-resource)
- [Campaign API](https://www.twilio.com/docs/messaging/api/us-app-to-person-resource)
- [Event Streams Documentation](https://www.twilio.com/docs/events) 