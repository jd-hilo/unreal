# RevenueCat Premium Setup Guide

This guide covers the RevenueCat premium subscription integration for the Unreal app.

## Overview

The app now includes:
- ✅ RevenueCat subscription management
- ✅ Weekly ($5/week) subscription option
- ✅ Lifetime ($30 one-time) purchase option
- ✅ Premium gating for biometrics and life trajectory simulations
- ✅ Beautiful premium paywall screen
- ✅ Profile upgrade option

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install `react-native-purchases` (v8.2.3) which has been added to package.json.

### 2. Configure RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Create or configure your app with the iOS API key: `appl_hsvLarkYcuThwdbbYQbCpOfHUuV`
3. Set up your products in App Store Connect:
   - **Weekly subscription**: `$4.99/week` (Product Type: Auto-Renewable Subscription, Duration: 1 Week)
   - **Lifetime purchase**: `$29.99` (Product Type: Non-Consumable)

4. Create an entitlement called `premium` in RevenueCat dashboard
5. Attach both products (weekly subscription AND lifetime non-consumable) to the `premium` entitlement
6. Configure offerings with your products:
   - Create a "current" offering
   - Add weekly subscription package
   - Add lifetime non-consumable package

### 3. Database Migration

Run the Supabase migration to add the `is_premium` field:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration manually in Supabase dashboard
# File: supabase/migrations/20251110000000_add_premium_field.sql
```

### 4. Testing with Manual Premium Override

For testing purposes, you can manually set users as premium in Supabase:

```sql
-- Set a user as premium
UPDATE profiles 
SET is_premium = true 
WHERE user_id = 'your-user-id-here';

