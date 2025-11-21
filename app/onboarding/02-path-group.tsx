import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/components/OnboardingScreen';
import { ChoiceQuestion } from '@/components/ChoiceQuestion';
import { Input } from '@/components/Input';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/store/useAuth';
import { getProfile, updateProfileFields } from '@/lib/storage';

interface LifeJourneyAnswers {
  hometown: string;
  hometownOther: string;
  // College questions
  wentToCollege?: string;
  collegeName?: string;
  // Other questions
  careerStart: string;
  careerStartOther: string;
  turningPoint: string;
  turningPointOther: string;
  shapedMost: string;
  shapedMostOther: string;
}

export default function LifeJourneyGroupScreen() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentSubQuestion, setCurrentSubQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<LifeJourneyAnswers>({
    hometown: '',
    hometownOther: '',
    careerStart: '',
    careerStartOther: '',
    turningPoint: '',
    turningPointOther: '',
    shapedMost: '',
    shapedMostOther: '',
  });

  useEffect(() => {
    loadExistingData();
  }, [user]);

  async function loadExistingData() {
    if (!user) return;
    
    try {
      const profile = await getProfile(user.id);
      const existingData = profile?.core_json?.onboarding_responses?.['02-path-group'];
      
      let loadedAnswers: Partial<LifeJourneyAnswers> = {};
      
      if (existingData) {
        try {
          loadedAnswers = JSON.parse(existingData);
        } catch (e) {
          // If not JSON, ignore
        }
      }
      
      // Also check for hometown and university in profile
      if (profile?.hometown && !loadedAnswers.hometown) {
        loadedAnswers.hometown = profile.hometown;
      }
      if (profile?.university && !loadedAnswers.collegeName) {
        loadedAnswers.wentToCollege = 'Yes';
        loadedAnswers.collegeName = profile.university;
      }
      
      if (Object.keys(loadedAnswers).length > 0) {
        setAnswers((prev) => ({ ...prev, ...loadedAnswers }));
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
    }
  }

  function updateAnswer(field: keyof LifeJourneyAnswers, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    
    // Save hometown immediately when answered
    if (field === 'hometown' && value.trim() && user) {
      updateProfileFields(user.id, { hometown: value.trim() }).catch(console.error);
    }
  }

  function needsCollegeFollowUp(): boolean {
    return answers.wentToCollege === 'Yes';
  }

  function handleNext() {
    // Handle sub-questions first
    if (currentSubQuestion) {
      handleSubQuestionNext();
      return;
    }

    // Check if current question needs follow-ups
    if (currentQuestion === 1 && needsCollegeFollowUp()) {
      if (!answers.collegeName) {
        setCurrentSubQuestion('college-name');
        return;
      }
    }

    // Move to next main question
    if (currentQuestion < 4) {
      setCurrentQuestion(currentQuestion + 1);
      setCurrentSubQuestion(null);
    } else {
      handleComplete();
    }
  }

  function handleSubQuestionNext() {
    if (!currentSubQuestion) return;

    // Handle college follow-up
    if (currentSubQuestion === 'college-name') {
      if (answers.collegeName?.trim() && user) {
        // Save university immediately
        updateProfileFields(user.id, { university: answers.collegeName.trim() }).catch(console.error);
        setCurrentSubQuestion(null);
        setCurrentQuestion(2);
      }
      return;
    }
  }

  async function handleComplete() {
    if (user) {
      try {
        const { saveOnboardingResponse } = await import('@/lib/storage');
        // Save answers temporarily for AI summarization
        await saveOnboardingResponse(user.id, '02-path-group', JSON.stringify(answers));
        
        // Ensure hometown and university are saved
        if (answers.hometown?.trim()) {
          await updateProfileFields(user.id, { hometown: answers.hometown.trim() });
        }
        if (answers.collegeName?.trim()) {
          await updateProfileFields(user.id, { university: answers.collegeName.trim() });
        }
      } catch (error) {
        console.error('Failed to save answers:', error);
      }
    }
    router.push('/onboarding/challenges');
  }

  function canContinue(): boolean {
    // Check sub-questions first
    if (currentSubQuestion === 'college-name') {
      return !!answers.collegeName?.trim();
    }

    // Check main questions
    switch (currentQuestion) {
      case 0:
        return !!answers.hometown?.trim();
      case 1:
        return !!answers.wentToCollege;
      case 2:
        return !!answers.careerStart;
      case 3:
        return !!answers.turningPoint;
      case 4:
        return !!answers.shapedMost;
      default:
        return false;
    }
  }

  function getQuestionTitle(): string {
    // Sub-question titles
    if (currentSubQuestion === 'college-name') {
      return 'What college did you attend?';
    }

    // Main question titles
    const titles = [
      'Where did you grow up?',
      'Did you go to college?',
      'How did you start your career?',
      'What was a key turning point?',
      'What shaped you most?',
    ];
    return titles[currentQuestion] || '';
  }

  function getProgress(): number {
    return 30 + (currentQuestion / 5) * 10; // 30-40% range
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
        {/* Hometown Question */}
        {currentQuestion === 0 && !currentSubQuestion && (
          <View style={styles.hometownContainer}>
            <Input
              placeholder="City, State/Country (e.g., Austin, TX or London, UK)"
              value={answers.hometown}
              onChangeText={(value) => updateAnswer('hometown', value)}
              autoFocus={true}
              containerStyle={styles.hometownInput}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
        )}

        {/* College Question */}
        {currentQuestion === 1 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['Yes', 'No']}
            selectedValue={answers.wentToCollege || ''}
            onSelect={(value) => updateAnswer('wentToCollege', value)}
          />
        )}

        {/* College Name Follow-up */}
        {currentSubQuestion === 'college-name' && (
          <View style={styles.subQuestionContainer}>
            <Input
              placeholder="e.g., Harvard University, Stanford, MIT..."
              value={answers.collegeName || ''}
              onChangeText={(value) => updateAnswer('collegeName', value)}
              autoFocus={true}
              containerStyle={styles.subQuestionInput}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
            />
          </View>
        )}

        {/* Career Start Question */}
        {currentQuestion === 2 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['First job', 'Internship', 'Entrepreneurship', 'Freelancing', 'Family business', 'Other']}
            selectedValue={answers.careerStart}
            onSelect={(value) => updateAnswer('careerStart', value)}
            otherValue={answers.careerStartOther}
            onOtherChange={(value) => updateAnswer('careerStartOther', value)}
          />
        )}

        {/* Turning Point Question */}
        {currentQuestion === 3 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['Graduation', 'Moving cities', 'Job change', 'Relationship', 'Family event', 'Other']}
            selectedValue={answers.turningPoint}
            onSelect={(value) => updateAnswer('turningPoint', value)}
            otherValue={answers.turningPointOther}
            onOtherChange={(value) => updateAnswer('turningPointOther', value)}
          />
        )}

        {/* Shaped Most Question */}
        {currentQuestion === 4 && !currentSubQuestion && (
          <ChoiceQuestion
            question=""
            options={['Family', 'Mentors', 'Experiences', 'Values', 'Education', 'Other']}
            selectedValue={answers.shapedMost}
            onSelect={(value) => updateAnswer('shapedMost', value)}
            otherValue={answers.shapedMostOther}
            onOtherChange={(value) => updateAnswer('shapedMostOther', value)}
          />
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
  hometownContainer: {
    marginTop: 8,
  },
  hometownInput: {
    marginBottom: 0,
  },
  subQuestionContainer: {
    marginTop: 8,
  },
  subQuestionInput: {
    marginBottom: 0,
  },
});

