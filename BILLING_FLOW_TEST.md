# Billing Flow Testing Guide

This guide walks through testing the complete billing flow from plan selection to payment to billing information display.

## 🚀 Quick Test

Run the automated test script:

```bash
node scripts/test-billing-flow.js
```

This verifies:
- ✅ Environment variables are configured
- ✅ Stripe price IDs exist and are valid
- ✅ Database schema is correct
- ✅ Plan mapping is configured
- ✅ Webhook events are structured properly
- ✅ Usage tracking is ready

## 🔧 Manual Testing Steps

### 1. Environment Setup

Ensure these environment variables are set in your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Plan Price IDs (from env-variables-to-add.txt)
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_1RUDYnBMnxCzo29MYxGrDWG7
NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID=price_1RUDYoBMnxCzo29MXVYvVNNv  
NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID=price_1RUDYpBMnxCzo29MpWmyrw6f
```

### 2. User Flow Testing

#### A. New User (No Plan)

1. **Navigate to Settings**
   - Go to `/dashboard/settings?tab=billing`
   - Should see "No active plan" empty state
   - Click "Choose a plan" button

2. **Plan Selection**
   - Pricing dialog should open with 3 plans:
     - Starter ($69/month)
     - Growth ($199/month) - marked as "Most Popular"
     - Scale ($499/month)
   - Click "Start Free Trial" on any plan

3. **Stripe Checkout**
   - Should redirect to Stripe hosted checkout page
   - Use test card: `4242 4242 4242 4242`
   - Complete payment with any email/address

4. **Post-Payment**
   - Should redirect back to settings billing tab
   - Should see billing overview with:
     - Plan name and price
     - Usage progress bars
     - Total for current month
   - Subscription status should be "active"

#### B. Existing User (Plan Change)

1. **Plan Change**
   - From billing tab, click "Compare pricing plans"
   - Select a different plan
   - Should redirect to Stripe billing portal
   - Change plan and confirm

2. **Verify Changes**
   - Return to settings billing tab
   - Should see updated plan information
   - Usage limits should reflect new plan

### 3. Billing Information Verification

After successful payment, verify the billing overview shows:

#### Plan Information
- ✅ Correct plan name (Starter/Growth/Scale)
- ✅ Correct monthly price ($69/$199/$499)
- ✅ Plan features description

#### Usage Tracking
- ✅ Progress bars for each usage type
- ✅ "Used X / Y included" format
- ✅ Red progress bars for overages (if any)
- ✅ Overage costs calculated correctly

#### Payment Methods
- ✅ Card information displayed correctly
- ✅ Default payment method marked
- ✅ Add/remove payment methods works

#### Billing History
- ✅ Previous invoices listed
- ✅ Correct amounts and dates
- ✅ Download/view invoice links work

### 4. Webhook Testing

Verify webhooks are working correctly:

1. **Stripe Dashboard**
   - Go to Stripe Dashboard > Developers > Webhooks
   - Check recent webhook deliveries
   - Ensure successful responses (200 status)

2. **Key Webhook Events**
   - `customer.subscription.created` - Creates subscription
   - `customer.subscription.updated` - Updates plan changes
   - `invoice.payment_succeeded` - Marks as paid
   - `setup_intent.succeeded` - Saves payment methods

### 5. Edge Cases Testing

#### Payment Failures
1. Use declined test card: `4000 0000 0000 0002`
2. Should handle gracefully with error messages
3. User should remain on free plan

#### Plan Downgrades
1. Change from higher to lower plan
2. Verify usage limits are updated
3. Check overage calculations

#### Subscription Cancellation
1. Cancel subscription via Stripe portal
2. Verify user sees "No active plan" state
3. Phone numbers should be suspended

## 🐛 Common Issues & Solutions

### Environment Variables Not Found
```bash
# Run the test script to verify
node scripts/test-billing-flow.js

# Add missing variables to .env
cp env-variables-to-add.txt .env.local
```

### Webhook Not Receiving Events
1. Check webhook URL in Stripe dashboard
2. Ensure it points to: `https://yourdomain.com/api/webhooks/stripe`
3. Verify webhook secret matches environment variable

### Database Schema Issues
```bash
# Update database schema
npx prisma db push

# Check if tables exist
npx prisma studio
```

### Plan Mapping Errors
1. Verify price IDs in Stripe dashboard
2. Check environment variables match
3. Ensure no typos in price IDs

## 📊 Expected Results

After completing the flow, users should see:

### No Plan State
- Empty state card with "Choose a plan" button
- Clear messaging about getting started

### Active Plan State
- Integrated billing overview with usage
- Progress bars showing current usage
- Overage calculations when applicable
- Payment method management
- Billing history access

### Plan Changes
- Smooth transition between plans
- Updated usage limits immediately
- Proper proration handling via Stripe

## 🎯 Success Criteria

✅ **Plan Selection**: Users can easily choose and purchase plans
✅ **Payment Processing**: Stripe handles payments securely
✅ **Subscription Management**: Plans are correctly activated/updated
✅ **Billing Display**: Users see accurate billing information
✅ **Usage Tracking**: Real-time usage monitoring with overages
✅ **Plan Changes**: Existing users can upgrade/downgrade seamlessly

## 🆘 Support

If you encounter issues:

1. Run the test script first: `node scripts/test-billing-flow.js`
2. Check Stripe dashboard for webhook deliveries
3. Verify database has correct subscription data
4. Test with different browsers/incognito mode
5. Check browser console for JavaScript errors

The billing system is now fully integrated and ready for production use! 🚀 