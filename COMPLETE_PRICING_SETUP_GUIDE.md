# Complete Pricing Setup Guide: Weekly & Lifetime with Existing Subscriptions

This guide covers setting up your new pricing ($4.99/week and $29.99 lifetime) in Apple App Store Connect and RevenueCat, while properly handling your existing monthly/yearly subscriptions.

## Overview

**New Products:**
- Weekly Subscription: $4.99/week (`unreal_weekly_sub`)
- Lifetime Purchase: $29.99 (`unreal_lifetime`)

**Existing Products (Keep Active):**
- Monthly Subscription: Keep for existing subscribers
- Yearly Subscription: Keep for existing subscribers

---

## Part 1: Apple App Store Connect Setup

### Step 1.1: Create Weekly Subscription

1. **Log into App Store Connect**
   - Go to: https://appstoreconnect.apple.com
   - Navigate to: Your App → Features → In-App Purchases

2. **Create New Subscription**
   - Click the **"+"** button to create new in-app purchase
   - Select: **Auto-Renewable Subscription**

3. **Configure Weekly Subscription**
   - **Product ID**: `unreal_weekly_sub` (must match exactly)
   - **Subscription Group**: 
     - If you have existing subscriptions, add to the **same subscription group** as your monthly/yearly products
     - This allows users to switch between subscription tiers
   - **Duration**: **1 Week**
   - **Price**: **$4.99 USD** (will display as $4.99/week)

4. **Add Localization**
   - **Display Name**: "Weekly Subscription" or "Unreal+ Weekly"
   - **Description**: "Get full access to biometrics and life trajectory simulations. Renews weekly."
   - Add other languages if needed

5. **Review Information**
   - Fill out required review information
   - Add screenshots if required
   - Submit for review

### Step 1.2: Create Lifetime Purchase

1. **Create New In-App Purchase**
   - Click the **"+"** button
   - Select: **Non-Consumable** (⚠️ Important: NOT Consumable!)

2. **Configure Lifetime Purchase**
   - **Product ID**: `unreal_lifetime` (must match exactly)
   - **Price**: **$29.99 USD** (will display as $29.99)
   - **Display Name**: "Lifetime Access" or "Unreal+ Lifetime"
   - **Description**: "One-time payment for lifetime access to all premium features including biometrics and life trajectory simulations."

3. **Add Localization**
   - Add display name and description in all supported languages

4. **Submit for Review**
   - Non-consumable products require Apple review
   - This may take longer than subscriptions

### Step 1.3: Handle Existing Subscriptions

#### Option A: Keep Existing Products Active (Recommended)

**For Monthly/Yearly Subscriptions:**
- ✅ **Keep products active** - Don't delete them
- ✅ **Keep in subscription group** - Allows users to switch tiers
- ⚠️ **Optional**: Mark as "Removed from Sale" if you want to prevent new purchases
  - Go to product → Edit → Scroll to bottom → "Remove from Sale"
  - Existing subscribers continue to renew
  - New users won't see these options

#### Option B: Deprecate Gradually

1. **Monitor Active Subscriptions**
   - Go to: Sales and Trends → Subscriptions
   - See how many active subscribers you have on monthly/yearly

2. **Set Timeline**
   - Keep products active for 6-12 months
   - Let natural migration occur
   - Most users will either:
     - Continue their current plan
     - Cancel
     - Switch to new plan (if you provide upgrade path)

3. **Eventually Remove from Sale**
   - After most users have migrated
   - Mark as "Removed from Sale"
   - Keep products in system for remaining subscribers

### Step 1.4: Subscription Group Management

**Best Practice:**
- Keep all subscriptions (monthly, yearly, weekly) in the **same subscription group**
- This allows users to:
  - Switch between tiers
  - Upgrade/downgrade
  - See all available options in App Store settings

**To Check/Update Subscription Group:**
1. Go to: Features → In-App Purchases
2. Click on any subscription product
3. Check "Subscription Group" at the top
4. Ensure weekly subscription is in the same group as monthly/yearly

---

