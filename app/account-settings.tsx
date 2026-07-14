import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ArrowLeft, Sparkles, Bell, Mail, Info, LogOut, Trash2, ChevronRight } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';
import { deleteAccountData } from '@/lib/storage';
import { resetDecisionGuide } from '@/lib/guideStorage';
import { trackEvent } from '@/lib/mixpanel';
import { Colors, Fonts } from '@/constants/Theme';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { isPremium } = useTwin();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        useTwin.getState().checkPremiumStatus(user.id);
      }
      Notifications.getPermissionsAsync().then(({ status }) => {
        setNotificationsEnabled(status === 'granted');
      });
    }, [user?.id])
  );

  async function handleSendFeedback() {
    try {
      const url = 'mailto:jd@hilo.media?subject=mora App Feedback';
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else Alert.alert('Error', 'Unable to open email app');
    } catch (error) {
      console.error('Failed to open email:', error);
      Alert.alert('Error', 'Unable to open email app');
    }
  }

  async function handleShowProductGuide() {
    try {
      await resetDecisionGuide();
      trackEvent('Product Guide Replayed');
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Failed to reset product guide:', error);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    Alert.alert(
      'Delete Account',
      'This will permanently remove your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccountData(user.id);
              await signOut();
              router.replace('/auth');
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  }

  async function handleNotificationsPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      Alert.alert('Notifications Enabled', "You're already receiving daily reminders at 8am.");
      return;
    }
    if (status === 'denied') {
      await Linking.openURL('app-settings:');
      return;
    }
    if (user) {
      const { registerForPushNotifications } = await import('@/lib/notifications');
      await registerForPushNotifications(user.id);
      const { status: newStatus } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(newStatus === 'granted');
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.editorialBlockTight}>
            <Text style={styles.editorialKicker}>App</Text>
            <Text style={styles.editorialHeadline}>Account</Text>
            <Text style={styles.editorialLead}>Billing, notifications, and session controls.</Text>
          </View>

          <View style={styles.cardContainer}>
            <TouchableOpacity
              onPress={() => router.push('/premium-onboarding' as any)}
              style={[styles.rowCard, styles.rowCardFirst, styles.rowCardBorder]}
            >
              <View style={styles.rowIcon}>
                <Sparkles size={20} color={isPremium ? '#FFD700' : Colors.textPrimary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>mora+</Text>
                <Text style={styles.rowSubtitle}>{isPremium ? 'Active' : 'View plans'}</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNotificationsPress} style={[styles.rowCard, styles.rowCardBorder]}>
              <View style={styles.rowIcon}>
                <Bell size={20} color={notificationsEnabled ? '#25729f' : '#F59E0B'} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Notifications</Text>
                <Text style={[styles.rowSubtitle, !notificationsEnabled && { color: '#F59E0B' }]}>
                  {notificationsEnabled === null
                    ? 'Checking...'
                    : notificationsEnabled
                      ? 'Enabled'
                      : 'Tap to enable in Settings'}
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendFeedback} style={[styles.rowCard, styles.rowCardBorder]}>
              <View style={styles.rowIcon}>
                <Mail size={20} color={Colors.textPrimary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Send Feedback</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShowProductGuide} style={[styles.rowCard, styles.rowCardBorder]}>
              <View style={styles.rowIcon}>
                <Info size={20} color={Colors.textPrimary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Product Guide</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut} style={[styles.rowCard, styles.rowCardBorder]}>
              <View style={styles.rowIcon}>
                <LogOut size={20} color={Colors.textPrimary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Sign Out</Text>
              </View>
              <ChevronRight size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteAccount} style={[styles.rowCard, styles.rowCardLast]}>
              <View style={styles.rowIcon}>
                <Trash2 size={20} color="#EF4444" />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Delete Account</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary.regular,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  editorialBlockTight: { marginBottom: 14, paddingHorizontal: 4, marginTop: 8 },
  editorialKicker: {
    fontSize: 11,
    fontFamily: Fonts.secondary.bold,
    letterSpacing: 1.2,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  editorialHeadline: {
    fontSize: 26,
    fontFamily: Fonts.primary.regular,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 32,
    marginBottom: 10,
  },
  editorialLead: {
    fontSize: 15,
    fontFamily: Fonts.secondary.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  rowCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF' },
  rowCardFirst: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  rowCardLast: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  rowCardBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  rowIcon: { width: 32, alignItems: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontFamily: Fonts.secondary.bold, fontWeight: '600', color: Colors.textPrimary },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.secondary.regular,
    fontWeight: '300',
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
