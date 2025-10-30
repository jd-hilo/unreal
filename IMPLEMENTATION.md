# Twin App - Implementation Summary

## Overview

Twin is a production-ready Expo (React Native) app that helps users make decisions using AI-powered predictions and run "what-if" life simulations. The app builds a digital twin by collecting user data through onboarding, maintains a lean data model in Supabase with pgvector embeddings, and uses OpenAI for transcription, embeddings, and LLM reasoning.

## Architecture

### Tech Stack
- **Frontend**: Expo (React Native), TypeScript, Expo Router
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL with pgvector)
- **AI**: OpenAI (Whisper, text-embedding-3-small, GPT-4)
- **Styling**: StyleSheet (minimal, text-first design)

### Key Features Implemented

1. **Authentication** - Email/password auth with Supabase
2. **Onboarding Flow** - 7-screen journey to build the digital twin
3. **Decision Support** - Ask questions, get AI predictions with probabilities
4. **90-Day Simulations** - Premium feature to see outcome projections
5. **What-If Scenarios** - Explore counterfactual life paths
6. **Profile Management** - Track twin understanding progress with completion cards

## Database Schema

All tables use Row Level Security (RLS) with policies scoped to `auth.uid()`:

- **profiles** - Core user data with narrative summary and embeddings (1536-dim)
- **relationships** - People who influence decisions (with years known, frequency)
- **career_entries** - Professional timeline with satisfaction ratings
- **decisions** - Questions, options, predictions, and uncertainty scores
- **simulations** - 90-day outcome projections (premium)
- **what_if** - Counterfactual analysis with metrics comparisons
- **journals** - Daily mood and text entries

## AI Integration

### Core Pack (≤1.5k tokens)
- Identity snapshot (age, city, role)
- Personality & decision style
- Top relationships (name, years, frequency, influence)
- Career summary
- Ranked values

### Relevance Pack (≤800 tokens)
- Vector similarity search over narrative summaries
- Past decisions and outcomes
- Recent journal trends
- Relationship notes

### LLM Prompts Implemented
1. **Life Extractor** - Transforms transcripts into structured data
2. **Relationship Miner** - Extracts people mentions
3. **Quick Clarifier** - Generates follow-up questions
4. **Decision Predictor** - Returns probabilities and rationale
5. **Simulation** - Projects 30/90/365 day outcomes
6. **What-If** - Counterfactual trajectory analysis

## File Structure

```
app/
├── (tabs)/
│   ├── home.tsx          # Main screen with two big actions
│   └── profile.tsx       # Progress tracking and settings
├── onboarding/
│   ├── 01-now.tsx        # Where are you in life?
│   ├── 02-path.tsx       # How did you get here?
│   ├── 03-values.tsx     # What matters most?
│   ├── 04-style.tsx      # Decision-making style
│   ├── 05-day.tsx        # Typical day
│   ├── 06-stress.tsx     # Stress responses
│   └── 07-clarifier.tsx  # Quick details
├── decision/
│   ├── new.tsx           # Create decision
│   └── [id].tsx          # View results & simulate
├── whatif/
│   ├── new.tsx           # Enter scenario
│   └── [id].tsx          # View comparison
├── auth/
│   └── index.tsx         # Sign in/up
└── index.tsx             # Routing logic

lib/
├── supabase.ts           # Client singleton
├── ai.ts                 # OpenAI wrappers with mock mode
├── storage.ts            # Database helpers
└── relevance.ts          # Context building

store/
├── useAuth.ts            # Auth state
└── useTwin.ts            # Twin progress & premium

components/
├── Button.tsx
├── Card.tsx
├── Input.tsx
├── ProgressBar.tsx
├── AudioRecorder.tsx     # Voice input support
└── OnboardingScreen.tsx  # Shared layout
```

## Dev Mode

When `OPENAI_API_KEY` is not set, the app runs in mock mode with deterministic generators for all AI functions. This allows testing without API costs.

## Privacy & Security

- RLS enforces user_id = auth.uid() on all tables
- Sensitive fields (sexuality, relationships) marked as private
- "Prefer not to say" defaults
- Data export/delete stubs for GDPR compliance

## Next Steps

To run the app:

1. Ensure `.env` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. Optionally add `OPENAI_API_KEY` for real AI (otherwise uses mocks)
3. Run `npm run dev` to start Expo
4. Sign up/in to begin onboarding

## Notes

- Embeddings use 1536 dimensions (text-embedding-3-small) due to pgvector limits
- Premium feature toggle in Profile → Settings
- Audio recording requires native permissions (auto-requested)
- All AI prompts match the exact specifications from requirements
