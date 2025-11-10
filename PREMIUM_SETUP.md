# RevenueCat Premium Setup Guide

This guide covers the RevenueCat premium subscription integration for the Unreal app.

## Overview

The app now includes:
- ✅ RevenueCat subscription management
- ✅ Monthly ($9.99) and Yearly ($94.99) subscription options
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
   - Monthly subscription: `$9.99/month`
   - Yearly subscription: `$94.99/year` (20% discount)

4. Create an entitlement called `premium` in RevenueCat dashboard
5. Attach both subscription products to the `premium` entitlement
6. Configure offerings with your products

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
- Monthly and yearly subscription toggle
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
- [ ] Can toggle between monthly and yearly
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

Your actual Product IDs:
- Monthly: `unreal_monthly_sub`
- Yearly: `unreal_yearly_sub`

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
   - Suggested: `unreal_monthly` and `unreal_yearly`
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

## Support

For RevenueCat-specific issues:
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat Community](https://community.revenuecat.com/)

For app-specific issues:
- Check implementation in files listed above
- Review console logs for error messages
- Verify database schema matches migration

