import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { ChevronLeft, ChevronRight, Clock, Briefcase, Building2, DollarSign } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { Input } from '@/components/Input';

const { width } = Dimensions.get('window');

const TIME_HORIZONS = [
  { value: 5, label: '5 Years', desc: 'Near-term outlook', icon: '🎯' },
  { value: 10, label: '10 Years', desc: 'Mid-career view', icon: '🚀' },
  { value: 15, label: '15 Years', desc: 'Long-term vision', icon: '🔮' },
] as const;

export default function CareerSimSetup() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [timeHorizon, setTimeHorizon] = useState<5 | 10 | 15>(10);
  const [currentRole, setCurrentRole] = useState('');
  const [company, setCompany] = useState('');
  const [salary, setSalary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.core_json?.primary_role) {
        setCurrentRole(profile.core_json.primary_role);
      }
      if (profile?.current_location) {
        // Could pre-fill company if we had it
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, [user]);

  const handleTimeHorizonPress = useCallback((value: 5 | 10 | 15) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeHorizon(value);
  }, []);

  const handleRunSimulation = useCallback(() => {
    if (!currentRole.trim() || !company.trim() || !salary.trim()) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    // Navigate to result screen with parameters
    // For now, we'll default to "stay" path type
    router.push({
      pathname: '/career-sim/result',
      params: {
        timeHorizon: timeHorizon.toString(),
        currentRole,
        company,
        salary,
        pathType: 'stay',
      },
    });
  }, [currentRole, company, salary, timeHorizon, router]);

  const isFormValid = currentRole.trim() && company.trim() && salary.trim();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Career Simulation</Text>
            <View style={styles.headerRight} />
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Time Horizon Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Clock size={20} color={Colors.gradients.purple[1]} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Time Horizon</Text>
              </View>
              <Text style={styles.sectionDesc}>How far into the future would you like to simulate?</Text>
              
              <View style={styles.timeHorizonGrid}>
                {TIME_HORIZONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timeCard,
                      timeHorizon === option.value && styles.timeCardSelected
                    ]}
                    onPress={() => handleTimeHorizonPress(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.timeCardEmoji}>{option.icon}</Text>
                    <Text style={[
                      styles.timeCardLabel,
                      timeHorizon === option.value && styles.timeCardLabelSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.timeCardDesc}>{option.desc}</Text>
                    {timeHorizon === option.value && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Current State Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Briefcase size={20} color={Colors.gradients.purple[1]} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Your Current State</Text>
              </View>
              <Text style={styles.sectionDesc}>Tell us about your current position</Text>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <Briefcase size={18} color={Colors.textSecondary} strokeWidth={2} />
                  </View>
                  <Input
                    placeholder="Current Role (e.g., Senior Software Engineer)"
                    value={currentRole}
                    onChangeText={setCurrentRole}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    style={styles.input}
                    containerStyle={styles.inputContainer}
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <Building2 size={18} color={Colors.textSecondary} strokeWidth={2} />
                  </View>
                  <Input
                    placeholder="Company (e.g., TechCorp)"
                    value={company}
                    onChangeText={setCompany}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    style={styles.input}
                    containerStyle={styles.inputContainer}
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <DollarSign size={18} color={Colors.textSecondary} strokeWidth={2} />
                  </View>
                  <Input
                    placeholder="Current Salary (e.g., 150000)"
                    value={salary}
                    onChangeText={setSalary}
                    keyboardType="numeric"
                    returnKeyType="done"
                    style={styles.input}
                    containerStyle={styles.inputContainer}
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                We'll simulate your career trajectory based on industry data, typical progression patterns, and realistic assumptions.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.runButton}
              onPress={handleRunSimulation}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={!isFormValid || loading ? ['#999', '#AAA'] : Colors.gradients.purple}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.runGradient}
              >
                <Text style={styles.runText}>
                  {loading ? 'Running...' : 'Run Simulation'}
                </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.primary.regular,
    color: Colors.textPrimary,
  },
  sectionDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginBottom: 20,
    lineHeight: 20,
  },
  timeHorizonGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  timeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  timeCardSelected: {
    borderColor: Colors.gradients.purple[1],
    backgroundColor: 'rgba(192, 132, 252, 0.02)',
  },
  timeCardEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  timeCardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 4,
  },
  timeCardLabelSelected: {
    color: Colors.gradients.purple[1],
  },
  timeCardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gradients.purple[1],
  },
  inputGroup: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 16,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 0,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 0,
    fontFamily: Fonts.secondary.regular,
  },
  infoBox: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.2)',
  },
  infoBoxText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    backgroundColor: 'transparent',
  },
  runButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  runGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    paddingHorizontal: 24,
    gap: 8,
  },
  runText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});
