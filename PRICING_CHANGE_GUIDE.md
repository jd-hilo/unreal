# Pricing Change Guide: $5/week & $30 Lifetime

This guide walks you through the complete process of changing your pricing from monthly/yearly subscriptions to weekly subscriptions and lifetime purchases.

## ✅ Code Changes (Already Complete)

The following code changes have been made:

1. **`app/premium.tsx`** - Updated to show:
   - Weekly subscription option ($5/week)
   - Lifetime purchase option ($30 one-time)
   - Updated package detection logic
   - Updated UI text and messaging

2. **`PREMIUM_SETUP.md`** - Updated documentation with new pricing structure

## 📋 What You Need to Do

### Step 1: App Store Connect Configuration

1. **Log into App Store Connect**
   - Go to: https://appstoreconnect.apple.com
   - Navigate to your app → Features → In-App Purchases

2. **Create Weekly Subscription Product**
   - Click the "+" button to create a new in-app purchase
   - Select: **Auto-Renewable Subscription**
   - **Product ID**: `unreal_weekly_sub` (or your preferred ID)
   - **Subscription Group**: Create a new group or use existing
   - **Duration**: 1 Week
   - **Price**: $4.99 (will display as $5/week)
   - **Localization**: Add display name and description
   - **Review Information**: Fill out required fields
   - **Submit for Review**

3. **Create Lifetime Purchase Product**
   - Click the "+" button to create a new in-app purchase
   - Select: **Non-Consumable**
   - **Product ID**: `unreal_lifetime` (or your preferred ID)
   - **Price**: $29.99 (will display as $30)
   - **Localization**: Add display name and description
   - **Review Information**: Fill out required fields
   - **Submit for Review**

   ⚠️ **Important**: Non-Consumable products require review and approval from Apple.

### Step 2: RevenueCat Dashboard Configuration

1. **Log into RevenueCat Dashboard**
   - Go to: https://app.revenuecat.com
   - Select your project

2. **Add Products**
   - Navigate to: Products → Add Product
   - **Weekly Subscription**:
     - Platform: iOS App Store
     - Product ID: `unreal_weekly_sub` (must match App Store Connect)
     - RevenueCat will sync product details automatically
   - **Lifetime Purchase**:
     - Platform: iOS App Store
     - Product ID: `unreal_lifetime` (must match App Store Connect)
     - RevenueCat will sync product details automatically

3. **Configure Entitlement**
   - Navigate to: Entitlements → `premium` (or create if doesn't exist)
   - Attach both products to the `premium` entitlement:
     - ✅ `unreal_weekly_sub` (weekly subscription)
     - ✅ `unreal_lifetime` (non-consumable)
   - Both products should grant the `premium` entitlement when purchased

4. **Configure Offerings**
   - Navigate to: Offerings → Current Offering (or create new)
   - Add **Weekly Package**:
     - Identifier: `$rc_weekly` (or custom identifier)
     - Product: `unreal_weekly_sub`
   - Add **Lifetime Package**:
     - Identifier: `$rc_lifetime` (or custom identifier)
     - Product: `unreal_lifetime`
   - Save the offering

### Step 3: Update Product IDs (If Needed)

If you used different product IDs than `unreal_weekly_sub` and `unreal_lifetime`, update the code:

**File**: `app/premium.tsx` (lines 33-46)

Update the package detection logic to match your product IDs:

```typescript
let pkg = selectedOption === 'weekly' 
  ? packages.find(p => 
      p.packageType === 'WEEKLY' || 
      p.identifier === '$rc_weekly' ||
      p.product.identifier === 'YOUR_WEEKLY_PRODUCT_ID' || // Update this
      p.identifier.includes('weekly') ||
      p.identifier.includes('week')
    )
  : packages.find(p => 
      p.packageType === 'CUSTOM' || 
      p.packageType === 'LIFETIME' ||
      p.identifier === '$rc_lifetime' ||
      p.product.identifier === 'YOUR_LIFETIME_PRODUCT_ID' || // Update this
      p.identifier.includes('lifetime') ||
      p.product.productType === 'NON_CONSUMABLE'
    );
```

### Step 4: Testing

1. **Set up iOS Sandbox Tester**
   - In App Store Connect → Users and Access → Sandbox Testers
   - Create a test account

2. **Test Weekly Subscription**
   - Build app with EAS or TestFlight
   - Sign in with sandbox tester account
   - Navigate to premium screen
   - Select "Weekly" option
   - Complete purchase flow
   - Verify premium features unlock

3. **Test Lifetime Purchase**
   - Use same sandbox tester account
   - Navigate to premium screen
   - Select "Lifetime" option
   - Complete purchase flow
   - Verify premium features unlock
   - Restart app and verify status persists

4. **Test Restore Purchases**
   - After making purchases, delete and reinstall app
   - Use "Restore Purchases" button
   - Verify both purchases restore correctly

### Step 5: Deploy

1. **Submit for Review**
   - Once products are approved in App Store Connect
   - Submit your app update (if needed)
   - Apple will review the in-app purchases

2. **Monitor**
   - Check RevenueCat dashboard for purchase events
   - Monitor Supabase for `is_premium` updates
   - Check Mixpanel for purchase analytics

## 🔍 Troubleshooting

### Products Not Showing Up
- Verify products are approved in App Store Connect
- Check that product IDs match exactly in RevenueCat
- Ensure offerings are configured correctly
- Check console logs for package detection issues

### Lifetime Purchase Not Working
- Verify product is set as "Non-Consumable" in App Store Connect
- Check that product is attached to `premium` entitlement
- Ensure package detection logic includes `NON_CONSUMABLE` product type

### Weekly Subscription Not Working
- Verify subscription duration is set to 1 Week
- Check that subscription is in an active subscription group
- Ensure package detection logic includes `WEEKLY` package type

## 📝 Important Notes

1. **Product IDs**: Must match exactly between App Store Connect, RevenueCat, and your code (if using specific IDs)

2. **Lifetime Purchases**: 
   - Are non-consumable products in iOS
   - Grant permanent access through entitlements
   - Can be restored across devices
   - Require Apple review and approval

3. **Weekly Subscriptions**:
   - Auto-renew every week
   - Users can cancel in App Store settings
   - Grant premium access while active

4. **Old Products**: You may want to deprecate old monthly/yearly products in RevenueCat, but keep them attached to the entitlement for existing subscribers.

## 📚 Additional Resources

- [RevenueCat Non-Consumables Guide](https://docs.revenuecat.com/docs/non-subscriptions)
- [App Store Connect In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [RevenueCat Weekly Subscriptions](https://docs.revenuecat.com/docs/entitlements)

## ✅ Checklist

- [ ] Create weekly subscription in App Store Connect
- [ ] Create lifetime non-consumable in App Store Connect
- [ ] Submit products for Apple review
- [ ] Add products to RevenueCat dashboard
- [ ] Attach both products to `premium` entitlement
- [ ] Configure offerings with both packages
- [ ] Test weekly subscription purchase
- [ ] Test lifetime purchase
- [ ] Test restore purchases
- [ ] Update product IDs in code (if different)
- [ ] Deploy to production

