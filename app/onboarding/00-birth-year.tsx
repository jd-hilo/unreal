import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useAuth } from '@/store/useAuth';
import { getProfile, saveOnboardingResponse, updateProfileFields } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import { Colors, Fonts } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

const currentYear = new Date().getFullYear();
const YEARS: number[] = [];
for (let y = currentYear - 13; y >= 1930; y--) {
  YEARS.push(y);
}

interface ColumnProps {
  items: string[];
  selectedIndex: number;
  onIndexChange: (i: number) => void;
  flex?: number;
}

function PickerColumn({ items, selectedIndex, onIndexChange, flex = 1 }: ColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isSnapping = useRef(false);
  const lastHapticIdx = useRef(selectedIndex);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, []);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (isSnapping.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    if (clamped !== lastHapticIdx.current) {
      lastHapticIdx.current = clamped;
      Haptics.selectionAsync();
    }
  }

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (isSnapping.current) return;
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(items.length - 1, idx));
    onIndexChange(clamped);
    const targetY = clamped * ITEM_HEIGHT;
    if (Math.abs(y - targetY) > 1) {
      isSnapping.current = true;
      scrollRef.current?.scrollTo({ y: targetY, animated: false });
      setTimeout(() => { isSnapping.current = false; }, 100);
    }
  }

  return (
    <View style={[styles.column, { flex }]}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        scrollEventThrottle={ITEM_HEIGHT}
        nestedScrollEnabled
      >
        {items.map((item, i) => (
          <View key={item} style={styles.pickerItem}>
            <Text
              style={[
                styles.pickerText,
                i === selectedIndex && styles.pickerTextSelected,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function BirthdayScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);

  const today = new Date();
  const [monthIdx, setMonthIdx] = useState(today.getMonth());
  const [dayIdx, setDayIdx] = useState(today.getDate() - 1);
  const [yearIdx, setYearIdx] = useState(0);

  useFocusEffect(
    useCallback(() => {
      trackEvent('OB - birthday');
    }, [])
  );

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    try {
      const profile = await getProfile(user.id);
      const stored = profile?.core_json?.onboarding_responses?.['birthday'];
      if (stored) {
        const d = new Date(stored);
        if (!isNaN(d.getTime())) {
          setMonthIdx(d.getUTCMonth());
          setDayIdx(d.getUTCDate() - 1);
          const yIdx = YEARS.indexOf(d.getUTCFullYear());
          if (yIdx >= 0) setYearIdx(yIdx);
        }
      } else {
        // fallback: legacy birth-year only
        const storedYear = profile?.core_json?.onboarding_responses?.['birth-year'];
        if (storedYear) {
          const yIdx = YEARS.indexOf(Number(storedYear));
          if (yIdx >= 0) setYearIdx(yIdx);
        }
      }
    } catch (e) {
      console.error('Failed to load birthday:', e);
    }
  }

  // Recompute day list when month/year changes
  const year = YEARS[yearIdx];
  const numDays = daysInMonth(monthIdx + 1, year);
  const days = Array.from({ length: numDays }, (_, i) => String(i + 1));
  const clampedDayIdx = Math.min(dayIdx, numDays - 1);

  async function handleNext() {
    const month = monthIdx + 1;
    const day = clampedDayIdx + 1;
    const birthdayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (user) {
      try {
        // Save full birthday and keep birth-year for backward compat
        await saveOnboardingResponse(user.id, 'birthday', birthdayStr);
        await saveOnboardingResponse(user.id, 'birth-year', String(year));
        // Also write to dedicated columns
        await updateProfileFields(user.id, {
          birthday: birthdayStr,
        });
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '00-birthday',
          step_name: 'Birthday',
        });
      } catch (e) {
        console.error('Failed to save birthday:', e);
      }
    }
    router.push('/onboarding/00-gender' as any);
  }

  const monthItems = MONTHS;
  const yearItems = YEARS.map(String);

  return (
    <OnboardingScreen
      title="When's your birthday?"
      progress={0.30}
      onNext={handleNext}
    >
      <View style={styles.pickerContainer}>
        {/* Selection highlight */}
        <View pointerEvents="none" style={styles.selectionBar} />

        {/* Top fade */}
        <View pointerEvents="none" style={styles.fadeTop}>
          <LinearGradient
            colors={['#FFFFFF', 'rgba(255,255,255,0)']}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.columns}>
          <PickerColumn
            items={monthItems}
            selectedIndex={monthIdx}
            onIndexChange={setMonthIdx}
            flex={2.2}
          />
          <PickerColumn
            items={days}
            selectedIndex={clampedDayIdx}
            onIndexChange={setDayIdx}
          />
          <PickerColumn
            items={yearItems}
            selectedIndex={yearIdx}
            onIndexChange={setYearIdx}
          />
        </View>

        {/* Bottom fade */}
        <View pointerEvents="none" style={styles.fadeBottom}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', '#FFFFFF']}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    marginTop: 16,
    height: PICKER_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  selectionBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: 'rgba(37, 114, 159, 0.07)',
    borderRadius: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(37, 114, 159, 0.15)',
    zIndex: 2,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 3,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 2,
    zIndex: 3,
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    height: PICKER_HEIGHT,
    alignItems: 'center',
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 17,
    color: Colors.textTertiary,
    fontFamily: Fonts.secondary.regular,
    textAlign: 'center',
  },
  pickerTextSelected: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Fonts.secondary.bold,
    textAlign: 'center',
  },
});
