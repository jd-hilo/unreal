import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { Input } from '@/components/Input';
import { HappinessSlider } from '@/components/HappinessSlider';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile } from '@/lib/storage';
import { trackEvent, MixpanelEvents } from '@/lib/mixpanel';
import * as Haptics from 'expo-haptics';

const INTERESTS = [
  { emoji: '🎵', label: 'Music' },
  { emoji: '🎬', label: 'Movies' },
  { emoji: '📚', label: 'Reading' },
  { emoji: '🏋️', label: 'Fitness' },
  { emoji: '🍳', label: 'Cooking' },
  { emoji: '✈️', label: 'Travel' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '🎨', label: 'Art' },
  { emoji: '📸', label: 'Photography' },
  { emoji: '🧘', label: 'Yoga' },
  { emoji: '🌱', label: 'Gardening' },
  { emoji: '🎭', label: 'Theater' },
  { emoji: '🎲', label: 'Board Games' },
  { emoji: '🏔️', label: 'Hiking' },
  { emoji: '🎸', label: 'Playing Music' },
  { emoji: '✍️', label: 'Writing' },
  { emoji: '🧩', label: 'Puzzles' },
  { emoji: '🎪', label: 'Comedy' },
  { emoji: '🍷', label: 'Wine' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🐕', label: 'Dogs' },
  { emoji: '🐱', label: 'Cats' },
  { emoji: '🌍', label: 'Languages' },
  { emoji: '🔬', label: 'Science' },
  { emoji: '💻', label: 'Coding' },
  { emoji: '📱', label: 'Tech' },
  { emoji: '🏕️', label: 'Camping' },
  { emoji: '🎤', label: 'Singing' },
  { emoji: '💃', label: 'Dancing' },
  { emoji: '🖌️', label: 'Drawing' },
  { emoji: '🧵', label: 'Crafts' },
  { emoji: '🤹', label: 'Circus' },
  { emoji: '🏺', label: 'Pottery' },
  { emoji: '⚽', label: 'Soccer' },
  { emoji: '🏀', label: 'Basketball' },
  { emoji: '🏈', label: 'Football' },
  { emoji: '⚾', label: 'Baseball' },
  { emoji: '🎾', label: 'Tennis' },
  { emoji: '🏐', label: 'Volleyball' },
  { emoji: '🏉', label: 'Rugby' },
  { emoji: '🏓', label: 'Table Tennis' },
  { emoji: '🏸', label: 'Badminton' },
  { emoji: '🏒', label: 'Hockey' },
  { emoji: '🥊', label: 'Boxing' },
  { emoji: '🥋', label: 'Martial Arts' },
  { emoji: '🤺', label: 'Fencing' },
  { emoji: '⛳', label: 'Golf' },
  { emoji: '🏹', label: 'Archery' },
  { emoji: '🎣', label: 'Fishing' },
  { emoji: '🏊', label: 'Swimming' },
  { emoji: '🤽', label: 'Water Polo' },
  { emoji: '🚣', label: 'Rowing' },
  { emoji: '⛷️', label: 'Skiing' },
  { emoji: '🏂', label: 'Snowboarding' },
  { emoji: '🏄', label: 'Surfing' },
  { emoji: '🏇', label: 'Horse Racing' },
  { emoji: '🚴', label: 'Cycling' },
  { emoji: '🏃', label: 'Running' },
  { emoji: '🚶', label: 'Walking' },
  { emoji: '🧗', label: 'Rock Climbing' },
  { emoji: '🏔️', label: 'Mountaineering' },
  { emoji: '🤸', label: 'Gymnastics' },
  { emoji: '🤾', label: 'Handball' },
  { emoji: '🏋️', label: 'Weightlifting' },
  { emoji: '🤼', label: 'Wrestling' },
  { emoji: '⛸️', label: 'Ice Skating' },
  { emoji: '🏎️', label: 'Racing' },
  { emoji: '🏍️', label: 'Motorcycling' },
  { emoji: '🚵', label: 'Mountain Biking' },
];

interface LifeSituationAnswers {
  workStatus: string;
  workStatusOther: string;
  // Work follow-ups
  currentJob?: string;
  jobHappiness?: number | null;
  // Living situation
  livingSituation: string;
  livingSituationOther: string;
  // Relationship status
  relationshipStatus: string;
  relationshipStatusOther: string;
  // Relationship follow-ups (single)
  singleHowLong?: string;
  beenInRelationshipBefore?: string;
  lookingFor?: string;
  // Relationship follow-ups (in relationship)
  relationshipHowLong?: string;
  partnerFirstName?: string;
  relationshipHappiness?: number | null;
  // Financial
  financialSituation: string;
  financialSituationOther: string;
  // Life stage
  lifeStage: string;
  lifeStageOther: string;
  // Goals
  currentGoals: string;
  // Interests
  interests?: string[];
}

export default function LifeSituationGroupScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentSubQuestion, setCurrentSubQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<LifeSituationAnswers>({
    workStatus: '',
    workStatusOther: '',
    livingSituation: '',
    livingSituationOther: '',
    relationshipStatus: '',
    relationshipStatusOther: '',
    financialSituation: '',
    financialSituationOther: '',
    lifeStage: '',
    lifeStageOther: '',
    currentGoals: '',
  });

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      const existingData = profile?.core_json?.onboarding_responses?.['01-now-group'];
      if (existingData) {
        try {
          const parsed = JSON.parse(existingData);
          setAnswers(parsed);
        } catch (e) {
          // If not JSON, ignore
        }
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  function updateAnswer(field: keyof LifeSituationAnswers, value: string | number | null) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  }

  function needsWorkFollowUps(): boolean {
    return ['Employed full-time', 'Employed part-time', 'Freelancer'].includes(answers.workStatus);
  }

  function needsRelationshipFollowUps(): boolean {
    return ['Single', 'Dating', 'Partnered', 'Married'].includes(answers.relationshipStatus);
  }

  function isSingle(): boolean {
    return answers.relationshipStatus === 'Single';
  }

  function isInRelationship(): boolean {
    return ['Dating', 'Partnered', 'Married'].includes(answers.relationshipStatus);
  }

  function handleNext() {
    // Handle sub-questions first
    if (currentSubQuestion) {
      handleSubQuestionNext();
      return;
    }

    // Check if current question needs follow-ups
    if (currentQuestion === 0 && needsWorkFollowUps()) {
      if (!answers.currentJob) {
        setCurrentSubQuestion('work-job');
        return;
      }
      if (answers.jobHappiness === null || answers.jobHappiness === undefined) {
        setCurrentSubQuestion('work-happiness');
        return;
      }
    }

    if (currentQuestion === 2 && needsRelationshipFollowUps()) {
      if (isSingle()) {
        if (!answers.singleHowLong) {
          setCurrentSubQuestion('single-how-long');
          return;
        }
        if (!answers.beenInRelationshipBefore) {
          setCurrentSubQuestion('single-been-before');
          return;
        }
        if (!answers.lookingFor) {
          setCurrentSubQuestion('single-looking-for');
          return;
        }
      } else if (isInRelationship()) {
        if (!answers.relationshipHowLong) {
          setCurrentSubQuestion('relationship-how-long');
          return;
        }
        if (!answers.partnerFirstName) {
          setCurrentSubQuestion('relationship-partner-name');
          return;
        }
        if (answers.relationshipHappiness === null || answers.relationshipHappiness === undefined) {
          setCurrentSubQuestion('relationship-happiness');
          return;
        }
      }
    }

    // Move to next main question
    if (currentQuestion < 6) {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentSubQuestion(null);
    } else {
      handleComplete();
    }
  }

  function handleSubQuestionNext() {
    if (!currentSubQuestion) return;

    // Handle work follow-ups
    if (currentSubQuestion === 'work-job') {
      if (answers.currentJob) {
        setCurrentSubQuestion('work-happiness');
      }
      return;
    }

    if (currentSubQuestion === 'work-happiness') {
      if (answers.jobHappiness !== null && answers.jobHappiness !== undefined) {
        setCurrentSubQuestion(null);
        setCurrentQuestion(1);
      }
      return;
    }

    // Handle single relationship follow-ups
    if (currentSubQuestion === 'single-how-long') {
      if (answers.singleHowLong) {
        setCurrentSubQuestion('single-been-before');
      }
      return;
    }

    if (currentSubQuestion === 'single-been-before') {
      if (answers.beenInRelationshipBefore) {
        setCurrentSubQuestion('single-looking-for');
      }
      return;
    }

    if (currentSubQuestion === 'single-looking-for') {
      if (answers.lookingFor) {
        setCurrentSubQuestion(null);
        setCurrentQuestion(3);
      }
      return;
    }

    // Handle in-relationship follow-ups
    if (currentSubQuestion === 'relationship-how-long') {
      if (answers.relationshipHowLong) {
        setCurrentSubQuestion('relationship-partner-name');
      }
      return;
    }

    if (currentSubQuestion === 'relationship-partner-name') {
      if (answers.partnerFirstName) {
        setCurrentSubQuestion('relationship-happiness');
      }
      return;
    }

    if (currentSubQuestion === 'relationship-happiness') {
      if (answers.relationshipHappiness !== null && answers.relationshipHappiness !== undefined) {
        setCurrentSubQuestion(null);
        setCurrentQuestion(3);
      }
      return;
    }
  }

  async function handleComplete() {
    if (user) {
      try {
        const { saveOnboardingResponse } = await import('@/lib/storage');
        // Save answers temporarily for AI summarization
        await saveOnboardingResponse(user.id, '01-now-group', JSON.stringify(answers));
        trackEvent(MixpanelEvents.ONBOARDING_STEP_COMPLETED, {
          step: '01-now-group',
          step_name: 'Life Situation'
        });
      } catch (error) {
        console.error('Failed to save answers:', error);
      }
    }
    router.push('/onboarding/02-path-group');
  }

  function canContinue(): boolean {
    // Check sub-questions first
    if (currentSubQuestion === 'work-job') {
      return !!answers.currentJob?.trim();
    }
    if (currentSubQuestion === 'work-happiness') {
      return answers.jobHappiness !== null && answers.jobHappiness !== undefined;
    }
    if (currentSubQuestion === 'single-how-long') {
      return !!answers.singleHowLong;
    }
    if (currentSubQuestion === 'single-been-before') {
      return !!answers.beenInRelationshipBefore;
    }
    if (currentSubQuestion === 'single-looking-for') {
      return !!answers.lookingFor;
    }
    if (currentSubQuestion === 'relationship-how-long') {
      return !!answers.relationshipHowLong;
    }
    if (currentSubQuestion === 'relationship-partner-name') {
      return !!answers.partnerFirstName?.trim();
    }
    if (currentSubQuestion === 'relationship-happiness') {
      return answers.relationshipHappiness !== null && answers.relationshipHappiness !== undefined;
    }

    // Check main questions
    switch (currentQuestion) {
      case 0:
        return !!answers.workStatus;
      case 1:
        return !!answers.livingSituation;
      case 2:
        return !!answers.relationshipStatus;
      case 3:
        return !!answers.financialSituation;
      case 4:
        return !!answers.lifeStage;
      case 5:
        return true; // Goals are optional but we allow empty
      case 6:
        return (answers.interests?.length || 0) > 0; // At least one interest required
      default:
        return false;
    }
  }

  function getQuestionTitle(): string {
    // Sub-question titles
    if (currentSubQuestion === 'work-job') {
      return 'What is your current job?';
    }
    if (currentSubQuestion === 'work-happiness') {
      return 'How happy are you with your job?';
    }
    if (currentSubQuestion === 'single-how-long') {
      return 'How long have you been single?';
    }
    if (currentSubQuestion === 'single-been-before') {
      return 'Have you been in a relationship before?';
    }
    if (currentSubQuestion === 'single-looking-for') {
      return 'What are you looking for?';
    }
    if (currentSubQuestion === 'relationship-how-long') {
      return 'How long have you been together?';
    }
    if (currentSubQuestion === 'relationship-partner-name') {
      return 'What is your partner\'s first name?';
    }
    if (currentSubQuestion === 'relationship-happiness') {
      return 'How happy are you in your relationship?';
    }

    // Main question titles
    const titles = [
      'What\'s your work status?',
      'What\'s your living situation?',
      'What\'s your relationship status?',
      'How would you describe your financial situation?',
      'What stage of life are you in?',
      'What are your current goals?',
      'What are you interested in?',
    ];
    return titles[currentQuestion] || '';
  }

  function getProgress(): number {
    // Progress calculation is approximate since we have dynamic sub-questions
    // Start higher and progress more slowly to give users sense of progress
    const baseProgress = 40 + (currentQuestion / 7) * 5;
    return Math.min(baseProgress, 45);
  }

  function toggleInterest(interest: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswers((prev) => {
      const currentInterests = prev.interests || [];
      if (currentInterests.includes(interest)) {
        return { ...prev, interests: currentInterests.filter((i) => i !== interest) };
      } else {
        return { ...prev, interests: [...currentInterests, interest] };
      }
    });
  }

  return (
    <OnboardingScreen
      title={getQuestionTitle()}
      progress={getProgress()}
      onNext={handleNext}
      canContinue={canContinue()}
      backgroundGradient={['#0C0C10', '#0F0F11', '#0F1A2E', '#1A2D4E']}
      buttonGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      progressBarGradient={['rgba(135, 206, 250, 0.9)', 'rgba(100, 181, 246, 0.8)', 'rgba(135, 206, 250, 0.7)']}
      buttonShadowColor="rgba(135, 206, 250, 0.5)"
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Work Status Question */}
        {currentQuestion === 0 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['Employed full-time', 'Employed part-time', 'Student', 'Freelancer', 'Unemployed', 'Retired', 'Other']}
            selectedValue={answers.workStatus}
            onSelect={(value) => updateAnswer('workStatus', value)}
            otherValue={answers.workStatusOther}
            onOtherChange={(value) => updateAnswer('workStatusOther', value)}
          />
        )}

        {/* Work Follow-ups */}
        {currentSubQuestion === 'work-job' && (
          <View style={styles.subQuestionContainer}>
            <Input
              placeholder="e.g., Software Engineer, Marketing Manager, Consultant..."
              value={answers.currentJob || ''}
              onChangeText={(value) => updateAnswer('currentJob', value)}
              autoFocus={true}
              containerStyle={styles.subQuestionInput}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
        )}

        {currentSubQuestion === 'work-happiness' && (
          <View style={styles.subQuestionContainer}>
            <HappinessSlider
              value={answers.jobHappiness ?? null}
              onValueChange={(value) => updateAnswer('jobHappiness', value)}
              label="Rate your job satisfaction"
            />
          </View>
        )}

        {/* Living Situation Question */}
        {currentQuestion === 1 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['Alone', 'With partner', 'With family', 'With roommates', 'Other']}
            selectedValue={answers.livingSituation}
            onSelect={(value) => updateAnswer('livingSituation', value)}
            otherValue={answers.livingSituationOther}
            onOtherChange={(value) => updateAnswer('livingSituationOther', value)}
          />
        )}

        {/* Relationship Status Question */}
        {currentQuestion === 2 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['Single', 'Dating', 'Partnered', 'Married', 'Other']}
            selectedValue={answers.relationshipStatus}
            onSelect={(value) => updateAnswer('relationshipStatus', value)}
            otherValue={answers.relationshipStatusOther}
            onOtherChange={(value) => updateAnswer('relationshipStatusOther', value)}
          />
        )}

        {/* Single Relationship Follow-ups */}
        {currentSubQuestion === 'single-how-long' && (
          <View style={styles.subQuestionContainer}>
            <ChoiceQuestion
              question=""
              options={['Less than 6 months', '6 months - 1 year', '1-2 years', '2-5 years', 'More than 5 years']}
              selectedValue={answers.singleHowLong || ''}
              onSelect={(value) => updateAnswer('singleHowLong', value)}
            />
          </View>
        )}

        {currentSubQuestion === 'single-been-before' && (
          <View style={styles.subQuestionContainer}>
            <ChoiceQuestion
              question=""
              options={['Yes', 'No']}
              selectedValue={answers.beenInRelationshipBefore || ''}
              onSelect={(value) => updateAnswer('beenInRelationshipBefore', value)}
            />
          </View>
        )}

        {currentSubQuestion === 'single-looking-for' && (
          <View style={styles.subQuestionContainer}>
            <ChoiceQuestion
              question=""
              options={['Serious relationship', 'Casual dating', 'Friendship first', 'Not sure yet']}
              selectedValue={answers.lookingFor || ''}
              onSelect={(value) => updateAnswer('lookingFor', value)}
            />
          </View>
        )}

        {/* In-Relationship Follow-ups */}
        {currentSubQuestion === 'relationship-how-long' && (
          <View style={styles.subQuestionContainer}>
            <ChoiceQuestion
              question=""
              options={['Less than 6 months', '6 months - 1 year', '1-2 years', '2-5 years', 'More than 5 years']}
              selectedValue={answers.relationshipHowLong || ''}
              onSelect={(value) => updateAnswer('relationshipHowLong', value)}
            />
          </View>
        )}

        {currentSubQuestion === 'relationship-partner-name' && (
          <View style={styles.subQuestionContainer}>
            <Input
              placeholder="This will help personalize responses"
              value={answers.partnerFirstName || ''}
              onChangeText={(value) => updateAnswer('partnerFirstName', value)}
              autoFocus={true}
              containerStyle={styles.subQuestionInput}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
        )}

        {currentSubQuestion === 'relationship-happiness' && (
          <View style={styles.subQuestionContainer}>
            <HappinessSlider
              value={answers.relationshipHappiness ?? null}
              onValueChange={(value) => updateAnswer('relationshipHappiness', value)}
              label="Rate your relationship satisfaction"
            />
          </View>
        )}

        {/* Financial Situation Question */}
        {currentQuestion === 3 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['Comfortable', 'Tight', 'Building wealth', 'Struggling', 'Other']}
            selectedValue={answers.financialSituation}
            onSelect={(value) => updateAnswer('financialSituation', value)}
            otherValue={answers.financialSituationOther}
            onOtherChange={(value) => updateAnswer('financialSituationOther', value)}
          />
        )}

        {/* Life Stage Question */}
        {currentQuestion === 4 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['Early career', 'Mid-career', 'Established', 'Transition', 'Other']}
            selectedValue={answers.lifeStage}
            onSelect={(value) => updateAnswer('lifeStage', value)}
            otherValue={answers.lifeStageOther}
            onOtherChange={(value) => updateAnswer('lifeStageOther', value)}
          />
        )}

        {/* Goals Question */}
        {currentQuestion === 5 && !currentSubQuestion && (
          <View style={styles.goalsContainer}>
            <Input
              placeholder="What are you working towards right now? (e.g., career change, starting a business, buying a home, improving health...)"
              value={answers.currentGoals}
              onChangeText={(value) => updateAnswer('currentGoals', value)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus={true}
              containerStyle={styles.goalsInput}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
        )}

        {/* Interests Question */}
        {currentQuestion === 6 && !currentSubQuestion && (
          <View style={styles.interestsContainer}>
            <View style={styles.interestsGrid}>
              {INTERESTS.map((interest) => {
                const isSelected = (answers.interests || []).includes(interest.label);
                return (
                  <TouchableOpacity
                    key={interest.label}
                    style={[
                      styles.interestCard,
                      isSelected && styles.interestCardSelected,
                    ]}
                    onPress={() => toggleInterest(interest.label)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emoji}>{interest.emoji}</Text>
                    <Text
                      style={[
                        styles.interestLabel,
                        isSelected && styles.interestLabelSelected,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit={false}
                    >
                      {interest.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  subQuestionContainer: {
    marginTop: 8,
  },
  subQuestionInput: {
    marginBottom: 0,
  },
  goalsContainer: {
    marginTop: 8,
  },
  goalsInput: {
    marginBottom: 0,
  },
  interestsContainer: {
    marginTop: 8,
  },
  interestsSubtitle: {
    fontSize: 15,
    color: 'rgba(200, 200, 200, 0.7)',
    marginBottom: 20,
    fontWeight: '400',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 250, 0.2)',
    width: '48%',
  },
  interestCardSelected: {
    backgroundColor: 'rgba(135, 206, 250, 0.2)',
    borderColor: 'rgba(135, 206, 250, 0.8)',
    borderWidth: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  interestLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
    flexShrink: 1,
    lineHeight: 18,
  },
  interestLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

