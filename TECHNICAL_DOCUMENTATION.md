# Technical Documentation: mora

**Version:** 1.9.1  
**Last Updated:** February 11, 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Tech Stack Overview](#tech-stack-overview)
3. [Architecture](#architecture)
4. [RevenueCat Implementation](#revenuecat-implementation)
5. [Database Schema](#database-schema)
6. [Authentication & User Management](#authentication--user-management)
7. [Analytics & Tracking](#analytics--tracking)
8. [Key Features](#key-features)
9. [Development & Deployment](#development--deployment)

---

## Executive Summary

**mora** is a mobile-first decision intelligence platform built with React Native and Expo. The application helps users simulate career trajectories, make better life decisions, and understand their future through AI-powered insights. The app leverages Claude AI for generating personalized simulations, RevenueCat for subscription management, and Supabase for backend infrastructure.

**Core Value Proposition:**
- AI-powered career simulations (5, 10, or 15-year horizons)
- Decision-making assistance through conversational AI
- Life planning and goal tracking
- Premium subscription model with freemium features

---

## Tech Stack Overview

### Frontend & Mobile

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.81.5 | Cross-platform mobile framework |
| **React** | 19.1.0 | UI library |
| **Expo** | ~54.0.25 | Development platform and build tooling |
| **Expo Router** | ~6.0.15 | File-based routing system |
| **TypeScript** | ~5.9.2 | Type safety and developer experience |
| **React Native Reanimated** | ~4.1.1 | High-performance animations |
| **React Native Gesture Handler** | ~2.28.0 | Native gesture handling |

### Backend & Infrastructure

| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database, authentication, real-time subscriptions |
| **Anthropic Claude Sonnet 4** | AI-powered career simulations and decision analysis |
| **RevenueCat** | Subscription management and in-app purchases |
| **Expo Application Services (EAS)** | Build and deployment infrastructure |

### State Management

| Technology | Purpose |
|------------|---------|
| **Zustand** | Lightweight state management (auth, premium status) |
| **AsyncStorage** | Local persistence for sessions and cached data |
| **React State** | Component-level state management |

### Analytics & Monitoring

| Technology | Purpose |
|------------|---------|
| **Mixpanel** | Product analytics and user behavior tracking |
| **Adjust** | Attribution tracking and marketing analytics |
| **Expo Session Replay** | Debug and user session recording |

### AI & Communication

| Technology | Purpose |
|------------|---------|
| **Anthropic Claude SDK** | Career simulation generation |
| **OpenAI** | Additional AI capabilities |
| **ElevenLabs** | Voice synthesis (AI conversations) |
| **LiveKit** | Real-time audio/video communication |

### UI & Design

| Technology | Purpose |
|------------|---------|
| **Lucide React Native** | Icon library |
| **Expo Linear Gradient** | Gradient styling |
| **React Native SVG** | Vector graphics |
| **Custom Design System** | Branded color palette and typography |

---

## Architecture

### Application Structure

mora follows a **file-based routing architecture** powered by Expo Router:

```
app/
├── (tabs)/              # Main tab navigation
│   ├── home.tsx         # Home feed
│   ├── decide.tsx       # Decision hub
│   ├── simulate.tsx     # Simulations list
│   ├── compatibility.tsx # Twin matching
│   └── profile.tsx      # User profile
├── auth/                # Authentication flows
├── onboarding/          # User onboarding
├── career-sim/          # Career simulation flow
├── decision/            # Decision analysis
├── premium.tsx          # Premium upgrade screen
└── _layout.tsx          # Root layout with auth initialization
```

### Data Flow Architecture

```
┌─────────────────┐
│   React Native │
│   Components   │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
    ┌────▼─────┐     ┌────▼────────┐
    │  Zustand │     │ AsyncStorage│
    │  Stores  │     │   (Cache)   │
    └────┬─────┘     └─────────────┘
         │
    ┌────▼──────────────────────────┐
    │     Supabase Client           │
    │  (Auth, Database, Realtime)   │
    └────┬──────────────────────────┘
         │
    ┌────▼─────────────────────────┐
    │   Supabase PostgreSQL        │
    │   (Source of Truth)          │
    └──────────────────────────────┘

         ┌──────────────────┐
         │  External APIs   │
         ├──────────────────┤
         │ • Claude AI      │
         │ • RevenueCat     │
         │ • Mixpanel       │
         │ • Adjust         │
         └──────────────────┘
```

### State Management Pattern

**Zustand Stores:**

1. **`useAuth`** (`store/useAuth.ts`)
   - User authentication state
   - Session management
   - Sign in/up/out methods
   - Apple Sign In integration
   - Phone OTP authentication

2. **`useTwin`** (referenced in layout)
   - Premium status
   - Onboarding completion state
   - Twin/compatibility features

**Key Pattern:**
```typescript
// Zustand store pattern
export const useAuth = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  
  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user || null, loading: false });
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  }
}));
```

### Component Architecture

**Design System:**
- **Colors:** Defined in `constants/Theme.ts` with gradients (peach, purple, blue)
- **Fonts:** Inter (400, 600, 700), Recoleta (Regular, Semibold)
- **Components:** Modular, reusable components in `components/` directory

**Key UI Patterns:**
- Card-based layouts with 3D shadows
- Gradient buttons with haptic feedback
- Modal sheets for detailed views
- Animated transitions using Reanimated

---

## RevenueCat Implementation

### Overview

mora uses **RevenueCat** for managing in-app purchases and subscriptions. The implementation supports both weekly subscriptions and lifetime purchases.

### Configuration

**RevenueCat API Key:**
- Stored in `app.json` under `extra.revenuecatApiKey`
- Value: `appl_hsvLarkYcuThwdbbYQbCpOfHUuV`
- Platform: iOS (Apple App Store)

**Package:**
- `react-native-purchases`: ^8.2.3

### Implementation Details

#### 1. Initialization (`lib/revenuecat.ts`)

```typescript
import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';

const REVENUECAT_API_KEY = Constants.expoConfig?.extra?.revenuecatApiKey || '';

export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (!isConfigured) {
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    isConfigured = true;
  }
  
  if (userId) {
    await Purchases.logIn(userId);
  }
}
```

**Initialization Flow:**
1. App launches → `app/_layout.tsx` initializes auth
2. User logs in → `useAuth` store updates user state
3. Premium status check → `useTwin.checkPremiumStatus(userId)` called
4. RevenueCat SDK configured with API key
5. User logged into RevenueCat with Supabase user ID

#### 2. Product Offerings

**Available Products:**

| Product ID | Type | Price | Description |
|------------|------|-------|-------------|
| `mora_weekly_sub` | Subscription | $4.99/week | Weekly subscription with 3-day free trial |
| `mora_lifetime_v2` | Non-Consumable | $29.99 (was $50) | One-time lifetime access |

**Entitlement:** `premium`
- All products grant access to the `premium` entitlement
- Configured in RevenueCat dashboard

#### 3. Premium Status Check

**Dual-Source Architecture:**

mora uses a **hybrid approach** for premium status:

```typescript
export async function checkAndSyncPremiumStatus(userId: string): Promise<boolean> {
  // 1. Check Supabase first (for manual overrides/testing)
  const supabasePremium = await getPremiumStatusFromSupabase(userId);
  if (supabasePremium) {
    return true; // Respect manual database override
  }
  
  // 2. Check RevenueCat for active subscriptions
  const customerInfo = await getCustomerInfo();
  const isPremium = isPremiumActive(customerInfo);
  
  // 3. Sync back to Supabase if premium via RevenueCat
  if (isPremium) {
    await syncPremiumStatus(userId, true);
  }
  
  return isPremium;
}
```

**Why Dual-Source?**
- **Supabase:** Fast local cache, enables testing without purchases
- **RevenueCat:** Source of truth for actual subscription status
- **Sync:** Ensures consistency across systems

#### 4. Purchase Flow

**User Journey:**
1. User taps "Upgrade to mora+" anywhere in app
2. Navigate to `/premium` screen
3. Display pricing cards (Weekly vs Lifetime)
4. User selects option and taps "Continue"
5. Call `purchasePackage(pkg)` from `usePremium` hook
6. RevenueCat handles App Store transaction
7. On success: Update local state + sync to Supabase
8. Show success alert and redirect to home

**Code Flow:**
```typescript
// app/premium.tsx
async function handlePurchase() {
  const pkg = selectedOption === 'weekly' 
    ? packages.find(p => p.product.identifier === 'mora_weekly_sub')
    : packages.find(p => p.product.identifier === 'mora_lifetime_v2');
  
  trackEvent(MixpanelEvents.PREMIUM_PURCHASE_STARTED, {
    plan_type: selectedOption,
    product_id: pkg.product.identifier
  });
  
  const success = await purchase(pkg);
  
  if (success) {
    Alert.alert('Welcome to mora+!', 'You now have lifetime access...');
    router.replace('/(tabs)/home');
  }
}
```

#### 5. Restore Purchases

**Implementation:**
```typescript
export async function restorePurchases(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}
```

**Use Cases:**
- User reinstalls app
- User switches devices
- User accidentally deleted app

**UI:** "Restore Purchases" link in footer of premium screen

#### 6. Premium Feature Gating

**Pattern:**
```typescript
const { isPremium } = usePremium();

if (!isPremium) {
  // Show upgrade prompt or limit features
  router.push('/premium');
  return;
}

// Premium feature logic
```

**Gated Features:**
- Unlimited career simulations (free users get limited credits)
- Decision chat with AI Architect
- In-depth simulation data (compensation, comparisons)
- Simulation branches (alternate timelines)

#### 7. Database Schema for Premium

**Supabase `profiles` table:**
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY,
  is_premium BOOLEAN DEFAULT FALSE,
  simulation_credits INTEGER DEFAULT 3,
  -- ... other fields
);
```

**Credit System:**
- Free users: 3 simulation credits
- Premium users: Unlimited (credits ignored)
- Credits decrement on simulation generation
- Credits can be manually adjusted in database for testing

#### 8. Testing & Development

**Testing Mode:**
```typescript
// lib/revenuecat.ts
const BYPASS_REVENUECAT_FOR_TESTING = false;

// Set to true to use only Supabase for premium status
// Useful for development without App Store sandbox
```

**Manual Premium Grant:**
```sql
-- Grant premium for testing
UPDATE profiles 
SET is_premium = true 
WHERE user_id = 'user-uuid-here';
```

#### 9. Analytics Integration

**Tracked Events:**
- `PREMIUM_SCREEN_VIEWED`: User views premium screen
- `PREMIUM_PURCHASE_STARTED`: User initiates purchase
- `PREMIUM_PURCHASE_COMPLETED`: Purchase successful (via Mixpanel)
- `PREMIUM_PURCHASE_FAILED`: Purchase failed or cancelled

**Implementation:**
```typescript
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';

trackEvent(MixpanelEvents.PREMIUM_PURCHASE_STARTED, {
  plan_type: 'lifetime',
  product_id: 'mora_lifetime_v2',
  user_id: user.id
});
```

#### 10. Error Handling

**Common Scenarios:**

1. **User Cancels Purchase:**
```typescript
if (error.userCancelled) {
  console.log('User cancelled purchase');
  // No alert shown, silent failure
}
```

2. **Network Error:**
```typescript
catch (error) {
  console.error('Purchase error:', error);
  Alert.alert('Error', 'Unable to complete purchase. Please try again.');
}
```

3. **No Packages Available:**
```typescript
if (!packages || packages.length === 0) {
  Alert.alert('Error', 'No packages available. Please try again later.');
}
```

### RevenueCat Dashboard Configuration

**Required Setup:**
1. **App Configuration:**
   - Platform: iOS
   - Bundle ID: `com.jdhilo2.unreal`
   - App Store Connect API integration

2. **Products:**
   - Add `mora_weekly_sub` (subscription)
   - Add `mora_lifetime_v2` (non-consumable)

3. **Entitlements:**
   - Create `premium` entitlement
   - Attach both products to `premium` entitlement

4. **Webhooks (Optional):**
   - Configure webhook to Supabase Edge Function
   - Sync subscription events (renewal, cancellation, expiration)

---

## Database Schema

### Supabase PostgreSQL

**Key Tables:**

#### 1. `profiles`
User profile and core data:
```typescript
{
  user_id: string (UUID, PK)
  first_name: string | null
  hometown: string | null
  university: string | null
  major: string | null
  current_location: string | null
  net_worth: string | null
  political_views: string | null
  twin_code: string | null
  is_premium: boolean
  ab_test_group: 'A' | 'B' | null
  simulation_credits: number | null
  core_json: CoreJsonData
  values_json: string[]
  narrative_summary: string | null
  life_situation: string | null
  life_journey: string | null
  dream_vision: DreamVision | null
  current_streak: number
  total_points: number
  created_at: timestamp
  updated_at: timestamp
}
```

#### 2. `career_simulations`
Stores generated career simulations:
```sql
CREATE TABLE career_simulations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id),
  simulation_data JSONB,
  time_horizon INTEGER,
  created_at TIMESTAMP
);
```

#### 3. `decision_chats`
AI decision conversations:
```sql
CREATE TABLE decision_chats (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id),
  decision_id UUID,
  messages JSONB[],
  created_at TIMESTAMP
);
```

#### 4. `timelines`
User-created life timelines:
```sql
CREATE TABLE timelines (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id),
  title TEXT,
  events JSONB[],
  current_year INTEGER,
  created_at TIMESTAMP
);
```

#### 5. `leaderboard_schema`
Gamification and points:
```sql
CREATE TABLE leaderboard_schema (
  user_id UUID PRIMARY KEY,
  total_points INTEGER,
  current_streak INTEGER,
  last_activity TIMESTAMP
);
```

### Data Relationships

```
profiles (1) ──< (many) career_simulations
profiles (1) ──< (many) decision_chats
profiles (1) ──< (many) timelines
profiles (1) ──< (many) year_predictions
profiles (1) ──< (many) compatibility_tests
```

---

## Authentication & User Management

### Authentication Methods

1. **Apple Sign In** (Primary)
   - Native iOS authentication
   - Expo Apple Authentication module
   - Extracts full name on first sign-in
   - Seamless user experience

2. **Email/Password**
   - Traditional email/password auth
   - Password reset via OTP
   - Supabase Auth handles security

3. **Phone OTP** (SMS)
   - Phone number verification
   - 6-digit OTP code
   - International phone support

### Authentication Flow

```
User Opens App
      ↓
Check Session (AsyncStorage)
      ↓
   ┌──────┴──────┐
   │             │
Session       No Session
Exists           ↓
   ↓         Show Welcome
Load User      Screen
   ↓             ↓
Check Premium  User Signs In
Status         (Apple/Email/Phone)
   ↓             ↓
Initialize    Create/Link
Mixpanel      Profile
   ↓             ↓
Navigate to   Assign A/B
Home          Test Group
              ↓
           Onboarding
           (if new user)
```

### User Onboarding

**Onboarding Steps:**
1. Name collection
2. Birth year
3. Values assessment (multi-select)
4. Decision style quiz
5. Life situation context
6. Dream self vision (10-step flow)

**A/B Testing:**
- Users assigned to Group A or B on signup
- Tracked in `profiles.ab_test_group`
- Used for feature experimentation

---

## Analytics & Tracking

### Mixpanel Integration

**Configuration:**
- Token: `1ce0090bc0bcfbadb8122252aaf7e21f`
- SDK: `mixpanel-react-native` v3.0.4
- Session Replay: Enabled for debugging

**Key Events:**
```typescript
enum MixpanelEvents {
  SIGN_UP_STARTED = 'Sign Up Started',
  SIGN_UP_COMPLETED = 'Sign Up Completed',
  SIGN_IN_COMPLETED = 'Sign In Completed',
  SIGN_OUT = 'Sign Out',
  PREMIUM_SCREEN_VIEWED = 'Premium Screen Viewed',
  PREMIUM_PURCHASE_STARTED = 'Premium Purchase Started',
  CAREER_SIM_STARTED = 'Career Simulation Started',
  CAREER_SIM_COMPLETED = 'Career Simulation Completed',
  DECISION_CREATED = 'Decision Created',
  // ... more events
}
```

**User Properties:**
```typescript
setUserProperties({
  user_id: string,
  signup_date: string,
  ab_test_group: 'A' | 'B',
  is_premium: boolean,
  simulation_count: number
});
```

### Adjust Integration

**Purpose:** Marketing attribution and campaign tracking

**Configuration:**
- SDK: `react-native-adjust` v5.4.4
- Initialized on app launch
- Tracks install attribution

---

## Key Features

### 1. Career Simulation

**Technology:**
- AI: Claude Sonnet 4 (`claude-sonnet-4-20250514`)
- Max Tokens: 8192
- Temperature: 0.7

**Flow:**
1. User completes 5-step onboarding
2. Generates user context from profile
3. Calls Claude API with structured prompt
4. Parses JSON response (timeline, stats, insights)
5. Displays rich result page with:
   - Career outcome card
   - Timeline milestones
   - Global comparisons
   - Regret moments
   - Societal impact
   - Alternate paths (branches)

**Data Structure:**
```typescript
interface CareerSimulation {
  id: string;
  timeHorizon: 5 | 10 | 15;
  outcome: CareerOutcome;
  timeline: { milestones: TimelineNode[] };
  globalComparison: GlobalComparison;
  zoomIns: ZoomIns;
  societalImpact: SocietalImpact;
  alternatePaths: AlternatePath[];
}
```

### 2. Decision Intelligence

**Features:**
- Create decision cards
- Chat with AI Architect about decisions
- Simulate decision outcomes
- Compare options with "What If" scenarios

**AI Integration:**
- Claude for decision analysis
- Context-aware recommendations
- Personalized based on user profile

### 3. Life Timeline

**Features:**
- Visual timeline of life events
- Current year tracking
- Future projections
- Relationship tracking

### 4. Compatibility (Twin System)

**Features:**
- Generate unique twin codes
- Match with friends/partners
- Compatibility scoring
- Shared decision-making

### 5. Gamification

**Features:**
- Daily streaks
- Points system
- Leaderboard
- Task completion rewards

---

## Development & Deployment

### Development Environment

**Prerequisites:**
- Node.js 18+
- Expo CLI
- iOS Simulator (for iOS development)
- Xcode (for iOS builds)

**Setup:**
```bash
npm install
expo start
```

**Environment Variables:**
```
EXPO_PUBLIC_SUPABASE_URL=<supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
ANTHROPIC_API_KEY=<claude-api-key>
```

### Build Configuration

**EAS Build:**
- Project ID: `5ec525db-1667-48cc-8a1b-e1078a844e55`
- Platform: iOS
- Bundle ID: `com.jdhilo2.unreal`
- Build Number: 41

**Build Command:**
```bash
eas build --platform ios --profile production
```

### Deployment

**iOS App Store:**
1. Build with EAS: `eas build --platform ios`
2. Submit to App Store: `eas submit --platform ios`
3. App Store Connect review process
4. Release to production

**Over-the-Air Updates:**
```bash
eas update --branch production --message "Update description"
```

### Version Management

**Current Version:** 1.9.1
- **Major:** Breaking changes
- **Minor:** New features
- **Patch:** Bug fixes

**Version Locations:**
- `app.json`: `expo.version`
- `package.json`: `version`
- iOS Build Number: `expo.ios.buildNumber`

---

## Security & Privacy

### Data Protection

1. **Authentication:**
   - Supabase Auth with JWT tokens
   - Secure session storage (AsyncStorage)
   - Auto-refresh tokens

2. **API Keys:**
   - Stored in `app.json` (not committed to git)
   - Environment-specific configuration
   - Expo Secrets for sensitive keys

3. **User Data:**
   - Row-level security (RLS) in Supabase
   - User can only access their own data
   - Premium status verified server-side

### Privacy Compliance

**iOS Privacy Manifest:**
- Microphone access: Voice conversations with AI
- Location access: Local recommendations
- Tracking: Personalized content (ATT prompt)

**Data Collection:**
- User profile information
- Decision history
- Simulation results
- Analytics events (anonymized)

---

## Performance Optimization

### Strategies

1. **Code Splitting:**
   - Lazy loading of screens
   - Dynamic imports for heavy components

2. **Caching:**
   - AsyncStorage for user data
   - Supabase query caching
   - Image caching with Expo Image

3. **Animations:**
   - React Native Reanimated (runs on UI thread)
   - Optimized gesture handlers
   - 60 FPS animations

4. **Bundle Size:**
   - Tree shaking unused code
   - Optimized images (WebP format)
   - Minimal dependencies

---

## Monitoring & Error Tracking

### Tools

1. **Expo Crash Reporting:**
   - Automatic crash reports
   - Stack traces with source maps

2. **Mixpanel Session Replay:**
   - Visual playback of user sessions
   - Debug user issues

3. **Console Logging:**
   - Structured logging with context
   - Error boundaries for React components

---

## Future Roadmap

### Planned Features

1. **Android Support:**
   - React Native Android build
   - Google Play Store release
   - RevenueCat Android configuration

2. **Web Version:**
   - Next.js web app (per CAREER_SIM_IMPLEMENTATION_PROMPT.md)
   - Shared API with mobile
   - Responsive design

3. **Enhanced AI:**
   - Voice conversations (ElevenLabs integration)
   - Real-time video calls (LiveKit)
   - Multi-modal AI (image analysis)

4. **Social Features:**
   - Share simulations
   - Collaborative decisions
   - Twin challenges

---

## Appendix

### Key Files Reference

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout, auth initialization |
| `lib/revenuecat.ts` | RevenueCat SDK wrapper |
| `lib/supabase.ts` | Supabase client configuration |
| `store/useAuth.ts` | Authentication state management |
| `app/premium.tsx` | Premium upgrade screen |
| `app.json` | Expo configuration |
| `package.json` | Dependencies and scripts |

### External Resources

- **Supabase Dashboard:** [app.supabase.com](https://app.supabase.com)
- **RevenueCat Dashboard:** [app.revenuecat.com](https://app.revenuecat.com)
- **Mixpanel Dashboard:** [mixpanel.com](https://mixpanel.com)
- **Expo Dashboard:** [expo.dev](https://expo.dev)
- **App Store Connect:** [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

---

**Document Prepared By:** AI Technical Documentation Assistant  
**Contact:** For questions about this documentation, refer to the development team.

