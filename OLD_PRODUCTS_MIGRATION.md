# Handling Old Pricing Products (Monthly/Yearly)

## ⚠️ Important: DO NOT DELETE Old Products

If you have existing subscribers on monthly or yearly plans, **do not delete** those products from App Store Connect or RevenueCat. Here's what to do instead:

## App Store Connect

### Keep Old Products Active
- **Do NOT delete** monthly/yearly subscription products
- **Do NOT remove** them from your subscription group
- Existing subscribers will continue to be charged on their current plan
- They can still renew automatically

### What You Can Do
- **Mark as "Removed from Sale"** (optional) - This prevents new users from purchasing, but existing subscribers keep their subscriptions
- Keep products in "Ready for Sale" status for existing customers

## RevenueCat Dashboard

### Recommended Approach

1. **Keep Products in RevenueCat**
   - Don't delete monthly/yearly products
   - Keep them attached to the `premium` entitlement
   - This ensures existing subscribers maintain premium access

2. **Update Current Offering**
   - Remove monthly/yearly packages from your **Current Offering**
   - Only include weekly and lifetime packages in the current offering
   - This prevents new users from seeing old options

3. **Keep Entitlement Configuration**
   - Keep all products (old and new) attached to `premium` entitlement
   - This ensures:
     - Existing monthly/yearly subscribers keep premium access
     - New weekly/lifetime purchases also grant premium access
     - All products grant the same entitlement

### Step-by-Step in RevenueCat

1. **Go to Offerings → Current Offering**
2. **Remove old packages** (monthly/yearly) from the current offering
3. **Keep only**:
   - `$rc_weekly` → `unreal_weekly_sub`
   - `$rc_lifetime` → `unreal_lifetime`
4. **Go to Entitlements → premium**
5. **Keep all products attached** (don't remove monthly/yearly)
6. **Save changes**

## Why Keep Old Products?

### For Existing Subscribers
- They continue to be charged on their current plan
- They maintain premium access
- They can cancel/change plans in App Store settings
- No disruption to their service

### For Your App
- No need to migrate existing users
- No customer support issues
- Smooth transition
- Revenue continues from existing subscribers

## Migration Strategy

### Option 1: Gradual Migration (Recommended)
- Keep old products active
- New users see only weekly/lifetime
- Existing users stay on their current plan
- Over time, users naturally migrate or cancel

### Option 2: Force Migration (Not Recommended)
- Cancel all old subscriptions
- Force users to repurchase
- **This will cause:**
  - Customer complaints
  - App Store policy violations
  - Revenue loss
  - Support burden

## What Happens to Old Products?

### Monthly/Yearly Subscriptions
- Continue to auto-renew for existing subscribers
- New users won't see them (removed from current offering)
- Existing subscribers can:
  - Continue their subscription
  - Cancel in App Store settings
  - Upgrade/downgrade if you provide options

### Your Code
- Your app already handles this correctly
- Code looks for weekly/lifetime products
- Old products won't appear in the premium screen
- Existing subscribers maintain premium status through entitlement

## Best Practice Summary

✅ **DO:**
- Keep old products in App Store Connect
- Keep old products in RevenueCat
- Keep old products attached to `premium` entitlement
- Remove old packages from Current Offering
- Let existing subscribers continue their current plan

❌ **DON'T:**
- Delete old products
- Remove old products from entitlement
- Cancel existing subscriptions
- Force users to repurchase

## Timeline

### Short Term (Now)
- Add new weekly/lifetime products
- Update current offering to show only new products
- Keep old products active for existing subscribers

### Long Term (6-12 months)
- Monitor subscription metrics
- Most users will naturally migrate or cancel
- Consider removing old products from sale (but keep for existing subscribers)
- Eventually, old products can be deprecated when no active subscribers remain

## Checking Active Subscriptions

### In RevenueCat
- Go to Customers → Filter by entitlement
- See which customers are on which products
- Monitor migration over time

### In App Store Connect
- Go to Sales and Trends → Subscriptions
- See active subscription counts by product
- Monitor revenue from each product type

## Support Considerations

If users ask about old pricing:
- Explain that new pricing options are available
- They can continue their current plan or switch
- Direct them to App Store subscription management
- Be transparent about the change

## Conclusion

**Keep old products active** - just remove them from your current offering so new users only see weekly/lifetime options. Existing subscribers will continue seamlessly, and you'll avoid customer service issues and potential App Store policy violations.

