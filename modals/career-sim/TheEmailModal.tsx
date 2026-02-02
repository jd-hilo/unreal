import React, { memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { X, Star, Reply, Forward, Archive, MoreVertical, ShieldCheck, Mail, Search, Menu, Trash2, Folder, Tag, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/Theme';
import type { EmailData } from '@/lib/career-sim/types';
import { LinearGradient } from 'expo-linear-gradient';

interface TheEmailModalProps {
  visible: boolean;
  onClose: () => void;
  emailData: EmailData;
}

function TheEmailModalComponent({ visible, onClose, emailData }: TheEmailModalProps) {
  // Provide safe defaults if emailData is missing
  const safeEmailData = emailData || {
    from: 'recruiter@company.com',
    to: 'you@email.com',
    subject: 'Exciting Opportunity',
    timestamp: 'March 10, 2032 2:30 PM',
    body: 'Email body content is being generated...',
    metadata: {
      folder: 'Opportunities',
      timesOpened: 1,
      lastUpdate: 'March 12, 2032',
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
        {/* Gmail Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} style={styles.toolbarButton}>
            <X size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.toolbarActions}>
            <TouchableOpacity style={styles.toolbarButton}>
              <Archive size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton}>
              <Trash2 size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton}>
              <Mail size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton}>
              <MoreVertical size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Subject & Labels */}
          <View style={styles.subjectSection}>
            <View style={styles.subjectRow}>
              <Text style={styles.subject}>{safeEmailData.subject}</Text>
              <TouchableOpacity style={styles.starButton}>
                <Star size={22} color="#FFD700" fill="#FFD700" />
              </TouchableOpacity>
            </View>
            <View style={styles.labelsRow}>
              <View style={[styles.labelBadge, { backgroundColor: '#E8F0FE' }]}>
                <Text style={[styles.labelText, { color: '#1967D2' }]}>Inbox</Text>
              </View>
              <View style={[styles.labelBadge, { backgroundColor: '#F1F3F4' }]}>
                <Text style={[styles.labelText, { color: '#3C4043' }]}>{safeEmailData.metadata?.folder ?? 'Inbox'}</Text>
              </View>
            </View>
          </View>

          {/* Sender Info */}
          <View style={styles.senderSection}>
            <View style={styles.senderAvatar}>
              <LinearGradient
                colors={['#4285F4', '#34A853']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>{safeEmailData.from?.charAt(0)?.toUpperCase() ?? 'R'}</Text>
              </LinearGradient>
            </View>
            <View style={styles.senderDetails}>
              <View style={styles.senderNameRow}>
                <Text style={styles.senderName}>{safeEmailData.from?.split('<')[0]?.trim() ?? safeEmailData.from}</Text>
                <Text style={styles.emailTime}>{safeEmailData.timestamp?.split(' at ')[1] ?? '2:30 PM'}</Text>
              </View>
              <View style={styles.toRow}>
                <Text style={styles.toText}>to me</Text>
                <TouchableOpacity>
                  <Text style={styles.viewDetails}>View details</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.replyIcon}>
              <Reply size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Email Content */}
          <View style={styles.emailContent}>
            <Text style={styles.bodyText}>{safeEmailData.body}</Text>
            
            <View style={styles.signature}>
              <View style={styles.sigDivider} />
              <Text style={styles.sigText}>Sent via Gmail for Enterprise</Text>
              <View style={styles.securityBadge}>
                <ShieldCheck size={12} color="#1E8E3E" />
                <Text style={styles.securityText}>Verified by Google Security</Text>
              </View>
            </View>
          </View>

          {/* Quick Replies */}
          <View style={styles.quickReplies}>
            <TouchableOpacity style={styles.replyBox}>
              <Reply size={18} color={Colors.textSecondary} />
              <Text style={styles.replyBoxText}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.replyBox}>
              <Reply size={18} color={Colors.textSecondary} style={{ transform: [{ scaleX: -1 }] }} />
              <Text style={styles.replyBoxText}>Reply all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.replyBox}>
              <Forward size={18} color={Colors.textSecondary} />
              <Text style={styles.replyBoxText}>Forward</Text>
            </TouchableOpacity>
          </View>

          {/* App Metadata Footer */}
          <View style={styles.appFooter}>
            <LinearGradient
              colors={['rgba(192, 132, 252, 0.05)', 'rgba(192, 132, 252, 0.1)']}
              style={styles.metaCard}
            >
              <View style={styles.metaHeader}>
                <Sparkles size={14} color={Colors.gradients.purple[1]} />
                <Text style={styles.metaTitle}>SIMULATION INSIGHT</Text>
              </View>
              <Text style={styles.metaDesc}>
                This email represents a key milestone in your {safeEmailData.metadata?.folder?.toLowerCase() ?? 'career'} trajectory. You've opened this {safeEmailData.metadata?.timesOpened ?? 1} times in this simulation.
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export const TheEmailModal = memo(TheEmailModalComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  subjectSection: {
    padding: 20,
    paddingBottom: 16,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  subject: {
    flex: 1,
    fontSize: 22,
    fontWeight: '400',
    color: '#202124',
    lineHeight: 28,
  },
  starButton: {
    paddingTop: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  senderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  senderDetails: {
    flex: 1,
  },
  senderNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
  },
  emailTime: {
    fontSize: 12,
    color: '#5F6368',
  },
  toRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toText: {
    fontSize: 13,
    color: '#5F6368',
  },
  viewDetails: {
    fontSize: 13,
    color: '#1A73E8',
  },
  replyIcon: {
    padding: 8,
  },
  emailContent: {
    padding: 20,
    paddingTop: 24,
  },
  bodyText: {
    fontSize: 15,
    color: '#3C4043',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  signature: {
    marginTop: 40,
  },
  sigDivider: {
    width: 40,
    height: 1,
    backgroundColor: '#DADCE0',
    marginBottom: 12,
  },
  sigText: {
    fontSize: 12,
    color: '#70757A',
    fontStyle: 'italic',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  securityText: {
    fontSize: 11,
    color: '#1E8E3E',
    fontWeight: '500',
  },
  quickReplies: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  replyBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  replyBoxText: {
    fontSize: 14,
    color: '#3C4043',
    fontWeight: '500',
  },
  appFooter: {
    padding: 20,
    paddingBottom: 40,
  },
  metaCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.2)',
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gradients.purple[1],
    letterSpacing: 1,
  },
  metaDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontFamily: Fonts.secondary.regular,
  },
});
