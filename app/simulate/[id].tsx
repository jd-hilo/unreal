import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, Dimensions, Animated, Image, Easing } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, useNavigation } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getTimeline, updateTimeline, getProfile } from '@/lib/storage';
import { advanceTimeline } from '@/lib/ai';
import { ChevronLeft, Plus, User, Lock, DollarSign, Heart, Zap, TrendingUp, TrendingDown, Users, X, ChevronDown, ChevronUp, MapPin, Sparkles, Brain, Briefcase, ChevronRight, Home } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');

// Helper function to parse net worth string to number
function parseNetWorth(str: string): number | null {
  if (!str || str === 'Not set' || str === '$0') return 0;
  const cleaned = str.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}


// Animated Net Worth Component
function AnimatedNetWorth({ value, previousValue, deltaString }: { value: string; previousValue?: string; deltaString?: string }) {
  const [delta, setDelta] = useState<number | null>(null);
  const deltaAnim = useRef(new Animated.Value(0)).current;
  const deltaOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Use deltaString if provided (from AI), otherwise calculate from previousValue
    if (deltaString) {
      // Parse deltaString like "+$15,000" or "-$5,000"
      const cleaned = deltaString.replace(/[^0-9.-]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        setDelta(num);
      }
    } else if (previousValue && previousValue !== value) {
      // Extract numeric values (simplified - assumes format like "$50,000" or "$100K")
      const prevNum = parseNetWorth(previousValue);
      const currNum = parseNetWorth(value);
      
      if (prevNum !== null && currNum !== null) {
        const change = currNum - prevNum;
        setDelta(change);

        // Pulse animation
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();

        // Show delta indicator
        deltaOpacity.setValue(1);
        deltaAnim.setValue(0);
        Animated.parallel([
          Animated.timing(deltaAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(4500),
            Animated.timing(deltaOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setDelta(null);
        });
      }
    }
  }, [value, previousValue, deltaString]);

  const translateY = deltaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  function formatDelta(delta: number): string {
    if (Math.abs(delta) >= 1000) {
      return `${delta > 0 ? '+' : ''}$${(delta / 1000).toFixed(1)}K`;
    }
    return `${delta > 0 ? '+' : ''}$${delta.toFixed(0)}`;
  }

  return (
    <View style={styles.netWorthContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Text style={styles.secondaryStatValue}>{value}</Text>
      </Animated.View>
      {delta !== null && delta !== 0 && (
        <Text
          style={[
            styles.netWorthDeltaBelow,
            { color: delta > 0 ? '#10B981' : '#EF4444' },
          ]}
        >
          {formatDelta(delta)}
        </Text>
      )}
    </View>
  );
}


export default function TimelineDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const timelineId = params.id as string;
  const user = useAuth((state) => state.user);
  const { isPremium } = useTwin();
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingScenario, setAddingScenario] = useState(false);
  const [scenarioModalVisible, setScenarioModalVisible] = useState(false);
  const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);
  const [scenarioText, setScenarioText] = useState('');
  const [assetNotifications, setAssetNotifications] = useState<Array<{ id: string; asset: any }>>([]);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const notificationAnimations = useRef<Map<string, Animated.Value>>(new Map());

  // Track previous values for animations
  const previousStats = useRef<any>(null);
  const previousNetWorth = useRef<string | null>(null);
  const [currentInventoryIndex, setCurrentInventoryIndex] = useState(0);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(0);

  // Loading messages to cycle through
  const loadingMessages = [
    'Simulating your decision...',
    'Building your alternate timeline...',
    'Calculating life outcomes...',
    'Analyzing potential consequences...',
    'Mapping your future path...',
    'Processing life scenarios...',
    'Generating timeline possibilities...',
    'Evaluating decision impact...',
    'Crafting your story...',
    'Predicting future events...',
  ];
  const inventoryScrollAnim = useRef(new Animated.Value(0)).current;

  // Slide-up animations for UI sections
  const statsBoardAnim = useRef(new Animated.Value(50)).current;
  const actionButtonAnim = useRef(new Animated.Value(50)).current;
  const lifeLogAnim = useRef(new Animated.Value(50)).current;
  const inventoryAnim = useRef(new Animated.Value(50)).current;

  // Loading screen animations
  const loadingPulseAnim = useRef(new Animated.Value(1)).current;
  const loadingRotateAnim = useRef(new Animated.Value(0)).current;

  // Check if user can go back (came from simulation tab)
  const canGoBack = navigation.canGoBack();

  // Disable swipe-to-go-back gesture and load timeline
  useFocusEffect(
    useCallback(() => {
      // Disable swipe-to-go-back gesture on both current and parent navigators
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

      // Load timeline
      if (timelineId && user) {
        loadTimeline();
      }

      return () => {
        // Re-enable gestures on cleanup
        navigation.setOptions({
          gestureEnabled: true,
        });
        if (parent) {
          parent.setOptions({
            gestureEnabled: true,
          });
        }
      };
    }, [navigation, timelineId, user])
  );

  async function loadTimeline() {
    if (!timelineId) return;

    try {
      const timelineData = await getTimeline(timelineId);
      
      // Store previous values before updating
      if (timeline) {
        previousStats.current = timeline.stats;
        previousNetWorth.current = timeline.twin_profile?.netWorth || null;
      }
      
      setTimeline(timelineData);
    } catch (error) {
      console.error('Failed to load timeline:', error);
      alert('Failed to load timeline');
    } finally {
      setLoading(false);
    }
  }

  // Auto-rotate inventory items
  useEffect(() => {
    if (timeline?.assets && timeline.assets.length > 1) {
      const interval = setInterval(() => {
        const newIndex = (currentInventoryIndex + 1) % timeline.assets.length;
        setCurrentInventoryIndex(newIndex);
        Animated.timing(inventoryScrollAnim, {
          toValue: newIndex,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, 4000); // Change every 4 seconds
      return () => clearInterval(interval);
    }
  }, [timeline?.assets, currentInventoryIndex]);

  // Initialize inventory scroll animation
  useEffect(() => {
    if (timeline?.assets && timeline.assets.length > 0) {
      inventoryScrollAnim.setValue(currentInventoryIndex);
    }
  }, [timeline?.assets?.length]);

  // Loading screen animations
  useEffect(() => {
    if (addingScenario) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(loadingPulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start rotation animation
      Animated.loop(
        Animated.timing(loadingRotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Cycle through loading messages every 2.5 seconds
      setCurrentLoadingMessage(0);
      const messageInterval = setInterval(() => {
        setCurrentLoadingMessage((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);

      return () => clearInterval(messageInterval);
    } else {
      loadingPulseAnim.setValue(1);
      loadingRotateAnim.setValue(0);
      setCurrentLoadingMessage(0);
    }
  }, [addingScenario]);

  // Slide-up animations on timeline load
  useEffect(() => {
    if (timeline && !loading) {
      // Reset all animations
      statsBoardAnim.setValue(50);
      actionButtonAnim.setValue(50);
      lifeLogAnim.setValue(50);
      inventoryAnim.setValue(50);

      // Animate sections with staggered delays
      Animated.parallel([
        Animated.timing(statsBoardAnim, {
          toValue: 0,
          duration: 600,
          delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(actionButtonAnim, {
          toValue: 0,
          duration: 600,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(lifeLogAnim, {
          toValue: 0,
          duration: 600,
          delay: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(inventoryAnim, {
          toValue: 0,
          duration: 600,
          delay: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [timeline, loading]);

  async function handleAddScenario() {
    if (!scenarioText.trim() || !timeline || !user) return;

    // Check year limit for free users (max 3 years)
    if (!isPremium) {
      const currentYear = timeline.current_year || 1;
      if (currentYear >= 3) {
        router.push('/premium');
        return;
      }
    }

    // Close modal immediately and show loading screen
    setScenarioModalVisible(false);
    setAddingScenario(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get user profile for context
      const profile = await getProfile(user.id);

      // Advance timeline
      const currentYear = timeline.current_year || 1;
      const advancement = await advanceTimeline({
        currentProfile: profile,
        currentStats: timeline.stats,
        timelineHistory: timeline.events || [],
        userDecision: scenarioText,
        currentAge: timeline.current_age,
        currentYear: currentYear,
        existingRelationships: timeline.relationships || [],
      });

      // Update timeline
      const newStats = {
        money: Math.max(0, Math.min(10, timeline.stats.money + advancement.statDeltas.money)),
        happiness: Math.max(0, Math.min(10, timeline.stats.happiness + advancement.statDeltas.happiness)),
        freedom: Math.max(0, Math.min(10, timeline.stats.freedom + advancement.statDeltas.freedom)),
        growth: Math.max(0, Math.min(10, timeline.stats.growth + advancement.statDeltas.growth)),
        relationships: Math.max(0, Math.min(10, timeline.stats.relationships + advancement.statDeltas.relationships)),
      };

      // Store previous values for animation and display
      previousStats.current = timeline.stats;
      previousNetWorth.current = timeline.twin_profile?.netWorth || null;
      
      // Store previous year's snapshot for delta calculations
      const previousYearSnapshot = {
        netWorth: timeline.twin_profile?.netWorth || null,
        location: timeline.twin_profile?.location || null,
        job: timeline.twin_profile?.job || null,
        relationships_count: timeline.relationships?.length || 0,
        stats: { ...timeline.stats },
      };

      const updatedTimeline = await updateTimeline(timelineId, {
        current_age: advancement.newAge,
        current_year: currentYear + 1, // Increment simulation year
        stats: newStats,
        newEvents: advancement.newEvents,
        newAssets: advancement.newAssets,
        removedAssetTypes: (advancement as any).removedAssets || [],
        twin_profile: {
          ...advancement.profileUpdates,
          profileDeltas: advancement.profileDeltas,
          previous_year_snapshot: previousYearSnapshot, // Store previous year's values
        },
        relationships: advancement.relationships || timeline.relationships || [],
      });

      // Show notifications for new assets
      if (advancement.newAssets && advancement.newAssets.length > 0) {
        const newNotifications = advancement.newAssets.map((asset, index) => ({
          id: `${Date.now()}-${index}`,
          asset,
        }));
        setAssetNotifications(newNotifications);
        
        // Animate in notifications
        newNotifications.forEach((notif) => {
          const animValue = new Animated.Value(0);
          notificationAnimations.current.set(notif.id, animValue);
          Animated.spring(animValue, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        });

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          newNotifications.forEach((notif) => {
            dismissNotification(notif.id);
          });
        }, 5000);
      }

      setTimeline(updatedTimeline);
      setScenarioText('');
      
      // Automatically expand the most recent year that was simulated
      const newCurrentYear = updatedTimeline.current_year || 1;
      setExpandedYears((prev) => {
        const newSet = new Set(prev);
        newSet.add(newCurrentYear);
        return newSet;
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Failed to add scenario:', error);
      const errorMessage = error?.message || 'Failed to simulate scenario. Please try again.';
      alert(errorMessage);
    } finally {
      setAddingScenario(false);
    }
  }


  function getAssetEmoji(assetType: string): string {
    switch (assetType) {
      case 'car': return '🚗';
      case 'apartment': return '🏢';
      case 'house': return '🏠';
      case 'pet': return '🐾';
      default: return '✨';
    }
  }

  function dismissNotification(id: string) {
    const animValue = notificationAnimations.current.get(id);
    if (animValue) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setAssetNotifications((prev) => prev.filter((n) => n.id !== id));
        notificationAnimations.current.delete(id);
      });
    } else {
      setAssetNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }

  function groupEventsByYear(events: any[]) {
    const grouped: { [year: number]: { month1: any[]; month6: any[]; month12: any[]; summary?: string } } = {};
    let currentYear = 1;
    let currentMonth = 1;
    
    events.forEach((event) => {
      const yearMatch = event.time?.match(/Year\s+(\d+)/i);
      const monthMatch = event.time?.match(/Month\s+(\d+)/i);
      
      let year = event.year || (yearMatch ? parseInt(yearMatch[1]) : null);
      let month = event.month || (monthMatch ? parseInt(monthMatch[1]) : null);
      
      if (!year) year = currentYear;
      if (!month) {
          month = currentMonth;
          currentMonth = currentMonth === 1 ? 6 : currentMonth === 6 ? 12 : 1;
          if (currentMonth === 1) currentYear++;
      }
      
      if (year) {
        if (!grouped[year]) {
          grouped[year] = { month1: [], month6: [], month12: [] };
        }
        
        if (month <= 3) grouped[year].month1.push(event);
        else if (month <= 9) grouped[year].month6.push(event);
        else grouped[year].month12.push(event);
      }
    });
    
    return grouped;
  }

  function toggleYear(year: number) {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function getRelationshipColor(type: string) {
    switch (type?.toLowerCase()) {
      case 'partner': return '#EC4899'; // Pink
      case 'family': return '#0EA5E9'; // Sky Blue
      case 'friend': return '#10B981'; // Green
      default: return '#9CA3AF'; // Gray
    }
  }

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case 'good': return '#10B981';
      case 'bad': return '#EF4444';
      case 'complicated': return '#F59E0B';
      default: return '#9CA3AF';
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (addingScenario) {
    const rotateInterpolate = loadingRotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.loadingScreen}>
        <LinearGradient
          colors={['#050505', '#0A0A0A', '#050505']}
          style={styles.loadingGradientContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <StatusBar style="light" />
          <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
            <View style={styles.loadingContent}>
              {/* Animated Orb */}
              <View style={styles.orbContainer}>
                <Animated.View
                  style={[
                    styles.orbOuter,
                    {
                      transform: [
                        { scale: loadingPulseAnim },
                        { rotate: rotateInterpolate },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(135, 206, 250, 0.2)', 'rgba(100, 181, 246, 0.1)', 'rgba(65, 105, 225, 0.05)']}
                    style={styles.orbGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </Animated.View>
                <View style={styles.orbInner}>
                  <Image 
                    source={require('@/assets/images/cube.png')}
                    style={styles.loadingCubeIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Loading Text */}
              <View style={styles.textContainer}>
                <Text style={styles.loadingText}>Simulating the next year...</Text>
                <View style={styles.statusContainer}>
                  <BlurView intensity={20} tint="dark" style={styles.statusBlur}>
                    <Text style={styles.statusText}>
                      {loadingMessages[currentLoadingMessage]}
                    </Text>
                  </BlurView>
                </View>
              </View>

              {/* Loading Dots */}
              <View style={styles.dotsContainer}>
                {[0, 1, 2].map((index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: '#87CEFA',
                        transform: [
                          {
                            scale: loadingPulseAnim.interpolate({
                              inputRange: [1, 1.1],
                              outputRange: [1, 1.2],
                            }),
                          },
                        ],
                        opacity: loadingPulseAnim.interpolate({
                          inputRange: [1, 1.1],
                          outputRange: [0.5, 1],
                        }),
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (!timeline) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Timeline not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#050505', '#0A0A0A', '#000000']}
      style={styles.container}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Asset Notifications */}
        {assetNotifications.length > 0 && (
          <View style={styles.notificationsContainer} pointerEvents="box-none">
            {assetNotifications.map((notif) => {
              let animValue = notificationAnimations.current.get(notif.id);
              if (!animValue) {
                animValue = new Animated.Value(0);
                notificationAnimations.current.set(notif.id, animValue);
                Animated.spring(animValue, {
                  toValue: 1,
                  useNativeDriver: true,
                  tension: 50,
                  friction: 7,
                }).start();
              }
              
              const translateY = animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              });
              const opacity = animValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              });

              return (
                <Animated.View
                  key={notif.id}
                  style={[
                    styles.notification,
                    {
                      transform: [{ translateY }],
                      opacity,
                    },
                  ]}
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationEmojiContainer}>
                      <Text style={styles.notificationEmoji}>
                        {getAssetEmoji(notif.asset.type || 'other')}
                      </Text>
                    </View>
                    <View style={styles.notificationText}>
                      <Text style={styles.notificationTitle}>New Asset Acquired!</Text>
                      <Text style={styles.notificationSubtitle}>{notif.asset.name}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => dismissNotification(notif.id)}
                      style={styles.notificationClose}
                    >
                      <X size={18} color="#000000" />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => canGoBack ? router.back() : router.push('/(tabs)/home')}
            style={styles.backButton}
          >
            {canGoBack ? (
              <ChevronLeft size={24} color="#FFFFFF" />
            ) : (
              <Home size={24} color="#FFFFFF" strokeWidth={2} />
            )}
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
             <Text style={styles.headerTitle} numberOfLines={1}>{timeline.title}</Text>
          </View>
          <View style={styles.headerRight}>
             <View style={styles.turnCounter}>
                <Zap size={14} color="#FCD34D" fill="#FCD34D" />
                <Text style={styles.turnText}>
                  {isPremium ? '∞' : `${timeline.current_year || 1}/3`}
                </Text>
             </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Character HUD / Stats Board */}
          <Animated.View 
            style={[
              styles.statsBoard,
              {
                transform: [{ translateY: statsBoardAnim }],
                opacity: statsBoardAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [1, 0],
                }),
              },
            ]}
          >
            {/* Top Row: Avatar & Age */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarIconContainer}>
                  <User size={40} color="#0EA5E9" />
                </View>
                <View style={styles.ageContainer}>
                  <Text style={styles.ageValue}>{timeline.current_age}</Text>
                  <Text style={styles.ageLabel}>YEARS OLD</Text>
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {/* Job - HERO STAT */}
              <View style={[styles.statCard, styles.heroStatCard]}>
                 <View style={styles.statHeader}>
                    <Briefcase size={20} color="#8B5CF6" />
                    <Text style={[styles.statLabel, { color: '#8B5CF6' }]}>JOB</Text>
                 </View>
                 <Text style={styles.secondaryStatValue}>
                   {timeline.twin_profile?.job || 'Unemployed'}
                 </Text>
                 {timeline.twin_profile?.previous_year_snapshot?.job && 
                  timeline.twin_profile?.previous_year_snapshot?.job !== timeline.twin_profile?.job && (
                   <Text style={styles.previousValueText}>
                     Was: {timeline.twin_profile.previous_year_snapshot.job}
                   </Text>
                 )}
                 <Text style={styles.statSubtext}>Current Role</Text>
              </View>

              {/* Location - HERO STAT */}
              <View style={[styles.statCard, styles.heroStatCard]}>
                 <View style={styles.statHeader}>
                    <MapPin size={20} color="#3B82F6" />
                    <Text style={[styles.statLabel, { color: '#3B82F6' }]}>LOCATION</Text>
                 </View>
                 <Text style={styles.secondaryStatValue}>
                   {timeline.twin_profile?.location || 'Unknown'}
                 </Text>
                 {timeline.twin_profile?.previous_year_snapshot?.location && 
                  timeline.twin_profile?.previous_year_snapshot?.location !== timeline.twin_profile?.location && (
                   <Text style={styles.previousValueText}>
                     Was: {timeline.twin_profile.previous_year_snapshot.location}
                   </Text>
                 )}
                 <Text style={styles.statSubtext}>Current City</Text>
              </View>

              {/* Net Worth */}
              <View style={styles.statCard}>
                 <View style={styles.statHeader}>
                    <DollarSign size={18} color="#10B981" />
                    <Text style={[styles.statLabel, { color: '#10B981' }]}>NET WORTH</Text>
                 </View>
                 <AnimatedNetWorth 
                   value={timeline.twin_profile?.netWorth || '$0'} 
                   previousValue={previousNetWorth.current || undefined}
                   deltaString={timeline.twin_profile?.profileDeltas?.netWorth}
                 />
              </View>

              {/* Relationships */}
              <TouchableOpacity 
                style={styles.statCard}
                onPress={() => setRelationshipModalVisible(true)}
                activeOpacity={0.7}
              >
                 <View style={styles.statHeader}>
                    <Users size={18} color="#EF4444" />
                    <Text style={[styles.statLabel, { color: '#EF4444' }]}>RELATIONSHIPS</Text>
                 </View>
                 <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <Text style={styles.secondaryStatValue}>{timeline.relationships?.length || 0}</Text>
                    <Text style={styles.secondaryStatUnit}>Connections</Text>
                    {(() => {
                      const prevSnapshot = timeline.twin_profile?.previous_year_snapshot;
                      if (prevSnapshot?.relationships_count !== undefined) {
                        const delta = (timeline.relationships?.length || 0) - prevSnapshot.relationships_count;
                        if (delta !== 0) {
                          return (
                            <Text style={[styles.relationshipDelta, { color: delta > 0 ? '#10B981' : '#EF4444' }]}>
                              {delta > 0 ? '+' : ''}{delta}
                            </Text>
                          );
                        }
                      }
                      return null;
                    })()}
                 </View>
                 <View style={styles.viewMoreRow}>
                   <Text style={styles.viewMoreText}>View All</Text>
                   <ChevronRight size={12} color="#666" />
                 </View>
              </TouchableOpacity>
            </View>

            {/* Secondary Metrics (Happiness, Freedom) */}
            <View style={styles.secondaryMetrics}>
               <View style={styles.miniMetric}>
                  <Text style={styles.miniMetricLabel}>Happiness</Text>
                  <View style={styles.miniMetricValueRow}>
                     <Heart size={14} color="#EC4899" />
                     <Text style={styles.miniMetricValue}>{Math.round(timeline.stats?.happiness || 5)}/10</Text>
                     {(() => {
                       const prevHappiness = previousStats.current?.happiness ?? timeline.twin_profile?.previous_year_snapshot?.stats?.happiness;
                       const currHappiness = timeline.stats?.happiness || 5;
                       if (prevHappiness !== undefined && prevHappiness !== currHappiness) {
                         const delta = currHappiness - prevHappiness;
                         return (
                           <Text style={[styles.miniMetricDelta, { color: delta > 0 ? '#10B981' : '#EF4444' }]}>
                             {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                           </Text>
                         );
                       }
                       return null;
                     })()}
                  </View>
               </View>
               <View style={styles.miniMetricDivider} />
               <View style={styles.miniMetric}>
                  <Text style={styles.miniMetricLabel}>Freedom</Text>
                  <View style={styles.miniMetricValueRow}>
                     <Zap size={14} color="#F59E0B" />
                     <Text style={styles.miniMetricValue}>{Math.round(timeline.stats?.freedom || 5)}/10</Text>
                     {(() => {
                       const prevFreedom = previousStats.current?.freedom ?? timeline.twin_profile?.previous_year_snapshot?.stats?.freedom;
                       const currFreedom = timeline.stats?.freedom || 5;
                       if (prevFreedom !== undefined && prevFreedom !== currFreedom) {
                         const delta = currFreedom - prevFreedom;
                         return (
                           <Text style={[styles.miniMetricDelta, { color: delta > 0 ? '#10B981' : '#EF4444' }]}>
                             {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                           </Text>
                         );
                       }
                       return null;
                     })()}
                  </View>
               </View>
            </View>

          </Animated.View>

          {/* Action Button (Floating Look) */}
          <Animated.View
            style={{
              transform: [{ translateY: actionButtonAnim }],
              opacity: actionButtonAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0],
              }),
            }}
          >
          <TouchableOpacity
            onPress={() => {
              // Check year limit for free users (max 3 years)
              if (!isPremium) {
                const currentYear = timeline.current_year || 1;
                if (currentYear >= 3) {
                  router.push('/premium');
                  return;
                }
              }
              setScenarioModalVisible(true);
            }}
            activeOpacity={0.8}
            style={styles.actionButtonContainer}
          >
                  <LinearGradient
                colors={['#2563EB', '#0EA5E9', '#14B8A6']}
                    start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButton}
             >
                <View style={styles.actionButtonContent}>
                   <Text style={styles.actionButtonTitle}>Make Decision</Text>
                   <Text style={styles.actionButtonSubtitle}>Choose your next move</Text>
                  </View>
                <View style={styles.actionButtonIcon}>
                   <Plus size={24} color="#FFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
          </Animated.View>

          {/* Timeline Events (Quest Log Style) */}
          <Animated.View
            style={{
              transform: [{ translateY: lifeLogAnim }],
              opacity: lifeLogAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [1, 0],
              }),
            }}
          >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Life Log</Text>
            <View style={styles.sectionBadge}>
               <Text style={styles.sectionBadgeText}>{timeline.events?.length || 0} Events</Text>
            </View>
          </View>

            {timeline.events && timeline.events.length > 0 ? (
              <View style={styles.eventsList}>
                {(() => {
                  const groupedEvents = groupEventsByYear(timeline.events);
                const years = Object.keys(groupedEvents).map(Number).sort((a, b) => b - a); // Newest first for game feel? or oldest? Sticking to Chronological for timeline usually makes sense, but games often show newest quest first. Let's keep chronological for "Life Story".
                  
                  return years.map((year) => {
                    const yearData = groupedEvents[year];
                    const isExpanded = expandedYears.has(year);
                    const hasEvents = (yearData.month1?.length || 0) + (yearData.month6?.length || 0) + (yearData.month12?.length || 0) > 0;
                    
                    if (!hasEvents) return null;
                    
                    return (
                    <View key={year} style={styles.questCard}>
                          <TouchableOpacity
                            onPress={() => toggleYear(year)}
                            activeOpacity={0.7}
                          style={styles.questHeader}
                       >
                          <View style={styles.questHeaderLeft}>
                             <View style={styles.questLevelBadge}>
                                <Text style={styles.questLevelText}>AGE {timeline.current_age - (timeline.current_year || 1) + year}</Text>
                                </View>
                             <Text style={styles.questTitle}>Year {year}</Text>
                              </View>
                          {isExpanded ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
                          </TouchableOpacity>
                        
                        {isExpanded && (
                        <View style={styles.questContent}>
                            {/* Month 1 */}
                          {yearData.month1?.map((event: any, idx: number) => (
                             <View key={`m1-${idx}`} style={styles.questItem}>
                                <View style={styles.questLine} />
                                <View style={styles.questDot} />
                                <Text style={styles.questItemTitle}>{event.title}</Text>
                                <Text style={styles.questItemDesc}>{event.description}</Text>
                                  </View>
                                ))}
                            
                            {/* Month 6 */}
                          {yearData.month6?.map((event: any, idx: number) => (
                             <View key={`m6-${idx}`} style={styles.questItem}>
                                <View style={styles.questLine} />
                                <View style={styles.questDot} />
                                <Text style={styles.questItemTitle}>{event.title}</Text>
                                <Text style={styles.questItemDesc}>{event.description}</Text>
                                  </View>
                                ))}
                            
                            {/* Month 12 */}
                          {yearData.month12?.map((event: any, idx: number) => (
                             <View key={`m12-${idx}`} style={styles.questItem}>
                                <View style={styles.questLine} />
                                <View style={styles.questDot} />
                                <Text style={styles.questItemTitle}>{event.title}</Text>
                                <Text style={styles.questItemDesc}>{event.description}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                      </View>
                    );
                  });
                })()}
              </View>
            ) : (
              <View style={styles.emptyEvents}>
                <Text style={styles.emptyEventsText}>
                No history yet. Make a decision to start your story.
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Inventory / Assets - Single Banner */}
          {timeline?.assets && timeline.assets.length > 0 && (
            <Animated.View
              style={{
                transform: [{ translateY: inventoryAnim }],
                opacity: inventoryAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [1, 0],
                }),
              }}
            >
            <View style={styles.inventorySection}>
               <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Inventory</Text>
                  <View style={styles.sectionBadge}>
                     <Text style={styles.sectionBadgeText}>{timeline.assets.length} Items</Text>
                  </View>
          </View>

               <View style={styles.inventoryBannerContainer}>
                 <Animated.View
                   style={[
                     {
                       flexDirection: 'row',
                       width: (width - 40) * (timeline.assets?.length || 1),
                     },
                     timeline.assets.length > 1 ?                      {
                       transform: [
                         {
                           translateX: inventoryScrollAnim.interpolate({
                             inputRange: timeline.assets.map((_: any, i: number) => i),
                             outputRange: timeline.assets.map((_: any, i: number) => -(i * (width - 40))),
                           }),
                         },
                       ],
                     } : {},
                   ]}
                 >
                {timeline.assets.map((asset: any, index: number) => (
                     <View key={index} style={styles.inventoryBannerItem}>
                    <LinearGradient
                         colors={['rgba(14, 165, 233, 0.2)', 'rgba(14, 165, 233, 0.05)', 'rgba(255, 255, 255, 0.02)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                         style={styles.inventoryBanner}
                    >
                         <View style={styles.inventoryBannerContent}>
                           <View style={styles.inventoryBannerIcon}>
                             <Text style={styles.inventoryBannerEmoji}>{getAssetEmoji(asset.type)}</Text>
                      </View>
                           <View style={styles.inventoryBannerText}>
                             <Text style={styles.inventoryBannerName}>{asset.name}</Text>
                      {asset.value && (
                               <Text style={styles.inventoryBannerValue}>{asset.value}</Text>
                      )}
                      {asset.description && (
                               <Text style={styles.inventoryBannerDesc} numberOfLines={2}>{asset.description}</Text>
                      )}
                  </View>
                         </View>
                         <View style={styles.inventoryBannerIndicator}>
                           {timeline.assets.map((_: any, idx: number) => (
                             <View
                               key={idx}
                               style={[
                                 styles.inventoryDot,
                                 idx === currentInventoryIndex && styles.inventoryDotActive,
                               ]}
                             />
                ))}
              </View>
                       </LinearGradient>
            </View>
                   ))}
                 </Animated.View>
               </View>

               {/* Manual navigation buttons */}
               {timeline.assets.length > 1 && (
                 <View style={styles.inventoryNav}>
          <TouchableOpacity
            onPress={() => {
                       const newIndex = currentInventoryIndex === 0 ? timeline.assets.length - 1 : currentInventoryIndex - 1;
                       setCurrentInventoryIndex(newIndex);
                       Animated.timing(inventoryScrollAnim, {
                         toValue: newIndex,
                         duration: 300,
                         easing: Easing.out(Easing.quad),
                         useNativeDriver: true,
                       }).start();
            }}
                     style={styles.inventoryNavButton}
                   >
                     <ChevronLeft size={20} color="#FFF" />
                   </TouchableOpacity>
                   <Text style={styles.inventoryNavText}>
                     {currentInventoryIndex + 1} / {timeline.assets.length}
                   </Text>
                   <TouchableOpacity
                     onPress={() => {
                       const newIndex = (currentInventoryIndex + 1) % timeline.assets.length;
                       setCurrentInventoryIndex(newIndex);
                       Animated.timing(inventoryScrollAnim, {
                         toValue: newIndex,
                         duration: 300,
                         easing: Easing.out(Easing.quad),
                         useNativeDriver: true,
                       }).start();
                     }}
                     style={styles.inventoryNavButton}
                   >
                     <ChevronRight size={20} color="#FFF" />
                   </TouchableOpacity>
                </View>
              )}
        </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Scenario Input Modal */}
        <Modal
          visible={scenarioModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setScenarioModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['#1a1a20', '#0f0f12']}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Sparkles size={20} color="#0EA5E9" />
                  <Text style={styles.modalTitle}>What do you do?</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setScenarioModalVisible(false);
                    setScenarioText('');
                  }}
                  style={styles.modalClose}
                >
                    <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Describe your next major life decision.
              </Text>
              <TextInput
                style={styles.scenarioInput}
                placeholder="E.g., I decide to quit my job and travel the world..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={scenarioText}
                onChangeText={setScenarioText}
                multiline
                autoFocus
              />
              <TouchableOpacity
                onPress={handleAddScenario}
                disabled={!scenarioText.trim() || addingScenario}
                style={[
                  styles.modalButton,
                  (!scenarioText.trim() || addingScenario) && styles.modalButtonDisabled,
                ]}
              >
                <LinearGradient
                  colors={
                    (!scenarioText.trim() || addingScenario)
                      ? ['rgba(100, 100, 100, 0.3)', 'rgba(80, 80, 80, 0.3)']
                      : ['#2563EB', '#0EA5E9', '#14B8A6']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalButtonGradient}
                >
                  {addingScenario ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Simulate Next Year</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Modal>

        {/* Relationships Modal */}
        <Modal
          visible={relationshipModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setRelationshipModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['#1a1a20', '#0f0f12']}
              style={[styles.modalContent, { maxHeight: '70%' }]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Users size={20} color="#EF4444" />
                  <Text style={styles.modalTitle}>Relationships</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setRelationshipModalVisible(false)}
                  style={styles.modalClose}
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.relationshipsList} showsVerticalScrollIndicator={false}>
                {timeline?.relationships && timeline.relationships.length > 0 ? (
                  timeline.relationships.map((rel: any, index: number) => (
                    <View key={index} style={styles.relationshipCard}>
                      <View style={styles.relationshipHeader}>
                        <Text style={styles.relationshipName}>{rel.name}</Text>
                        <View style={[styles.relationshipTypeTag, { backgroundColor: getRelationshipColor(rel.type) + '20' }]}>
                          <Text style={[styles.relationshipTypeText, { color: getRelationshipColor(rel.type) }]}>{rel.type}</Text>
                        </View>
                      </View>
                      <Text style={styles.relationshipStatus}>Status: <Text style={{color: getStatusColor(rel.status), fontWeight: '700'}}>{rel.status}</Text></Text>
                      <Text style={styles.relationshipDesc}>{rel.description}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyEvents}>
                    <Text style={styles.emptyEventsText}>No relationships yet. Simulate to meet people!</Text>
                  </View>
                )}
              </ScrollView>
            </LinearGradient>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingGradientContainer: {
    flex: 1,
  },
  loadingSafeArea: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  orbContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  orbOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  orbGradient: {
    width: '100%',
    height: '100%',
  },
  orbInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingCubeIcon: {
    width: 60,
    height: 60,
    opacity: 0.9,
  },
  textContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  statusText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  turnCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(20, 20, 25, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  turnText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  statsBoard: {
    backgroundColor: '#1A1A20',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#0EA5E9',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageContainer: {
    justifyContent: 'center',
  },
  ageValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 28,
  },
  ageLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  contextInfo: {
    alignItems: 'flex-end',
    gap: 6,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  contextText: {
    fontSize: 12,
    color: '#CCC',
    maxWidth: 120,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%', // roughly half width with gap
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroStatCard: {
    width: '100%', // Full width for rectangles instead of squares
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  heroStatValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  heroStatMax: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  statSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  secondaryStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryStatUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  viewMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  secondaryMetrics: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  miniMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  miniMetricLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  miniMetricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  miniMetricDelta: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniMetricDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  previousValueText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  
  // Existing styles to preserve
  netWorthContainer: {
    position: 'relative',
  },
  netWorthDelta: {
    position: 'absolute',
    top: -24,
    right: 0,
    zIndex: 10,
  },
  netWorthDeltaBelow: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  netWorthDeltaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  netWorthDeltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  relationshipDelta: {
    fontSize: 11,
    fontWeight: '600',
  },
  smallDeltaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Action Button & Other Sections
  actionButtonContainer: {
    marginBottom: 32,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  actionButton: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  actionButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  sectionBadge: {
    backgroundColor: '#1A1A20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionBadgeText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  eventsList: {
    gap: 12,
    marginBottom: 32,
  },
  questCard: {
    backgroundColor: '#1A1A20',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  questHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questLevelBadge: {
    backgroundColor: '#2A2A30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  questLevelText: {
    color: '#0EA5E9',
    fontSize: 10,
    fontWeight: '700',
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  questContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  questItem: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingVertical: 12,
    position: 'relative',
    flexWrap: 'wrap',
  },
  questLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#333',
  },
  questDot: {
    position: 'absolute',
    left: -4,
    top: 18,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#1A1A20',
    borderWidth: 2,
    borderColor: '#0EA5E9',
  },
  questItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
    width: '100%',
    paddingLeft: 12,
  },
  questItemDesc: {
    fontSize: 15,
    color: '#888',
    width: '100%',
    paddingLeft: 12,
    lineHeight: 22,
  },
  emptyEvents: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#1A1A20',
    borderRadius: 16,
    marginBottom: 32,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyEventsText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  inventorySection: {
    marginBottom: 32,
  },
  inventoryBannerContainer: {
    width: width - 40,
    height: 140,
    overflow: 'hidden',
    borderRadius: 20,
    marginBottom: 12,
  },
  inventoryBannerItem: {
    width: width - 40,
    height: 140,
  },
  inventoryBanner: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
    padding: 16,
    justifyContent: 'space-between',
  },
  inventoryBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  inventoryBannerIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryBannerEmoji: {
    fontSize: 36,
  },
  inventoryBannerText: {
    flex: 1,
    gap: 4,
  },
  inventoryBannerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  inventoryBannerValue: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  inventoryBannerDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 16,
  },
  inventoryBannerIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  inventoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  inventoryDotActive: {
    backgroundColor: '#0EA5E9',
    width: 20,
  },
  inventoryNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  inventoryNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryNavText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  modalClose: {
    padding: 4,
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  scenarioInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  notificationsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 20,
    gap: 8,
  },
  notification: {
    marginBottom: 8,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationEmoji: {
    fontSize: 28,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.7)',
  },
  notificationClose: {
    padding: 4,
    marginLeft: 8,
  },
  relationshipsList: {
    marginTop: 8,
  },
  relationshipCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  relationshipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  relationshipName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  relationshipTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  relationshipTypeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  relationshipStatus: {
    fontSize: 12,
    color: '#CCC',
    marginBottom: 4,
  },
  relationshipDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
});



