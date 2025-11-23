# RevenueCat & Apple App Store Connect Setup Guide

This guide covers exactly what you need to do in RevenueCat and Apple App Store Connect to reflect the pricing changes ($5/week and $30 lifetime).

## Current App Configuration

Your app is configured to look for:
- **Weekly Subscription**: Product ID `unreal_weekly_sub` (or any product with "weekly" in the identifier)
- **Lifetime Purchase**: Product ID `unreal_lifetime` (or any NON_CONSUMABLE product with "lifetime" in the identifier)

## Step 1: Apple App Store Connect Setup

### 1.1 Create Weekly Subscription

1. **Log into App Store Connect** → Your App → Features → In-App Purchases
2. **Click "+" to create new in-app purchase**
3. **Select "Auto-Renewable Subscription"**
4. **Fill in the details:**
   - **Product ID**: `unreal_weekly_sub` (must match exactly)
   - **Subscription Group**: Create a new group (e.g., "Unreal Premium") or use existing
   - **Duration**: 1 Week
   - **Price**: $4.99 USD (will display as $5/week)
   - **Display Name**: "Weekly Subscription" (or "Unreal+ Weekly")
   - **Description**: "Get full access to biometrics and life trajectory simulations"
5. **Add Localization** (if needed):
   - Add display name and description in other languages
6. **Save and Submit for Review**

### 1.2 Create Lifetime Purchase

1. **In App Store Connect** → In-App Purchases
2. **Click "+" to create new in-app purchase**
3. **Select "Non-Consumable"** (this is important - NOT consumable!)
4. **Fill in the details:**
   - **Product ID**: `unreal_lifetime` (must match exactly)
   - **Price**: $29.99 USD (will display as $30)
   - **Display Name**: "Lifetime Access" (or "Unreal+ Lifetime")
   - **Description**: "One-time payment for lifetime access to all premium features"
5. **Add Localization** (if needed)
6. **Save and Submit for Review**

### 1.3 Important Notes for App Store Connect

- ⚠️ **Product IDs must match exactly**: `unreal_weekly_sub` and `unreal_lifetime`
- ⚠️ **Lifetime must be Non-Consumable**: This allows it to be restored across devices
- ⚠️ **Both products must be approved** before they'll work in production
- ⚠️ **For testing**: Use Sandbox Tester accounts (set up in Users and Access → Sandbox)

## Step 2: RevenueCat Dashboard Setup

### 2.1 Add Products to RevenueCat

1. **Log into RevenueCat Dashboard** → Your Project → Products
2. **Add Weekly Subscription Product:**
   - Click "Add Product" or "Sync Products"
   - Select "iOS App Store"
   - Enter Product ID: `unreal_weekly_sub`
   - RevenueCat will automatically sync product details from App Store Connect
   - Verify price shows as $4.99/week

3. **Add Lifetime Product:**
   - Click "Add Product" or "Sync Products"
   - Select "iOS App Store"
   - Enter Product ID: `unreal_lifetime`
   - RevenueCat will automatically sync product details
   - Verify price shows as $29.99

### 2.2 Configure Entitlement

1. **Go to Entitlements** → Find or create `premium` entitlement
2. **Attach both products to the entitlement:**
   - Click on `premium` entitlement
   - Under "Products", add:
     - `unreal_weekly_sub` (weekly subscription)
     - `unreal_lifetime` (non-consumable)
   - Both should grant the `premium` entitlement when purchased

### 2.3 Configure Offerings

1. **Go to Offerings** → Current Offering (or create new "current" offering)
2. **Add Weekly Package:**
   - Click "Add Package"
   - **Identifier**: `$rc_weekly` (or any identifier you prefer)
   - **Product**: Select `unreal_weekly_sub`
   - Save

3. **Add Lifetime Package:**
   - Click "Add Package"
   - **Identifier**: `$rc_lifetime` (or any identifier you prefer)
   - **Product**: Select `unreal_lifetime`
   - Save

4. **Make sure the offering is set as "Current"** (there should be a toggle or setting)

### 2.4 Verify Configuration

Your RevenueCat setup should look like this:

```
Entitlements:
  └─ premium
      ├─ unreal_weekly_sub (Auto-Renewable Subscription)
      └─ unreal_lifetime (Non-Consumable)

Offerings:
  └─ current (Current Offering)
      ├─ Package: $rc_weekly → unreal_weekly_sub
      └─ Package: $rc_lifetime → unreal_lifetime
```

