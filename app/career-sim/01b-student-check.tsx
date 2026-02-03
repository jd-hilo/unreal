import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { ProgressBar } from '@/components/ProgressBar';

export default function StudentCheckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isStudent, setIsStudent] = useState<boolean | null>(null);

  const handleSelect = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsStudent(value);
  };

  const handleNext = () => {
    if (isStudent === null) return;
    
    if (isStudent) {
      // Navigate to student details screen
      router.push({
        pathname: '/career-sim/01c-student-details',
        params: {
          timeHorizon: params.timeHorizon as string,
          isStudent: 'true',
        },
      });
    } else {
      // Skip to current role screen
      router.push({
        pathname: '/career-sim/02-current-role',
        params: {
          timeHorizon: params.timeHorizon as string,
          isStudent: 'false',
        },
      });
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
            <View style={styles.progressBarContainer}>
              <ProgressBar progress={0.33} showLabel={false} height={4} gradientColors={['#25729f', '#62edb9']} trackColor="rgba(0,0,0,0.05)" />
            </View>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>Are you a student?</Text>
              <Text style={styles.subtitle}>This helps us provide more accurate career simulations</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsGrid}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  isStudent === true && styles.optionCardSelected
                ]}
                onPress={() => handleSelect(true)}
                activeOpacity={0.9}
              >
                {/* 3D Edge Effects */}
                <View style={styles.cardEdgeTop} />
                <View style={styles.cardEdgeLeft} />
                <View style={styles.cardEdgeRight} />
                <View style={styles.cardEdgeBottom} />
                
                <View style={styles.cardInner}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F8F7FF']}
                    style={styles.cardBackground}
                  />
                  
                  <View style={styles.cardContent}>
                    <Text style={[
                      styles.optionLabel,
                      isStudent === true && styles.optionLabelSelected
                    ]}>
                      Yes, I'm a student
                    </Text>
                    
                    {isStudent === true && (
                      <View style={styles.selectedIndicator}>
                        <View style={styles.selectedDot} />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  isStudent === false && styles.optionCardSelected
                ]}
                onPress={() => handleSelect(false)}
                activeOpacity={0.9}
              >
                {/* 3D Edge Effects */}
                <View style={styles.cardEdgeTop} />
                <View style={styles.cardEdgeLeft} />
                <View style={styles.cardEdgeRight} />
                <View style={styles.cardEdgeBottom} />
                
                <View style={styles.cardInner}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F8F7FF']}
                    style={styles.cardBackground}
                  />
                  
                  <View style={styles.cardContent}>
                    <Text style={[
                      styles.optionLabel,
                      isStudent === false && styles.optionLabelSelected
                    ]}>
                      No, I'm working
                    </Text>
                    
                    {isStudent === false && (
                      <View style={styles.selectedIndicator}>
                        <View style={styles.selectedDot} />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.nextButton, isStudent === null && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={isStudent === null}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isStudent === null ? ['#999', '#AAA'] : ['#25729f', '#62edb9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    marginTop: 5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 22,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    position: 'relative',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 200,
  },
  cardEdgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 10,
  },
  cardEdgeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
    zIndex: 10,
  },
  cardEdgeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
  },
  cardEdgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 10,
  },
  cardInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  optionCardSelected: {
    shadowOpacity: 0.2,
    shadowColor: '#8B5CF6',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: Colors.textPrimary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#25729f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 36,
    backgroundColor: 'transparent',
  },
  nextButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#25729f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});
