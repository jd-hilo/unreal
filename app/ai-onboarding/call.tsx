import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Check } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { Button } from '@/components/Button';
import { Orb } from '@/components/Orb';
import { useConversation } from '@elevenlabs/react-native';

const ELEVENLABS_AGENT_ID = 'agent_7501k9x1w3qneqtb2hyz9vth6267';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface OnboardingData {
  firstName?: string;
  lifeSituation?: string;
  lifeJourney?: string;
  stressHandling?: string;
  hometown?: string;
  college?: string;
  relationships?: string;
}

export default function AIOnboardingCall() {
  console.log('🟢 AI CALL SCREEN: Component rendering');
  const router = useRouter();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [conversationComplete, setConversationComplete] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [userConfirmedMic, setUserConfirmedMic] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const callStateRef = useRef({ started: false, complete: false });
  
  // Keep ref in sync with state
  useEffect(() => {
    callStateRef.current = { started: conversationStarted, complete: conversationComplete };
  }, [conversationStarted, conversationComplete]);

  useEffect(() => {
    console.log('🟢 AI CALL SCREEN: Component mounted');
    
    // Override router methods to prevent navigation during call
    const originalReplace = router.replace;
    const originalPush = router.push;
    const originalBack = router.back;
    
    router.replace = ((...args: any[]) => {
      const { started, complete } = callStateRef.current;
      if (started && !complete) {
        console.log('🚫 AI CALL SCREEN: BLOCKED router.replace attempt during active call!', args);
        return;
      }
      console.log('✅ AI CALL SCREEN: Allowing router.replace', args);
      return originalReplace.apply(router, args);
    }) as any;
    
    router.push = ((...args: any[]) => {
      const { started, complete } = callStateRef.current;
      if (started && !complete) {
        console.log('🚫 AI CALL SCREEN: BLOCKED router.push attempt during active call!', args);
        return;
      }
      console.log('✅ AI CALL SCREEN: Allowing router.push', args);
      return originalPush.apply(router, args);
    }) as any;
    
    router.back = (() => {
      const { started, complete } = callStateRef.current;
      if (started && !complete) {
        console.log('🚫 AI CALL SCREEN: BLOCKED router.back attempt during active call!');
        return;
      }
      console.log('✅ AI CALL SCREEN: Allowing router.back');
      return originalBack.apply(router);
    }) as any;
    
    return () => {
      console.log('🔴 AI CALL SCREEN: Component unmounting');
      // Restore original router methods
      router.replace = originalReplace;
      router.push = originalPush;
      router.back = originalBack;
    };
  }, []);

  // Use official Eleven Labs SDK
  const conversation = useConversation({
    onConnect: () => {
      console.log('✅ Connected to Eleven Labs agent');
      // Don't set conversationStarted here - it's already set when starting
    },
    onDisconnect: () => {
      console.log('❌ Disconnected from agent');
      // Check if conversation is complete
      if (isConversationComplete(onboardingData)) {
        setConversationComplete(true);
      }
    },
    onMessage: (message: any) => {
      console.log('💬 Message:', message);
      
      const role = message.source === 'user' ? 'user' : 'assistant';
      const content = typeof message === 'string' ? message : (message.message || message.text || '');
      
      if (content) {
        setMessages(prev => [...prev, {
          role,
          content,
          timestamp: new Date(),
        }]);
        
        // Extract onboarding data from user messages
        if (role === 'user') {
          extractDataFromMessage(content);
        }
      }
    },
    onError: (error) => {
      console.error('❌ Conversation error:', error);
      alert(`Call error: ${error.message || error}`);
    },
    onModeChange: (mode) => {
      console.log('📊 Mode changed:', mode.mode);
    },
    onStatusChange: (status) => {
      console.log('📊 Status changed:', status.status);
    },
  });

  useEffect(() => {
    // Check microphone permission on load
    const checkTimer = setTimeout(() => {
      checkMicrophonePermission();
    }, 100);

    return () => {
      clearTimeout(checkTimer);
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Check if conversation is complete and end session
  useEffect(() => {
    if (isConversationComplete(onboardingData) && conversation.status === 'connected') {
      console.log('✅ Conversation complete - all data collected');
      // Wait a moment for final message to be heard, then end session
      setTimeout(async () => {
        console.log('🔚 Ending session automatically');
        try {
          await conversation.endSession();
          setConversationComplete(true);
        } catch (error) {
          console.error('Failed to end session:', error);
          setConversationComplete(true);
        }
      }, 3000); // 3 second delay for user to hear final message
    }
  }, [onboardingData, conversation.status]);

  // NAVIGATION BLOCKER: Prevent navigation away from call until complete
  useEffect(() => {
    console.log('🛡️ AI CALL SCREEN: Setting up navigation blocker');
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      console.log('⚠️ AI CALL SCREEN: Navigation attempt detected!', {
        conversationComplete,
        conversationStarted,
        action: e.data.action
      });
      
      // Allow navigation if conversation is complete or never started
      if (conversationComplete || !conversationStarted) {
        console.log('✅ AI CALL SCREEN: Allowing navigation (conversation complete or not started)');
        return;
      }

      // Prevent default navigation
      console.log('🚫 AI CALL SCREEN: BLOCKING navigation - showing confirmation dialog');
      e.preventDefault();

      // Show confirmation dialog
      Alert.alert(
        'End conversation?',
        'Are you sure you want to end your conversation with Sol? Your progress will be lost.',
        [
          { text: "Stay", style: 'cancel', onPress: () => console.log('User chose to stay') },
          {
            text: 'End Call',
            style: 'destructive',
            onPress: async () => {
              console.log('User chose to end call');
              try {
                await conversation.endSession();
              } catch (error) {
                console.error('Failed to end session:', error);
              }
              // Allow navigation after ending call
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return () => {
      console.log('🛡️ AI CALL SCREEN: Removing navigation blocker');
      unsubscribe();
    };
  }, [navigation, conversationComplete, conversationStarted, conversation]);

  function isConversationComplete(data: OnboardingData): boolean {
    return !!(
      data.firstName &&
      data.lifeSituation &&
      data.lifeJourney &&
      data.stressHandling &&
      data.hometown &&
      data.college &&
      data.relationships
    );
  }

  function extractDataFromMessage(message: string) {
    // Extract data intelligently based on conversation context
    const userMessages = messages.filter(m => m.role === 'user');
    const messageIndex = userMessages.length;
    
    // Extract based on which question we're on
    if (messageIndex === 0 && !onboardingData.firstName) {
      // First user message is the name
      const name = extractFirstName(message);
      setOnboardingData(prev => ({ ...prev, firstName: name }));
    } else if (messageIndex === 1 && !onboardingData.lifeSituation) {
      setOnboardingData(prev => ({ ...prev, lifeSituation: message }));
    } else if (messageIndex === 2 && !onboardingData.lifeJourney) {
      setOnboardingData(prev => ({ ...prev, lifeJourney: message }));
    } else if (messageIndex === 3 && !onboardingData.stressHandling) {
      setOnboardingData(prev => ({ ...prev, stressHandling: message }));
    } else if (messageIndex === 4 && !onboardingData.hometown) {
      setOnboardingData(prev => ({ ...prev, hometown: message }));
    } else if (messageIndex === 5 && !onboardingData.college) {
      setOnboardingData(prev => ({ ...prev, college: message }));
    } else if (messageIndex === 6 && !onboardingData.relationships) {
      setOnboardingData(prev => ({ ...prev, relationships: message }));
    }
  }

  function extractFirstName(message: string): string {
    // Try to extract first name from various response formats
    const patterns = [
      /my name is (\w+)/i,
      /i'm (\w+)/i,
      /i am (\w+)/i,
      /^(\w+)$/i,
      /call me (\w+)/i,
      /this is (\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
    }

    // Take first capitalized word
    const words = message.split(/\s+/);
    for (const word of words) {
      if (word.length > 1 && /^[A-Z][a-z]+$/.test(word)) {
        return word;
      }
    }
    
    // Otherwise, take first word that looks like a name
    for (const word of words) {
      if (word.length > 1 && /^[A-Za-z]+$/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
    }

    return message.trim();
  }

  async function checkMicrophonePermission() {
    console.log('🔍 Permission check skipped - user must tap Enable Microphone button');
    setMicPermission('undetermined');
  }

  async function requestMicrophonePermission() {
    if (userConfirmedMic && micPermission === 'granted') {
      console.log('ℹ️ Microphone already enabled, skipping');
      return;
    }

    setCheckingPermission(true);
    try {
      console.log('🎤 Requesting iOS microphone permission...');
      
      const { status, granted } = await Audio.requestPermissionsAsync();
      console.log('📱 Permission result:', { status, granted });
      
      if (status === 'granted') {
        console.log('✅ Microphone permission GRANTED!');
        
        // Verify with recording test
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            playThroughEarpieceAndroid: false,
          });
          
          const { recording } = await Audio.Recording.createAsync(
            Audio.RecordingOptionsPresets.HIGH_QUALITY
          );
          
          console.log('✅ Recording test successful');
          await recording.stopAndUnloadAsync();
          
          setMicPermission('granted');
          setUserConfirmedMic(true);
        } catch (recError: any) {
          console.error('❌ Recording test failed:', recError.message);
          setMicPermission('denied');
        }
      } else {
        console.log('❌ Microphone permission DENIED');
        setMicPermission('denied');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to request permission:', error);
      setMicPermission('denied');
    } finally {
      setCheckingPermission(false);
    }
  }

  async function handleStartCall() {
    console.log('🎙️ AI CALL SCREEN: handleStartCall invoked');
    if (micPermission !== 'granted' || !userConfirmedMic) {
      console.log('⚠️ AI CALL SCREEN: Permission not granted');
      return;
    }

    // Set conversationStarted BEFORE calling startSession to switch to call UI
    console.log('🎙️ AI CALL SCREEN: Setting conversationStarted = true');
    setConversationStarted(true);

    try {
      console.log('🚀 AI CALL SCREEN: Starting conversation with agent:', ELEVENLABS_AGENT_ID);
      await conversation.startSession({
        agentId: ELEVENLABS_AGENT_ID,
      });
      console.log('✅ AI CALL SCREEN: Session started successfully');
    } catch (error) {
      console.error('❌ AI CALL SCREEN: Failed to start session:', error);
      alert('Failed to start conversation. Please try again.');
      setConversationStarted(false); // Reset on error
    }
  }

  async function handleEndCall() {
    try {
      if (conversation.status === 'connected') {
        await conversation.endSession();
      }
      router.back();
    } catch (error) {
      console.error('Failed to end session:', error);
      router.back();
    }
  }

  function handleContinueToReview() {
    router.push({
      pathname: '/ai-onboarding/review',
      params: {
        data: JSON.stringify(onboardingData),
      },
    });
  }

  function getCallStatus() {
    if (!conversation || conversation.status !== 'connected') return 'disconnected';
    if (conversation.isSpeaking) return 'speaking';
    return 'listening';
  }

  // Debug: Log conversation object
  useEffect(() => {
    console.log('🔍 Conversation object:', {
      status: conversation?.status,
      isSpeaking: conversation?.isSpeaking,
      conversationStarted,
    });
  }, [conversation?.status, conversation?.isSpeaking, conversationStarted]);

  // Pre-call screen
  if (!conversationStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.avatarContainer}>
            <Orb status="connected" size={160} />
          </View>

          <Text style={styles.title}>Ready to chat with Sol?</Text>
          <Text style={styles.subtitle}>
            This will be a quick 3-5 minute conversation. Sol will ask you a few questions to build your twin.
          </Text>
        </View>

        <View style={styles.footer}>
          {/* Microphone Permission Button */}
          <TouchableOpacity
            style={[
              styles.micPermissionButton,
              micPermission === 'granted' && styles.micPermissionButtonGranted,
              micPermission === 'denied' && styles.micPermissionButtonDenied,
            ]}
            onPress={requestMicrophonePermission}
            disabled={checkingPermission}
            activeOpacity={0.7}
          >
            <View style={styles.micPermissionContent}>
              <View style={[
                styles.checkbox,
                micPermission === 'granted' && styles.checkboxChecked,
              ]}>
                {micPermission === 'granted' && (
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                )}
              </View>
              <View style={styles.micPermissionText}>
                <Text style={styles.micPermissionTitle}>
                  {checkingPermission ? 'Checking...' : 'Enable Microphone'}
                </Text>
                <Text style={styles.micPermissionSubtitle}>
                  {micPermission === 'granted' && 'Microphone enabled ✓'}
                  {micPermission === 'denied' && 'Permission denied - Check settings'}
                  {micPermission === 'undetermined' && 'Tap to enable microphone access'}
                </Text>
              </View>
              {checkingPermission && (
                <ActivityIndicator size="small" color="#4169E1" />
              )}
              {!checkingPermission && micPermission === 'undetermined' && (
                <Mic size={24} color="#4169E1" />
              )}
              {!checkingPermission && micPermission === 'granted' && (
                <Mic size={24} color="#10B981" />
              )}
              {!checkingPermission && micPermission === 'denied' && (
                <MicOff size={24} color="#EF4444" />
              )}
            </View>
          </TouchableOpacity>

          {/* Start Conversation Button */}
          <Button
            title="Start Conversation"
            onPress={handleStartCall}
            size="large"
            icon={<Phone size={20} color="#FFFFFF" />}
            disabled={!userConfirmedMic || micPermission !== 'granted'}
          />
          
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const callStatus = getCallStatus();

  // Debug render
  console.log('🎨 Rendering call screen, conversationStarted:', conversationStarted, 'status:', conversation?.status);

  // Active call screen
  return (
    <View style={styles.container}>
      <View style={styles.callScreen}>
        {/* Header */}
        <View style={styles.callHeader}>
          <Text style={styles.callHeaderTitle}>Voice Call with Sol</Text>
          <View style={styles.statusIndicatorContainer}>
            <View style={[
              styles.statusDot,
              { backgroundColor: callStatus === 'listening' ? '#10B981' : 
                              callStatus === 'speaking' ? '#F59E0B' : '#6B7280' }
            ]} />
            <Text style={styles.statusText}>
              {callStatus === 'speaking' ? 'Sol is speaking...' : 
               callStatus === 'listening' ? 'Listening...' : 'Connecting...'}
            </Text>
          </View>
        </View>

        {/* Animated Orb */}
        <View style={styles.callAvatarContainer}>
          <Orb status={callStatus} size={200} />
        </View>

        {/* Live Transcript */}
        <View style={styles.transcriptContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.transcriptScroll}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.slice(-3).map((msg, index) => (
              <View key={index} style={styles.transcriptItem}>
                <Text style={styles.transcriptSpeaker}>
                  {msg.role === 'user' ? 'You' : 'Sol'}:
                </Text>
                <Text style={styles.transcriptText}>{msg.content}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Call Complete Overlay */}
        {conversationComplete && (
          <View style={styles.completeOverlay}>
            <View style={styles.completeCard}>
              <Text style={styles.completeTitle}>✨ Call Complete!</Text>
              <Text style={styles.completeText}>
                Great conversation! Let's review what we discussed.
              </Text>
            </View>
            <Button
              title="Review & Continue"
              onPress={handleContinueToReview}
              size="large"
            />
          </View>
        )}
      </View>

      {/* Call Controls */}
      {!conversationComplete && (
        <View style={styles.callFooter}>
          {/* Microphone Status Indicator */}
          <View style={styles.muteButton}>
            <Mic size={24} color="#10B981" />
            <Text style={styles.muteText}>Microphone Active</Text>
          </View>

          {/* End Call Button */}
          <TouchableOpacity onPress={handleEndCall} style={styles.endCallButton}>
            <PhoneOff size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.endCallText}>End Call</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  // Pre-call screen styles
  centerContent: {
    flex: 1,
    padding: 24,
    paddingTop: 120,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: 24,
    gap: 16,
  },
  micPermissionButton: {
    backgroundColor: 'rgba(20, 18, 30, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(183, 149, 255, 0.3)',
    borderRadius: 16,
    padding: 18,
  },
  micPermissionButtonGranted: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  micPermissionButtonDenied: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  micPermissionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(183, 149, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  micPermissionText: {
    flex: 1,
    gap: 4,
  },
  micPermissionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  micPermissionSubtitle: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    fontWeight: '600',
  },
  // Call screen styles
  callScreen: {
    flex: 1,
    paddingTop: 60,
  },
  callHeader: {
    padding: 24,
    alignItems: 'center',
  },
  callHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  callAvatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcriptContainer: {
    height: 180,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    gap: 12,
  },
  transcriptItem: {
    gap: 4,
  },
  transcriptSpeaker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4169E1',
  },
  transcriptText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.9)',
    lineHeight: 22,
  },
  callFooter: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 16,
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 18, 30, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(183, 149, 255, 0.3)',
  },
  muteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    fontWeight: '500',
  },
  completeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 12, 16, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 24,
  },
  completeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 16,
    padding: 24,
    gap: 8,
    width: '100%',
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  completeText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.85)',
    lineHeight: 24,
    textAlign: 'center',
  },
});
