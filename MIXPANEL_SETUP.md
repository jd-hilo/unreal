# Mixpanel Analytics Setup Guide

This guide covers the Mixpanel analytics integration for the Unreal app.

## Overview

The app now tracks:
- ✅ Authentication events (sign up, sign in, sign out)
- ✅ Complete onboarding flow
- ✅ Decision creation and analysis
- ✅ Premium purchases and paywall interactions
- ✅ What-if scenarios and biometrics
- ✅ User properties (premium status, location, etc.)

## Configuration

**Mixpanel Token:** `1ce0090bc0bcfbadb8122252aaf7e21f`

The token is stored in `app.json`:
```json
{
  "expo": {
    "extra": {
      "mixpanelToken": "1ce0090bc0bcfbadb8122252aaf7e21f"
    }
  }
}
```

## Tracked Events

### Authentication Events
| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `Sign Up Started` | email | User enters sign up flow |
| `Sign Up Completed` | user_id, email | Account successfully created |
| `Sign In Completed` | user_id, email | User logs in |
| `Sign Out` | - | User logs out |
| `Sign Up Failed` | email, error | Sign up error occurs |
| `Sign In Failed` | email, error | Sign in error occurs |

### Onboarding Events
| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `Onboarding Started` | - | User enters first onboarding step (00-name) |
| `Onboarding Step Completed` | step, step_name | User completes each step |
| `Onboarding Completed` | - | User finishes all onboarding steps |

### Decision Events
| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `Decision Created` | decision_id, num_options, has_participants, num_participants | New decision created |
| `Decision Analyzed` | decision_id, predicted_option, confidence, num_participants | AI prediction generated |
| `Decision Simulated` | decision_id, num_options | User opens life trajectory simulation |

### Premium Events
| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `Premium Screen Viewed` | is_premium | User views premium paywall |
| `Premium Purchase Started` | plan_type, product_id | User initiates purchase |
| `Premium Purchase Completed` | product_id, plan_type | Purchase successful |
| `Premium Purchase Failed` | product_id, error | Purchase fails |
| `Premium Restored` | - | User restores previous purchase |
| `Premium Feature Blocked` | feature, decision_id/what_if_id | User hits paywall |

### What-If Events
| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `What If Created` | what_if_id, has_biometrics | User creates what-if scenario |
| `Biometrics Viewed` | what_if_id | Premium user views biometrics |
| `Biometrics Blocked` | what_if_id | Free user sees locked biometrics |

## User Properties

The following user properties are automatically set:

| Property | Type | Description |
|----------|------|-------------|
| `user_id` | string | Unique user identifier (UUID) |
| `signup_date` | string | ISO date when user signed up |
| `is_premium` | boolean | Premium subscription status |
| `onboarding_complete` | boolean | Onboarding completion status |

## Architecture

### Core Files

#### `lib/mixpanel.ts`
Mixpanel service layer with:
- `initializeMixpanel()` - Initialize SDK
- `trackEvent(name, properties)` - Track events
- `identifyUser(userId)` - Identify user
- `setUserProperties(properties)` - Set user properties
- `setUserProperty(key, value)` - Set single property
- `resetMixpanel()` - Reset on logout
- `MixpanelEvents` - Constants for event names

#### `hooks/useMixpanel.ts`
React hook for easy tracking:
- `useTrackScreen(screenName, properties)` - Auto-track screen views
- `useMixpanel()` - Get tracking functions

### Integration Points

#### App Launch - `app/_layout.tsx`
- Initializes Mixpanel SDK
- Identifies user when authenticated
- Sets initial user properties

#### Authentication - `store/useAuth.ts`
- Tracks sign up started/completed/failed
- Tracks sign in completed/failed
- Tracks sign out
- Resets Mixpanel on logout

#### Onboarding
- `app/onboarding/00-name.tsx` - Tracks onboarding started
- `app/onboarding/07-clarifier.tsx` - Tracks onboarding completed
- Sets `onboarding_complete` user property

#### Premium - `hooks/usePremium.ts`
- Tracks purchase started (in app/premium.tsx)
- Tracks purchase completed/failed automatically
- Tracks restore purchases
- Updates `is_premium` user property

#### Gated Features
- `app/decision/[id].tsx` - Tracks when simulate button is blocked
- `app/whatif/[id].tsx` - Tracks when biometrics are blocked/viewed

#### Decisions
- `app/decision/new.tsx` - Tracks decision created and analyzed
- `app/decision/[id].tsx` - Tracks simulation started

#### What-If
- `app/whatif/new.tsx` - Tracks what-if created
- `app/whatif/[id].tsx` - Tracks biometrics viewed/blocked

## Testing

### Verify in Mixpanel Dashboard

