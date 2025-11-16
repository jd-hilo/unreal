import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { getRelationships } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Plus, Users, Heart, Briefcase, GraduationCap, UserCircle, X, Trash2 } from 'lucide-react-native';

const RELATIONSHIP_TYPES = [
  'Partner', 'Spouse', 'Family', 'Friend', 'Mentor', 
  'Coworker', 'Boss', 'Other'
];

const CONTACT_FREQUENCIES = [
  'Daily', 'Weekly', 'Monthly', 'Rarely'
];

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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRel, setSelectedRel] = useState<Relationship | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editYears, setEditYears] = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reload relationships when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRelationships();
    }, [user])
  );

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
        return <Briefcase size={20} color="#1E40AF" />;
      case 'mentor':
        return <GraduationCap size={20} color="#F59E0B" />;
      default:
        return <UserCircle size={20} color="#6B7280" />;
    }
  }

  function handleAddRelationship() {
    router.push('/relationships/add' as any);
  }

  function handleEditRelationship(rel: Relationship) {
    setSelectedRel(rel);
    setEditName(rel.name);
    // Capitalize first letter to match options
    setEditType(rel.relationship_type.charAt(0).toUpperCase() + rel.relationship_type.slice(1));
    setEditYears(rel.years_known?.toString() || '');
    // Capitalize first letter to match options
    setEditFrequency(rel.contact_frequency ? rel.contact_frequency.charAt(0).toUpperCase() + rel.contact_frequency.slice(1) : '');
    setEditLocation(rel.location || '');
    setModalVisible(true);
  }

  async function handleUpdate() {
    if (!selectedRel || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('relationships')
        .update({
          name: editName,
          relationship_type: editType.toLowerCase(),
          years_known: editYears ? parseFloat(editYears) : null,
          contact_frequency: editFrequency.toLowerCase() || null,
          location: editLocation || null,
        })
        .eq('id', selectedRel.id);

      if (error) throw error;

      setModalVisible(false);
      loadRelationships();
    } catch (error) {
      console.error('Failed to update relationship:', error);
      Alert.alert('Error', 'Failed to update relationship');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedRel || !user) return;

    Alert.alert(
      'Delete Relationship',
      `Are you sure you want to delete ${selectedRel.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error } = await supabase
                .from('relationships')
                .delete()
                .eq('id', selectedRel.id);

              if (error) throw error;

              setModalVisible(false);
              loadRelationships();
            } catch (error) {
              console.error('Failed to delete relationship:', error);
              Alert.alert('Error', 'Failed to delete relationship');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
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
                onPress={() => handleEditRelationship(rel)}
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

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Relationship</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Input
                label="Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="Their name"
              />

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Relationship Type</Text>
                <View style={styles.modalOptionsGrid}>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.modalOption,
                        editType === type && styles.modalOptionSelected
                      ]}
                      onPress={() => setEditType(type)}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        editType === type && styles.modalOptionTextSelected
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Years Known"
                value={editYears}
                onChangeText={setEditYears}
                placeholder="How many years?"
                keyboardType="numeric"
              />

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionLabel}>Contact Frequency</Text>
                <View style={styles.modalOptionsGrid}>
                  {CONTACT_FREQUENCIES.map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.modalOption,
                        editFrequency === freq && styles.modalOptionSelected
                      ]}
                      onPress={() => setEditFrequency(freq)}
                    >
                      <Text style={[
                        styles.modalOptionText,
                        editFrequency === freq && styles.modalOptionTextSelected
                      ]}>
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Location"
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Where they live"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Delete"
                onPress={handleDelete}
                loading={deleting}
                variant="outline"
                icon={<Trash2 size={20} color="#EF4444" />}
                style={styles.deleteButton}
              />
              <Button
                title="Save Changes"
                onPress={handleUpdate}
                loading={saving}
                style={styles.saveButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C10',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#0C0C10',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(200, 200, 200, 0.75)',
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  relationshipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0C10',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    gap: 12,
  },
  relationshipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 18, 30, 0.6)',
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
    color: '#FFFFFF',
  },
  relationshipType: {
    fontSize: 14,
    color: 'rgba(200, 200, 200, 0.75)',
    textTransform: 'capitalize',
  },
  relationshipLocation: {
    fontSize: 12,
    color: 'rgba(150, 150, 150, 0.6)',
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
    color: 'rgba(200, 200, 200, 0.85)',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#0C0C10',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0C0C10',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 37, 109, 0.2)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 24,
    gap: 24,
  },
  modalSection: {
    gap: 8,
  },
  modalSectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    backgroundColor: '#0C0C10',
  },
  modalOptionSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(200, 200, 200, 0.75)',
  },
  modalOptionTextSelected: {
    color: '#FFFFFF',
  },
  modalSliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalSliderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(59, 37, 109, 0.3)',
    backgroundColor: '#0C0C10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSliderButtonActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  modalSliderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(200, 200, 200, 0.75)',
  },
  modalSliderButtonTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  deleteButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});