## Part 2: RevenueCat Dashboard Setup

### Step 2.1: Add New Products

1. **Log into RevenueCat Dashboard**
   - Go to: https://app.revenuecat.com
   - Select your project

2. **Add Weekly Subscription Product**
   - Navigate to: **Products** → Click **"Add Product"** or **"Sync Products"**
   - Select: **iOS App Store**
   - Enter Product ID: `unreal_weekly_sub`
   - RevenueCat will automatically sync:
     - Price ($4.99)
     - Duration (1 week)
     - Product details from App Store Connect
   - Verify the product appears correctly

3. **Add Lifetime Product**
   - Click **"Add Product"** or **"Sync Products"**
   - Select: **iOS App Store**
   - Enter Product ID: `unreal_lifetime`
   - RevenueCat will sync:
     - Price ($29.99)
     - Product type (Non-Consumable)
   - Verify the product appears correctly

### Step 2.2: Configure Entitlement

1. **Go to Entitlements**
   - Navigate to: **Entitlements** → Find or create `premium` entitlement

2. **Attach ALL Products to Entitlement**
   - Click on `premium` entitlement
   - Under **"Products"**, ensure you have:
     - ✅ `unreal_weekly_sub` (new - weekly subscription)
     - ✅ `unreal_lifetime` (new - non-consumable)
     - ✅ Your existing monthly subscription product
     - ✅ Your existing yearly subscription product

   **Why attach all products?**
   - All products grant the same `premium` entitlement
   - Existing subscribers maintain premium access
   - New purchases also grant premium access
   - No disruption to existing users

3. **Save Entitlement Configuration**

### Step 2.3: Configure Offerings (Most Important Step)

This is where you control what new users see vs. what existing users keep.

1. **Go to Offerings**
   - Navigate to: **Offerings** → **Current Offering** (or create new "current" offering)

2. **Remove Old Packages from Current Offering**
   - Find monthly subscription package → **Remove** or **Delete** from offering
   - Find yearly subscription package → **Remove** or **Delete** from offering
   - ⚠️ **Don't delete the products** - just remove them from the current offering

3. **Add New Packages to Current Offering**
   - Click **"Add Package"**
   - **Weekly Package:**
     - Identifier: `$rc_weekly` (or your preferred identifier)
     - Product: Select `unreal_weekly_sub`
     - Save
   
   - Click **"Add Package"** again
   - **Lifetime Package:**
     - Identifier: `$rc_lifetime` (or your preferred identifier)
     - Product: Select `unreal_lifetime`
     - Save

4. **Verify Current Offering**
   Your current offering should now contain:
   - ✅ `$rc_weekly` → `unreal_weekly_sub`
   - ✅ `$rc_lifetime` → `unreal_lifetime`
   - ❌ Monthly package (removed)
   - ❌ Yearly package (removed)

5. **Set as Current Offering**
   - Ensure this offering is marked as **"Current"**
   - This is what your app will fetch

### Step 2.4: Handle Existing Subscriptions

#### Keep Old Products Active

**In RevenueCat:**
- ✅ Keep monthly/yearly products in the system
- ✅ Keep them attached to `premium` entitlement
- ✅ Don't delete them
- ✅ They'll continue to work for existing subscribers

**What Happens:**
- Existing subscribers keep their monthly/yearly subscriptions
- They maintain premium access through the entitlement
- Your app won't show these options (they're not in current offering)
- RevenueCat continues to track and manage these subscriptions

#### Optional: Create Separate Offering for Existing Users

If you want to provide upgrade paths:

1. **Create New Offering**: "Legacy" or "Upgrade"
2. **Add all packages** (monthly, yearly, weekly, lifetime)
3. **Use this offering** for users who want to switch plans
4. **Keep "Current" offering** with only weekly/lifetime for new users

---

## Part 3: Testing Strategy

### Step 3.1: Set Up Sandbox Testers

1. **In App Store Connect**
   - Go to: **Users and Access** → **Sandbox Testers**
   - Create test accounts for:
     - New weekly subscription
     - New lifetime purchase
     - Existing monthly subscription (if testing migration)

