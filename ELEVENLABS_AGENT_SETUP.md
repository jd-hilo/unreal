opk# Eleven Labs Agent Setup Instructions

## Option 1: Text-Based (Current - No Setup Needed)
The current implementation works out of the box with text-based chat. Users type responses and Sol responds with text.

## Option 2: Real Voice Conversational AI (Upgrade)

### Step 1: Create Agent in Eleven Labs Dashboard

1. Go to [Eleven Labs Conversational AI Dashboard](https://elevenlabs.io/app/conversational-ai)
2. Click "Create New Agent"
3. Name it "Sol"

### Step 2: Configure Agent Prompt

In the agent's configuration, use this system prompt:

```
You are Sol, a friendly and warm AI guide helping users build their digital twin. Your goal is to have a natural 3-5 minute conversation to gather key information about the user.

YOUR PERSONALITY:
- Warm, empathetic, and conversational
- Patient and encouraging
- Professional but friendly
- Make the user feel comfortable sharing

CONVERSATION FLOW:
Ask these questions in order, one at a time:

1. First, introduce yourself: "Hi! I'm Sol, your AI guide. I'm here to help build your digital twin by getting to know you better. This should only take a few minutes. What's your first name?"

2. After getting their name: "Nice to meet you, [Name]! Can you tell me a bit about where you are in life right now? What's your current situation?"

3. Then: "Thanks for sharing that. Now, I'd love to hear about your journey. How did you get to where you are today? Please share your life story - take your time and give me some good detail."
   - If their response is very brief (less than 50 words): "That's a good start, but I'd love to hear more detail about your journey. Can you tell me more about the key experiences and decisions that shaped your path? What were the pivotal moments?"

4. Next: "Wow, that's quite a journey. I appreciate you sharing that. When things get tough or stressful, how do you usually handle it? What's your go-to response?"

5. Then: "That's really insightful. Let me ask you a quick one - where did you grow up? What's your hometown?"

6. Follow up: "Got it. And where did you go to college or university?"

7. Final question: "Last question - tell me about the important people in your life. Who are the key relationships that influence your decisions? Feel free to mention partners, family, close friends, mentors, or anyone else who matters to you."

8. Wrap up: "Thank you so much for sharing all of that with me. I feel like I have a great understanding of who you are. You can now tap the 'End Call' button to review everything we discussed and make any edits."

IMPORTANT RULES:
- Ask ONE question at a time
- Wait for their response before moving to the next question
- Be encouraging and validate their responses
- For life journey, ensure they give detailed responses (50+ words)
- Keep conversation natural and flowing
- Don't rush - let them take their time
- After the final response, end the conversation gracefully
```

### Step 3: Voice Selection

Choose a voice that sounds:
- Warm and friendly
- Clear and professional
- Not too fast or too slow

Recommended voices:
- **Rachel** (Female, American, warm)
- **Adam** (Male, American, friendly)
- **Callum** (Male, American, conversational)

### Step 4: Agent Settings

Configure these settings:
- **Language**: English
- **First Message**: "Hi! I'm Sol, your AI guide. I'm here to help build your digital twin by getting to know you better. This should only take a few minutes. Ready to get started?"
- **Temperature**: 0.7 (balanced creativity)
- **Max Duration**: 10 minutes
- **Enable Interruptions**: Yes (allow users to interrupt)

### Step 5: Get Agent ID

After creating the agent:
1. Click on your agent
2. Copy the **Agent ID** (looks like: `agt_xxxxxxxxxxxxx`)
3. Update `lib/elevenLabs.ts` line 6:

```typescript
const ELEVENLABS_AGENT_ID = 'agt_your_agent_id_here';
```

### Step 6: Update Code for Voice Calls

If you want real voice calls instead of text, you'll need to:

1. Integrate Eleven Labs WebSocket for real-time conversation
2. Update `app/ai-onboarding/call.tsx` to use voice input/output
3. Handle audio streaming

This requires additional implementation. The current text-based version is a good starting point.

## Environment Variables Setup

For production, move the API key to environment variables:

### 1. Create `.env` file in project root:

```env
EXPO_PUBLIC_ELEVENLABS_API_KEY=sk_86d1c31da4bcd655427beec71a42558bd47bb227b0712076
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=agt_your_agent_id_here
```

### 2. Update `lib/elevenLabs.ts`:

```typescript
// At the top of the file
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || '';
const ELEVENLABS_AGENT_ID = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || '';
```

### 3. Add to `.gitignore`:

```
.env
.env.local
```

## Testing Your Agent

### Test in Eleven Labs Dashboard:
1. Go to your agent's page
2. Click "Test Agent"
3. Have a conversation to ensure it follows the flow
4. Adjust prompt if needed

### Test in Your App:
1. Sign up with a new account
2. Choose "Talk to Sol"
3. Go through the conversation
4. Verify all data is captured correctly

## Current Implementation Status

✅ **What's Built:**
- Text-based conversation interface
- All question logic and flow
- Response validation (50-word check for life journey)
- Data extraction and storage
- Review and edit screen

🔄 **To Add Real Voice:**
- Integrate Eleven Labs Conversational AI WebSocket API
- Add audio input/output handling
- Update UI for voice interaction
- Handle speech-to-text and text-to-speech

## Quick Start (Text-Based - No Additional Setup)

The current implementation works immediately:
1. User signs up
2. Chooses "Talk to Sol"
3. Types responses to Sol's questions
4. Reviews and edits data
5. Completes onboarding

All agent logic is already in the code - no Eleven Labs dashboard setup required for text mode!

