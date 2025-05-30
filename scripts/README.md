# Phone Number Debugging & Repair Scripts

This directory contains scripts for debugging and repairing phone number issues in the LinkAI platform.

## 🔍 Scripts Overview

### `debug-phone-numbers.js`
**Purpose**: Comprehensive analysis of phone number database state

**Usage**:
```bash
node scripts/debug-phone-numbers.js
```

**What it does**:
- Analyzes all phone numbers in the database
- Checks Stripe subscription status for each number
- Identifies issues like missing Twilio SIDs, subscription items, etc.
- Provides detailed recommendations for fixes
- Shows breakdown by status (active/suspended/warning/pending)

**Sample Output**:
```
📱 Found 1 phone numbers in database

📞 Analyzing: +17875923061
   User: hello@getlinkai.com
   Status: warning
   Monthly Price: $3.25
   Twilio SID: PN68d64048bd0ce2675b8816e53381f263
   Agent: Not assigned
   Subscription Item: MISSING
   🚨 Issues found:
      ⚠️  Missing subscription item - billing may not work
```

### `fix-phone-number-statuses.js`
**Purpose**: Repair wrongly suspended phone numbers

**Usage**:
```bash
node scripts/fix-phone-number-statuses.js
```

**What it does**:
- Finds suspended phone numbers where users have payment methods
- Checks Stripe subscription status
- Updates status to `active` if subscription is active
- Updates status to `warning` if user has payment methods but no subscription
- Provides summary of changes made

**Sample Output**:
```
🔧 Starting Phone Number Status Repair...

Found 1 suspended phone numbers

Checking: +17875923061 (hello@getlinkai.com)
  ⚠️  Has payment methods but no subscription - setting to warning

✅ Phone number status repair completed!
📊 Summary:
   Fixed to active: 0
   Set to warning: 1
   Kept suspended: 0
```

## 🚨 When to Use These Scripts

### Use `debug-phone-numbers.js` when:
- Users report phone numbers showing as suspended despite having payments
- Investigating billing or status calculation issues
- After making changes to status calculation logic
- Monthly health checks on phone number data
- Before deploying changes to production

### Use `fix-phone-number-statuses.js` when:
- After identifying suspended numbers that should be active
- Following updates to status calculation logic
- Migrating from old to new billing systems
- Recovering from database inconsistencies

## 🔧 Required Environment Variables

Both scripts require:
```env
STRIPE_SECRET_KEY=sk_...
DATABASE_URL=postgresql://...
```

## ⚠️ Safety Notes

1. **Always run in development first** to test the scripts
2. **Backup the database** before running repair scripts in production
3. **Review the output** of debug script before running repair script
4. **Scripts are idempotent** - safe to run multiple times
5. **Monitor logs** for any unexpected errors during execution

## 📊 Status Meanings

- **`active`**: Phone number is working, user has active subscription
- **`warning`**: Phone number may work but has billing/configuration issues
- **`pending`**: Phone number is being set up or waiting for configuration
- **`suspended`**: Phone number is not working due to billing issues

## 🎯 Common Issues & Solutions

### Issue: "Missing Twilio SID"
**Meaning**: Phone number was saved to database but never actually purchased from Twilio
**Solution**: User needs to purchase the number again through the proper flow

### Issue: "Missing subscription item"
**Meaning**: Legacy number from before subscription integration
**Solution**: Usually not critical if user has active subscription

### Issue: "Suspended despite payment methods"
**Meaning**: Status calculation is too aggressive
**Solution**: Run the repair script to fix status

### Issue: "Stripe subscription not found"
**Meaning**: Subscription was deleted or corrupted
**Solution**: User needs to resubscribe or contact support

## 🔄 Maintenance Schedule

**Weekly**: Run debug script to check for new issues
**Monthly**: Run repair script to fix accumulated status issues
**After changes**: Always run debug script after modifying purchase or status logic
**Before deployments**: Run debug script to ensure no regressions

## 📞 Support Escalation

If scripts reveal issues that can't be automatically fixed:

1. **Missing Twilio SIDs**: Contact Twilio support to verify number ownership
2. **Billing discrepancies**: Review Stripe dashboard for subscription issues  
3. **Data corruption**: May require manual database intervention
4. **API failures**: Check Twilio and Stripe service status

---

*These scripts are essential tools for maintaining the health of the phone number purchase and billing system.* 