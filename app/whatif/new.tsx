import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Image, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { Button } from '@/components/Button';
import { ArrowLeft, ChevronRight, Lightbulb, GraduationCap, MapPin, Briefcase } from 'lucide-react-native';
import { insertWhatIf } from '@/lib/storage';
import { runWhatIf } from '@/lib/ai';
import { getProfile, getRelationships } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { computeScenarioAlignment } from '@/lib/relevance';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function NewWhatIfScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [whatIfText, setWhatIfText] = useState('');
  const [loading, setLoading] = useState(false);
  const scenarioInputRef = useRef<TextInput>(null);

  // Auto-focus input when screen loads
  useEffect(() => {
    const timer = setTimeout(() => {
      scenarioInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit() {
    if (!user || !whatIfText.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const baselineSummary = profile?.narrative_summary || 'No profile data available';
      const relationships = await getRelationships(user.id);
      
      // Extract current biometric values from profile
      const currentBiometrics: {
        location?: string | null;
        netWorth?: string | null;
        relationshipStatus?: string | null;
      } = {
        location: profile?.current_location || profile?.core_json?.city || null,
        netWorth: profile?.net_worth || null,
        relationshipStatus: profile?.core_json?.relationship_status || null,
      };
      
      // If user has a partner/spouse, override relationshipStatus to "in a relationship"
      const hasPartner = (relationships || []).some((r: any) => {
        const type = (r?.relationship_type || '').toLowerCase();
        return type === 'partner' || type === 'spouse';
      });
      if (hasPartner) {
        currentBiometrics.relationshipStatus = 'in a relationship';
      }
      
      // Debug: Log what baseline summary is being sent to AI
      console.log('===== WHAT-IF DEBUG =====');
      console.log('Current biometrics:', currentBiometrics);
      console.log('Baseline summary being sent to AI:');
      console.log(baselineSummary);
      console.log('========================');

      const result = await runWhatIf(baselineSummary, whatIfText, currentBiometrics);

      // Compute Scenario-specific Alignment Score (varies per What-If)
      let twinAlignmentScore: number | null = null;
      try {
        console.log('===== SCENARIO ALIGNMENT DEBUG =====');
        console.log('User ID:', user.id);
        twinAlignmentScore = await computeScenarioAlignment(user.id, result.summary, result.metrics, result.biometrics);
        console.log('Scenario Alignment Score:', twinAlignmentScore);
        console.log('====================================');
      } catch (e) {
        console.warn('Failed to compute scenario alignment:', e);
      }

      const whatIfData = await insertWhatIf(user.id, {
        counterfactual_type: 'general',
        payload: { question: whatIfText },
        metrics: result.metrics,
        summary: result.summary,
        biometrics: result.biometrics,
        twinAlignmentScore: twinAlignmentScore ?? undefined,
      });

      // Track what-if created
      trackEvent(MixpanelEvents.WHAT_IF_CREATED, {
        what_if_id: whatIfData.id,
        has_biometrics: !!result.biometrics
      });

      router.push(`/whatif/${whatIfData.id}`);
    } catch (error) {
      console.error('What-if error:', error);
      alert('Failed to process what-if scenario');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = whatIfText.trim();

  return (
    <View style={styles.screen}>
      <View style={styles.backgroundGradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Main Header */}
            <View style={styles.header}>
              <Text style={styles.greeting}>
                <Text style={styles.greetingRest}>What if?</Text>
              </Text>
              <Text style={styles.greetingSubtext}>See your alternate life</Text>
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Scenario Input */}
              <View style={styles.section}>
                <FloatingLabelInput
                  ref={scenarioInputRef}
                  label="Your scenario"
                  value={whatIfText}
                  onChangeText={setWhatIfText}
                  multiline
                  placeholder="What if I..."
                  returnKeyType="done"
                  containerStyle={styles.scenarioInput}
                  style={styles.scenarioInputText}
                />
              </View>

              {/* Example Scenarios */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Lightbulb size={18} color="rgba(135, 206, 250, 0.9)" />
                  <Text style={styles.sectionLabel}>Try these examples</Text>
                </View>

                <View style={styles.examplesGrid}>
                  <TouchableOpacity
                    style={styles.exampleCard}
                    onPress={() => setWhatIfText('What if I had studied engineering instead of my current major?')}
                    activeOpacity={0.7}
                  >
                    <BlurView intensity={20} tint="dark" style={styles.exampleCardBlur}>
                      <View style={styles.exampleIcon}>
                        <GraduationCap size={20} color="rgba(135, 206, 250, 0.9)" />
                      </View>
                      <View style={styles.exampleContent}>
                        <Text style={styles.exampleTitle}>Different major</Text>
                        <Text style={styles.exampleDesc}>Academic path</Text>
                      </View>
                      <ChevronRight size={18} color="rgba(200, 200, 200, 0.5)" />
                    </BlurView>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exampleCard}
                    onPress={() => setWhatIfText('What if I had stayed in my hometown instead of moving?')}
                    activeOpacity={0.7}
                  >
                    <BlurView intensity={20} tint="dark" style={styles.exampleCardBlur}>
                      <View style={styles.exampleIcon}>
                        <MapPin size={20} color="rgba(135, 206, 250, 0.9)" />
                      </View>
                      <View style={styles.exampleContent}>
                        <Text style={styles.exampleTitle}>Different location</Text>
                        <Text style={styles.exampleDesc}>Where you live</Text>
                      </View>
                      <ChevronRight size={18} color="rgba(200, 200, 200, 0.5)" />
                    </BlurView>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exampleCard}
                    onPress={() => setWhatIfText('What if I had started my own business instead of working a corporate job?')}
                    activeOpacity={0.7}
                  >
                    <BlurView intensity={20} tint="dark" style={styles.exampleCardBlur}>
                      <View style={styles.exampleIcon}>
                        <Briefcase size={20} color="rgba(135, 206, 250, 0.9)" />
                      </View>
                      <View style={styles.exampleContent}>
                        <Text style={styles.exampleTitle}>Career path</Text>
                        <Text style={styles.exampleDesc}>Professional choice</Text>
                      </View>
                      <ChevronRight size={18} color="rgba(200, 200, 200, 0.5)" />
                    </BlurView>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Floating Action Button */}
            <View style={styles.floatingButtonContainer}>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!canSubmit || loading}
                activeOpacity={0.9}
                style={[
                  styles.floatingButton,
                  (!canSubmit || loading) && styles.floatingButtonDisabled
                ]}
              >
                <LinearGradient
                  colors={canSubmit && !loading ? ['rgba(135, 206, 250, 0.1)', 'rgba(135, 206, 250, 0.05)'] : ['rgba(100, 100, 100, 0.5)', 'rgba(80, 80, 80, 0.5)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.floatingButtonGradient,
                    canSubmit && !loading && styles.floatingButtonActiveBorder
                  ]}
                >
                  <Image 
                    source={require('@/assets/images/cube.png')}
                    style={styles.cubeIcon}
                    resizeMode="contain"
                  />
                  <Text style={[
                    styles.floatingButtonText,
                    (!canSubmit || loading) && styles.floatingButtonTextDisabled
                  ]}>
                    {loading ? 'Exploring...' : 'Explore Timeline'}
                  </Text>
                  {!loading && (
                    <ChevronRight 
                      size={20} 
                      color={(!canSubmit || loading) ? "rgba(255,255,255,0.5)" : "#FFFFFF"} 
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
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
  container: {
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
  header: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
    fontFamily: Platform.select({ ios: 'System', android: 'Roboto' }),
    letterSpacing: -0.5,
  },
  greetingRest: {
    color: '#FFFFFF',
  },
  greetingSubtext: {
    color: '#999999',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  scenarioInput: {
    marginTop: 4,
  },
  scenarioInputText: {
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: -0.3,
    lineHeight: 28,
    minHeight: 28,
  },
  examplesGrid: {
    gap: 12,
  },
  exampleCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  exampleCardBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  exampleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleContent: {
    flex: 1,
    flexShrink: 1,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
    flexShrink: 1,
  },
  exampleDesc: {
    fontSize: 13,
    color: 'rgba(200, 200, 200, 0.6)',
    flexShrink: 1,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: '#050505',
  },
  floatingButton: {
    borderRadius: 24,
    overflow: 'visible',
    shadowColor: 'rgba(135, 206, 250, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  floatingButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  floatingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 24,
  },
  floatingButtonActiveBorder: {
    borderWidth: 1,
    borderColor: '#87CEFA',
  },
  floatingButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  floatingButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  cubeIcon: {
    width: 22,
    height: 22,
  },
});
