import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Pressable, Keyboard, Animated, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { ArrowUp, Compass } from 'lucide-react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/store/useAuth';
import { getDecisions, getProfile } from '@/lib/storage';
import { generateInterestingDecisionQuestions, deriveDecisionOptionsWithContext } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { isLocationSpecificQuestion } from '@/lib/decision';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const SUGGESTIONS_STORAGE_KEY = 'decide_suggested_questions';

export default function DecideTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<Array<{ question: string; category: string }>>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputBottomAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const suggestionFadeAnims = useRef<Animated.Value[]>([]).current;
  const suggestionsContainerFade = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      // Disable swipe-to-go-back gesture on both current and parent navigators
      navigation.setOptions({
        gestureEnabled: false,
        fullScreenGestureEnabled: false,
      });

      // Also disable on parent navigator if it exists
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        });
      }

      if (user) {
        loadData();
      }
      // Reset navigation state when page comes into focus
      setIsNavigating(false);
      // Fade in animation
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }).start();

      return () => {
        // Re-enable on cleanup if needed
        navigation.setOptions({
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        });
        if (parent) {
          parent.setOptions({
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          });
        }
      };
    }, [user, navigation])
  );

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
        // Animate to 80% of keyboard height - positions input 20% closer to keyboard
        Animated.timing(inputBottomAnim, {
          toValue: height * 0.8,
          duration: Platform.OS === 'ios' ? 250 : 100,
          useNativeDriver: false,
        }).start();
        // Hide suggestions immediately when keyboard appears
        suggestionsContainerFade.setValue(0);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        // Animate back to 0, which maps to 140px from bottom (above tab bar)
        Animated.timing(inputBottomAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 100,
          useNativeDriver: false,
        }).start();
        // Fade in suggestions when keyboard hides
        Animated.timing(suggestionsContainerFade, {
          toValue: 1,
          duration: 300,
          delay: 100,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [inputBottomAnim]);

  async function loadData() {
    try {
      // Try to load persisted suggestions first
      const stored = await AsyncStorage.getItem(`${SUGGESTIONS_STORAGE_KEY}_${user!.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setSuggestedQuestions(parsed);
          setLoadingQuestions(false);
          return;
        }
      }

      // Generate new questions if none are stored
      setLoadingQuestions(true);
      
      // Fetch previous decisions to exclude them
      const previousDecisions = await getDecisions(user!.id, 20);
      const excludedQuestions = previousDecisions.map(d => d.question);
      
      const corePack = await buildCorePack(user!.id);
      const questions = await generateInterestingDecisionQuestions(corePack, 3, excludedQuestions);
      setSuggestedQuestions(questions);
      
      // Persist the questions
      await AsyncStorage.setItem(`${SUGGESTIONS_STORAGE_KEY}_${user!.id}`, JSON.stringify(questions));
      setLoadingQuestions(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoadingQuestions(false);
    }
  }

  // Animate suggestions fade in when they're loaded
  useEffect(() => {
    if (!loadingQuestions && suggestedQuestions.length > 0) {
      // Initialize fade animations for each suggestion
      while (suggestionFadeAnims.length < suggestedQuestions.length) {
        suggestionFadeAnims.push(new Animated.Value(0));
      }
      
      // Animate each suggestion with a staggered delay
      suggestionFadeAnims.slice(0, suggestedQuestions.length).forEach((anim, index) => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: index * 100, // Stagger each card by 100ms
          useNativeDriver: true,
        }).start();
      });
    }
  }, [suggestedQuestions, loadingQuestions]);

  async function processDecision(questionText: string) {
    if (!user) return;
    
    try {
      // Build core pack
      const corePack = await buildCorePack(user.id);
      let optionsContext = corePack;
      
      // Add location context if this is a location-specific question
      if (isLocationSpecificQuestion(questionText)) {
        try {
          const profile = await getProfile(user.id);
          
          // Get location_enabled from core_json.onboarding_responses
          let locationEnabled = false;
          if (profile?.core_json?.onboarding_responses?.['local-preferences']) {
            try {
              const localPrefs = JSON.parse(profile.core_json.onboarding_responses['local-preferences']);
              locationEnabled = localPrefs.location_enabled === true;
            } catch (e) {
              console.warn('Failed to parse local preferences:', e);
            }
          }
          
          // Conditionally import expo-location
          let Location: typeof import('expo-location') | null = null;
          try {
            Location = require('expo-location');
          } catch (e) {
            // expo-location not available
          }
          
          if (locationEnabled && Location) {
            try {
              const { status } = await Location.getForegroundPermissionsAsync();
              if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                });
                const locationContext = `\n\nCURRENT GPS LOCATION: ${location.coords.latitude}, ${location.coords.longitude}\nUse this exact location to recommend REAL restaurants, bars, or venues nearby. IMPORTANT: Prioritize LOCAL, INDEPENDENT restaurants and venues over chain restaurants. Only suggest chains if there are no good local options nearby. Provide specific venue names, addresses, and why they match the user's preferences.`;
                optionsContext += locationContext;
              }
            } catch (error) {
              console.warn('Failed to get real-time location, using fallback:', error);
            }
          }
          
          // Add fallback location context if available
          if (profile?.current_location && !optionsContext.includes('CURRENT GPS LOCATION')) {
            optionsContext += `\n\nLOCATION FALLBACK: ${profile.current_location}\nUse this city/area to recommend REAL restaurants, bars, or venues. IMPORTANT: Prioritize LOCAL, INDEPENDENT restaurants and venues over chain restaurants. Only suggest chains if there are no good local options. Provide specific venue names and why they match the user's preferences.`;
          }
        } catch (error) {
          console.warn('Failed to enhance location context:', error);
        }
      }
      
      // Derive options
      const options = await deriveDecisionOptionsWithContext(questionText, optionsContext);
      
      if (!questionText.trim() || options.length < 2) {
        setIsNavigating(false);
        return;
      }
      
      // Route to decision/new with question and options, starting at step 2 (options page)
      router.push({
        pathname: '/decision/new',
        params: { 
          question: questionText.trim(),
          options: JSON.stringify(options),
          step: '2'
        }
      });
    } catch (error) {
      console.error('Error processing decision:', error);
      setIsNavigating(false);
      throw error;
    }
  }

  async function removeQuestionAndRegenerate(askedQuestion: string) {
    try {
      // Remove the asked question from suggestions
      const updated = suggestedQuestions.filter(q => q.question !== askedQuestion);
      
      // If we have less than 3 questions, generate a new one
      if (updated.length < 3) {
        setLoadingQuestions(true);
        const previousDecisions = await getDecisions(user!.id, 20);
        const excludedQuestions = [
          ...previousDecisions.map(d => d.question),
          ...updated.map(q => q.question), // Also exclude current suggestions
          askedQuestion, // Exclude the one just asked
        ];
        
        const corePack = await buildCorePack(user!.id);
        const newQuestions = await generateInterestingDecisionQuestions(corePack, 1, excludedQuestions);
        
        // Add the new question to the list
        updated.push(...newQuestions);
        setLoadingQuestions(false);
      }
      
      setSuggestedQuestions(updated);
      
      // Persist updated questions
      await AsyncStorage.setItem(`${SUGGESTIONS_STORAGE_KEY}_${user!.id}`, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to regenerate question:', error);
      // Just remove the asked question even if regeneration fails
      const updated = suggestedQuestions.filter(q => q.question !== askedQuestion);
      setSuggestedQuestions(updated);
      await AsyncStorage.setItem(`${SUGGESTIONS_STORAGE_KEY}_${user!.id}`, JSON.stringify(updated));
    }
  }

  const handleSubmit = async () => {
    if (!inputText.trim() || isNavigating || !user) return;
    
    setIsNavigating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await processDecision(inputText.trim());
      setInputText('');
    } catch (error) {
      console.error('Error processing decision:', error);
      setIsNavigating(false);
    }
  };

  const handleSuggestionClick = async (question: string) => {
    if (isNavigating || !user) return;
    
    setIsNavigating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      // Remove the clicked question and regenerate if needed
      removeQuestionAndRegenerate(question);
      
      await processDecision(question);
    } catch (error) {
      console.error('Error processing decision:', error);
      setIsNavigating(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Animated.ScrollView 
            style={{ opacity: fadeAnim }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Compass size={32} color={Colors.textPrimary} strokeWidth={2} />
                <Text style={styles.title}>Decide</Text>
              </View>
              <Text style={styles.subtitle}>Let your twin guide your decision</Text>
            </View>

            <View style={styles.spacer} />

            {/* Suggestions positioned above input */}
            <Animated.View style={[styles.suggestionsWrapper, { opacity: suggestionsContainerFade }]}>
              {loadingQuestions ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Generating suggested questions...</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselContainer}
                  style={styles.carousel}
                >
                  {suggestedQuestions.map((item, index) => {
                    // Ensure we have an animation value for this index
                    if (!suggestionFadeAnims[index]) {
                      suggestionFadeAnims[index] = new Animated.Value(loadingQuestions ? 0 : 1);
                    }
                    return (
                      <Animated.View
                        key={index}
                        style={{ opacity: suggestionFadeAnims[index] || 1 }}
                      >
                        <TouchableOpacity
                          style={[styles.suggestionCard, isNavigating && styles.suggestionCardDisabled]}
                          onPress={() => handleSuggestionClick(item.question)}
                          activeOpacity={0.8}
                          disabled={isNavigating}
                        >
                          <View style={styles.suggestionCardContent}>
                            <View style={styles.suggestionCategoryBadge}>
                              <Text style={styles.suggestionCategoryText}>{item.category || 'Growth'}</Text>
                            </View>
                            <Text style={styles.suggestionCardText}>{item.question}</Text>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })}
                </ScrollView>
              )}
            </Animated.View>
          </Animated.ScrollView>

          <Animated.View 
            style={[
              styles.inputContainerFixed,
              {
                bottom: inputBottomAnim.interpolate({
                  inputRange: [0, 1000],
                  outputRange: [100, 1000], // When 0: 100px from bottom. When keyboardHeight: that height from bottom
                  extrapolate: 'clamp',
                }),
              }
            ]}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Ask your twin anything"
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <Pressable 
                onPress={handleSubmit}
                disabled={!inputText.trim() || isNavigating}
                style={({ pressed }) => [
                  styles.submitButtonWrapper,
                  (!inputText.trim() || isNavigating) && styles.submitButtonDisabled,
                  {
                    shadowColor: '#FF9F43',
                    transform: [{ translateY: pressed ? 2 : 0 }],
                    shadowOffset: { width: 0, height: pressed ? 2 : 4 },
                    shadowOpacity: pressed ? 0.3 : 0.5,
                    shadowRadius: pressed ? 8 : 12,
                    elevation: pressed ? 4 : 8,
                  }
                ]}
              >
                {isNavigating ? (
                  <LinearGradient
                    colors={['#FF9F43', '#FF6B6B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitButtonGradient}
                  >
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </LinearGradient>
                ) : inputText.trim() ? (
                  <LinearGradient
                    colors={['#FF9F43', '#FF6B6B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitButtonGradient}
                  >
                    <ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                ) : (
                  <View style={[styles.submitButtonGradient, { backgroundColor: Colors.textTertiary }]}>
                    <ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                )}
              </Pressable>
            </View>
            <Text style={styles.charCount}>{inputText.length}/500</Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 200, // Space for fixed input at bottom
  },
  spacer: {
    flex: 1,
    minHeight: 200,
  },
  suggestionsWrapper: {
    width: '100%',
  },
  header: {
    marginBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  inputContainerFixed: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: Colors.background,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
    paddingVertical: 0,
    marginRight: 12,
    maxHeight: 120,
  },
  submitButtonWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
    fontFamily: Fonts.secondary.regular,
  },
  carousel: {
    overflow: 'visible', // Allow shadows to show
    marginHorizontal: -24, // Offset parent padding to allow edge-to-edge cards
  },
  carouselContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20, // Increased to allow shadow space (shadowRadius is 12)
    paddingLeft: 24,
    paddingRight: 24,
    gap: 12,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    minWidth: 280,
    maxWidth: 320,
    height: 170,
  },
  suggestionCardDisabled: {
    opacity: 0.5,
  },
  suggestionCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  suggestionCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  suggestionCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: Fonts.secondary.bold,
  },
  suggestionCardText: {
    fontSize: 16,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.regular,
  },
});
