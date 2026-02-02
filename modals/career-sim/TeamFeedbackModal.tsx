import React, { memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { X, Hash, Bell, Search, MoreVertical, Smile, Paperclip, Send, ChevronRight, MessageCircle, Zap, Users, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/Theme';
import type { FeedbackData, SlackMessage } from '@/lib/career-sim/types';
import { LinearGradient } from 'expo-linear-gradient';

interface TeamFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  feedbackData: FeedbackData;
}

interface MessageComponentProps {
  message: SlackMessage;
}

const MessageComponent = memo(({ message }: MessageComponentProps) => (
  <View style={styles.messageContainer}>
    <View style={styles.avatarContainer}>
      <LinearGradient
        colors={Colors.gradients.purple}
        style={styles.avatarGradient}
      >
        <Text style={styles.avatarEmoji}>{message.avatar}</Text>
      </LinearGradient>
    </View>
    <View style={styles.messageContent}>
      <View style={styles.messageHeader}>
        <Text style={styles.authorName}>{message.author}</Text>
        <Text style={styles.timestamp}>{message.timestamp}</Text>
      </View>
      <Text style={styles.messageText}>{message.message}</Text>
      {message.reactions.length > 0 && (
        <View style={styles.reactions}>
          {message.reactions.map((reaction, index) => (
            <TouchableOpacity key={index} style={styles.reactionBadge}>
              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              <Text style={styles.reactionCount}>{reaction.count}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addReaction}>
            <Smile size={14} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  </View>
));

MessageComponent.displayName = 'MessageComponent';

function TeamFeedbackModalComponent({ visible, onClose, feedbackData }: TeamFeedbackModalProps) {
  // Provide default values if feedbackData is missing
  const safeFeedbackData = feedbackData || {
    messages: [],
    finalMessage: 'Team feedback data is being generated...',
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Slack Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} style={styles.toolbarButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.channelInfo}>
            <Hash size={18} color="#FFFFFF" opacity={0.7} />
            <Text style={styles.channelName}>anonymous-feedback</Text>
          </View>
          <View style={styles.toolbarActions}>
            <TouchableOpacity style={styles.toolbarButton}>
              <Search size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton}>
              <MoreVertical size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.threadHeader}>
            <View style={styles.threadIconContainer}>
              <MessageCircle size={24} color={Colors.gradients.purple[1]} />
            </View>
            <View>
              <Text style={styles.threadTitle}>Peer Review Thread</Text>
              <Text style={styles.threadSubtitle}>4 replies from your 2034 team</Text>
            </View>
          </View>

          <View style={styles.messagesList}>
            {safeFeedbackData.messages?.map((message, index) => (
              <MessageComponent key={index} message={message} />
            ))}

            {/* Final Message / System Insight */}
            <View style={styles.insightSection}>
              <LinearGradient
                colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']}
                style={styles.insightCard}
              >
                <View style={styles.insightHeader}>
                  <Zap size={14} color={Colors.textTertiary} />
                  <Text style={styles.insightTitle}>UNSPOKEN TRUTH</Text>
                </View>
                <Text style={styles.insightText}>{safeFeedbackData.finalMessage}</Text>
              </LinearGradient>
            </View>
          </View>
          
          <View style={styles.footerSpacing} />
        </ScrollView>

        {/* Slack Input Mockup */}
        <View style={styles.inputMockup}>
          <View style={styles.inputInner}>
            <Text style={styles.inputPlaceholder}>Message #anonymous-feedback</Text>
            <View style={styles.inputActions}>
              <View style={styles.leftActions}>
                <Plus size={20} color={Colors.textTertiary} />
                <Paperclip size={20} color={Colors.textTertiary} />
              </View>
              <View style={styles.sendButton}>
                <Send size={18} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const TeamFeedbackModal = memo(TeamFeedbackModalComponent);

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
    backgroundColor: '#4A154B', // Slack Purple
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginLeft: 12,
  },
  channelName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 4,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  threadIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  threadSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  messagesList: {
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
  },
  avatarGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1D1C1D',
    fontFamily: Fonts.secondary.bold,
  },
  timestamp: {
    fontSize: 12,
    color: '#616061',
    fontFamily: Fonts.secondary.regular,
  },
  messageText: {
    fontSize: 15,
    color: '#1D1C1D',
    lineHeight: 22,
    fontFamily: Fonts.secondary.regular,
  },
  reactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D1C1D',
  },
  addReaction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  insightSection: {
    padding: 20,
    marginTop: 20,
  },
  insightCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  insightText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    lineHeight: 20,
    fontFamily: Fonts.secondary.regular,
  },
  inputMockup: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
  },
  inputInner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    borderRadius: 12,
    padding: 12,
  },
  inputPlaceholder: {
    fontSize: 15,
    color: Colors.textTertiary,
    marginBottom: 12,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    gap: 16,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#007A5A', // Slack Green
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpacing: {
    height: 40,
  },
});
