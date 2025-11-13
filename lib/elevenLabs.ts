import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

// Eleven Labs API Configuration
// For security, move these to .env file in production
const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY || 'sk_86d1c31da4bcd655427beec71a42558bd47bb227b0712076';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface OnboardingData {
  firstName?: string;
  lifeSituation?: string;
  lifeJourney?: string;
  stressHandling?: string;
  hometown?: string;
  college?: string;
  relationships?: string;
}

// Text-to-Speech function using Eleven Labs (React Native compatible)
// Kept as utility function for other features that may need TTS
export async function textToSpeech(text: string): Promise<Audio.Sound | null> {
  try {
    console.log('🗣️ Generating speech for:', text.substring(0, 50) + '...');
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM`, // Default voice
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.statusText}`);
    }

    // Get audio as base64 for React Native
    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    // Save to temporary file in React Native
    const fileUri = `${FileSystem.documentDirectory}sol_speech_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log('✅ Audio file saved, creating sound...');
    
    const { sound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: false }
    );

    return sound;
  } catch (error) {
    console.error('❌ Text-to-speech error:', error);
    return null;
  }
}
