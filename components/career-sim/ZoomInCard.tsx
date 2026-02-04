import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Maximize2, Mail, Calendar, MessageSquare, Inbox, Clock, ArrowRight, Bell, Signal, Wifi, Battery } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';

interface ZoomInCardProps {
  cards: Array<{ id: string; title: string; icon: string }>;
  onZoomInPress: (type: 'email' | 'tuesday' | 'calendar' | 'feedback' | 'inbox') => void;
  isPremium?: boolean;
  router?: { push: (path: any) => void };
}

interface ZoomCardItemProps {
  id: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const ZoomCardItem = memo(({ id, title, subtitle, onPress }: ZoomCardItemProps) => {
  const renderPreview = () => {
    switch (id) {
      case 'tuesday':
        return (
          <View style={styles.previewContainer}>
            <View style={styles.phonePreview}>
              <LinearGradient
                colors={['#1a1a1a', '#2d3436']}
                style={styles.phoneGradient}
              >
                <View style={styles.phoneStatusBar}>
                  <Text style={styles.phoneTime}>9:41</Text>
                  <View style={styles.phoneIcons}>
                    <Signal size={10} color="#FFFFFF" />
                    <Wifi size={10} color="#FFFFFF" />
                    <Battery size={10} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.phoneNotifications}>
                  <View style={styles.notifPreview}>
                    <Bell size={12} color="#FFFFFF" />
                    <Text style={styles.notifPreviewText}>4 notifications</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        );
      case 'email':
        return (
          <View style={styles.previewContainer}>
            <View style={styles.emailPreview}>
              <View style={styles.emailHeader}>
                <View style={styles.emailAvatar}>
                  <Mail size={16} color="#4285F4" />
                </View>
                <View style={styles.emailInfo}>
                  <View style={styles.emailLine} />
                  <View style={[styles.emailLine, { width: '60%' }]} />
                </View>
              </View>
              <View style={styles.emailSubject}>
                <View style={styles.emailLine} />
              </View>
              <View style={styles.emailBody}>
                <View style={[styles.emailLine, { marginBottom: 6 }]} />
                <View style={[styles.emailLine, { width: '80%' }]} />
              </View>
            </View>
          </View>
        );
      case 'calendar':
        return (
          <View style={styles.previewContainer}>
            <View style={styles.calendarPreview}>
              <View style={styles.calendarHeader}>
                <View style={styles.calendarLine} />
              </View>
              <View style={styles.calendarGrid}>
                {['Mon', 'Tue', 'Wed', 'Thu'].map((day, i) => (
                  <View key={i} style={styles.calendarDay}>
                    <Text style={styles.calendarDayText}>{day}</Text>
                    <View style={styles.calendarEvent} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        );
      case 'feedback':
        return (
          <View style={styles.previewContainer}>
            <View style={styles.slackPreview}>
              <View style={styles.slackHeader}>
                <View style={styles.slackAvatar} />
                <View style={styles.slackInfo}>
                  <View style={styles.slackLine} />
                  <View style={[styles.slackLine, { width: '50%' }]} />
                </View>
              </View>
              <View style={styles.slackMessage}>
                <View style={[styles.slackLine, { marginBottom: 4 }]} />
                <View style={[styles.slackLine, { width: '70%' }]} />
              </View>
            </View>
          </View>
        );
      case 'inbox':
        return (
          <View style={styles.previewContainer}>
            <View style={styles.inboxPreview}>
              <View style={styles.inboxItem}>
                <View style={styles.inboxDot} />
                <View style={styles.inboxContent}>
                  <View style={styles.inboxLine} />
                  <View style={[styles.inboxLine, { width: '60%' }]} />
                </View>
              </View>
              <View style={styles.inboxItem}>
                <View style={styles.inboxDot} />
                <View style={styles.inboxContent}>
                  <View style={styles.inboxLine} />
                  <View style={[styles.inboxLine, { width: '50%' }]} />
                </View>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={styles.zoomCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        {renderPreview()}
        <View style={styles.cardText}>
          <Text style={styles.zoomTitle}>{title}</Text>
          <Text style={styles.zoomSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.exploreBadge}>
            <Text style={styles.exploreText}>Explore</Text>
            <ArrowRight size={14} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

ZoomCardItem.displayName = 'ZoomCardItem';

function ZoomInCardComponent({ cards, onZoomInPress, isPremium = true, router }: ZoomInCardProps) {
  const handlePress = useCallback((type: 'email' | 'tuesday' | 'calendar' | 'feedback' | 'inbox') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!isPremium && router) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/premium' as any);
      return;
    }
    
    onZoomInPress(type);
  }, [onZoomInPress, isPremium, router]);

  const getSubtitle = (id: string) => {
    const subtitleMap: Record<string, string> = {
      tuesday: 'Your phone at 9:41 AM',
      email: 'The one that changed it',
      calendar: 'How your time shifts',
      feedback: 'What they say about you',
      inbox: '2026 vs 2034',
    };
    return subtitleMap[id] || 'Explore this moment';
  };

  const safeCards = cards || [
    { id: 'email', title: 'The Email', icon: '📧' },
    { id: 'tuesday', title: 'Random Tuesday', icon: '📅' },
    { id: 'calendar', title: 'Calendar Evolution', icon: '🗓️' },
    { id: 'feedback', title: 'Team Feedback', icon: '💬' },
    { id: 'inbox', title: 'Inbox Evolution', icon: '📬' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>See the Details</Text>
      <Text style={styles.sectionDesc}>Step into specific moments of your future</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        snapToInterval={220 + 16}
        decelerationRate="fast"
      >
        {safeCards.map((card) => (
          <ZoomCardItem
            key={card.id}
            id={card.id}
            title={card.title}
            subtitle={getSubtitle(card.id)}
            onPress={() => handlePress(card.id as 'email' | 'tuesday' | 'calendar' | 'feedback' | 'inbox')}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export const ZoomInCard = memo(ZoomInCardComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.primary.regular,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    marginBottom: 12,
  },
  scrollView: {
    marginHorizontal: -24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  zoomCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
    minHeight: 240,
    justifyContent: 'space-between',
  },
  previewContainer: {
    height: 120,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  // Phone Preview (Lock Screen)
  phonePreview: {
    flex: 1,
  },
  phoneGradient: {
    flex: 1,
    padding: 12,
  },
  phoneStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneTime: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  phoneIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  phoneNotifications: {
    marginTop: 8,
  },
  notifPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 12,
  },
  notifPreviewText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  // Email Preview
  emailPreview: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  emailHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  emailAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailInfo: {
    flex: 1,
    gap: 4,
  },
  emailLine: {
    height: 8,
    backgroundColor: '#E8EAED',
    borderRadius: 4,
    width: '100%',
  },
  emailSubject: {
    marginBottom: 8,
  },
  emailBody: {
    gap: 4,
  },
  // Calendar Preview
  calendarPreview: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  calendarHeader: {
    marginBottom: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarDay: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  calendarDayText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calendarEvent: {
    width: '100%',
    height: 20,
    backgroundColor: '#4285F4',
    borderRadius: 4,
    opacity: 0.6,
  },
  // Slack Preview
  slackPreview: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  slackHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  slackAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#611F69',
  },
  slackInfo: {
    flex: 1,
    gap: 4,
  },
  slackLine: {
    height: 8,
    backgroundColor: '#E8EAED',
    borderRadius: 4,
    width: '100%',
  },
  slackMessage: {
    marginLeft: 32,
    gap: 4,
  },
  // Inbox Preview
  inboxPreview: {
    flex: 1,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  inboxItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gradients.purple[1],
  },
  inboxContent: {
    flex: 1,
    gap: 4,
  },
  inboxLine: {
    height: 8,
    backgroundColor: '#E8EAED',
    borderRadius: 4,
    width: '100%',
  },
  cardText: {
    marginBottom: 12,
  },
  zoomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    marginBottom: 4,
  },
  zoomSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    lineHeight: 16,
  },
  cardFooter: {
    marginTop: 'auto',
  },
  exploreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.semibold,
  },
});
