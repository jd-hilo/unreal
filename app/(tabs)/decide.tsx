import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Keyboard,
  Animated,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { ArrowUp, ChevronDown, MessageSquare } from 'lucide-react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/store/useAuth';
import { getDecisions, getProfile, getLifeChats, getDreamSelfChats, createLifeChat, createDreamSelfChat } from '@/lib/storage';
import { generateInterestingDecisionQuestions, deriveDecisionOptionsWithContext } from '@/lib/ai';
import { buildCorePack } from '@/lib/relevance';
import { isLocationSpecificQuestion } from '@/lib/decision';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const SUGGESTIONS_STORAGE_KEY = 'decide_suggested_questions';

type ActiveTab = 'architect' | 'decide' | 'future-self';

export default function ChatTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();

  // Active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('architect');

  // Decide tab state
  const [inputText, setInputText] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<Array<{ question: string; category: string }>>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputBottomAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const suggestionFadeAnims = useRef<Animated.Value[]>([]).current;
  const suggestionsContainerFade = useRef(new Animated.Value(1)).current;
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState<false | ActiveTab>(false);
  const [loadingDecisions, setLoadingDecisions] = useState(false);

  // Architect tab state
  const [lifeChats, setLifeChats] = useState<any[]>([]);
  const [loadingLifeChats, setLoadingLifeChats] = useState(false);
  const [architectInput, setArchitectInput] = useState('');
  const [architectSending, setArchitectSending] = useState(false);

  // Future Self tab state
  const [dreamSelfChats, setDreamSelfChats] = useState<any[]>([]);
  const [loadingDreamChats, setLoadingDreamChats] = useState(false);
  const [dreamInput, setDreamInput] = useState('');
  const [dreamSending, setDreamSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ gestureEnabled: false, fullScreenGestureEnabled: false });
      const parent = navigation.getParent();
      if (parent) parent.setOptions({ gestureEnabled: false, fullScreenGestureEnabled: false });

      if (user) {
        loadData();
        loadRecentDecisions();
        loadLifeChats();
        loadDreamSelfData();
      }

      const fromQuery =
        tabParam && (tabParam === 'architect' || tabParam === 'decide' || tabParam === 'future-self')
          ? tabParam
          : null;
      if (fromQuery) {
        setActiveTab(fromQuery as ActiveTab);
      } else {
        AsyncStorage.getItem('decide_initial_tab').then((tab) => {
          if (tab && (tab === 'architect' || tab === 'decide' || tab === 'future-self')) {
            setActiveTab(tab as ActiveTab);
            AsyncStorage.removeItem('decide_initial_tab');
          }
        });
      }

      setIsNavigating(false);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }).start();

      return () => {
        navigation.setOptions({ gestureEnabled: true, fullScreenGestureEnabled: true });
        if (parent) parent.setOptions({ gestureEnabled: true, fullScreenGestureEnabled: true });
      };
    }, [user, navigation, tabParam])
  );

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);
        Animated.timing(inputBottomAnim, {
          toValue: height * 0.8,
          duration: Platform.OS === 'ios' ? 250 : 100,
          useNativeDriver: false,
        }).start();
        suggestionsContainerFade.setValue(0);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.timing(inputBottomAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 100,
          useNativeDriver: false,
        }).start();
        Animated.timing(suggestionsContainerFade, { toValue: 1, duration: 300, delay: 100, useNativeDriver: true }).start();
      }
    );
    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [inputBottomAnim]);

  async function loadData() {
    try {
      const stored = await AsyncStorage.getItem(`${SUGGESTIONS_STORAGE_KEY}_${user!.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          setSuggestedQuestions(parsed);
          setLoadingQuestions(false);
          return;
        }
      }
      setLoadingQuestions(true);
      const previousDecisions = await getDecisions(user!.id, 20);
      const excludedQuestions = previousDecisions.map((d: any) => d.question);
      const corePack = await buildCorePack(user!.id);
      const questions = await generateInterestingDecisionQuestions(corePack, 3, excludedQuestions);
      setSuggestedQuestions(questions);
      await AsyncStorage.setItem(`${SUGGESTIONS_STORAGE_KEY}_${user!.id}`, JSON.stringify(questions));
      setLoadingQuestions(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoadingQuestions(false);
    }
  }

  async function loadRecentDecisions() {
    if (!user?.id) return;
    setLoadingDecisions(true);
    try {
      const decisions = await getDecisions(user.id, 10);
      setRecentDecisions(decisions || []);
    } catch (error) {
      console.error('Error loading recent decisions:', error);
    } finally {
      setLoadingDecisions(false);
    }
  }

  async function loadLifeChats() {
    if (!user?.id) return;
    setLoadingLifeChats(true);
    try {
      const chats = await getLifeChats(user.id, 6);
      setLifeChats(chats || []);
    } catch (error) {
      console.error('Error loading life chats:', error);
    } finally {
      setLoadingLifeChats(false);
    }
  }

  async function loadDreamSelfData() {
    if (!user?.id) return;
    setLoadingDreamChats(true);
    try {
      const chats = await getDreamSelfChats(user.id, 6);
      setDreamSelfChats(chats || []);
    } catch (error) {
      console.error('Error loading dream self data:', error);
    } finally {
      setLoadingDreamChats(false);
    }
  }

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  }, []);

  const handleLoadDecision = useCallback((decision: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowRecentDropdown(false);
    router.push(`/decision/${decision.id}`);
  }, [router]);

  useEffect(() => {
    if (!loadingQuestions && suggestedQuestions.length > 0) {
      while (suggestionFadeAnims.length < suggestedQuestions.length) {
        suggestionFadeAnims.push(new Animated.Value(0));
      }
      suggestionFadeAnims.slice(0, suggestedQuestions.length).forEach((anim, index) => {
        anim.setValue(0);
        Animated.timing(anim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }).start();
      });
    }
  }, [suggestedQuestions, loadingQuestions]);

  async function processDecision(questionText: string) {
    if (!user) return;
    try {
      const corePack = await buildCorePack(user.id);
      let optionsContext = corePack;

      if (isLocationSpecificQuestion(questionText)) {
        try {
          const profileData = await getProfile(user.id);
          let locationEnabled = false;
          if (profileData?.core_json?.onboarding_responses?.['local-preferences']) {
            try {
              const localPrefs = JSON.parse(profileData.core_json.onboarding_responses['local-preferences']);
              locationEnabled = localPrefs.location_enabled === true;
            } catch (e) {}
          }
          let Location: typeof import('expo-location') | null = null;
          try { Location = require('expo-location'); } catch (e) {}
          if (locationEnabled && Location) {
            try {
              const { status } = await Location.getForegroundPermissionsAsync();
              if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                optionsContext += `\n\nCURRENT GPS LOCATION: ${location.coords.latitude}, ${location.coords.longitude}\nUse this exact location to recommend REAL restaurants, bars, or venues nearby. IMPORTANT: Prioritize LOCAL, INDEPENDENT restaurants and venues over chain restaurants.`;
              }
            } catch (error) {}
          }
          if (profileData?.current_location && !optionsContext.includes('CURRENT GPS LOCATION')) {
            optionsContext += `\n\nLOCATION FALLBACK: ${profileData.current_location}\nUse this city/area to recommend REAL restaurants, bars, or venues. IMPORTANT: Prioritize LOCAL, INDEPENDENT restaurants over chains.`;
          }
        } catch (error) {}
      }

      const options = await deriveDecisionOptionsWithContext(questionText, optionsContext);
      if (!questionText.trim() || options.length < 2) { setIsNavigating(false); return; }

      router.push({ pathname: '/decision/new', params: { question: questionText.trim(), options: JSON.stringify(options), step: '2' } });
    } catch (error) {
      console.error('Error processing decision:', error);
      setIsNavigating(false);
      throw error;
    }
  }

  async function removeQuestionAndRegenerate(askedQuestion: string) {
    try {
      const updated = suggestedQuestions.filter(q => q.question !== askedQuestion);
      if (updated.length < 3) {
        setLoadingQuestions(true);
        const previousDecisions = await getDecisions(user!.id, 20);
        const excludedQuestions = [...previousDecisions.map((d: any) => d.question), ...updated.map(q => q.question), askedQuestion];
        const corePack = await buildCorePack(user!.id);
        const newQuestions = await generateInterestingDecisionQuestions(corePack, 1, excludedQuestions);
        updated.push(...newQuestions);
        setLoadingQuestions(false);
      }
      setSuggestedQuestions(updated);
      await AsyncStorage.setItem(`${SUGGESTIONS_STORAGE_KEY}_${user!.id}`, JSON.stringify(updated));
    } catch (error) {
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
      setIsNavigating(false);
    }
  };

  const handleSuggestionClick = async (question: string) => {
    if (isNavigating || !user) return;
    setIsNavigating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      removeQuestionAndRegenerate(question);
      await processDecision(question);
    } catch (error) {
      setIsNavigating(false);
    }
  };

  async function handleArchitectInputSend() {
    const trimmed = architectInput.trim();
    if (!trimmed || architectSending || !user?.id) return;
    setArchitectSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const chat = await createLifeChat(user.id, trimmed.substring(0, 50));
      setArchitectInput('');
      router.push({ pathname: '/chat/life/[id]', params: { id: chat.id, initialMessage: trimmed } });
    } catch (e) {
      console.error('Failed to send architect message:', e);
    } finally {
      setArchitectSending(false);
    }
  }

  async function handleDreamInputSend() {
    const trimmed = dreamInput.trim();
    if (!trimmed || dreamSending || !user?.id) return;
    setDreamSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const chat = await createDreamSelfChat(user.id, trimmed.substring(0, 50));
      setDreamInput('');
      router.push({ pathname: '/chat/dream-self/[id]', params: { id: chat.id, initialMessage: trimmed } });
    } catch (e) {
      console.error('Failed to send dream self message:', e);
    } finally {
      setDreamSending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <Animated.View style={[styles.headerArea, { opacity: fadeAnim }]}>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                <MessageSquare size={26} color={Colors.textPrimary} strokeWidth={2} />
                <Text style={styles.title}>Chat</Text>
              </View>
              {/* Recent dropdown — top right, context-aware per active tab */}
              {user?.id && (
                <View style={styles.recentDropdownContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowRecentDropdown(showRecentDropdown === activeTab ? false : activeTab);
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(0, 188, 166, 0.06)', 'rgba(144, 140, 241, 0.06)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.recentDecisionsButton}
                    >
                      {(activeTab === 'architect' && loadingLifeChats) ||
                      (activeTab === 'decide' && loadingDecisions) ||
                      (activeTab === 'future-self' && loadingDreamChats) ? (
                        <ActivityIndicator size="small" color="#696969" />
                      ) : (
                        <>
                          <Text style={styles.recentDecisionsText}>Recent</Text>
                          <ChevronDown
                            size={12}
                            color="#696969"
                            strokeWidth={2}
                            style={showRecentDropdown === activeTab ? styles.dropdownIconRotated : undefined}
                          />
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                  {showRecentDropdown === activeTab && (
                    <>
                      <TouchableWithoutFeedback onPress={() => setShowRecentDropdown(false)}>
                        <View style={styles.dropdownOverlay} />
                      </TouchableWithoutFeedback>
                      <View style={[styles.dropdown, styles.dropdownRight]}>
                        {activeTab === 'architect' && (
                          lifeChats.length === 0 ? (
                            <View style={styles.dropdownEmpty}><Text style={styles.dropdownEmptyText}>No recent chats</Text></View>
                          ) : (
                            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator bounces={false}>
                              {lifeChats.map((chat) => (
                                <TouchableOpacity key={chat.id} style={styles.dropdownItem} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowRecentDropdown(false); router.push(`/chat/life/${chat.id}`); }}>
                                  <Text style={styles.dropdownItemTitle} numberOfLines={2}>{chat.title}</Text>
                                  <Text style={styles.dropdownItemDate}>{formatDate(chat.updated_at)}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )
                        )}
                        {activeTab === 'decide' && (
                          recentDecisions.length === 0 ? (
                            <View style={styles.dropdownEmpty}><Text style={styles.dropdownEmptyText}>No recent decisions</Text></View>
                          ) : (
                            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator bounces={false}>
                              {recentDecisions.map((decision) => (
                                <TouchableOpacity key={decision.id} style={styles.dropdownItem} onPress={() => handleLoadDecision(decision)}>
                                  <Text style={styles.dropdownItemTitle} numberOfLines={2}>{decision.question}</Text>
                                  <Text style={styles.dropdownItemDate}>{formatDate(decision.created_at)}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )
                        )}
                        {activeTab === 'future-self' && (
                          dreamSelfChats.length === 0 ? (
                            <View style={styles.dropdownEmpty}><Text style={styles.dropdownEmptyText}>No recent chats</Text></View>
                          ) : (
                            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled showsVerticalScrollIndicator bounces={false}>
                              {dreamSelfChats.map((chat) => (
                                <TouchableOpacity key={chat.id} style={styles.dropdownItem} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowRecentDropdown(false); router.push(`/chat/dream-self/${chat.id}`); }}>
                                  <Text style={styles.dropdownItemTitle} numberOfLines={2}>{chat.title}</Text>
                                  <Text style={styles.dropdownItemDate}>{formatDate(chat.updated_at)}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )
                        )}
                      </View>
                    </>
                  )}
                </View>
              )}
            </View>
            <View style={styles.filterTabsRow}>
              {(['architect', 'decide', 'future-self'] as ActiveTab[]).map((tab) => {
                const label = tab === 'architect' ? 'Architect' : tab === 'decide' ? 'Decide' : 'Future Self';
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTab(tab);
                    }}
                    activeOpacity={0.8}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={['#FF9F43', '#FF6B6B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.filterTabActive}
                      >
                        <Text style={styles.filterTabTextActive}>{label}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.filterTabInactive}>
                        <Text style={styles.filterTabTextInactive}>{label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* Tab content */}
          <Animated.ScrollView
            style={{ opacity: fadeAnim }}
            contentContainerStyle={[
              styles.scrollContent,
              activeTab === 'decide' && styles.scrollContentDecide,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── ARCHITECT TAB ── */}
            {activeTab === 'architect' && (
              <View style={styles.section}>
                <View style={styles.tabHeroArea}>
                  <Image
                    source={require('@/assets/images/icon.png')}
                    style={styles.heroLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.tabHeroText}>The Architect knows you. Feel free to discuss anything.</Text>
                </View>
              </View>
            )}

            {/* ── DECIDE TAB ── */}
            {activeTab === 'decide' && (
              <View style={styles.decideContent}>
                <View style={styles.spacer} />

                {!loadingQuestions && suggestedQuestions.length > 0 && (
                  <Animated.View style={[styles.suggestionsWrapper, { opacity: suggestionsContainerFade }]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.carouselContainer}
                      style={styles.carousel}
                    >
                      {suggestedQuestions.map((item, index) => {
                        if (!suggestionFadeAnims[index]) suggestionFadeAnims[index] = new Animated.Value(1);
                        return (
                          <Animated.View key={index} style={{ opacity: suggestionFadeAnims[index] || 1 }}>
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
                  </Animated.View>
                )}
              </View>
            )}

            {/* ── FUTURE SELF TAB ── */}
            {activeTab === 'future-self' && (
              <View style={styles.section}>
                <View style={styles.tabHeroArea}>
                  <Image
                    source={require('@/assets/images/manwhite.png')}
                    style={styles.heroMan}
                    resizeMode="contain"
                  />
                  <Text style={styles.tabHeroText}>Chat with your future self.</Text>
                </View>
              </View>
            )}
          </Animated.ScrollView>

          {/* Input bars — all tabs get one */}
          <Animated.View
            style={[
              styles.inputContainerFixed,
              {
                bottom: inputBottomAnim.interpolate({
                  inputRange: [0, 1000],
                  outputRange: [100, 1000],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            {activeTab === 'decide' && (
              <>
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
                      { shadowColor: '#FF9F43', transform: [{ translateY: pressed ? 2 : 0 }], shadowOffset: { width: 0, height: pressed ? 2 : 4 }, shadowOpacity: pressed ? 0.3 : 0.5, shadowRadius: pressed ? 8 : 12, elevation: pressed ? 4 : 8 },
                    ]}
                  >
                    {isNavigating ? (
                      <LinearGradient colors={['#FF9F43', '#FF6B6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </LinearGradient>
                    ) : inputText.trim() ? (
                      <LinearGradient colors={['#FF9F43', '#FF6B6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
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
              </>
            )}
            {activeTab === 'architect' && (
              <>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Message the Architect..."
                    placeholderTextColor={Colors.textTertiary}
                    value={architectInput}
                    onChangeText={setArchitectInput}
                    multiline
                    maxLength={500}
                  />
                  <Pressable
                    onPress={handleArchitectInputSend}
                    disabled={!architectInput.trim() || architectSending}
                    style={({ pressed }) => [
                      styles.submitButtonWrapper,
                      (!architectInput.trim() || architectSending) && styles.submitButtonDisabled,
                      { shadowColor: '#25729f', transform: [{ translateY: pressed ? 2 : 0 }], shadowOffset: { width: 0, height: pressed ? 2 : 4 }, shadowOpacity: pressed ? 0.3 : 0.5, shadowRadius: pressed ? 8 : 12, elevation: pressed ? 4 : 8 },
                    ]}
                  >
                    {architectSending ? (
                      <LinearGradient colors={['#25729f', '#62edb9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </LinearGradient>
                    ) : architectInput.trim() ? (
                      <LinearGradient colors={['#25729f', '#62edb9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
                        <ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} />
                      </LinearGradient>
                    ) : (
                      <View style={[styles.submitButtonGradient, { backgroundColor: Colors.textTertiary }]}>
                        <ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    )}
                  </Pressable>
                </View>
                <Text style={styles.charCount}>{architectInput.length}/500</Text>
              </>
            )}
            {activeTab === 'future-self' && (
              <>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ask your future self..."
                    placeholderTextColor={Colors.textTertiary}
                    value={dreamInput}
                    onChangeText={setDreamInput}
                    multiline
                    maxLength={500}
                  />
                  <Pressable
                    onPress={handleDreamInputSend}
                    disabled={!dreamInput.trim() || dreamSending}
                    style={({ pressed }) => [
                      styles.submitButtonWrapper,
                      (!dreamInput.trim() || dreamSending) && styles.submitButtonDisabled,
                      { shadowColor: '#1a1a2e', transform: [{ translateY: pressed ? 2 : 0 }], shadowOffset: { width: 0, height: pressed ? 2 : 4 }, shadowOpacity: pressed ? 0.3 : 0.5, shadowRadius: pressed ? 8 : 12, elevation: pressed ? 4 : 8 },
                    ]}
                  >
                    {dreamSending ? (
                      <LinearGradient colors={['#1a1a2e', '#16213e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </LinearGradient>
                    ) : dreamInput.trim() ? (
                      <LinearGradient colors={['#1a1a2e', '#16213e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButtonGradient}>
                        <ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} />
                      </LinearGradient>
                    ) : (
                      <View style={[styles.submitButtonGradient, { backgroundColor: Colors.textTertiary }]}>
                        <ArrowUp size={24} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    )}
                  </Pressable>
                </View>
                <Text style={styles.charCount}>{dreamInput.length}/500</Text>
              </>
            )}
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
  headerArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    zIndex: 100,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    zIndex: 100,
    overflow: 'visible',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.primary.semibold,
    color: Colors.textPrimary,
  },
  heroLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  heroMan: {
    width: 120,
    height: 120,
    opacity: 0.85,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTabActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  filterTabTextActive: {
    fontSize: 14,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterTabTextInactive: {
    fontSize: 14,
    fontFamily: Fonts.secondary.bold,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 200,
  },
  scrollContentDecide: {
    paddingBottom: 220,
  },

  // ── Architect / Future Self shared section styles ──
  section: {
    flex: 1,
  },
  tabHeroArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 20,
  },
  tabHeroText: {
    fontSize: 14,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textTertiary,
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 20,
  },
  recentDropdownContainer: {
    alignSelf: 'center',
    position: 'relative',
    zIndex: 200,
  },

  // ── Decide tab content ──
  decideContent: {
    flex: 1,
  },
  recentDecisionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 56,
    borderWidth: 0.5,
    borderColor: '#DFDFDF',
    gap: 6,
    overflow: 'hidden',
  },
  recentDecisionsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#696969',
    fontFamily: Fonts.secondary.bold,
    lineHeight: 16,
  },
  dropdownIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownOverlay: {
    position: 'absolute',
    top: -200,
    left: -400,
    right: -400,
    bottom: -2000,
    zIndex: 9998,
  },
  dropdownRight: {
    left: undefined,
    right: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    width: 280,
    maxHeight: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
  },
  dropdownEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  dropdownScroll: {
    maxHeight: 320,
    backgroundColor: '#FFFFFF',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 4,
  },
  dropdownItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    lineHeight: 20,
  },
  dropdownItemDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    opacity: 0.7,
  },
  spacer: {
    flex: 1,
    minHeight: 160,
  },
  suggestionsWrapper: {
    width: '100%',
    marginTop: 10,
  },
  carousel: {
    overflow: 'visible',
    marginHorizontal: -24,
  },
  carouselContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
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

  // ── Input bar ──
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
});