## Step 3: Testing Checklist

### Before Testing

- [ ] Both products created in App Store Connect
- [ ] Products submitted for review (or in "Ready to Submit" status)
- [ ] Products added to RevenueCat
- [ ] Both products attached to `premium` entitlement
- [ ] Offering configured with both packages
- [ ] Sandbox tester account created in App Store Connect

### Test Weekly Subscription

1. **Build app** (EAS build or TestFlight)
2. **Sign in with Sandbox Tester account** on device
3. **Navigate to Premium screen**
4. **Select "Weekly" option**
5. **Tap purchase button**
6. **Complete purchase** (Sandbox purchases are free)
7. **Verify:**
   - [ ] Purchase completes successfully
   - [ ] Premium features unlock immediately
   - [ ] Premium status shows in profile

### Test Lifetime Purchase

1. **On same device** (or different device with same sandbox account)
2. **Navigate to Premium screen**
3. **Select "Lifetime" option**
4. **Tap purchase button**
5. **Complete purchase**
6. **Verify:**
   - [ ] Purchase completes successfully
   - [ ] Premium features unlock
   - [ ] Premium status persists after app restart
   - [ ] Can restore purchase on different device

### Test Restore Purchases

1. **Delete and reinstall app** (or use "Restore Purchases" button)
2. **Sign in with same Sandbox Tester account**
3. **Tap "Restore Purchases"**
4. **Verify:**
   - [ ] Both weekly and lifetime purchases restore correctly
   - [ ] Premium status activates

## Step 4: Production Checklist

Before going live:

- [ ] Both products approved in App Store Connect
- [ ] Products are "Ready for Sale" status
- [ ] RevenueCat products synced correctly
- [ ] Entitlement configured correctly
- [ ] Offering set as "Current"
- [ ] Tested with Sandbox accounts
- [ ] Verified pricing displays correctly ($5/week, $30 lifetime)
- [ ] Webhook configured (if using) to sync premium status to Supabase

## Troubleshooting

### Products Not Showing in App

**Issue**: Premium screen shows "No packages available"

**Solutions**:
- Verify products exist in App Store Connect
- Check products are approved or at least "Ready to Submit"
- Verify Product IDs match exactly (`unreal_weekly_sub`, `unreal_lifetime`)
- Check RevenueCat dashboard → Products → verify products are synced
- Check RevenueCat dashboard → Offerings → verify offering is set as "Current"
- Try syncing products again in RevenueCat

### Wrong Product Detected

**Issue**: App selects wrong product when choosing weekly/lifetime

**Solutions**:
- Check package identifiers in RevenueCat match what code expects (`$rc_weekly`, `$rc_lifetime`)
- Verify product types: weekly should be `WEEKLY` or `SUBSCRIPTION`, lifetime should be `NON_CONSUMABLE`
- Check console logs for available packages (code logs this on error)

### Purchase Not Granting Premium

**Issue**: Purchase completes but premium status doesn't activate

**Solutions**:
- Verify both products are attached to `premium` entitlement in RevenueCat
- Check RevenueCat dashboard → Customers → find your test user → verify entitlement shows as active
- Check webhook logs (if configured) to see if purchase event was received
- Verify Supabase `is_premium` field updates (if using webhook)

### Lifetime Purchase Not Restoring

**Issue**: Lifetime purchase doesn't restore on new device

**Solutions**:
- Verify lifetime product is set as **Non-Consumable** (not Consumable) in App Store Connect
- Check RevenueCat → Customer → verify purchase shows in purchase history
- Ensure using same Apple ID for restore
- Try "Restore Purchases" button in app

## Quick Reference

### Product IDs (Must Match Exactly)
- Weekly: `unreal_weekly_sub`
- Lifetime: `unreal_lifetime`

### Package Identifiers (RevenueCat)
- Weekly: `$rc_weekly` (or custom)
- Lifetime: `$rc_lifetime` (or custom)

### Entitlement Name
- `premium` (must match exactly)

### Pricing
- Weekly: $4.99/week (displays as $5/week)
- Lifetime: $29.99 (displays as $30)

## Support Resources

- **RevenueCat Docs**: https://docs.revenuecat.com/
- **Non-Consumables Guide**: https://docs.revenuecat.com/docs/non-subscriptions
- **App Store Connect Help**: https://help.apple.com/app-store-connect/
- **RevenueCat Community**: https://community.revenuecat.com/

