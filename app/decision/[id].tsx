import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, Alert, Image, Clipboard, Modal, Linking, Platform, Animated, Share } from 'react-native';
import { LigatureFreeText } from '@/components/LigatureFreeText';
import * as Haptics from 'expo-haptics';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/store/useAuth';
import { getDecision, updateDecisionPrediction, getDecisionParticipants } from '@/lib/storage';
import { predictDecision } from '@/lib/ai';
import { buildCorePack, buildRelevancePack } from '@/lib/relevance';
import { formatFactors } from '@/lib/factorFormatter';
import { Button } from '@/components/Button';
import { Home, Sparkles, Users, Lock, Zap, Share as ShareIcon, Instagram, Ghost, ChevronRight, ChevronLeft, MessageCircle, ChevronDown } from 'lucide-react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTwin } from '@/store/useTwin';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';

// Helper function to clean rationale text
function cleanRationale(text: string): string {
  if (!text) return text;
  // Remove common unwanted phrases related to "decision making"
  return text
    .replace(/\bdecision[- ]making\b/gi, '')
    .replace(/\bdecision making process\b/gi, '')
    .replace(/\bdecision[- ]making process\b/gi, '')
    .replace(/\bin decision making\b/gi, '')
    .replace(/\bwhen making decisions\b/gi, '')
    .replace(/\bdecision[- ]making context\b/gi, '')
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

export default function DecisionResultScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [decision, setDecision] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [sharing, setSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current;
  const arrowBounce = useRef(new Animated.Value(0)).current;

  // Disable swipe-to-go-back gesture on both current and parent navigators
  useFocusEffect(() => {
    // Disable on current screen
    navigation.setOptions({
      gestureEnabled: false,
    });

    // Disable on parent navigator (to prevent swiping back to home)
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        gestureEnabled: false,
      });
    }

    return () => {
      // Re-enable on cleanup
      navigation.setOptions({
        gestureEnabled: true,
      });
      if (parent) {
        parent.setOptions({
          gestureEnabled: true,
        });
      }
    };
  });

  useEffect(() => {
    if (user) {
      loadDecision();
    }
  }, [id, user]);

  // Animate arrow bounce
  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowBounce, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(arrowBounce, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();
    return () => bounceAnimation.stop();
  }, [arrowBounce]);

  useEffect(() => {
    // Lazy-load suggestions after decision loads
    if (decision && decision.prediction && user) {
      loadSuggestions();
    }
  }, [decision?.id, decision?.prediction]);

  async function loadDecision() {
    if (!id || typeof id !== 'string' || !user) return;

    try {
      const [decisionData, participantsData] = await Promise.all([
        getDecision(id),
        getDecisionParticipants(id as string),
      ]);
      
      if (!decisionData) {
        setLoading(false);
        return;
      }

      setDecision(decisionData);
      setParticipants(participantsData || []);
      
      // Always generate prediction on result screen if decision is not a draft
      // This ensures AI is called when viewing the result
      if (decisionData.status !== 'draft' && !decisionData.prediction) {
        await generatePrediction(decisionData);
      }
      
      // Trigger fade-in animation after data loads
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Failed to load decision:', error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function generatePrediction(decisionData: any) {
    if (!user || !decisionData) {
      console.warn('Cannot generate prediction: missing user or decision data');
      return;
    }

    setPredicting(true);
    console.log('Generating AI prediction for decision:', decisionData.id);

    try {
      console.log('Building core pack and relevance pack...');
      
      // Get all participant user IDs
      const allUserIds = [user.id, ...participants.map(p => p.participant_user_id)];
      
      const corePack = await buildCorePack(user.id, allUserIds);
      const relevancePack = await buildRelevancePack(user.id, decisionData.question);
      
      console.log('Core pack length:', corePack.length);
      console.log('Relevance pack length:', relevancePack.length);
      console.log('Number of twins:', allUserIds.length);
      
      const options = Array.isArray(decisionData.options) 
        ? decisionData.options 
        : JSON.parse(decisionData.options || '[]');

      console.log('Calling predictDecision AI function...');
      const prediction = await predictDecision({
        corePack,
        relevancePack,
        question: decisionData.question,
        options,
        participantCount: allUserIds.length,
      });

      console.log('AI prediction received:', {
        prediction: prediction.prediction,
        probs: prediction.probs,
        uncertainty: prediction.uncertainty,
      });

      console.log('Saving prediction to database...');
      await updateDecisionPrediction(decisionData.id, prediction);

      // Reload the decision to get the updated prediction
      const updatedDecision = await getDecision(decisionData.id);
      setDecision(updatedDecision);
      console.log('Prediction saved and decision updated');
      
      // Trigger fade-in animation after prediction loads
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reload suggestions after new prediction
      loadSuggestions();
    } catch (error) {
      console.error('Failed to generate prediction:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      alert('Failed to generate prediction. Please try again.');
    } finally {
      setPredicting(false);
    }
  }

  async function loadSuggestions() {
    if (!decision?.id || !decision?.prediction || !user) return;
    
    setLoadingSuggestions(true);
    try {
      const { getDecisionSuggestions } = await import('@/lib/decisionsApi');
      const data = await getDecisionSuggestions(
        decision.id,
        user.id,
        decision.question,
        Array.isArray(decision.options) ? decision.options : JSON.parse(decision.options || '[]'),
        decision.prediction.probs,
        decision.prediction.factors || []
      );
      if (data) {
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleChatWithArchitect() {
    if (!user || !decision) return;
    
    // Track chat opened
    trackEvent(MixpanelEvents.DECISION_CHAT_OPENED, {
      decision_id: decision.id,
      has_prediction: !!decision.prediction
    });
    
    // Navigate to chat page
    router.push(`/decision/chat/${decision.id}` as any);
  }

  async function handleShare() {
    if (sharing || !prediction) return;
    setSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setShowShareModal(true);
      trackEvent(MixpanelEvents.DECISION_SHARE_OPENED, { decision_id: decision.id });
    } catch (error) {
      console.error('Error opening share modal:', error);
    } finally {
      setSharing(false);
    }
  }

  async function shareDecision() {
    if (!prediction) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      const appStoreLink = 'https://apps.apple.com/us/app/mora-simulate-your-life/id6754901842';
      const cleanedRationale = cleanRationale(prediction.rationale);
      const rationalePreview = cleanedRationale.length > 150 
        ? cleanedRationale.substring(0, 150) + '...' 
        : cleanedRationale;
      
      const shareMessage = `Question: ${decision.question}\n\nRecommended: ${prediction.prediction}\n\nWhy: ${rationalePreview}\n\ndecided with mora\n${appStoreLink}`;

      await Share.share({
        message: shareMessage,
      });
      
      trackEvent(MixpanelEvents.DECISION_SHARED, { decision_id: decision.id, platform: 'native' });
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share.');
    }
  }

  async function shareToInstagram() {
    shareDecision();
  }

  async function shareToSnapchat() {
    shareDecision();
  }

  async function shareMore() {
    shareDecision();
  }

  if (loading || predicting) {
    return (
      <View style={styles.screen}>
        <View style={styles.backgroundGradient}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
                <Home size={24} color={Colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.textSecondary} />
              <Text style={styles.loadingText}>
                {predicting ? 'Generating prediction...' : 'Loading...'}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  if (!decision) {
    return (
      <View style={styles.screen}>
        <View style={styles.backgroundGradient}>
          <StatusBar style="dark" />
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
                <Home size={24} color={Colors.textPrimary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Decision not found</Text>
            </View>
          </SafeAreaView>
        </View>
      </View>
    );
  }

  const prediction = decision.prediction;
  // Confidence should match the highest probability percentage
  const confidence = prediction && prediction.probs 
    ? Math.max(...Object.values(prediction.probs as Record<string, number>)) * 100 
    : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
              <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
            </TouchableOpacity>
            {prediction && (
              <TouchableOpacity 
                onPress={handleShare} 
                style={styles.shareButton}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={Colors.textPrimary} />
                ) : (
                  <View style={styles.shareIconContainer}>
                    <ShareIcon size={22} color={Colors.textPrimary} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Animated.ScrollView 
            ref={scrollViewRef as any}
            style={[styles.content, { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]} 
            contentContainerStyle={styles.contentContainer}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              {
                useNativeDriver: false,
                listener: (event: any) => {
                  const offsetY = event.nativeEvent.contentOffset.y;
                  const contentHeight = event.nativeEvent.contentSize.height;
                  const layoutHeight = event.nativeEvent.layoutMeasurement.height;
                  const distanceFromBottom = contentHeight - layoutHeight - offsetY;
                  
                  // Fade out when within 100px of bottom
                  if (distanceFromBottom < 100) {
                    Animated.timing(hintOpacity, {
                      toValue: 0,
                      duration: 300,
                      useNativeDriver: true,
                    }).start(() => {
                      setShowScrollHint(false);
                    });
                  } else if (!showScrollHint) {
                    setShowScrollHint(true);
                    Animated.timing(hintOpacity, {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true,
                    }).start();
                  }
                },
              }
            )}
            scrollEventThrottle={16}
          >
            {/* Main Header */}
            <View style={styles.headerCard}>
              <View style={styles.headerCardBlur}>
                <Text style={styles.headerLabel}>Question</Text>
                <Text style={styles.headerText}>
                  {decision.question}
                </Text>
              </View>
            </View>

        {/* Show participants if any */}
        {participants.length > 0 && (
          <View style={styles.participantsSection}>
            <View style={styles.participantsHeader}>
              <Users size={16} color={Colors.textSecondary} />
              <Text style={styles.participantsTitle}>
                Consulted with {participants.length} other {participants.length === 1 ? 'twin' : 'twins'}
              </Text>
            </View>
            <View style={styles.participantsList}>
              {participants.map((p) => (
                <View key={p.id} style={styles.participantChip}>
                  <Text style={styles.participantName}>{p.first_name || 'Someone'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!prediction && decision.status !== 'draft' && user && (
          <View style={styles.noPredictionContainer}>
            <Text style={styles.noPredictionText}>
              Get an AI-powered prediction for your decision
            </Text>
            <Button
              title="Get Prediction"
              onPress={() => generatePrediction(decision)}
              loading={predicting}
              size="large"
              style={styles.generateButton}
            />
          </View>
        )}

        {prediction && (
          <>
            <View style={styles.predictionCard}>
              <Text style={styles.predictionLabel}>Recommended</Text>
              <LigatureFreeText text={prediction.prediction} style={styles.predictionValue} />
              <Text style={styles.confidence}>
                {confidence.toFixed(0)}% confidence
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Why this choice?</Text>
                <Text style={styles.rationale}>{cleanRationale(prediction.rationale)}</Text>
              </View>
            </View>

            {prediction.probs && (
              <View style={styles.section}>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>All Options</Text>
                  {Object.entries(prediction.probs as Record<string, number>).map(
                    ([option, prob]) => (
                      <View key={option} style={styles.optionRow}>
                        <Text style={styles.optionName}>{option}</Text>
                        <View style={styles.probContainer}>
                          <View style={styles.probBarBackground}>
                            <LinearGradient
                              colors={Colors.gradients.turquoise}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                            style={[
                              styles.probBar,
                              { width: `${(prob as number) * 100}%` },
                            ]}
                          />
                          </View>
                          <Text style={styles.probText}>
                            {((prob as number) * 100).toFixed(0)}%
                          </Text>
                        </View>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}

            {/* If things were different Section */}
            {decision.prediction && (
              <View style={styles.section}>
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                    <View style={styles.sparklesIconContainer}>
                      <Sparkles size={20} color={Colors.textSecondary} />
                    </View>
                    <Text style={styles.sectionTitle}>If things were different…</Text>
                  </View>
                  {loadingSuggestions ? (
                    <ActivityIndicator size="small" color={Colors.textSecondary} style={styles.sectionLoader} />
                  ) : suggestions?.suggestions ? (
                    <View style={styles.suggestionsContainer}>
                      {suggestions.suggestions.map((suggestion: any, index: number) => (
                        <View key={index} style={styles.suggestionCard}>
                          <Text style={styles.suggestionLabel}>{suggestion.label}</Text>
                          {suggestion.probs && (
                            <View style={styles.suggestionProbs}>
                              {Object.entries(suggestion.probs).map(([option, prob]: [string, any]) => {
                                const currentProb = decision.prediction.probs[option] || 0;
                                const delta = prob - currentProb;
                                return (
                                  <View key={option} style={styles.suggestionProbRow}>
                                    <Text style={styles.suggestionOption}>{option}</Text>
                                    <Text style={styles.suggestionProb}>{(prob * 100).toFixed(0)}%</Text>
                                    {delta !== 0 && (
                                      <Text style={[styles.suggestionDelta, { color: delta > 0 ? '#10B981' : '#EF4444' }]}>
                                        {delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}%
                                      </Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                          {suggestion.delta && (
                            <Text style={styles.suggestionDeltaText}>{suggestion.delta}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyStateText}>
                      No suggestions available at this time.
                    </Text>
                  )}
                </View>
              </View>
            )}

            {prediction.factors && (
              <View style={styles.section}>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Key Factors</Text>
                  {formatFactors(prediction.factors).map((formattedFactor: string, index: number) => (
                    <Text key={index} style={styles.factor}>
                      {formattedFactor}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {/* Chaos Level */}
            {(prediction.chaosLevel !== undefined || prediction.chaosMessage) && (() => {
              const chaosLevel = prediction.chaosLevel || 50;
              const chaosColor = chaosLevel <= 33 ? '#10B981' : chaosLevel <= 66 ? '#F59E0B' : '#EF4444';
              return (
                <View style={styles.section}>
                  <View style={styles.sectionCard}>
                    <View style={styles.chaosHeaderColumn}>
                      <View style={styles.chaosTitleRow}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Chaos Level</Text>
                        <Text style={[styles.chaosValue, { color: chaosColor }]}>
                          {chaosLevel}%
                        </Text>
                      </View>
                      {prediction.chaosMessage && (
                        <Text style={[styles.chaosMessage, { color: chaosColor }]}>
                          {prediction.chaosMessage}
                        </Text>
                      )}
                    </View>
                    <View style={styles.chaosBarBg}>
                      <View style={[styles.chaosBarFill, { width: `${chaosLevel}%`, backgroundColor: chaosColor }]} />
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Side Effects */}
            {prediction.sideEffects && prediction.sideEffects.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Side Effects of This Decision</Text>
                  {prediction.sideEffects.map((effect: string, index: number) => (
                    <View key={index} style={styles.sideEffectItem}>
                      <Text style={styles.sideEffectBullet}>•</Text>
                      <Text style={styles.sideEffectText}>{effect}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Next Steps */}
            {prediction.nextSteps && prediction.nextSteps.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Next Steps</Text>
                  {prediction.nextSteps.map((step: string, index: number) => (
                    <View key={index} style={styles.nextStepItem}>
                      <Text style={styles.nextStepNumber}>{index + 1}</Text>
                      <Text style={styles.nextStepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Pressable
              onPress={handleChatWithArchitect}
              style={({ pressed }) => [
                styles.architectButton,
                {
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(0, 188, 166, 0.06)', 'rgba(144, 140, 241, 0.06)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.architectButtonGradient}
              >
                <MessageCircle size={16} color="#696969" strokeWidth={2} />
                <Text style={styles.architectButtonText}>Talk with the Architect</Text>
              </LinearGradient>
            </Pressable>

            <TouchableOpacity
              style={styles.askAnotherButton}
              onPress={() => router.push('/decision/new')}
              activeOpacity={0.7}
            >
              <Text style={styles.askAnotherButtonText}>Ask Another Decision</Text>
            </TouchableOpacity>

            {/* Disclaimer */}
            <View style={styles.disclaimerSection}>
              <Text style={styles.disclaimerText}>
                The Architect uses your digital twin to help you think through decisions, but the final choice is always yours.
              </Text>
            </View>
          </>
        )}
          </Animated.ScrollView>

          {/* Sticky scroll hint */}
          {showScrollHint && (
            <Animated.View 
              style={[
                styles.scrollHint,
                { opacity: hintOpacity }
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
              >
                <BlurView intensity={80} tint="light" style={styles.scrollHintBlur}>
                  <Text style={styles.scrollHintText}>Scroll to speak to architect</Text>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          translateY: arrowBounce.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 4],
                          }),
                        },
                      ],
                    }}
                  >
                    <ChevronDown size={16} color={Colors.textPrimary} strokeWidth={2} />
                  </Animated.View>
                </BlurView>
              </TouchableOpacity>
            </Animated.View>
          )}
        </SafeAreaView>
      </View>

      {/* Custom Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        >
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.shareModalContent}>
              <Text style={styles.shareModalTitle}>Share Result</Text>
              
              <TouchableOpacity 
                style={styles.mainShareButton}
                onPress={shareDecision}
              >
                <LinearGradient
                  colors={['#25729f', '#62edb9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.mainShareButtonGradient}
                >
                  <ShareIcon size={24} color="#FFFFFF" />
                  <Text style={styles.mainShareButtonText}>Share Message</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={shareToInstagram}
                >
                  <LinearGradient
                    colors={['#833AB4', '#FD1D1D', '#FCAF45']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.socialButtonGradient}
                  >
                    <Instagram size={28} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.socialButtonLabel}>Instagram</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={shareToSnapchat}
                >
                  <View style={[styles.socialButtonGradient, { backgroundColor: '#FFFC00' }]}>
                    <Ghost size={28} color="#000000" />
                  </View>
                  <Text style={styles.socialButtonLabel}>Snapchat</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={shareMore}
                >
                  <View style={[styles.socialButtonGradient, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                    <ShareIcon size={28} color={Colors.textPrimary} />
                  </View>
                  <Text style={styles.socialButtonLabel}>More</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowShareModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  shareButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
  },
  headerCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  headerCardBlur: {
    padding: 20,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    fontFamily: Fonts.secondary.bold,
    flexShrink: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  predictionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginBottom: 8,
    fontFamily: Fonts.secondary.bold,
  },
  predictionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    fontFamily: Fonts.primary.regular,
  },
  confidence: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
    fontFamily: Fonts.secondary.bold,
  },
  section: {
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 20,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 16,
    letterSpacing: 0.2,
    fontFamily: Fonts.secondary.bold,
  },
  rationale: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },
  optionRow: {
    marginBottom: 16,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 0.1,
    fontFamily: Fonts.secondary.bold,
  },
  probContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  probBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  probBar: {
    height: '100%',
    borderRadius: 4,
  },
  probText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.7)',
    minWidth: 40,
  },
  factor: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 22,
    letterSpacing: 0.1,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },
  simulateButtonWrapper: {
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
  },
  simulateButtonWrapperNonPremium: {
    marginTop: 24,
    marginBottom: 32,
  },
  simulateButton: {
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 24,
    borderWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 0,
  },
  architectButton: {
    marginTop: 24,
    marginBottom: 8,
    alignSelf: 'center',
  },
  architectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderRadius: 56,
    borderWidth: 0.5,
    borderColor: '#DFDFDF',
  },
  architectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#696969',
    fontFamily: Fonts.secondary.bold,
    lineHeight: 17,
  },
  simulateButtonInner: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  lockIcon: {
    marginRight: 0,
  },
  simulateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  simulateTextContainer: {
    alignItems: 'center',
    gap: 4,
  },
  simulateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  simulateButtonSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
  askAnotherButton: {
    marginTop: 8,
    marginBottom: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  askAnotherButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  goHomeTextContainer: {
    marginTop: 0,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  goHomeText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  noPredictionContainer: {
    padding: 32,
    alignItems: 'center',
  },
  noPredictionText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 24,
    textAlign: 'center',
  },
  generateButton: {
    width: '100%',
  },
  regenerateButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sparklesIconContainer: {
    marginTop: -5,
  },
  sectionLoader: {
    marginVertical: 16,
  },
  aggregateContainer: {
    gap: 16,
  },
  aggregateSubtext: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 8,
  },
  groupCard: {
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  groupLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  groupProbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupOption: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.85)',
    flex: 1,
  },
  groupProb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  consensusChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  consensusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
  },
  suggestionsContainer: {
    gap: 14,
  },
  suggestionCard: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 0,
    padding: 16,
    borderRadius: 16,
  },
  suggestionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.2,
    fontFamily: Fonts.secondary.semibold,
  },
  suggestionProbs: {
    gap: 8,
  },
  suggestionProbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  suggestionOption: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },
  suggestionProb: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 40,
    fontFamily: Fonts.secondary.bold,
  },
  suggestionDelta: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    fontFamily: Fonts.secondary.bold,
  },
  suggestionDeltaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },
  participantsSection: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 20,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  participantsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.85)',
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    backgroundColor: 'rgba(135, 206, 250, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.3)',
  },
  participantName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(135, 206, 250, 0.9)',
  },
  disclaimerSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  disclaimerText: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  rationaleContainer: {
    position: 'relative',
    height: 160,
    overflow: 'hidden',
  },
  blurContainer: {
    position: 'absolute',
    top: 72, // After approx 3 lines (24px * 3)
    bottom: 0,
    left: -20, // Extend blur to edges of card
    right: -20,
    zIndex: 10,
  },
  absoluteBlur: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#FFEB3B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  unlockButtonText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 18,
  },
  blockedSuggestionsContainer: {
    position: 'relative',
    marginTop: 14,
    overflow: 'hidden',
    borderRadius: 12,
  },
  suggestionsBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  shareIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareModalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Fonts.secondary.bold,
  },
  mainShareButton: {
    width: '100%',
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  mainShareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  mainShareButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 24,
  },
  socialButton: {
    alignItems: 'center',
    gap: 8,
  },
  socialButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.bold,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.bold,
  },
  chaosHeaderColumn: {
    marginBottom: 12,
    gap: 4,
  },
  chaosTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chaosMessage: {
    fontSize: 15,
    fontWeight: '300',
    opacity: 0.9,
    fontFamily: Fonts.secondary.regular,
  },
  chaosValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chaosBarBg: {
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  chaosBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sideEffectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  sideEffectBullet: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: Fonts.secondary.bold,
  },
  sideEffectText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  nextStepNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textSecondary,
    lineHeight: 32,
    fontFamily: Fonts.secondary.bold,
    minWidth: 40,
    textAlign: 'left',
  },
  nextStepText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: Fonts.secondary.regular,
  },
  scrollHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
    alignItems: 'center',
  },
  scrollHintBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: 6,
    minWidth: 200,
    maxWidth: 250,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  scrollHintText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    fontWeight: '400',
    textAlign: 'center',
  },
});
