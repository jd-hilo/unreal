import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/store/useAuth';
import { getRelationships } from '@/lib/storage';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Plus, Users, Heart, Briefcase, GraduationCap, UserCircle } from 'lucide-react-native';

interface Relationship {
  id: string;
  name: string;
  relationship_type: string;
  years_known: number | null;
  contact_frequency: string | null;
  influence: number | null;
  location: string | null;
}

export default function RelationshipsScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelationships();
  }, [user]);

  async function loadRelationships() {
    if (!user) return;
    
    try {
      const data = await getRelationships(user.id);
      setRelationships(data as Relationship[]);
    } catch (error) {
      console.error('Failed to load relationships:', error);
    } finally {
      setLoading(false);
    }
  }

  function getRelationshipIcon(type: string) {
    switch (type.toLowerCase()) {
      case 'partner':
      case 'spouse':
        return <Heart size={20} color="#EF4444" />;
      case 'family':
        return <Users size={20} color="#10B981" />;
      case 'friend':
        return <UserCircle size={20} color="#3B82F6" />;
      case 'coworker':
      case 'boss':
        return <Briefcase size={20} color="#8B5CF6" />;
      case 'mentor':
        return <GraduationCap size={20} color="#F59E0B" />;
      default:
        return <UserCircle size={20} color="#6B7280" />;
    }
  }

  function handleAddRelationship() {
    router.push('/relationships/add' as any);
  }

  function handleEditRelationship(id: string) {
    router.push(`/relationships/${id}` as any);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Relationships</Text>
        <Text style={styles.subtitle}>
          People who influence your decisions
        </Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {relationships.length === 0 && !loading ? (
          <Card style={styles.emptyCard}>
            <Users size={48} color="#D1D5DB" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No relationships yet</Text>
            <Text style={styles.emptyText}>
              Add the people who matter most in your life to help your twin make better decisions
            </Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {relationships.map((rel) => (
              <TouchableOpacity
                key={rel.id}
                style={styles.relationshipCard}
                onPress={() => handleEditRelationship(rel.id)}
                activeOpacity={0.7}
              >
                <View style={styles.relationshipIcon}>
                  {getRelationshipIcon(rel.relationship_type)}
                </View>
                <View style={styles.relationshipContent}>
                  <Text style={styles.relationshipName}>{rel.name}</Text>
                  <Text style={styles.relationshipType}>
                    {rel.relationship_type}
                    {rel.years_known && ` • ${rel.years_known} years`}
                  </Text>
                  {rel.location && (
                    <Text style={styles.relationshipLocation}>{rel.location}</Text>
                  )}
                </View>
                {rel.influence !== null && (
                  <View style={styles.influenceBadge}>
                    <Text style={styles.influenceText}>
                      {Math.round(rel.influence * 100)}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Add Relationship"
          onPress={handleAddRelationship}
          icon={<Plus size={20} color="#FFFFFF" />}
          size="large"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#666666',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  relationshipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 12,
  },
  relationshipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relationshipContent: {
    flex: 1,
    gap: 4,
  },
  relationshipName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  relationshipType: {
    fontSize: 14,
    color: '#666666',
    textTransform: 'capitalize',
  },
  relationshipLocation: {
    fontSize: 12,
    color: '#999999',
  },
  influenceBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  influenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
});

