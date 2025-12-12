import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Dimensions, Platform, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Book, Smile, DollarSign, Calendar } from 'lucide-react-native';
import { getProfile } from '@/lib/storage';
import { Card, CardTitle, CardContent } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';

interface ProductGuideProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
  targetCardLayout?: { x: number; y: number; width: number; height: number };
  whatIfCardLayout?: { x: number; y: number; width: number; height: number };
  journalCardLayout?: { x: number; y: number; width: number; height: number };
  twinCardLayout?: { x: number; y: number; width: number; height: number };
  userId?: string;
  onStepChange?: (step: number) => void;
}

const { width, height } = Dimensions.get('window');

export function ProductGuide({ 
  visible, 
  onDismiss, 
  onComplete, 
  onStepChange,
  targetCardLayout,
  whatIfCardLayout,
  journalCardLayout,
  twinCardLayout,
  userId
}: ProductGuideProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState('Friend');
  const [topValue, setTopValue] = useState('your values');
  const [hometown, setHometown] = useState('your hometown');
  
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  
  // Calculate available height accounting for safe areas
  // We'll use the full screen height for positioning calculations to avoid confusion
  const screenHeight = height;

  const steps = [
    {
      id: 'decision',
      title: "Make Better Decisions",
      renderContent: () => (
        <View style={styles.visualContentContainer}>
          <Card style={{ padding: 12 }}>
            <CardContent>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Should I quit my job?</Text>
                  <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                    Based on your value of freedom, this aligns with your long-term goals.
                  </Text>
                </View>
                <View style={{ width: 100, gap: 6, justifyContent: 'center' }}>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: '#4ADE80' }}>Yes</Text>
                      <Text style={{ fontSize: 11, color: '#4ADE80' }}>85%</Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: 'rgba(74, 222, 128, 0.2)', borderRadius: 2 }}>
                      <View style={{ width: '85%', height: '100%', backgroundColor: '#4ADE80', borderRadius: 2 }} />
                    </View>
                  </View>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, color: '#EF4444' }}>No</Text>
                      <Text style={{ fontSize: 11, color: '#EF4444' }}>15%</Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: 2 }}>
                      <View style={{ width: '15%', height: '100%', backgroundColor: '#EF4444', borderRadius: 2 }} />
                    </View>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      ),
      layout: targetCardLayout,
      icon: require('@/assets/images/compass.png'),
      cardTitle: "Decide",
      cardSubtitle: "Make a choice, simulate the outcomes"
    },
    {
      id: 'whatif',
      title: "See Your Alternate Life",
      renderContent: () => (
        <View style={styles.visualContentContainer}>
          <Card style={{ padding: 12 }}>
            <CardContent>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 }}>
                What if I moved to NYC?
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 215, 0, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Smile size={16} color="#FFD700" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Happiness</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFD700' }}>+12%</Text>
                  </View>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(74, 222, 128, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={16} color="#4ADE80" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Net Worth</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#4ADE80' }}>$1.2M</Text>
                  </View>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      ),
      layout: whatIfCardLayout,
      icon: require('@/assets/images/star.png'),
      cardTitle: "Explore",
      cardSubtitle: "See your alternate life"
    },
    {
      id: 'journal',
      title: "Stay in Sync",
      renderContent: () => (
         <View style={styles.visualContentContainer}>
            <Card style={{ padding: 12 }}>
              <CardContent>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Calendar size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Today, 9:41 AM</Text>
                  </View>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(135, 206, 250, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Smile size={16} color="#87CEFA" />
                  </View>
                </View>
                <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', lineHeight: 20 }}>
                  "Feeling excited about the new project at work today. It aligns perfectly with my goal to prioritize {topValue.toLowerCase()}..."
                </Text>
              </CardContent>
            </Card>
         </View>
      ),
      layout: journalCardLayout,
      isIconComponent: true,
      IconComponent: Book,
      cardTitle: "Journal",
      cardSubtitle: "Daily reflection"
    },
    {
      id: 'twin',
      title: "Train Your Twin",
      renderContent: () => (
        <View style={styles.visualContentContainer}>
          <Card style={{ padding: 12 }}>
            <CardContent>
              <View style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Twin Accuracy</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#87CEFA' }}>85%</Text>
                </View>
                <ProgressBar progress={0.85} gradientColors={['#87CEFA', '#5CA8FF', '#87CEFA']} height={8} showLabel={false} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, color: '#FFFFFF' }}>Values ✓</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, color: '#FFFFFF' }}>Personality ✓</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, color: '#FFFFFF' }}>Goals ✓</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      ),
      layout: twinCardLayout,
      icon: require('@/assets/images/cube.png'),
      cardTitle: "My Twin",
      cardSubtitle: "Training..."
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    async function loadUserProfile() {
      if (!userId) return;
      try {
        const profile = await getProfile(userId);
        if (profile) {
          if (profile.first_name) setFirstName(profile.first_name);
          
          // Try to get hometown
          const responses = profile.core_json?.onboarding_responses || {};
          const userHometown = profile.hometown || responses.hometown || responses['00-birth-place']; // Fallback keys
          if (userHometown) setHometown(userHometown);

          // Try to get top value
          // First check values_json array
          if (profile.values_json && Array.isArray(profile.values_json) && profile.values_json.length > 0) {
             setTopValue(profile.values_json[0]);
          } 
          // Then check onboarding responses text
          else if (responses['01-values']) {
             // If it's a comma separated string, take the first one
             const firstVal = responses['01-values'].split(',')[0].trim();
             if (firstVal) setTopValue(firstVal);
          }
        }
      } catch (error) {
        console.log('Failed to load profile for guide:', error);
      }
    }
    
    if (visible) {
      loadUserProfile();
    }
  }, [userId, visible]);

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 400 });
      startStepAnimation();
    } else {
      overlayOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      startStepAnimation();
    }
  }, [currentStep]);

  const startStepAnimation = () => {
    // Reset values
    cardScale.value = 1;
    textOpacity.value = 0;
    textTranslateY.value = 20;

    // Animate card pulse
    cardScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Animate text in
    textOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    textTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  // If layout is missing, fallback to center or skip (for safety)
  const layout = currentStepData.layout || { x: width / 2 - 80, y: height / 2 - 100, width: 160, height: 180 };
  
  // Adjust vertical position to align perfectly with home screen elements
  // Subtracting a small offset to account for potential status bar/safe area discrepancies
  const verticalOffset = Platform.OS === 'ios' ? 48 : 0;
  const adjustedY = layout.y - verticalOffset;

  // Determine text position (above or below card) accounting for safe areas
  // Steps 3 and 4 (journal, twin) should always show text above the card
  const isJournalOrTwinStep = currentStep === 2 || currentStep === 3;
  const isTopHalf = adjustedY < screenHeight / 2;
  
  // Safe area padding - ensure enough space for button and content
  // On iPhone 16/new devices, bottom inset might be small but curve is large
  // Reduced from 120 to 60 to allow more space and avoid scrolling
  const bottomSafeArea = Math.max(insets.bottom, 34) + 60; 
  const topSafeArea = Math.max(insets.top, 47) + 24;
  
  // For journal and twin steps, always position text above the card
  // For other steps, use normal logic (text below if card is in top half, above if in bottom half)
  const shouldPositionAbove = isJournalOrTwinStep || !isTopHalf;
  
  // Calculate card boundaries
  const cardBottom = adjustedY + layout.height;
  const cardTop = adjustedY;
  
  // Maximum height for text container - ensure it fits on screen
  const maxTextHeight = Math.min(screenHeight * 0.65, screenHeight - topSafeArea - bottomSafeArea);
  
  let textPosition: { top?: number; bottom?: number; maxHeight?: number };
  
  if (shouldPositionAbove) {
    // Position above card - prioritize fitting on screen over perfect alignment
    const idealBottom = screenHeight - cardTop + 16; // Position so bottom of text is 16px above card top
    const minBottom = bottomSafeArea; // Minimum distance from bottom of screen
    
    // Calculate if ideal position would cause overflow
    const spaceAbove = cardTop - topSafeArea;
    // We check if we have enough space above the card for the text
    // OR if the calculated bottom position is too low (meaning card is too low?)
    // Actually idealBottom being small means card is low (high y). idealBottom being large means card is high.
    // We only care if the text fits in spaceAbove.
    
    const fitsAbove = spaceAbove >= 200; // Minimal viable height
    
    if (fitsAbove) {
       // It fits above. Check if we can align with card or need to stick to safe area.
       // We prefer aligning with card (idealBottom).
       // But if idealBottom is smaller than minBottom (card is extremely low), 
       // then the text container would be pushed down into safe area.
       // However, since we are positioning ABOVE the card, if the card is very low, idealBottom is SMALL.
       // wait: idealBottom = screenHeight - cardTop + 24.
       // If card is at bottom (cardTop is large), idealBottom is small.
       // If cardTop is at 800, screen is 900. idealBottom = 900 - 800 + 24 = 124.
       // If minBottom is 150. Then idealBottom < minBottom. 
       // This means the bottom of the text container would be at 124px from screen bottom.
       // But we want it at least 150px from screen bottom.
       // So we should take max(idealBottom, minBottom).
       
       textPosition = {
         bottom: Math.max(idealBottom, minBottom),
         maxHeight: Math.min(maxTextHeight, spaceAbove)
       };
    } else {
       // Doesn't fit above nicely.
       // Fallback: Check if we can put it below or just force it to fit somewhere.
       // If we force it above, we might overlap the card or go into top safe area.
       
       // Let's try to fit it on screen regardless of card position
       textPosition = {
         bottom: minBottom,
         maxHeight: maxTextHeight
       };
    }
  } else {
    // Position below card
    const idealTop = cardBottom + 16;
    const spaceBelow = screenHeight - idealTop - bottomSafeArea;
    
    if (spaceBelow >= 200) {
       textPosition = {
         top: idealTop,
         maxHeight: Math.min(maxTextHeight, spaceBelow)
       };
    } else {
       // Doesn't fit below. Try above?
       const spaceAbove = cardTop - topSafeArea;
       if (spaceAbove > spaceBelow && spaceAbove >= 200) {
          textPosition = {
             bottom: Math.max(screenHeight - cardTop + 16, bottomSafeArea),
             maxHeight: Math.min(maxTextHeight, spaceAbove)
          };
       } else {
          // Just center it vertically or put it at safe bottom
          textPosition = {
             bottom: bottomSafeArea,
             maxHeight: maxTextHeight
          };
       }
    }
  }
  
  // Final safety check - ensure maxHeight is reasonable
  if (textPosition.maxHeight && textPosition.maxHeight < 200) {
    textPosition.maxHeight = 200; // Minimum height to show content
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        {/* Dark Overlay */}
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.dimmer} />
        </Animated.View>

        {/* Highlighted Card Clone */}
        <Animated.View 
          style={[
            styles.cardCloneWrapper,
            {
              left: layout.x,
              top: adjustedY,
              width: layout.width,
              height: layout.height,
              zIndex: 10,
            },
            cardAnimatedStyle
          ]}
        >
           <View style={styles.cardClone}>
              <BlurView intensity={80} tint="dark" style={styles.cardBlur}>
                 <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                       {currentStepData.isIconComponent && currentStepData.IconComponent ? (
                          <currentStepData.IconComponent size={24} color="#FFFFFF" strokeWidth={1.5} />
                       ) : (
                          <Image 
                            source={currentStepData.icon}
                            style={styles.iconImage}
                            resizeMode="contain"
                          />
                       )}
                    </View>
                    <Text style={styles.cardTitle}>{currentStepData.cardTitle}</Text>
                    <Text style={styles.cardSubtitle}>{currentStepData.cardSubtitle}</Text>
                 </View>
              </BlurView>
              {/* Glow effect */}
              <LinearGradient
                colors={['rgba(135, 206, 250, 0.15)', 'transparent']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
              />
           </View>
        </Animated.View>

        {/* Guide Text & Controls */}
        <Animated.View style={[styles.textContainer, textPosition, textAnimatedStyle]}>
           <ScrollView 
             style={styles.scrollContainer}
             contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}
             showsVerticalScrollIndicator={false}
             bounces={true}
             nestedScrollEnabled={true}
             keyboardShouldPersistTaps="handled"
           >
             <BlurView intensity={80} tint="dark" style={styles.textBubble}>
                <View style={styles.headerRow}>
                  {currentStepData.isIconComponent && currentStepData.IconComponent ? (
                    <currentStepData.IconComponent size={18} color="#87CEFA" strokeWidth={1.5} />
                  ) : currentStepData.icon ? (
                    <Image 
                      source={currentStepData.icon}
                      style={styles.headerIcon}
                      resizeMode="contain"
                    />
                  ) : null}
                  <Text style={styles.guideTitle}>{currentStepData.title}</Text>
                </View>
                
                {currentStepData.renderContent ? (
                  currentStepData.renderContent()
                ) : (
                  <Text style={styles.guideDescription}>{(currentStepData as any).description || ''}</Text>
                )}
                
                <View style={styles.footer}>
                  <View style={styles.indicators}>
                    {steps.map((_, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.dot, 
                          index === currentStep && styles.dotActive
                        ]} 
                      />
                    ))}
                  </View>

                  <TouchableOpacity 
                    style={styles.nextButton}
                    onPress={handleNext}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.nextText}>{isLastStep ? 'Get Started' : 'Next'}</Text>
                    {!isLastStep && <ChevronRight size={14} color="#000" />}
                  </TouchableOpacity>
                </View>
             </BlurView>
           </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  cardCloneWrapper: {
    position: 'absolute',
    borderRadius: 32,
  },
  cardClone: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  cardBlur: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginBottom: 16,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  iconImage: {
    width: 48,
    height: 48,
  },
  visualContentContainer: {
    marginVertical: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 24,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
  },
  textContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    maxHeight: '80%',
  },
  scrollContainer: {
    width: '100%',
    maxWidth: 400,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  textBubble: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
    overflow: 'hidden',
    minHeight: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerIcon: {
    width: 18,
    height: 18,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  guideDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
  },
  indicators: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#87CEFA',
    width: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#87CEFA',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 4,
  },
  nextText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
