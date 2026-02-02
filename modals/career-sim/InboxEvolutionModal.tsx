import React, { memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { X, Square, Star, Paperclip, Search, Menu, Edit3, Archive, Trash2, Mail, ChevronRight, Inbox, Clock, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/Theme';
import type { InboxData, InboxEmail } from '@/lib/career-sim/types';
import { LinearGradient } from 'expo-linear-gradient';

interface InboxEvolutionModalProps {
  visible: boolean;
  onClose: () => void;
  inboxData: InboxData;
}

interface EmailItemProps {
  email: InboxEmail;
}

const EmailItem = memo(({ email }: EmailItemProps) => (
  <View style={[styles.emailItem, email.unread && styles.emailUnread]}>
    <View style={styles.avatarCircle}>
      <Text style={styles.avatarInitial}>{email.sender.charAt(0)}</Text>
    </View>
    <View style={styles.emailContent}>
      <View style={styles.emailHeaderRow}>
        <Text style={[styles.emailSender, email.unread && styles.textBold]} numberOfLines={1}>
          {email.sender}
        </Text>
        <Text style={[styles.emailTime, email.unread && styles.textUnreadPurple]}>{email.time}</Text>
      </View>
      <Text style={[styles.emailSubject, email.unread && styles.textBold]} numberOfLines={1}>
        {email.subject}
      </Text>
      <View style={styles.emailFooterRow}>
        <Text style={styles.emailSnippet} numberOfLines={1}>
          Click to see the full message and attachments...
        </Text>
        {email.important && (
          <Star size={14} color="#FFD700" fill="#FFD700" />
        )}
      </View>
    </View>
  </View>
));

EmailItem.displayName = 'EmailItem';

interface InboxViewComponentProps {
  year: number;
  emails: InboxEmail[];
  filteredCount?: number;
}

const InboxViewComponent = memo(({ year, emails, filteredCount }: InboxViewComponentProps) => (
  <View style={styles.inboxView}>
    <View style={styles.inboxHeader}>
      <View style={styles.yearBadge}>
        <Text style={styles.yearLabel}>{year}</Text>
      </View>
      <View style={styles.unreadBadge}>
        <Text style={styles.inboxCount}>
          {emails.filter(e => e.unread).length} UNREAD
        </Text>
      </View>
    </View>
    <View style={styles.emailList}>
      {emails.map((email, index) => (
        <EmailItem key={index} email={email} />
      ))}
      {filteredCount && filteredCount > 0 && (
        <LinearGradient
          colors={['rgba(16, 185, 129, 0.05)', 'rgba(16, 185, 129, 0.1)']}
          style={styles.filteredBanner}
        >
          <Zap size={14} color="#10B981" />
          <Text style={styles.filteredText}>
            {filteredCount} low-priority emails auto-archived by AI
          </Text>
        </LinearGradient>
      )}
    </View>
  </View>
));

InboxViewComponent.displayName = 'InboxViewComponent';

function InboxEvolutionModalComponent({ visible, onClose, inboxData }: InboxEvolutionModalProps) {
  // Provide default values if inboxData is missing
  const safeInboxData = inboxData || {
    current: {
      year: 2026,
      emails: [],
    },
    future: {
      year: 2032,
      emails: [],
    },
    stats: {
      responseTime: { current: '2 hours', future: '30 minutes' },
      stressLevel: { current: 'Low', future: 'Medium' },
    },
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Outlook/Gmail Style Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} style={styles.toolbarButton}>
            <X size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textTertiary} />
            <Text style={styles.searchText}>Search in mail</Text>
          </View>
          <View style={styles.profileCircle}>
            <Text style={styles.profileInitial}>Y</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.introSection}>
            <Text style={styles.introTitle}>Communication Fatigue</Text>
            <Text style={styles.introSubtitle}>How your digital noise scales with your success</Text>
          </View>

          {/* Current Inbox */}
          <InboxViewComponent 
            year={safeInboxData.current?.year ?? 2026}
            emails={safeInboxData.current?.emails ?? []}
          />

          <View style={styles.evolutionDivider}>
            <View style={styles.dividerLine} />
            <View style={styles.evolutionIcon}>
              <Clock size={20} color={Colors.textTertiary} />
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* Future Inbox */}
          <InboxViewComponent 
            year={safeInboxData.future?.year ?? 2032}
            emails={safeInboxData.future?.emails ?? []}
            filteredCount={safeInboxData.future?.filteredCount}
          />

          {/* Stats Comparison */}
          <View style={styles.statsContainer}>
            <View style={styles.statsHeader}>
              <Inbox size={18} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
              <Text style={styles.statsTitleText}>INBOX METRICS</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>AVG RESPONSE TIME</Text>
                <View style={styles.statValues}>
                  <Text style={styles.statCurrent}>{safeInboxData.stats?.responseTime?.current ?? '2 hours'}</Text>
                  <ChevronRight size={14} color={Colors.textTertiary} />
                  <Text style={styles.statFuture}>{safeInboxData.stats?.responseTime?.future ?? '30 minutes'}</Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>EMAIL STRESS LEVEL</Text>
                <View style={styles.statValues}>
                  <Text style={styles.statCurrent}>{safeInboxData.stats?.stressLevel?.current ?? 'Low'}</Text>
                  <ChevronRight size={14} color={Colors.textTertiary} />
                  <Text style={styles.statFuture}>{safeInboxData.stats?.stressLevel?.future ?? 'Medium'}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.footerSpacing} />
        </ScrollView>

        {/* Compose FAB */}
        <TouchableOpacity style={styles.fab}>
          <LinearGradient
            colors={Colors.gradients.purple}
            style={styles.fabGradient}
          >
            <Edit3 size={24} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.fabText}>Compose</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export const InboxEvolutionModal = memo(InboxEvolutionModalComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  toolbarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchText: {
    fontSize: 15,
    color: '#5F6368',
  },
  profileCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  introSection: {
    padding: 24,
    paddingBottom: 0,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  inboxView: {
    padding: 16,
    marginTop: 16,
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  yearBadge: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.bold,
  },
  unreadBadge: {
    backgroundColor: '#FCE8E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  inboxCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D93025',
    letterSpacing: 0.5,
  },
  emailList: {
    gap: 1,
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F3F4',
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  emailUnread: {
    backgroundColor: '#FFFFFF',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5F6368',
  },
  emailContent: {
    flex: 1,
  },
  emailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  emailSender: {
    fontSize: 15,
    color: '#202124',
    fontFamily: Fonts.secondary.regular,
    flex: 1,
    marginRight: 8,
  },
  emailTime: {
    fontSize: 12,
    color: '#5F6368',
    fontFamily: Fonts.secondary.regular,
  },
  emailSubject: {
    fontSize: 14,
    color: '#202124',
    fontFamily: Fonts.secondary.regular,
    marginBottom: 2,
  },
  emailFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailSnippet: {
    fontSize: 13,
    color: '#5F6368',
    fontFamily: Fonts.secondary.regular,
    flex: 1,
  },
  textBold: {
    fontWeight: '700',
    color: '#000000',
  },
  textUnreadPurple: {
    color: Colors.gradients.purple[1],
    fontWeight: '700',
  },
  filteredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  filteredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    fontFamily: Fonts.secondary.bold,
    flex: 1,
  },
  evolutionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F3F4',
  },
  evolutionIcon: {
    paddingHorizontal: 16,
  },
  statsContainer: {
    margin: 24,
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  statsTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  statValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCurrent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statFuture: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.gradients.purple[1],
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.secondary.bold,
  },
  footerSpacing: {
    height: 100,
  },
});
