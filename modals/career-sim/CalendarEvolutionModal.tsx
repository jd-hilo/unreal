import React, { memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { X, ChevronLeft, ChevronRight, MoreVertical, Calendar as CalendarIcon, Plus, Search, Users, MapPin, Video, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '@/constants/Theme';
import type { CalendarData, CalendarEvent } from '@/lib/career-sim/types';
import { LinearGradient } from 'expo-linear-gradient';

interface CalendarEvolutionModalProps {
  visible: boolean;
  onClose: () => void;
  calendarData: CalendarData;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface CalendarViewComponentProps {
  year: number;
  events: CalendarEvent[];
}

const CalendarViewComponent = memo(({ year, events }: CalendarViewComponentProps) => {
  const eventsByDay = DAYS.reduce((acc, day) => {
    acc[day] = events.filter(e => e.day === day);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarYear}>{year}</Text>
        <View style={styles.calendarNav}>
          <ChevronLeft size={20} color={Colors.textSecondary} />
          <Text style={styles.monthText}>MARCH</Text>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </View>
      </View>
      
      <View style={styles.calendarGrid}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeLabel}>9 AM</Text>
          <Text style={styles.timeLabel}>12 PM</Text>
          <Text style={styles.timeLabel}>3 PM</Text>
          <Text style={styles.timeLabel}>6 PM</Text>
        </View>
        
        {DAYS.map((day) => (
          <View key={day} style={styles.dayColumn}>
            <Text style={styles.dayLabel}>{day.toUpperCase()}</Text>
            <View style={styles.eventsWrapper}>
              {eventsByDay[day].map((event, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.eventCard,
                    { 
                      backgroundColor: event.color,
                      height: Math.max(event.duration / 1.5, 40),
                    }
                  ]}
                >
                  <Text style={styles.eventTitleText} numberOfLines={1}>{event.title}</Text>
                  {event.duration > 45 && (
                    <Text style={styles.eventTimeText}>{event.time}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

CalendarViewComponent.displayName = 'CalendarViewComponent';

function CalendarEvolutionModalComponent({ visible, onClose, calendarData }: CalendarEvolutionModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Google Calendar Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onClose} style={styles.toolbarButton}>
            <X size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Calendar</Text>
          <View style={styles.toolbarActions}>
            <TouchableOpacity style={styles.toolbarButton}>
              <Search size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton}>
              <Users size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolbarButton}>
              <MoreVertical size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.comparisonHeader}>
            <Text style={styles.comparisonTitle}>Time Allocation Shift</Text>
            <Text style={styles.comparisonSubtitle}>See how your weekly rhythm transforms</Text>
          </View>

          {/* Current Calendar */}
          <CalendarViewComponent 
            year={calendarData.current.year}
            events={calendarData.current.events}
          />

          <View style={styles.evolutionArrow}>
            <LinearGradient
              colors={['transparent', 'rgba(192, 132, 252, 0.1)', 'transparent']}
              style={styles.arrowGradient}
            >
              <ChevronRight size={32} color={Colors.gradients.purple[1]} style={{ transform: [{ rotate: '90deg' }] }} />
            </LinearGradient>
          </View>

          {/* Future Calendar */}
          <CalendarViewComponent 
            year={calendarData.future.year}
            events={calendarData.future.events}
          />

          {/* Stats Comparison */}
          <View style={styles.statsContainer}>
            <View style={styles.statsHeader}>
              <Clock size={18} color={Colors.gradients.purple[1]} strokeWidth={2.5} />
              <Text style={styles.statsTitleText}>EFFICIENCY METRICS</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>MEETINGS / WEEK</Text>
                <View style={styles.statBoxValues}>
                  <Text style={styles.statBoxCurrent}>{calendarData.stats.meetingsPerWeek.current}</Text>
                  <ChevronRight size={14} color={Colors.textTertiary} />
                  <Text style={styles.statBoxFuture}>{calendarData.stats.meetingsPerWeek.future}</Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>STRESS LEVEL</Text>
                <View style={styles.statBoxValues}>
                  <Text style={styles.statBoxCurrent}>{calendarData.stats.stressLevel.current}</Text>
                  <ChevronRight size={14} color={Colors.textTertiary} />
                  <Text style={styles.statBoxFuture}>{calendarData.stats.stressLevel.future}</Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>AUTONOMY</Text>
                <View style={styles.statBoxValues}>
                  <Text style={styles.statBoxCurrent}>{calendarData.stats.controlLevel.current}</Text>
                  <ChevronRight size={14} color={Colors.textTertiary} />
                  <Text style={styles.statBoxFuture}>{calendarData.stats.controlLevel.future}</Text>
                </View>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>LAST FIGMA EDIT</Text>
                <View style={styles.statBoxValues}>
                  <Text style={styles.statBoxCurrent}>{calendarData.stats.lastOpenedFigma.current}</Text>
                  <ChevronRight size={14} color={Colors.textTertiary} />
                  <Text style={styles.statBoxFuture}>{calendarData.stats.lastOpenedFigma.future}</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.footerSpacing} />
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity style={styles.fab}>
          <LinearGradient
            colors={Colors.gradients.purple}
            style={styles.fabGradient}
          >
            <Plus size={30} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export const CalendarEvolutionModal = memo(CalendarEvolutionModalComponent);

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
  toolbarTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#3C4043',
    flex: 1,
    marginLeft: 12,
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
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  comparisonHeader: {
    padding: 24,
    paddingBottom: 0,
  },
  comparisonTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: Fonts.primary.regular,
    marginBottom: 4,
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Fonts.secondary.regular,
  },
  calendarContainer: {
    padding: 16,
    marginTop: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  calendarYear: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gradients.purple[1],
    fontFamily: Fonts.secondary.bold,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#F1F3F4',
    borderRadius: 16,
    overflow: 'hidden',
  },
  timeColumn: {
    width: 45,
    backgroundColor: '#F8F9FA',
    paddingVertical: 40,
    alignItems: 'center',
    gap: 60,
    borderRightWidth: 1,
    borderRightColor: '#F1F3F4',
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#70757A',
  },
  dayColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#F1F3F4',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#70757A',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  eventsWrapper: {
    padding: 4,
    gap: 4,
    height: 240,
  },
  eventCard: {
    borderRadius: 4,
    padding: 4,
    justifyContent: 'center',
  },
  eventTitleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventTimeText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  evolutionArrow: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  statBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  statBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textTertiary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  statBoxValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBoxCurrent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statBoxFuture: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.gradients.purple[1],
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpacing: {
    height: 100,
  },
});
