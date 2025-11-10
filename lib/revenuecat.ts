import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const REVENUECAT_API_KEY = Constants.expoConfig?.extra?.revenuecatApiKey || '';

if (!REVENUECAT_API_KEY) {
  console.warn('RevenueCat API key not found in app.json');
}

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 */
export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.warn('Cannot initialize RevenueCat: missing API key');
    return;
  }

  try {
    if (!isConfigured) {
      Purchases.configure({ apiKey: REVENUECAT_API_KEY });
      isConfigured = true;
    }

    if (userId) {
      await Purchases.logIn(userId);
    }
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
  }
}

/**
 * Get available subscription packages
 */
export async function getAvailablePackages(): Promise<PurchasesPackage[]> {
  try {
    // Ensure RevenueCat is configured before calling
    if (!isConfigured) {
      console.warn('RevenueCat not configured yet, initializing...');
      await initializeRevenueCat();
    }
    
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      return offerings.current.availablePackages;
    }
    return [];
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return [];
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('User cancelled purchase');
    } else {
      console.error('Purchase error:', error);
    }
    return null;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Restore purchases error:', error);
    throw error;
  }
}

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    // Ensure RevenueCat is configured before calling
    if (!isConfigured) {
      console.warn('RevenueCat not configured yet, initializing...');
      await initializeRevenueCat();
    }
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Check if user has active premium subscription
 */
export function isPremiumActive(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) {
    console.log('❌ No customer info available');
    return false;
  }
  
  const entitlements = customerInfo.entitlements.active;
  console.log('🔍 Active entitlements:', Object.keys(entitlements));
  
  // Check for 'premium' entitlement (you should configure this in RevenueCat dashboard)
  const hasPremium = 'premium' in entitlements || 'Premium' in entitlements;
  console.log('✅ Has premium entitlement:', hasPremium);
  
  return hasPremium;
}

/**
 * Sync subscription status with Supabase
 */
export async function syncPremiumStatus(userId: string, isPremium: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: isPremium })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to sync premium status to Supabase:', error);
    }
  } catch (error) {
    console.error('Error syncing premium status:', error);
  }
}

/**
 * Get premium status from Supabase (fallback/cache)
 */
export async function getPremiumStatusFromSupabase(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.is_premium || false;
  } catch (error) {
    console.error('Error getting premium status from Supabase:', error);
    return false;
  }
}

/**
 * Check and sync premium status
 * Returns premium status from RevenueCat and syncs to Supabase
 * Respects manual Supabase overrides for testing
 */
export async function checkAndSyncPremiumStatus(userId: string): Promise<boolean> {
  try {
    // First, check if manually set to premium in Supabase (for testing)
    const supabasePremium = await getPremiumStatusFromSupabase(userId);
    
    // If manually set to premium in Supabase, respect it (testing override)
    if (supabasePremium) {
      console.log('✅ Premium status from Supabase override: true');
      console.log('🎉 Premium features unlocked via database override!');
      return true;
    }
    
    // Otherwise, check RevenueCat for actual subscription
    // Ensure RevenueCat is initialized first
    if (!isConfigured) {
      console.log('Initializing RevenueCat for user:', userId);
      await initializeRevenueCat(userId);
    }
    
    // Get status from RevenueCat
    const customerInfo = await getCustomerInfo();
    const isPremium = isPremiumActive(customerInfo);

    // Only sync to Supabase if RevenueCat says premium (don't overwrite manual test overrides)
    if (isPremium) {
      await syncPremiumStatus(userId, true);
    }

    return isPremium;
  } catch (error) {
    console.error('Error checking premium status:', error);
    // Fallback to Supabase status
    return await getPremiumStatusFromSupabase(userId);
  }
}

