import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/store/useAuth';
import { getTimeline } from '@/lib/storage';
import { ChevronLeft, MapPin, Briefcase, Heart, DollarSign, Home, Car } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';

export default function SimulatedProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const timelineId = params.id as string;
  const user = useAuth((state) => state.user);
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (timelineId && user) {
        loadTimeline();
      }
    }, [timelineId, user])
  );

  async function loadTimeline() {
    if (!timelineId) return;

    try {
      const timelineData = await getTimeline(timelineId);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !timeline) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const profile = timeline.twin_profile || {};
  const assets = timeline.assets || [];

  return (
    <LinearGradient
      colors={['#0C0C10', '#0F0F11']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Simulated Twin Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Age */}
          <View style={styles.section}>
            <BlurView intensity={40} tint="dark" style={styles.card}>
              <Text style={styles.cardLabel}>Current Age</Text>
              <Text style={styles.cardValue}>{timeline.current_age}</Text>
            </BlurView>
          </View>

          {/* Profile Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Details</Text>
            
            {profile.location && (
              <BlurView intensity={40} tint="dark" style={styles.infoCard}>
                <MapPin size={20} color="#3B82F6" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{profile.location}</Text>
                </View>
              </BlurView>
            )}

            {profile.job && (
              <BlurView intensity={40} tint="dark" style={styles.infoCard}>
                <Briefcase size={20} color="#0EA5E9" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Job</Text>
                  <Text style={styles.infoValue}>{profile.job}</Text>
                </View>
              </BlurView>
            )}

            {profile.relationshipStatus && (
              <BlurView intensity={40} tint="dark" style={styles.infoCard}>
                <Heart size={20} color="#EF4444" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Relationship Status</Text>
                  <Text style={styles.infoValue}>{profile.relationshipStatus}</Text>
                </View>
              </BlurView>
            )}

            {profile.netWorth && (
              <BlurView intensity={40} tint="dark" style={styles.infoCard}>
                <DollarSign size={20} color="#10B981" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Net Worth</Text>
                  <Text style={styles.infoValue}>{profile.netWorth}</Text>
                </View>
              </BlurView>
            )}
          </View>

          {/* Assets */}
          {assets.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assets</Text>
              <View style={styles.assetsGrid}>
                {assets.map((asset: any, index: number) => {
                  let Icon = Home;
                  if (asset.type === 'car') Icon = Car;
                  else if (asset.type === 'apartment' || asset.type === 'house') Icon = Home;

                  return (
                    <BlurView key={index} intensity={40} tint="dark" style={styles.assetCard}>
                      <Icon size={24} color="#87CEFA" />
                      <Text style={styles.assetName}>{asset.name}</Text>
                      {asset.value && (
                        <Text style={styles.assetValue}>{asset.value}</Text>
                      )}
                      {asset.description && (
                        <Text style={styles.assetDescription} numberOfLines={2}>
                          {asset.description}
                        </Text>
                      )}
                    </BlurView>
                  );
                })}
              </View>
            </View>
          )}

          {/* Stats Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Life Stats</Text>
            <View style={styles.statsGrid}>
              <BlurView intensity={40} tint="dark" style={styles.statCard}>
                <Text style={styles.statLabel}>Money</Text>
                <Text style={styles.statValue}>{timeline.stats.money.toFixed(1)}</Text>
              </BlurView>
              <BlurView intensity={40} tint="dark" style={styles.statCard}>
                <Text style={styles.statLabel}>Happiness</Text>
                <Text style={styles.statValue}>{timeline.stats.happiness.toFixed(1)}</Text>
              </BlurView>
              <BlurView intensity={40} tint="dark" style={styles.statCard}>
                <Text style={styles.statLabel}>Freedom</Text>
                <Text style={styles.statValue}>{timeline.stats.freedom.toFixed(1)}</Text>
              </BlurView>
              <BlurView intensity={40} tint="dark" style={styles.statCard}>
                <Text style={styles.statLabel}>Growth</Text>
                <Text style={styles.statValue}>{timeline.stats.growth.toFixed(1)}</Text>
              </BlurView>
              <BlurView intensity={40} tint="dark" style={styles.statCard}>
                <Text style={styles.statLabel}>Relationships</Text>
                <Text style={styles.statValue}>{timeline.stats.relationships.toFixed(1)}</Text>
              </BlurView>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  assetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  assetCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  assetValue: {
    fontSize: 12,
    color: '#10B981',
    marginBottom: 4,
  },
  assetDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});



