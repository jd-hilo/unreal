import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/useAuth';
import { FloatingLabelInput } from '@/components/FloatingLabelInput';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import { getProfile, updateProfileFields, refreshLifeSituationAfterIdentityUpdate, refreshDreamProgressAfterIdentityUpdate } from '@/lib/storage';
import { Colors, Fonts } from '@/constants/Theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { TwinUpdatingOverlay } from '@/components/TwinUpdatingOverlay';

export default function EditDreamSelfScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updatingTwin, setUpdatingTwin] = useState(false);
  
  const [dreamVision, setDreamVision] = useState({
    net_worth_goal: '',
    career_vision: '',
    dream_city: '',
    dream_home: '',
    relationship_status_goal: '',
    family_plans: '',
    health_goals: '',
    hobbies_interests: '',
    travel_plans: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      if (profile?.dream_vision) {
        setDreamVision({
          ...dreamVision,
          ...profile.dream_vision
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setInitialLoading(false);
    }
  }

  const updateField = (field: string, value: string) => {
    setDreamVision(prev => ({ ...prev, [field]: value }));
  };

  async function handleSave() {
    if (!user) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const profileBefore = await getProfile(user.id);
      await updateProfileFields(user.id, {
        dream_vision: dreamVision
      });

      const dreamSummaryParts = [
        dreamVision.career_vision && `career: ${dreamVision.career_vision}`,
        dreamVision.net_worth_goal && `net worth goal: ${dreamVision.net_worth_goal}`,
        dreamVision.dream_city && `dream city: ${dreamVision.dream_city}`,
        dreamVision.relationship_status_goal && `relationship goal: ${dreamVision.relationship_status_goal}`,
        dreamVision.health_goals && `health goals: ${dreamVision.health_goals}`,
      ].filter(Boolean).join('; ');
      setUpdatingTwin(true);
      try {
        if (dreamSummaryParts) await refreshLifeSituationAfterIdentityUpdate(user.id, 'Dream Self vision', dreamSummaryParts);
        await refreshDreamProgressAfterIdentityUpdate(user.id, profileBefore);
      } finally {
        setUpdatingTwin(false);
      }

      router.back();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) return null;

  return (
    <View style={styles.screen}>
      <TwinUpdatingOverlay visible={updatingTwin} />
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Dream Self</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            style={styles.content} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.introSection}>
              <Sparkles size={32} color="#A78BFA" />
              <View style={styles.titleContainer}>
                {'Refine Your Vision'.split('').map((char, index) => (
                  <Text key={index} style={styles.introTitle}>
                    {char === ' ' ? '\u00A0' : char}
                  </Text>
                ))}
              </View>
              <Text style={styles.introSubtitle}>Update your goals and aspirations. The Architect will adjust your path accordingly.</Text>
            </View>

            <View style={styles.form}>
              <FloatingLabelInput
                label="Goal Net Worth"
                value={dreamVision.net_worth_goal}
                onChangeText={(v) => updateField('net_worth_goal', v)}
                placeholder="e.g. $1M, Debt-free"
                containerStyle={styles.input}
              />
              <FloatingLabelInput
                label="Career Vision"
                value={dreamVision.career_vision}
                onChangeText={(v) => updateField('career_vision', v)}
                placeholder="e.g. CEO of my own company"
                multiline
                containerStyle={styles.input}
              />
              <FloatingLabelInput
                label="Goal City"
                value={dreamVision.dream_city}
                onChangeText={(v) => updateField('dream_city', v)}
                placeholder="e.g. New York, Tokyo"
                containerStyle={styles.input}
              />
              <FloatingLabelInput
                label="Dream Home"
                value={dreamVision.dream_home}
                onChangeText={(v) => updateField('dream_home', v)}
                placeholder="e.g. Modern villa with a pool"
                multiline
                containerStyle={styles.input}
              />
              <FloatingLabelInput
                label="Relationship Goal"
                value={dreamVision.relationship_status_goal}
                onChangeText={(v) => updateField('relationship_status_goal', v)}
                placeholder="e.g. Married, Long-term partner"
                containerStyle={styles.input}
              />
              <FloatingLabelInput
                label="Family Plans"
                value={dreamVision.family_plans}
                onChangeText={(v) => updateField('family_plans', v)}
                placeholder="e.g. 2 kids, living near parents"
                multiline
                containerStyle={styles.input}
              />
              <FloatingLabelInput
                label="Health Goals"
                value={dreamVision.health_goals}
                onChangeText={(v) => updateField('health_goals', v)}
                placeholder="e.g. Run a marathon, 10% body fat"
                multiline
                containerStyle={styles.input}
              />
              <FloatingLabelInput
                label="Hobbies & Interests"
                value={dreamVision.hobbies_interests}
                onChangeText={(v) => updateField('hobbies_interests', v)}
                placeholder="e.g. Surfing, learning piano"
                multiline
                containerStyle={styles.input}
              />
              <FloatingLabelInput
                label="Travel Plans"
                value={dreamVision.travel_plans}
                onChangeText={(v) => updateField('travel_plans', v)}
                placeholder="e.g. Visit every continent"
                multiline
                containerStyle={styles.input}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={handleSave}
              disabled={loading}
              style={({ pressed }) => [
                styles.saveButtonWrapper,
                loading && styles.saveButtonDisabled,
                !loading && {
                  transform: [{ translateY: pressed ? 4 : 0 }],
                  shadowOffset: { width: 0, height: pressed ? 0 : 4 },
                  shadowOpacity: 1,
                  shadowRadius: 0,
                  elevation: pressed ? 2 : 8,
                }
              ]}
            >
              <View style={[styles.saveButton, !loading && styles.saveButtonActive]}>
                {!loading && (
                  <LinearGradient
                    colors={['#25729f', '#62edb9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
                {!loading && <ChevronRight size={20} color="#FFFFFF" />}
              </View>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontSize: 18, fontFamily: Fonts.primary.regular, fontWeight: '700', color: Colors.textPrimary },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  introSection: { alignItems: 'center', marginBottom: 32 },
  titleContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, marginBottom: 8 },
  introTitle: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, fontFamily: Fonts.primary.regular },
  introSubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, fontFamily: Fonts.secondary.regular },
  form: { gap: 20 },
  input: { marginBottom: 0 },
  footer: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 20 : 24 },
  saveButtonWrapper: { borderRadius: 24, overflow: 'visible', shadowColor: 'rgba(0, 0, 0, 0.1)', elevation: 5 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 24, gap: 10, borderRadius: 24, overflow: 'hidden' },
  saveButtonActive: { shadowColor: 'rgba(0, 0, 0, 0.1)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16 },
  saveButtonDisabled: { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
  saveButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: Fonts.secondary.bold },
});
