import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { X, TrendingUp, TrendingDown, DollarSign, Smile, Zap, Heart, Briefcase, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { DailyStory } from '@/types/database';

interface WorldEffectInfoModalProps {
  visible: boolean;
  story: DailyStory | null;
  onClose: () => void;
}

const metricIcons = {
  money: DollarSign,
  happiness: Smile,
  freedom: Zap,
  growth: Briefcase,
  relationships: Heart,
};

const metricLabels = {
  money: 'Money',
  happiness: 'Happiness',
  freedom: 'Freedom',
  growth: 'Growth',
  relationships: 'Relationships',
};

export function WorldEffectInfoModal({ visible, story, onClose }: WorldEffectInfoModalProps) {
  if (!story) return null;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleOpenLink = async () => {
    if (story.url) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const supported = await Linking.canOpenURL(story.url);
        if (supported) {
          await Linking.openURL(story.url);
        } else {
          console.error('Cannot open URL:', story.url);
        }
      } catch (error) {
        console.error('Error opening URL:', error);
      }
    }
  };

  const affectedMetrics = Object.entries(story.affectedMetrics).filter(([_, score]) => score !== undefined && score !== 0);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.modalWrapper}>
              <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Impact Analysis</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Story Title */}
                <Text style={styles.storyTitle}>{story.title}</Text>

                {/* Overall Impact Score */}
                <View style={styles.overallScoreContainer}>
                  <View style={styles.scoreHeader}>
                    <Text style={styles.scoreLabel}>Overall Impact</Text>
                    <View style={[
                      styles.scoreBadge,
                      story.impactScore > 0 ? styles.positiveBadge : story.impactScore < 0 ? styles.negativeBadge : styles.neutralBadge
                    ]}>
                      {story.impactScore > 0 ? (
                        <TrendingUp size={16} color="#10B981" />
                      ) : story.impactScore < 0 ? (
                        <TrendingDown size={16} color="#EF4444" />
                      ) : null}
                      <Text style={[
                        styles.scoreText,
                        story.impactScore > 0 ? styles.positiveText : story.impactScore < 0 ? styles.negativeText : styles.neutralText
                      ]}>
                        {story.impactScore > 0 ? '+' : ''}{story.impactScore.toFixed(0)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Explanation */}
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationLabel}>Why this affects you:</Text>
                  <Text style={styles.explanationText}>{story.explanation}</Text>
                </View>

                {/* Affected Metrics */}
                {affectedMetrics.length > 0 && (
                  <View style={styles.metricsContainer}>
                    <Text style={styles.metricsLabel}>Affected Areas:</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.metricsGrid}
                    >
                      {affectedMetrics.map(([metric, score]) => {
                        const Icon = metricIcons[metric as keyof typeof metricIcons];
                        const label = metricLabels[metric as keyof typeof metricLabels];
                        const isPositive = (score as number) > 0;
                        const isNegative = (score as number) < 0;

                        return (
                          <View key={metric} style={[
                            styles.metricChip,
                            isPositive ? styles.positiveChip : isNegative ? styles.negativeChip : styles.neutralChip
                          ]}>
                            <View style={[
                              styles.metricIconContainer,
                              isPositive ? styles.positiveIconBg : isNegative ? styles.negativeIconBg : styles.neutralIconBg
                            ]}>
                              {Icon && <Icon size={18} color={isPositive ? '#10B981' : isNegative ? '#EF4444' : '#666666'} />}
                            </View>
                            <View style={styles.metricChipContent}>
                              <Text style={styles.metricChipLabel}>
                                {isPositive ? 'Supports ' : 'Hurts '}
                                {label}
                              </Text>
                              <Text style={[
                                styles.metricChipScore,
                                isPositive ? styles.positiveText : isNegative ? styles.negativeText : styles.neutralText
                              ]}>
                                {isPositive ? '+' : ''}{(score as number).toFixed(0)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Source Link */}
                {story.url && (
                  <View style={styles.linkContainer}>
                    <TouchableOpacity 
                      style={styles.linkButton}
                      onPress={handleOpenLink}
                      activeOpacity={0.7}
                    >
                      <ExternalLink size={16} color="#FFFFFF" />
                      <Text style={styles.linkText}>Read full article</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
              </View>
            </View>
          </SafeAreaView>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  blurContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '100%',
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: '100%',
  },
  storyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
    lineHeight: 28,
    fontFamily: 'Recoleta-Regular',
  },
  overallScoreContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999999',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  positiveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  negativeBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  neutralBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  positiveText: {
    color: '#10B981',
  },
  negativeText: {
    color: '#EF4444',
  },
  neutralText: {
    color: '#999999',
  },
  explanationContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  explanationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  explanationText: {
    fontSize: 15,
    color: '#CCCCCC',
    lineHeight: 22,
  },
  metricsContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  metricsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 4,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: 160,
  },
  positiveChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  negativeChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  neutralChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  positiveIconBg: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  negativeIconBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  neutralIconBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricChipContent: {
    flex: 1,
  },
  metricChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  metricChipScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  linkContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    marginTop: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

