import React, { memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { X, Camera, Mic, Battery, Wifi, Signal, Sparkles } from 'lucide-react-native';
import { Colors, Fonts } from '@/constants/Theme';
import type { RandomTuesdayData } from '@/lib/career-sim/types';
import { LinearGradient } from 'expo-linear-gradient';

interface RandomTuesdayModalProps {
  visible: boolean;
  onClose: () => void;
  tuesdayData: RandomTuesdayData;
}

function RandomTuesdayModalComponent({ visible, onClose, tuesdayData }: RandomTuesdayModalProps) {
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Provide safe defaults if tuesdayData is missing
  const safeTuesdayData = tuesdayData || {
    date: 'Tuesday, March 15, 2032',
    notifications: [],
    timeline: [],
    stats: {
      decisionsMade: 0,
      imposterSyndromeMoments: 0,
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
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} style={styles.toolbarButton}>
            <X size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.toolbarActions}>
            {/* Empty space for balance */}
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* iPhone Lock Screen Mockup */}
          <View style={styles.lockScreenContainer}>
            <LinearGradient
              colors={['#1a1a1a', '#2d3436']}
              style={styles.lockScreenGradient}
            >
              {/* Status Bar */}
              <View style={styles.statusBar}>
                <Text style={styles.statusBarTime}>{currentTime}</Text>
                <View style={styles.statusBarIcons}>
                  <Signal size={14} color="#FFFFFF" />
                  <Wifi size={14} color="#FFFFFF" />
                  <Battery size={14} color="#FFFFFF" />
                </View>
              </View>

              {/* Date & Time */}
              <View style={styles.lockScreenHeader}>
                <Text style={styles.lockScreenDate}>{safeTuesdayData.date?.split(',')[1]?.trim() ?? 'March 15'}</Text>
                <Text style={styles.lockScreenTime}>09:41</Text>
              </View>

              {/* Notifications */}
              <View style={styles.notificationsList}>
                {safeTuesdayData.notifications?.map((notification, index) => (
                  <View key={index} style={styles.notificationCard}>
                    <View style={styles.notificationHeader}>
                      <View style={styles.appIconContainer}>
                        <Text style={styles.appIconEmoji}>{notification.icon ?? '📱'}</Text>
                      </View>
                      <Text style={styles.appName}>{notification.app?.toUpperCase() ?? 'APP'}</Text>
                      <Text style={styles.notifTime}>{notification.time ?? '9:00 AM'}</Text>
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notifTitle}>{notification.title ?? 'Notification'}</Text>
                      <Text style={styles.notifBody} numberOfLines={2}>{notification.body ?? 'Notification body'}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Lock Screen Bottom */}
              <View style={styles.lockScreenFooter}>
                <View style={styles.footerIcon}>
                  <Camera size={20} color="#FFFFFF" />
                </View>
                <View style={styles.homeIndicator} />
                <View style={styles.footerIcon}>
                  <Mic size={20} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
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
                This represents a snapshot of a random Tuesday in your simulated future. You made {safeTuesdayData.stats?.decisionsMade ?? 0} decisions and experienced {safeTuesdayData.stats?.imposterSyndromeMoments ?? 0} moments of doubt.
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export const RandomTuesdayModal = memo(RandomTuesdayModalComponent);

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
  lockScreenContainer: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 600,
  },
  lockScreenGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 600,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  statusBarTime: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBarIcons: {
    flexDirection: 'row',
    gap: 6,
  },
  lockScreenHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  lockScreenDate: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  lockScreenTime: {
    color: '#FFFFFF',
    fontSize: 80,
    fontWeight: '200',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
  },
  notificationsList: {
    gap: 10,
  },
  notificationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 14,
    backdropFilter: 'blur(20px)',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  appIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  appIconEmoji: {
    fontSize: 12,
  },
  appName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  notifTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  notificationContent: {
    paddingLeft: 2,
  },
  notifTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  notifBody: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  lockScreenFooter: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicator: {
    width: 120,
    height: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    opacity: 0.5,
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
