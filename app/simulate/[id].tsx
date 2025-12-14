import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput, Dimensions, Animated, Image, Easing } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { getTimeline, updateTimeline, getProfile } from '@/lib/storage';
import { advanceTimeline } from '@/lib/ai';
import { ChevronLeft, Plus, User, Lock, DollarSign, Heart, Zap, TrendingUp, TrendingDown, Users, X, ChevronDown, ChevronUp, MapPin, Sparkles, Brain, Briefcase, ChevronRight } from 'lucide-react-native';
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

// Animated Progress Bar Component
function AnimatedProgressBar({ value, color, icon, previousValue }: { value: number; color: string; icon: any; previousValue?: number }) {
  const Icon = icon;
  const animValue = useRef(new Animated.Value(previousValue || 0)).current;
  const [delta, setDelta] = useState<number | null>(null);
  const deltaAnim = useRef(new Animated.Value(0)).current;
  const deltaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (previousValue !== undefined && previousValue !== value) {
      const change = value - previousValue;
      setDelta(change);
      
      // Animate the bar
      Animated.timing(animValue, {
        toValue: value,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

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
          Animated.delay(4000),
          Animated.timing(deltaOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setDelta(null);
      });
    } else {
      animValue.setValue(value);
    }
  }, [value, previousValue]);

  const widthInterpolate = animValue.interpolate({
    inputRange: [0, 10],
    outputRange: ['0%', '100%'],
  });

  const translateY = deltaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={styles.statBarContainer}>
      <View style={styles.statBarIcon}>
        <Icon size={14} color={color} />
      </View>
      <View style={styles.statBarTrack}>
        <Animated.View
          style={[
            styles.statBarFillAnimated,
            {
              width: widthInterpolate,
              backgroundColor: color,
            },
          ]}
        >
          <LinearGradient
            colors={[color, adjustColorBrightness(color, -20)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <View style={styles.statBarValueContainer}>
        <View style={{flexDirection: 'column', alignItems: 'flex-end', gap: 2}}>
          <Text style={styles.statBarValue}>{Math.round(value)}/10</Text>
          {previousValue !== undefined && previousValue !== value && (
            <Text style={styles.previousStatValue}>
              Was: {Math.round(previousValue)}/10
            </Text>
          )}
        </View>
        {delta !== null && (
          <Animated.View
            style={[
              styles.deltaIndicator,
              {
                opacity: deltaOpacity,
                transform: [{ translateY }],
                backgroundColor: delta > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              },
            ]}
          >
            {delta > 0 ? (
              <TrendingUp size={12} color="#10B981" />
            ) : (
              <TrendingDown size={12} color="#EF4444" />
            )}
            <Text
              style={[
                styles.deltaText,
                { color: delta > 0 ? '#10B981' : '#EF4444' },
              ]}
            >
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
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
        <Text style={styles.primaryStatValue}>{value}</Text>
      </Animated.View>
      {delta !== null && delta !== 0 && (
        <Animated.View
          style={[
            styles.netWorthDelta,
            {
              opacity: deltaOpacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <LinearGradient
            colors={
              delta > 0
                ? ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.1)']
                : ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.1)']
            }
            style={styles.netWorthDeltaGradient}
          >
            {delta > 0 ? (
              <TrendingUp size={14} color="#10B981" />
            ) : (
              <TrendingDown size={14} color="#EF4444" />
            )}
            <Text
              style={[
                styles.netWorthDeltaText,
                { color: delta > 0 ? '#10B981' : '#EF4444' },
              ]}
            >
              {formatDelta(delta)}
            </Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

function adjustColorBrightness(color: string, percent: number): string {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Adjust brightness
  const newR = Math.max(0, Math.min(255, r + (r * percent / 100)));
  const newG = Math.max(0, Math.min(255, g + (g * percent / 100)));
  const newB = Math.max(0, Math.min(255, b + (b * percent / 100)));
  
  return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
}

export default function TimelineDetailScreen() {
  const router = useRouter();
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
  const inventoryScrollAnim = useRef(new Animated.Value(0)).current;

  // Slide-up animations for UI sections
  const statsBoardAnim = useRef(new Animated.Value(50)).current;
  const actionButtonAnim = useRef(new Animated.Value(50)).current;
  const lifeLogAnim = useRef(new Animated.Value(50)).current;
  const inventoryAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      if (timelineId && user) {
        loadTimeline();
      }
    }, [timelineId, user])
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

    // Check limits
    const scenarioCount = timeline.scenario_count || 0;
    const maxScenarios = isPremium ? Infinity : 5;

    if (scenarioCount >= maxScenarios) {
      alert(
        isPremium
          ? 'Unable to add scenario'
          : 'Free users can add up to 5 scenarios per timeline. Upgrade to Premium for unlimited scenarios.'
      );
      return;
    }

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
      setScenarioModalVisible(false);
      setScenarioText('');
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
                  <LinearGradient
                    colors={['rgba(14, 165, 233, 0.3)', 'rgba(14, 165, 233, 0.15)', 'rgba(20, 20, 20, 0.95)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.notificationContent}
                  >
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
                      <X size={18} color="rgba(255, 255, 255, 0.7)" />
                    </TouchableOpacity>
                  </LinearGradient>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
             <Text style={styles.headerTitle} numberOfLines={1}>{timeline.title}</Text>
          </View>
          <View style={styles.headerRight}>
             <View style={styles.turnCounter}>
                <Zap size={14} color="#FCD34D" fill="#FCD34D" />
                <Text style={styles.turnText}>{timeline.scenario_count || 0}/5</Text>
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
            <Image 
              source={require('@/assets/images/splash-icon.png')} 
              style={[StyleSheet.absoluteFill, { opacity: 0.05 }]}
              blurRadius={50}
            />
            
            {/* Top Row: Avatar & Main Metrics */}
            <View style={styles.statsTopRow}>
              <View style={styles.avatarSection}>
                <View style={styles.avatarContainer}>
                  <Image 
                     source={require('@/assets/images/man.png')} 
                     style={styles.avatarImage} 
                  />
                </View>
                <View style={styles.ageDisplay}>
                  <Text style={styles.ageDisplayText}>{timeline.current_age}</Text>
                  <Text style={styles.ageDisplayLabel}>Years Old</Text>
                </View>
              </View>
              
              <View style={styles.primaryStats}>
                 {/* Money */}
                 <View style={styles.primaryStatItem}>
                    <View style={styles.coinIcon}>
                       <DollarSign size={16} color="#10B981" />
                    </View>
                    <View style={styles.primaryStatTextContainer}>
                       <Text style={styles.primaryStatLabel}>NET WORTH</Text>
                       <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 6}}>
                         <AnimatedNetWorth 
                           value={timeline.twin_profile?.netWorth || '$0'} 
                           previousValue={previousNetWorth.current || undefined}
                           deltaString={timeline.twin_profile?.profileDeltas?.netWorth}
                         />
                         {(() => {
                           const prevSnapshot = timeline.twin_profile?.previous_year_snapshot;
                           if (prevSnapshot?.netWorth) {
                             const prevNum = parseNetWorth(prevSnapshot.netWorth);
                             const currNum = parseNetWorth(timeline.twin_profile?.netWorth || '$0');
                             if (prevNum !== null && currNum !== null) {
                               const delta = currNum - prevNum;
                               if (delta !== 0) {
                                 const formatted = Math.abs(delta) >= 1000 
                                   ? `${delta > 0 ? '+' : ''}$${(delta / 1000).toFixed(1)}K`
                                   : `${delta > 0 ? '+' : ''}$${Math.round(delta)}`;
                                 return (
                                   <Text style={[styles.smallDeltaText, { color: delta > 0 ? '#10B981' : '#EF4444' }]}>
                                     {formatted}
                                   </Text>
                                 );
                               }
                             }
                           }
                           return null;
                         })()}
                       </View>
                  </View>
                </View>

                 {/* Location */}
                 <View style={styles.primaryStatItem}>
                    <View style={[styles.coinIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                       <MapPin size={16} color="#3B82F6" />
                    </View>
                    <View style={styles.primaryStatTextContainer}>
                       <Text style={styles.primaryStatLabel}>LOCATION</Text>
                       <View style={{flexDirection: 'column', gap: 2}}>
                         <Text style={styles.primaryStatValue}>{timeline.twin_profile?.location || 'Unknown'}</Text>
                         {timeline.twin_profile?.previous_year_snapshot?.location && 
                          timeline.twin_profile?.previous_year_snapshot?.location !== timeline.twin_profile?.location && (
                           <Text style={styles.previousValueText}>
                             Was: {timeline.twin_profile.previous_year_snapshot.location}
                           </Text>
                         )}
                       </View>
                  </View>
                </View>

                 {/* Job */}
                 {timeline.twin_profile?.job && (
                   <View style={styles.primaryStatItem}>
                      <View style={[styles.coinIcon, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                         <Briefcase size={16} color="#8B5CF6" />
                      </View>
                      <View style={styles.primaryStatTextContainer}>
                         <Text style={styles.primaryStatLabel}>JOB</Text>
                         <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
                           <Text style={styles.primaryStatValue}>{timeline.twin_profile.job}</Text>
                           {timeline.twin_profile?.profileDeltas?.job && (
                             <View style={[styles.deltaTag, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                               <Text style={[styles.deltaText, { color: '#8B5CF6' }]}>
                                 {timeline.twin_profile.profileDeltas.job}
                               </Text>
                             </View>
                           )}
                         </View>
                    </View>
                  </View>
                 )}

                 {/* Relationships */}
                 <TouchableOpacity 
                    style={styles.primaryStatItem}
                    onPress={() => setRelationshipModalVisible(true)}
                    activeOpacity={0.7}
                 >
                    <View style={[styles.coinIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                       <Users size={16} color="#EF4444" />
                    </View>
                    <View style={styles.primaryStatTextContainer}>
                       <Text style={styles.primaryStatLabel}>RELATIONSHIPS</Text>
                       <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                         <Text style={styles.primaryStatValue}>
                           {timeline.relationships?.length || 0} Connections
                         </Text>
                         {(() => {
                           const prevSnapshot = timeline.twin_profile?.previous_year_snapshot;
                           if (prevSnapshot?.relationships_count !== undefined) {
                             const delta = (timeline.relationships?.length || 0) - prevSnapshot.relationships_count;
                             if (delta !== 0) {
                               return (
                                 <Text style={[styles.smallDeltaText, { color: delta > 0 ? '#10B981' : '#EF4444' }]}>
                                   {delta > 0 ? '+' : ''}{delta}
                                 </Text>
                               );
                             }
                           }
                           return null;
                         })()}
                         <ChevronRight size={14} color="#666" />
                       </View>
                    </View>
                 </TouchableOpacity>
                  </View>
                </View>

            {/* Status Bars */}
            <View style={styles.statusBars}>
              <AnimatedProgressBar 
                value={timeline.stats?.happiness || 5} 
                color="#EC4899" 
                icon={Heart}
                previousValue={previousStats.current?.happiness ?? timeline.twin_profile?.previous_year_snapshot?.stats?.happiness}
              />
              <AnimatedProgressBar 
                value={timeline.stats?.money || 5} 
                color="#10B981" 
                icon={DollarSign}
                previousValue={previousStats.current?.money ?? timeline.twin_profile?.previous_year_snapshot?.stats?.money}
              />
              <AnimatedProgressBar 
                value={timeline.stats?.freedom || 5} 
                color="#F59E0B" 
                icon={Sparkles}
                previousValue={previousStats.current?.freedom ?? timeline.twin_profile?.previous_year_snapshot?.stats?.freedom}
              />
              <AnimatedProgressBar 
                value={timeline.stats?.growth || 5} 
                color="#0EA5E9" 
                icon={Brain}
                previousValue={previousStats.current?.growth ?? timeline.twin_profile?.previous_year_snapshot?.stats?.growth}
              />
              <AnimatedProgressBar 
                value={timeline.stats?.relationships || 5} 
                color="#EF4444" 
                icon={Users}
                previousValue={previousStats.current?.relationships ?? timeline.twin_profile?.previous_year_snapshot?.stats?.relationships}
              />
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
              const scenarioCount = timeline.scenario_count || 0;
              const maxScenarios = isPremium ? Infinity : 5;
              if (scenarioCount >= maxScenarios && !isPremium) {
                alert('Free users can add up to 5 scenarios. Upgrade for unlimited.');
                return;
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  ageBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.4)',
  },
  ageText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C4B5FD',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
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
  statsTopRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#0EA5E9',
  },
  ageDisplay: {
    alignItems: 'center',
    gap: 2,
  },
  ageDisplayText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    lineHeight: 38,
  },
  ageDisplayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  primaryStats: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  primaryStatItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryStatTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  primaryStatLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '700',
    marginBottom: 2,
  },
  primaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    flexWrap: 'wrap',
  },
  deltaTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smallDeltaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  previousValueText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  statusBars: {
    gap: 12,
  },
  statBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statBarIcon: {
    width: 24,
    alignItems: 'center',
  },
  statBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statBarFillAnimated: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBarValueContainer: {
    width: 60,
    alignItems: 'flex-end',
    position: 'relative',
  },
  statBarValue: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  previousStatValue: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    textAlign: 'right',
  },
  deltaIndicator: {
    position: 'absolute',
    top: -20,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  netWorthContainer: {
    position: 'relative',
  },
  netWorthDelta: {
    position: 'absolute',
    top: -30,
    left: 0,
    zIndex: 10,
  },
  netWorthDeltaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  netWorthDeltaText: {
    fontSize: 13,
    fontWeight: '700',
  },
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
    fontSize: 13,
    color: '#888',
    width: '100%',
    paddingLeft: 12,
    lineHeight: 18,
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
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.4)',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  notificationEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#FFFFFF',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
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