1. Go to [Mixpanel Dashboard](https://mixpanel.com/project)
2. Navigate to **Events** → **Live View**
3. Perform actions in the app
4. Verify events appear in real-time

### Test Checklist

**Authentication Flow:**
- [ ] Sign up → See "Sign Up Started" and "Sign Up Completed"
- [ ] Sign in → See "Sign In Completed"
- [ ] Sign out → See "Sign Out"

**Onboarding Flow:**
- [ ] Start onboarding → See "Onboarding Started"
- [ ] Complete onboarding → See "Onboarding Completed"
- [ ] Check user property `onboarding_complete` = true

**Premium Flow:**
- [ ] Open premium screen → See "Premium Screen Viewed"
- [ ] Try to purchase → See "Premium Purchase Started"
- [ ] Hit paywall → See "Premium Feature Blocked"

**Decision Flow:**
- [ ] Create decision → See "Decision Created"
- [ ] View prediction → See "Decision Analyzed"
- [ ] Click simulate (if premium) → See "Decision Simulated"

**What-If Flow:**
- [ ] Create what-if → See "What If Created"
- [ ] View biometrics (premium) → See "Biometrics Viewed"
- [ ] See locked biometrics (free) → See "Biometrics Blocked"

## User Properties Dashboard

In Mixpanel, you can filter users by:
- Premium status (`is_premium = true`)
- Onboarding completion (`onboarding_complete = true`)
- Signup date
- Location

## Privacy & Compliance

### Data Collected
- ✅ Anonymous user IDs (UUIDs)
- ✅ Event names and timestamps
- ✅ Basic user properties (premium status, location)
- ✅ Product interaction data

### Data NOT Collected
- ❌ Passwords or sensitive auth data
- ❌ Personal decision content (only IDs)
- ❌ Full profile narratives
- ❌ Payment details (handled by RevenueCat)

### Compliance
- GDPR compliant (anonymized data)
- No PII beyond what's necessary
- User can request data deletion

## Analytics Insights

### Key Metrics to Monitor

**Onboarding Funnel:**
```
Sign Up Started
  ↓ (conversion rate)
Sign Up Completed
  ↓
Onboarding Started
  ↓
Onboarding Completed
```

**Premium Conversion:**
```
Premium Feature Blocked
  ↓ (conversion rate)
Premium Screen Viewed
  ↓
Premium Purchase Started
  ↓
Premium Purchase Completed
```

**Feature Usage:**
- Decision creation rate
- What-if scenario creation rate
- Simulation usage (premium feature)
- Biometrics views (premium feature)

### Useful Queries

**Premium Conversion Rate:**
```
Users who viewed Premium Screen / Users who hit paywall
```

**Onboarding Completion Rate:**
```
Onboarding Completed / Sign Up Completed
```

**Decision to Simulation Rate:**
```
Decision Simulated / Decision Created
```

## Debugging

### Events Not Appearing

1. **Check initialization:**
   ```
   console.log should show: "📊 Mixpanel initialized"
   ```

2. **Check token:**
   - Verify `mixpanelToken` in app.json
   - Token: `1ce0090bc0bcfbadb8122252aaf7e21f`

3. **Check console logs:**
   - Each tracked event logs: `📊 Tracked: [EventName]`

4. **Verify in Mixpanel:**
   - Go to Live View
   - Events may take 1-2 minutes to appear

### Common Issues

**"Mixpanel not initialized":**
- App needs to fully load before tracking
- Check that `initializeMixpanel()` is called in `app/_layout.tsx`

**Events missing properties:**
- Check that properties are passed correctly
- Use console.log to verify data before tracking

**User properties not updating:**
- Use `setUserProperty()` after user actions
- Check that user is identified first

## Advanced Usage

### Custom Event Tracking

To add custom events in any component:

```typescript
import { trackEvent } from '@/lib/mixpanel';

// Simple event
trackEvent('Custom Event Name');

// Event with properties
trackEvent('Custom Event Name', {
  property1: 'value1',
  property2: 123
});
```

### Update User Properties

```typescript
import { setUserProperty } from '@/lib/mixpanel';

// Single property
setUserProperty('key', 'value');

// Multiple properties
import { setUserProperties } from '@/lib/mixpanel';
setUserProperties({
  location: 'Austin, TX',
  premium_level: 'gold'
});
```

### Track Screen Views

```typescript
import { useTrackScreen } from '@/hooks/useMixpanel';

export default function MyScreen() {
  useTrackScreen('My Screen Name', { custom_property: 'value' });
  // ... rest of component
}
```

## Support

- [Mixpanel Documentation](https://docs.mixpanel.com/)
- [React Native SDK Guide](https://docs.mixpanel.com/docs/tracking/reference/react-native)
- [Mixpanel Community](https://community.mixpanel.com/)

## Next Steps

1. **Verify events in Mixpanel dashboard**
2. **Create funnels for key user journeys**
3. **Set up retention reports**
4. **Monitor premium conversion rates**
5. **A/B test premium paywall variations**