### Step 3.2: Test New Products

1. **Test Weekly Subscription**
   - Build app (EAS build or TestFlight)
   - Sign in with sandbox tester account
   - Navigate to Premium screen
   - Verify only weekly and lifetime options appear
   - Select "Weekly"
   - Complete purchase flow
   - Verify premium features unlock
   - Check RevenueCat dashboard → Customer → verify entitlement active

2. **Test Lifetime Purchase**
   - Use same or different sandbox account
   - Navigate to Premium screen
   - Select "Lifetime"
   - Complete purchase flow
   - Verify premium features unlock
   - Restart app → verify premium persists
   - Check RevenueCat → verify non-consumable purchase recorded

3. **Test Restore Purchases**
   - Delete and reinstall app
   - Sign in with sandbox account that made purchases
   - Tap "Restore Purchases"
   - Verify both weekly and lifetime restore correctly

### Step 3.3: Verify Existing Subscriptions Still Work

1. **Test with Existing Monthly/Yearly Subscriber**
   - Use sandbox account with active monthly/yearly subscription
   - Sign into app
   - Verify premium features still work
   - Verify premium screen shows "You're Premium!" message
   - Check RevenueCat → Customer → verify entitlement still active

2. **Verify Old Products Not Shown**
   - New users should only see weekly/lifetime
   - Old products shouldn't appear in premium screen
   - Check console logs to verify only new packages fetched

---

## Part 4: Migration Strategy

### Phase 1: Setup (Week 1)

- [ ] Create weekly subscription in App Store Connect
- [ ] Create lifetime non-consumable in App Store Connect
- [ ] Submit both for Apple review
- [ ] Add products to RevenueCat
- [ ] Configure entitlement (attach all products)
- [ ] Update current offering (remove old, add new)
- [ ] Test with sandbox accounts

### Phase 2: Soft Launch (Week 2-3)

- [ ] Wait for Apple approval
- [ ] Deploy app update with new pricing
- [ ] Monitor RevenueCat dashboard
- [ ] Check for any issues
- [ ] Verify existing subscribers unaffected

### Phase 3: Monitor (Month 1-3)

- [ ] Track new subscription signups
- [ ] Monitor existing subscription renewals
- [ ] Check customer support for issues
- [ ] Review RevenueCat analytics
- [ ] Monitor App Store Connect subscription metrics

### Phase 4: Optional Cleanup (Month 6+)

- [ ] Review active monthly/yearly subscriptions
- [ ] Consider marking old products as "Removed from Sale"
- [ ] Keep products in system for remaining subscribers
- [ ] Eventually deprecate when no active subscribers remain

---

## Part 5: Important Configuration Checklist

### Apple App Store Connect

- [ ] Weekly subscription created (`unreal_weekly_sub`)
- [ ] Lifetime non-consumable created (`unreal_lifetime`)
- [ ] Both products submitted for review
- [ ] Weekly subscription in same subscription group as monthly/yearly
- [ ] Products approved and "Ready for Sale"
- [ ] Existing monthly/yearly products still active
- [ ] Sandbox testers created

### RevenueCat Dashboard

- [ ] Weekly product added (`unreal_weekly_sub`)
- [ ] Lifetime product added (`unreal_lifetime`)
- [ ] Both products synced from App Store Connect
- [ ] All products attached to `premium` entitlement:
  - [ ] Weekly subscription
  - [ ] Lifetime non-consumable
  - [ ] Monthly subscription (existing)
  - [ ] Yearly subscription (existing)
- [ ] Current offering updated:
  - [ ] Monthly package removed
  - [ ] Yearly package removed
  - [ ] Weekly package added (`$rc_weekly`)
  - [ ] Lifetime package added (`$rc_lifetime`)
- [ ] Current offering set as active

### Code Verification

- [ ] App code already updated (✅ Done)
- [ ] Product IDs match (`unreal_weekly_sub`, `unreal_lifetime`)
- [ ] Package detection logic works
- [ ] Premium screen shows correct prices ($4.99/week, $29.99)

