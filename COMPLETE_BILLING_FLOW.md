# Complete Billing Flow Documentation

## Overview

The LinkAI billing system provides a seamless, integrated experience for plan selection, payment processing, and usage tracking - all within the dashboard without redirecting to Stripe.

## Key Components

### 1. **Pricing Dialog** (`components/billing/pricing-dialog.tsx`)
- Shows all available plans (Starter $69, Growth $199, Scale $499)
- Handles plan selection and triggers checkout confirmation
- Supports monthly/yearly toggle (15% discount for yearly)
- Shows current plan and allows upgrades/downgrades

### 2. **Checkout Confirmation Dialog** (`components/billing/checkout-confirmation-dialog.tsx`)
- Shows checkout summary with selected plan details
- Displays saved payment methods
- Allows adding new payment methods inline
- Processes subscription directly without Stripe redirect
- Shows success animation on completion

### 3. **Billing Overview** (Settings > Billing tab)
- **Integrated Billing & Usage**: Shows plan cost + usage in one view
- **Progress Bars**: Visual representation of resource usage
- **Overage Tracking**: Real-time calculation of overages
- **Empty State**: Clean CTA when no plan is active

### 4. **API Endpoints**

#### `/api/billing/confirm-subscription`
- Handles direct subscription creation/updates
- Uses saved payment methods for instant processing
- Falls back to trial if payment method issues
- Updates database immediately (no webhook dependency)

#### `/api/billing/usage`
- Returns formatted usage summary with:
  - Current usage metrics
  - Plan limits
  - Utilization percentages
  - Overage costs

## User Flow

### New User Journey
1. User sees empty state in billing → "Choose a plan" button
2. Opens pricing dialog → Selects plan
3. Checkout confirmation dialog → Add payment method
4. Payment method added inline → Confirm checkout
5. Success animation → Plan activated immediately

### Existing User Journey
1. User clicks "View pricing plans" or plan selection
2. Selects new plan in pricing dialog
3. Checkout confirmation shows saved payment methods
4. One-click confirmation → Instant plan change
5. Success animation → Updated billing overview

## Key Improvements

### 1. **No Stripe Redirects**
- All payment processing happens in-dashboard
- Better UX with instant feedback
- Maintains user context

### 2. **Smart Payment Handling**
- Automatically uses saved payment methods
- Inline payment method addition
- Graceful fallbacks for failures

### 3. **Integrated Billing & Usage**
- Single view for all billing information
- Real-time usage tracking with progress bars
- Clear overage cost calculations

### 4. **Immediate Database Updates**
- No dependency on webhooks for critical updates
- Plan changes reflect instantly
- Better reliability

### 5. **Visual Feedback**
- Success animations for completed actions
- Loading states for all operations
- Clear error messages

## Environment Variables

```env
# Required Stripe Price IDs
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_1RUDYnBMnxCzo29MYxGrDWG7
NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID=price_1RUDYoBMnxCzo29MXVYvVNNv  
NEXT_PUBLIC_STRIPE_SCALE_PRICE_ID=price_1RUDYpBMnxCzo29MpWmyrw6f

# Stripe Webhook Secret (for webhook handlers)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Database Schema

The billing system uses these key fields on the User model:
- `stripeCustomerId`: Stripe customer ID
- `stripeSubscriptionId`: Active subscription ID
- `stripePriceId`: Current plan's price ID
- `stripeSubscriptionStatus`: Subscription status
- `stripeCurrentPeriodEnd`: Billing period end date

## Testing the Flow

### Debug Script
Run the debug script to check user's billing status:
```bash
node scripts/debug-billing.js user@example.com
```

This shows:
- Database subscription status
- Stripe customer details
- Payment methods
- Active subscriptions
- Recent Stripe events

### Manual Testing
1. Create new account
2. Navigate to Settings > Billing
3. Click "Choose a plan"
4. Select a plan and add payment method
5. Verify immediate plan activation
6. Test plan changes with saved payment method

## Error Handling

The system handles these scenarios gracefully:
- No payment methods: Prompts to add one
- Failed payments: Clear error messages
- Network issues: Retry mechanisms
- Invalid plans: Fallback to starter

## Webhook Integration

While the system doesn't depend on webhooks for immediate updates, they're still handled for:
- Long-term subscription status sync
- Payment failure notifications
- Subscription cancellations
- Invoice generation

## Future Enhancements

Consider adding:
- Multiple payment method management
- Subscription pause/resume
- Custom billing cycles
- Team billing management
- Invoice customization 