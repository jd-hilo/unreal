import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Clipboard, Modal, Linking, Platform, Animated } from 'react-native';
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
import { Home, Sparkles, Users, Lock, Zap, Share as ShareIcon, Instagram, Ghost } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTwin } from '@/store/useTwin';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

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
  const viewShotRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageUri, setShareImageUri] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

  async function handleSimulate() {
    if (!user || !decision) return;
    
    // Check premium status
    if (!isPremium) {
      trackEvent(MixpanelEvents.PREMIUM_FEATURE_BLOCKED, {
        feature: 'life_trajectory_simulation',
        decision_id: decision.id
      });
      
      Alert.alert(
        'Premium Feature',
        'Life trajectory simulations are available with unreal+. Upgrade to unlock this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/premium' as any) }
        ]
      );
      return;
    }
    
    // Track simulation started
    trackEvent(MixpanelEvents.DECISION_SIMULATED, {
      decision_id: decision.id,
      num_options: Array.isArray(decision.options) ? decision.options.length : JSON.parse(decision.options || '[]').length
    });
    
    // Navigate to simulation page
    router.push(`/decision/simulate/${decision.id}` as any);
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });

      setShareImageUri(uri);
      setShowShareModal(true);
      trackEvent(MixpanelEvents.DECISION_SHARE_OPENED, { decision_id: decision.id });
    } catch (error) {
      console.error('Error generating share image:', error);
      Alert.alert('Error', 'Failed to generate share image.');
    } finally {
      setSharing(false);
    }
  }

  async function shareToInstagram() {
    if (!shareImageUri) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // Copy app store link to clipboard
      const appStoreLink = 'https://apps.apple.com/us/app/unreal-simulate-your-life/id6754901842';
      Clipboard.setString(appStoreLink);

      // For Instagram Stories, we need to use the share sheet
      // Instagram doesn't support direct image sharing via URL scheme
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareImageUri, {
          UTI: 'public.image',
          mimeType: 'image/png',
          dialogTitle: 'Share to Instagram',
        });
        trackEvent(MixpanelEvents.DECISION_SHARED, { decision_id: decision.id, platform: 'instagram' });
      }
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing to Instagram:', error);
      Alert.alert('Error', 'Failed to share to Instagram.');
    }
  }

  async function shareToSnapchat() {
    if (!shareImageUri) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // Copy app store link to clipboard
      const appStoreLink = 'https://apps.apple.com/us/app/unreal-simulate-your-life/id6754901842';
      Clipboard.setString(appStoreLink);

      // Snapchat also uses the native share sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareImageUri, {
          UTI: 'public.image',
          mimeType: 'image/png',
          dialogTitle: 'Share to Snapchat',
        });
        trackEvent(MixpanelEvents.DECISION_SHARED, { decision_id: decision.id, platform: 'snapchat' });
      }
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing to Snapchat:', error);
      Alert.alert('Error', 'Failed to share to Snapchat.');
    }
  }

  async function shareMore() {
    if (!shareImageUri) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // Copy app store link to clipboard
      const appStoreLink = 'https://apps.apple.com/us/app/unreal-simulate-your-life/id6754901842';
      Clipboard.setString(appStoreLink);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareImageUri, {
          UTI: 'public.image',
          mimeType: 'image/png',
          dialogTitle: 'Share your Decision',
        });
        trackEvent(MixpanelEvents.DECISION_SHARED, { decision_id: decision.id, platform: 'other' });
      }
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share.');
    }
  }

  if (loading || predicting) {
    return (
      <View style={styles.screen}>
        <View style={styles.backgroundGradient}>
          <StatusBar style="light" />
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
                <Home size={24} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="rgba(135, 206, 250, 0.9)" />
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
          <StatusBar style="light" />
          <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
                <Home size={24} color="#FFFFFF" strokeWidth={2} />
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
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.iconButton}>
              <Home size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
            {prediction && (
              <TouchableOpacity 
                onPress={handleShare} 
                style={styles.shareButton}
                disabled={sharing}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.shareIconContainer}>
                    <ShareIcon size={22} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Animated.ScrollView 
            style={[styles.content, { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]} 
            contentContainerStyle={styles.contentContainer}
          >
            {/* Main Header */}
            <View style={styles.headerCard}>
              <BlurView intensity={40} tint="dark" style={styles.headerCardBlur}>
                <Text style={styles.headerLabel}>Question</Text>
                <Text style={styles.headerText}>
                  {decision.question}
                </Text>
              </BlurView>
            </View>

        {/* Show participants if any */}
        {participants.length > 0 && (
          <View style={styles.participantsSection}>
            <View style={styles.participantsHeader}>
              <Users size={16} color="rgba(135, 206, 250, 0.9)" />
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
              <Text style={styles.predictionValue}>{prediction.prediction}</Text>
              <Text style={styles.confidence}>
                {confidence.toFixed(0)}% confidence
              </Text>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Why this choice?</Text>
                <Text style={styles.rationale}>{prediction.rationale}</Text>
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
                              colors={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
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

            {/* If things were different Section */}
            {decision.prediction && (
              <View style={styles.section}>
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sparklesIconContainer}>
                      <Sparkles size={20} color="rgba(135, 206, 250, 0.9)" />
                    </View>
                    <Text style={styles.sectionTitle}>If things were different…</Text>
                  </View>
                  {loadingSuggestions ? (
                    <ActivityIndicator size="small" color="rgba(135, 206, 250, 0.9)" style={styles.sectionLoader} />
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

            <View style={styles.simulateButtonWrapper}>
              <TouchableOpacity
                style={styles.simulateButtonPremium}
                onPress={isPremium ? handleSimulate : () => router.push('/premium' as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.simulateButtonGradient}
                >
                  <Text style={styles.simulateButtonTextActive}>Simulate Each Choice</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.askAnotherButton}
              onPress={() => router.push('/decision/new')}
              activeOpacity={0.7}
            >
              <Text style={styles.askAnotherButtonText}>Ask Another Decision</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/home')}
              activeOpacity={0.7}
              style={styles.goHomeTextContainer}
            >
              <Text style={styles.goHomeText}>Go to Home</Text>
            </TouchableOpacity>

            {/* Disclaimer */}
            {isPremium && (
              <View style={styles.disclaimerSection}>
                <Text style={styles.disclaimerText}>
                  This trajectory is generated through simulations based on your unique profile. Use it as a thought experiment, not a prediction.
                </Text>
              </View>
            )}
          </>
        )}
          </Animated.ScrollView>
        </SafeAreaView>
      </View>

      {/* Hidden Share Card */}
      {decision && prediction && (
        <View 
          ref={viewShotRef} 
          style={styles.shareCardContainer}
          collapsable={false}
        >
          <View style={styles.shareBackground}>
            {/* Header Card */}
            <View style={styles.shareHeaderCard}>
              <Text style={styles.shareHeaderLabel}>Question</Text>
              <Text style={styles.shareQuestion}>{decision.question}</Text>
            </View>

            {/* Prediction Card */}
            <View style={styles.sharePredictionCard}>
              <Text style={styles.sharePredictionLabel}>Recommended</Text>
              <Text style={styles.sharePredictionValue}>{prediction.prediction}</Text>
              <Text style={styles.shareConfidence}>
                {confidence.toFixed(0)}% confidence
              </Text>
            </View>

            {/* Options Card */}
            {prediction.probs && (
              <View style={styles.shareSectionCard}>
                <Text style={styles.shareSectionTitle}>All Options</Text>
                {Object.entries(prediction.probs as Record<string, number>).map(
                  ([option, prob]) => (
                    <View key={option} style={styles.shareOptionRow}>
                      <Text style={styles.shareOptionName}>{option}</Text>
                      <View style={styles.shareProbContainer}>
                        <View style={styles.shareProbBarBackground}>
                          <LinearGradient
                            colors={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[
                              styles.shareProbBar,
                              { width: `${(prob as number) * 100}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.shareProbText}>
                          {((prob as number) * 100).toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  )
                )}
              </View>
            )}

            {/* Footer */}
            <View style={styles.shareFooter}>
              <View style={styles.shareFooterContent}>
                <Text style={styles.shareGeneratedBy}>Generated by your AI Twin</Text>
                <Text style={styles.shareLink}>Build your own AI Twin. Search "Unreal" on{'\n'}the App Store.</Text>
              </View>
              <View style={styles.shareAppIcon}>
                 <Image 
                  source={require('@/assets/images/icon.png')}
                  style={styles.shareAppIconImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </View>
      )}

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
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.shareModalContent}>
              <Text style={styles.shareModalTitle}>Share to</Text>
              
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
                    <Instagram size={32} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.socialButtonLabel}>Instagram</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={shareToSnapchat}
                >
                  <View style={[styles.socialButtonGradient, { backgroundColor: '#FFFC00' }]}>
                    <Ghost size={32} color="#000000" />
                  </View>
                  <Text style={styles.socialButtonLabel}>Snapchat</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.socialButton}
                  onPress={shareMore}
                >
                  <View style={[styles.socialButtonGradient, { backgroundColor: 'rgba(135, 206, 250, 0.2)' }]}>
                    <ShareIcon size={32} color="#FFFFFF" />
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
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    flex: 1,
    backgroundColor: '#050505',
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  headerCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerCardBlur: {
    padding: 18,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  predictionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  predictionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 8,
  },
  predictionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  confidence: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  rationale: {
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(200, 200, 200, 0.85)',
  },
  optionRow: {
    marginBottom: 16,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.1,
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
    color: 'rgba(200, 200, 200, 0.75)',
    minWidth: 40,
  },
  factor: {
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.85)',
    marginBottom: 10,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  simulateButtonWrapper: {
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 24,
    shadowColor: 'rgba(135, 206, 250, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
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
  simulateButtonPremium: {
    backgroundColor: 'transparent',
    shadowColor: 'rgba(135, 206, 250, 0.9)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 16,
  },
  simulateButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulateButtonTextActive: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  askAnotherButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0,
    padding: 16,
    borderRadius: 12,
  },
  suggestionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.2,
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
    color: 'rgba(200, 200, 200, 0.85)',
    flex: 1,
  },
  suggestionProb: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    minWidth: 40,
  },
  suggestionDelta: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  suggestionDeltaText: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.75)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  participantsSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 0,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 0,
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
  shareButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  shareIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardContainer: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: 375,
    backgroundColor: '#000000',
  },
  shareBackground: {
    backgroundColor: '#050505',
    padding: 20,
    paddingBottom: 16,
    minHeight: 350,
    maxHeight: 550,
  },
  shareHeaderCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 18,
  },
  shareHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  shareQuestion: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sharePredictionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  sharePredictionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    marginBottom: 8,
  },
  sharePredictionValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  shareConfidence: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  shareSectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  shareSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  shareOptionRow: {
    marginBottom: 16,
  },
  shareOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  shareProbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shareProbBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  shareProbBar: {
    height: '100%',
    borderRadius: 4,
  },
  shareProbText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
    minWidth: 40,
  },
  shareWhatIf: {
    marginTop: 8,
    gap: 8,
  },
  shareSuggestion: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  shareSuggestionText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  shareFooter: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  shareFooterContent: {
    gap: 3,
  },
  shareGeneratedBy: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  shareLink: {
    fontSize: 11,
    color: 'rgba(135, 206, 250, 0.8)',
    fontWeight: '600',
  },
  shareAppIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  shareAppIconImage: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  shareModalContent: {
    backgroundColor: '#1a1d26',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 20,
  },
  socialButton: {
    alignItems: 'center',
    gap: 10,
    width: 90,
  },
  socialButtonGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  socialButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    fontWeight: '500',
    opacity: 0.9,
  },
  chaosValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chaosBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    color: 'rgba(135, 206, 250, 0.9)',
    fontWeight: '700',
    marginTop: 2,
  },
  sideEffectText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.85)',
    lineHeight: 22,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 16,
  },
  nextStepNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: 'rgba(135, 206, 250, 0.9)',
    lineHeight: 38,
    marginTop: -4,
  },
  nextStepText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    fontWeight: '500',
    paddingTop: 4,
  },
});
