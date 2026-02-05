import { useState, useEffect } from 'react';
import { getCareerSimulations } from '@/lib/storage';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export function useCareerSimCooldown() {
  const { user } = useAuth();
  const { isPremium } = useTwin();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [lastSimulationDate, setLastSimulationDate] = useState<Date | null>(null);

  useEffect(() => {
    const checkCooldown = async () => {
      if (!user?.id || isPremium) {
        setIsOnCooldown(false);
        setTimeRemaining(null);
        return;
      }

      try {
        const simulations = await getCareerSimulations(user.id);
        if (simulations.length === 0) {
          setIsOnCooldown(false);
          setTimeRemaining(null);
          return;
        }

        // Get the most recent simulation
        const mostRecent = simulations[0];
        const lastSimDate = new Date(mostRecent.created_at);
        setLastSimulationDate(lastSimDate);

        const now = new Date();
        const timeSinceLastSim = now.getTime() - lastSimDate.getTime();
        const remaining = COOLDOWN_MS - timeSinceLastSim;

        if (remaining > 0) {
          setIsOnCooldown(true);
          setTimeRemaining(remaining);
        } else {
          setIsOnCooldown(false);
          setTimeRemaining(null);
        }
      } catch (error) {
        console.error('Error checking cooldown:', error);
        setIsOnCooldown(false);
        setTimeRemaining(null);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000); // Update every second

    return () => clearInterval(interval);
  }, [user?.id, isPremium]);

  // Update time remaining every second
  useEffect(() => {
    if (!isOnCooldown || !timeRemaining) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (!prev || prev <= 1000) {
          setIsOnCooldown(false);
          return null;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnCooldown, timeRemaining]);

  const formatTimeRemaining = (ms: number): string => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  };

  return {
    isOnCooldown,
    timeRemaining,
    formattedTime: timeRemaining ? formatTimeRemaining(timeRemaining) : null,
    lastSimulationDate,
  };
}