---

## Part 6: Troubleshooting

### Products Not Showing in App

**Symptoms**: Premium screen shows "No packages available"

**Solutions**:
1. Verify products exist in App Store Connect
2. Check products are approved (or at least "Ready to Submit")
3. Verify Product IDs match exactly
4. Check RevenueCat → Products → verify products synced
5. Check RevenueCat → Offerings → verify "Current" offering is set
6. Try syncing products again in RevenueCat
7. Check console logs for package detection errors

### Existing Subscribers Lost Premium Access

**Symptoms**: Users with monthly/yearly subscriptions lose premium features

**Solutions**:
1. Verify monthly/yearly products still attached to `premium` entitlement
2. Check RevenueCat → Customer → verify entitlement still active
3. Ensure products weren't deleted (just removed from offering)
4. Check webhook logs (if configured) for entitlement updates
5. Manually refresh premium status in app

### Wrong Product Selected

**Symptoms**: App selects wrong product when choosing weekly/lifetime

**Solutions**:
1. Check package identifiers in RevenueCat match code expectations
2. Verify product types: weekly = `WEEKLY` or `SUBSCRIPTION`, lifetime = `NON_CONSUMABLE`
3. Check console logs for available packages (code logs this on error)
4. Verify offering configuration in RevenueCat

### Lifetime Purchase Not Restoring

**Symptoms**: Lifetime purchase doesn't restore on new device

**Solutions**:
1. Verify lifetime product is **Non-Consumable** (not Consumable) in App Store Connect
2. Check RevenueCat → Customer → verify purchase in history
3. Ensure using same Apple ID for restore
4. Try "Restore Purchases" button
5. Check that non-consumable products are properly configured in RevenueCat

---

## Part 7: Best Practices Summary

### ✅ DO:

1. **Keep existing products active** in both platforms
2. **Attach all products** to the same entitlement
3. **Remove old packages** from current offering only
4. **Test thoroughly** with sandbox accounts
5. **Monitor** existing subscribers during transition
6. **Provide support** for users with questions
7. **Document** your configuration for future reference

### ❌ DON'T:

1. **Delete** old products
2. **Remove** old products from entitlement
3. **Cancel** existing subscriptions
4. **Force** users to repurchase
5. **Rush** the migration process
6. **Ignore** existing subscribers
7. **Skip** testing phase

---

## Part 8: Support & Resources

### RevenueCat Resources
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [Non-Consumables Guide](https://docs.revenuecat.com/docs/non-subscriptions)
- [Offerings Guide](https://docs.revenuecat.com/docs/entitlements)
- [RevenueCat Community](https://community.revenuecat.com/)

### Apple Resources
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [Subscription Management](https://developer.apple.com/app-store/subscriptions/)

### Your App's Configuration
- Product IDs: `unreal_weekly_sub`, `unreal_lifetime`
- Entitlement: `premium`
- Package IDs: `$rc_weekly`, `$rc_lifetime` (or your custom IDs)

---

## Quick Reference

### Product IDs (Must Match Exactly)
- Weekly: `unreal_weekly_sub`
- Lifetime: `unreal_lifetime`
- Monthly: (your existing product ID)
- Yearly: (your existing product ID)

### Pricing
- Weekly: $4.99/week
- Lifetime: $29.99 one-time
- Monthly: (your existing price)
- Yearly: (your existing price)

### Entitlement
- Name: `premium`
- Attached Products: All (weekly, lifetime, monthly, yearly)

### Current Offering
- Contains: Weekly + Lifetime only
- Does NOT contain: Monthly + Yearly (removed, not deleted)

---

## Final Notes

This setup ensures:
- ✅ New users see only weekly and lifetime options
- ✅ Existing subscribers continue seamlessly
- ✅ All products grant premium access
- ✅ No disruption to current users
- ✅ Smooth transition to new pricing

Take your time with each step, test thoroughly, and monitor the transition. Your existing subscribers will continue to work perfectly while new users get the new pricing options.

