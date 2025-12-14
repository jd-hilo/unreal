import { useState, useEffect } from 'react';
import { getOrGenerateLifeScore } from '@/lib/lifeScore';
import { LifeScoreEventsData } from '@/types/database';

interface UseLifeScoreResult {
  score: number;
  previousScore: number | null;
  peakScore: number;
  isNewPeak: boolean;
  events: LifeScoreEventsData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLifeScore(userId: string | null): UseLifeScoreResult {
  const [score, setScore] = useState<number>(100); // Default to baseline 100
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [peakScore, setPeakScore] = useState<number>(100);
  const [isNewPeak, setIsNewPeak] = useState<boolean>(false);
  const [events, setEvents] = useState<LifeScoreEventsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    async function loadLifeScore() {
      if (!userId) {
        setIsLoading(false);
        setError('User not authenticated.');
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const data = await getOrGenerateLifeScore(userId);
        setScore(data.score);
        setPreviousScore(data.previousScore);
        setPeakScore(data.peakScore);
        setIsNewPeak(data.isNewPeak);
        setEvents(data.events);
      } catch (err) {
        console.error('Failed to load or generate life score:', err);
        setError('Failed to load daily life score.');
        // Fallback to default values on error
        setScore(100);
        setPreviousScore(null);
        setPeakScore(100);
        setIsNewPeak(false);
        setEvents({
          date: new Date().toISOString().split('T')[0],
          netDelta: 0,
          events: [
            { title: 'System Check', delta: 0, message: 'Your life score is calibrating. No major events today.' },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadLifeScore();
  }, [userId, refreshTrigger]);

  return { score, previousScore, peakScore, isNewPeak, events, isLoading, error, refresh };
}