-- Check premium status
SELECT user_id, first_name, is_premium 
FROM profiles 
WHERE user_id = 'your-user-id-here';
```

## Features

### 1. Premium Paywall (`/premium`)
- Beautiful, high-converting design
- Weekly subscription and lifetime purchase toggle
- Feature highlights
- Purchase and restore functionality
- Shows active subscription status for premium users

### 2. Gated Features

#### Biometrics (What-If Results)
- Location: `app/whatif/[id].tsx`
- Non-premium users see blurred biometrics with an "Unlock" overlay
- Tapping redirects to premium screen

#### Life Trajectory Simulations
- Location: `app/decision/[id].tsx`
- Simulate button shows lock icon for non-premium users
- Alert dialog prompts upgrade on tap

### 3. Profile Integration
- Unreal+ card in profile screen
- Shows premium status with crown icon for active subscribers
- Shows upgrade prompt with sparkle icon for free users
- Tapping navigates to premium screen

## Architecture

### Files Created/Modified

#### New Files
- `lib/revenuecat.ts` - RevenueCat service layer
- `hooks/usePremium.ts` - Premium subscription hook
- `app/premium.tsx` - Premium paywall screen
- `supabase/migrations/20251110000000_add_premium_field.sql` - Database migration

#### Modified Files
- `package.json` - Added react-native-purchases dependency
- `app.json` - Added RevenueCat API key
- `types/database.ts` - Added is_premium field to profiles table
- `store/useTwin.ts` - Added premium state management
- `app/_layout.tsx` - Initialize premium check on app launch
- `app/whatif/[id].tsx` - Gate biometrics with blur overlay
- `app/decision/[id].tsx` - Gate simulate button
- `app/(tabs)/profile.tsx` - Add Unreal+ upgrade card

## State Management

Premium status is managed through the `useTwin` Zustand store:

```typescript
const { isPremium } = useTwin();
```

The status is:
1. Checked on app launch via RevenueCat
2. Synced to Supabase for fallback/caching
3. Updated after successful purchases
4. Refreshed on profile screen focus

## Testing Checklist

### Free User Flow
- [ ] Biometrics in what-if screen are blurred with unlock overlay
- [ ] Simulate button shows "(Premium)" label with lock icon
- [ ] Tapping gated features shows upgrade prompt
- [ ] Premium card in profile shows "Upgrade to Unreal+"

### Premium Purchase Flow
- [ ] Premium screen loads available packages
- [ ] Can toggle between weekly subscription and lifetime purchase
- [ ] Purchase completes successfully
- [ ] After purchase, redirects back with confirmation
- [ ] Premium status updates immediately

### Premium User Experience
- [ ] Biometrics display without overlay
- [ ] Simulate button works without restrictions
- [ ] Premium card shows "Unreal+ Active" with crown icon
- [ ] Premium screen shows "You're Premium!" message

### Restore Purchases
- [ ] Restore button works on premium screen
- [ ] Successfully restores previous purchase
- [ ] Shows appropriate message if no purchases found

## Manual Testing Setup

### For Testing Without Real Purchases

Your actual Product IDs (configure these in App Store Connect):
- Weekly: `unreal_weekly_sub` (or similar)
- Lifetime: `unreal_lifetime` (or similar)

1. **Set user as premium in Supabase:**
   ```sql
   UPDATE profiles SET is_premium = true WHERE user_id = 'test-user-id';
   ```

2. **Reload the app** to see premium features unlocked

3. **Test gated features:**
   - Navigate to a what-if result → biometrics should be visible
   - Navigate to a decision result → simulate button should work

### For Testing Real Purchases

1. **Set up iOS Sandbox Tester** in App Store Connect
2. **Build with EAS or run on TestFlight**
3. **Test purchase flow** with sandbox account
4. **Verify RevenueCat webhook** receives purchase event
5. **Check Supabase** for is_premium update

## RevenueCat Configuration Notes

### Required Setup in RevenueCat Dashboard:

1. **Entitlement Name:** `premium`
   - This is checked in `lib/revenuecat.ts` → `isPremiumActive()`

2. **Product Identifiers (in App Store Connect):**
   - Weekly subscription: `unreal_weekly_sub` (Auto-Renewable Subscription, 1 Week duration)
   - Lifetime purchase: `unreal_lifetime` (Non-Consumable product)
   - Must match what you configure in RevenueCat offerings

3. **Offerings:**
   - Create a "current" offering
   - Add both monthly and yearly packages

## Environment Variables

The RevenueCat API key is stored in `app.json`:

```json
{
  "expo": {
    "extra": {
      "revenuecatApiKey": "appl_hsvLarkYcuThwdbbYQbCpOfHUuV"
    }
  }
}
```

For production, consider using environment-specific keys.

## Troubleshooting

### Premium status not updating
- Check RevenueCat dashboard for webhook logs
- Verify entitlement is named exactly `premium`
- Check Supabase for is_premium field value
- Try calling `checkPremiumStatus(userId)` manually

### Purchases not working
- Verify you're testing on a real device or TestFlight
- Check that products are set up in App Store Connect
- Ensure products are approved and available
- Check RevenueCat logs for error messages

### Biometrics still showing as locked
- Verify `isPremium` state in useTwin store
- Check that user is authenticated
- Ensure premium status was synced from RevenueCat

## Step-by-Step Pricing Setup Guide

### Changing from Monthly/Yearly to Weekly/Lifetime

To change your pricing to **$5/week** and **$30 lifetime**, follow these steps:

#### Step 1: App Store Connect Setup

1. **Log into App Store Connect** → Your App → Features → In-App Purchases
2. **Create Weekly Subscription:**
   - Click "+" to create new in-app purchase
   - Select "Auto-Renewable Subscription"
   - Product ID: `unreal_weekly_sub` (or your preferred ID)
   - Subscription Group: Create new or use existing
   - Duration: 1 Week
   - Price: $4.99 (App Store will show as $5/week)
   - Localization: Add display name and description
   - Submit for review

3. **Create Lifetime Purchase:**
   - Click "+" to create new in-app purchase
   - Select "Non-Consumable"
   - Product ID: `unreal_lifetime` (or your preferred ID)
   - Price: $29.99 (App Store will show as $30)
   - Localization: Add display name and description
   - Submit for review

#### Step 2: RevenueCat Dashboard Setup

1. **Log into RevenueCat Dashboard** → Your Project → Products
2. **Add Weekly Subscription Product:**
   - Click "Add Product"
   - Select "iOS App Store"
   - Enter Product ID: `unreal_weekly_sub` (must match App Store Connect)
   - RevenueCat will sync the product details

3. **Add Lifetime Product:**
   - Click "Add Product"
   - Select "iOS App Store"
   - Enter Product ID: `unreal_lifetime` (must match App Store Connect)
   - RevenueCat will sync the product details

4. **Configure Entitlement:**
   - Go to Entitlements → `premium` (or create if doesn't exist)
   - Attach both products:
     - `unreal_weekly_sub` (weekly subscription)
     - `unreal_lifetime` (non-consumable)
   - Both should grant the `premium` entitlement

5. **Configure Offerings:**
   - Go to Offerings → Current Offering (or create new)
   - Add Package for weekly subscription:
     - Identifier: `$rc_weekly` (or custom)
     - Product: `unreal_weekly_sub`
   - Add Package for lifetime:
     - Identifier: `$rc_lifetime` (or custom)
     - Product: `unreal_lifetime`
   - Save the offering

#### Step 3: Code Updates (Already Done)

The code has been updated to:
- ✅ Display weekly ($5/week) and lifetime ($30) options
- ✅ Detect weekly subscription packages
- ✅ Detect lifetime non-consumable packages
- ✅ Handle both purchase types correctly

#### Step 4: Testing

1. **Test Weekly Subscription:**
   - Use iOS Sandbox Tester account
   - Navigate to premium screen
   - Select "Weekly" option
   - Complete purchase flow
   - Verify premium status activates

2. **Test Lifetime Purchase:**
   - Use iOS Sandbox Tester account
   - Navigate to premium screen
   - Select "Lifetime" option
   - Complete purchase flow
   - Verify premium status activates
   - Verify it persists after app restart

3. **Test Restore Purchases:**
   - After making a purchase, delete and reinstall app
   - Use "Restore Purchases" button
   - Verify both weekly and lifetime purchases restore correctly

#### Step 5: Important Notes

- **Lifetime purchases** are handled as non-consumables in iOS, which means:
  - They grant permanent access through the `premium` entitlement
  - They can be restored across devices
  - RevenueCat will track them in customer info

- **Weekly subscriptions** will:
  - Auto-renew every week
  - Grant `premium` entitlement while active
  - Require cancellation in App Store settings

- **Product IDs** must match exactly between:
  - App Store Connect
  - RevenueCat Dashboard
  - Your code (if you use specific identifiers)

## Support

For RevenueCat-specific issues:
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat Community](https://community.revenuecat.com/)
- [RevenueCat Non-Consumables Guide](https://docs.revenuecat.com/docs/non-subscriptions)

For app-specific issues:
- Check implementation in files listed above
- Review console logs for error messages
- Verify database schema matches migration

