import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Pressable, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/useAuth';
import { getRelationships } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/Input';
import { Plus, Users, Heart, Briefcase, GraduationCap, UserCircle, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, Fonts } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

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
        return <UserCircle size={20} color="rgba(135, 206, 250, 0.9)" />;
      case 'coworker':
      case 'boss':
        return <Briefcase size={20} color="rgba(135, 206, 250, 0.9)" />;
      case 'mentor':
        return <GraduationCap size={20} color="#F59E0B" />;
      default:
        return <UserCircle size={20} color="#6B7280" />;
    }
  }

  function handleAddRelationship() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/relationships/add' as any);
  }

  function handleEditRelationship(rel: Relationship) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Relationships</Text>
            <Text style={styles.subtitle}>
              People who influence your decisions
            </Text>
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {relationships.length === 0 && !loading ? (
            <View style={styles.emptyCard}>
              <Users size={48} color={Colors.textTertiary} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No relationships yet</Text>
              <Text style={styles.emptyText}>
                Add the people who matter most in your life to help your twin make better decisions
              </Text>
            </View>
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
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer Button */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleAddRelationship}
            style={({ pressed }) => [
              styles.addButton,
              {
                shadowColor: '#25729f',
                transform: [{ translateY: pressed ? 2 : 0 }],
                shadowOffset: { width: 0, height: pressed ? 2 : 8 },
                shadowOpacity: pressed ? 0.3 : 0.5,
                shadowRadius: pressed ? 8 : 20,
                elevation: pressed ? 4 : 12,
              }
            ]}
          >
            <LinearGradient
              colors={['#25729f', '#62edb9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.addButtonGradient}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Relationship</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>

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
              <TouchableOpacity 
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setModalVisible(false);
                }}
                style={styles.modalCloseButton}
              >
                <X size={24} color={Colors.textTertiary} />
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
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={({ pressed }) => [
                  styles.deleteButton,
                  {
                    opacity: deleting ? 0.6 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }
                ]}
              >
                <Trash2 size={18} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
              <Pressable
                onPress={handleUpdate}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    shadowColor: '#25729f',
                    transform: [{ translateY: pressed ? 2 : 0 }],
                    shadowOffset: { width: 0, height: pressed ? 2 : 8 },
                    shadowOpacity: pressed ? 0.3 : 0.5,
                    shadowRadius: pressed ? 8 : 20,
                    elevation: pressed ? 4 : 12,
                    opacity: saving ? 0.6 : 1,
                  }
                ]}
              >
                <LinearGradient
                  colors={['#25729f', '#62edb9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  {saving ? (
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </LinearGradient>
              </Pressable>
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
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
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
    borderRadius: 24,
    padding: 16,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 12,
  },
  relationshipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
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
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
  },
  relationshipType: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
    textTransform: 'capitalize',
  },
  relationshipLocation: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.regular,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 30,
    backgroundColor: 'transparent',
  },
  addButton: {
    borderRadius: 28,
    overflow: 'visible',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 28,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
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
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
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
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FFFFFF',
  },
  modalOptionSelected: {
    borderColor: '#25729f',
    backgroundColor: 'rgba(37, 114, 159, 0.1)',
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  modalOptionTextSelected: {
    color: '#25729f',
    fontFamily: Fonts.secondary.bold,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: Fonts.secondary.bold,
  },
  saveButton: {
    flex: 2,
    borderRadius: 24,
    overflow: 'visible',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.secondary.bold,
  },
});


