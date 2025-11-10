import { useState, useEffect } from 'react';
import { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import {
  initializeRevenueCat,
  getAvailablePackages,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  isPremiumActive,
  syncPremiumStatus,
  checkAndSyncPremiumStatus,
} from '@/lib/revenuecat';
import { useAuth } from '@/store/useAuth';
import { useTwin } from '@/store/useTwin';

export function usePremium() {
  const user = useAuth((state) => state.user);
  const { isPremium, setPremium } = useTwin();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Initialize RevenueCat and check premium status
  useEffect(() => {
    if (user) {
      initializePremium();
    }
  }, [user]);

  async function initializePremium() {
    if (!user) return;

    try {
      setLoading(true);
      
      // Initialize RevenueCat
      await initializeRevenueCat(user.id);

      // Check premium status
      const premiumStatus = await checkAndSyncPremiumStatus(user.id);
      setPremium(premiumStatus);

      // Load available packages
      const availablePackages = await getAvailablePackages();
      setPackages(availablePackages);
    } catch (error) {
      console.error('Failed to initialize premium:', error);
    } finally {
      setLoading(false);
    }
  }

  async function purchase(pkg: PurchasesPackage): Promise<boolean> {
    if (!user) return false;

    try {
      setPurchasing(true);
      const customerInfo = await purchasePackage(pkg);

      if (customerInfo) {
        const isPremium = isPremiumActive(customerInfo);
        await syncPremiumStatus(user.id, isPremium);
        setPremium(isPremium);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    } finally {
      setPurchasing(false);
    }
  }

  async function restore(): Promise<boolean> {
    if (!user) return false;

    try {
      setRestoring(true);
      const customerInfo = await restorePurchases();
      const isPremium = isPremiumActive(customerInfo);
      await syncPremiumStatus(user.id, isPremium);
      setPremium(isPremium);
      return isPremium;
    } catch (error) {
      console.error('Restore failed:', error);
      return false;
    } finally {
      setRestoring(false);
    }
  }

  async function refreshPremiumStatus(): Promise<void> {
    if (!user) return;

    try {
      const premiumStatus = await checkAndSyncPremiumStatus(user.id);
      setPremium(premiumStatus);
    } catch (error) {
      console.error('Failed to refresh premium status:', error);
    }
  }

  return {
    isPremium,
    packages,
    loading,
    purchasing,
    restoring,
    purchase,
    restore,
    refreshPremiumStatus,
  };
}

