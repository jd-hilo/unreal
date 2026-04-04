import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { DollarSign, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { ProgressBar } from '@/components/ProgressBar';
import * as Haptics from 'expo-haptics';

export default function SalaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [salary, setSalary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.salary) {
      setSalary(params.salary as string);
    }
  }, [params.salary]);

  const handleNext = async () => {
    setLoading(true);
    const salaryVal = salary.trim() || '100000'; // Placeholder when skipped
    router.push({
      pathname: '/career-sim/generating',
      params: {
        timeHorizon: params.timeHorizon as string,
        currentRole: params.currentRole as string,
        company: params.company as string,
        salary: salaryVal,
        pathType: 'stay',
        isStudent: params.isStudent || 'false',
        ...(params.grade && { grade: params.grade }),
        ...(params.school && { school: params.school }),
        ...(params.studying && { studying: params.studying }),
      },
    });
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
              <ProgressBar progress={1.0} showLabel={false} height={4} gradientColors={['#25729f', '#62edb9']} trackColor="rgba(0,0,0,0.05)" />
            </View>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>Your Current Salary</Text>
              <Text style={styles.subtitle}>What is your current annual salary? (optional)</Text>
            </View>

            {/* Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <DollarSign size={18} color={Colors.textSecondary} strokeWidth={2} />
              </View>
              <TextInput
                placeholder="Current Salary (e.g., 150000) — or skip"
                value={salary}
                onChangeText={setSalary}
                keyboardType="number-pad"
                returnKeyType="done"
                style={styles.input}
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                We'll simulate your career trajectory based on industry data, typical progression patterns, and realistic assumptions. Skip if you prefer not to share.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Button */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.nextButton, loading && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#999', '#AAA'] : ['#25729f', '#62edb9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.nextButtonGradient}
              >
                {loading ? (
                  <Text style={styles.nextButtonText}>Running...</Text>
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>Run Simulation</Text>
                    <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </>
                )}
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 16,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 0,
    fontFamily: Fonts.secondary.regular,
  },
  infoBox: {
    backgroundColor: 'rgba(37, 114, 159, 0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 114, 159, 0.1)',
  },
  infoBoxText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 20,
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
