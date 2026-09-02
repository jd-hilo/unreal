import { Adjust, AdjustConfig, AdjustEvent } from 'react-native-adjust';

/**
 * Adjust event tokens for app 9xs312sd0t8g.
 * Sessions are also recorded automatically by the SDK on init.
 * These tokens must exist in the Adjust dashboard to attribute correctly.
 */
const EVENT_SESSION = 'session';
const EVENT_PURCHASE = 'purchase';

class AdjustService {
  isInitialized = false;
  eventQueue: Array<AdjustEvent> = [];

  constructor() {
    this.isInitialized = false;
    this.eventQueue = [];
  }

  initialize() {
    if (this.isInitialized) return;

    const adjustConfig = new AdjustConfig(
      '9xs312sd0t8g',
      __DEV__
        ? AdjustConfig.EnvironmentSandbox
        : AdjustConfig.EnvironmentProduction
    );
    Adjust.initSdk(adjustConfig);
    this.isInitialized = true;
    this.flushEventQueue();
    // Explicit session/open event in addition to automatic SDK session tracking
    this.trackEvent(EVENT_SESSION);
  }

  trackEvent(
    eventToken: string,
    options?: {
      revenue?: number;
      currency?: string;
      callbackParams?: Record<string, string>;
    }
  ) {
    if (!eventToken) return;

    try {
      const adjustEvent = new AdjustEvent(eventToken);

      if (options?.revenue != null && options?.currency) {
        adjustEvent.setRevenue(options.revenue, options.currency);
      }

      if (options?.callbackParams) {
        for (const [key, value] of Object.entries(options.callbackParams)) {
          adjustEvent.addCallbackParameter(key, value);
        }
      }

      if (!this.isInitialized) {
        this.eventQueue.push(adjustEvent);
        return;
      }

      Adjust.trackEvent(adjustEvent);
    } catch (error) {
      console.error('Adjust trackEvent failed:', error);
    }
  }

  trackPurchase(productId: string, price?: number, currency?: string) {
    this.trackEvent(EVENT_PURCHASE, {
      revenue: price,
      currency: currency || 'USD',
      callbackParams: { product_id: productId },
    });
  }

  flushEventQueue() {
    if (!this.isInitialized || this.eventQueue.length === 0) return;
    const queued = this.eventQueue.splice(0, this.eventQueue.length);
    for (const event of queued) {
      try {
        Adjust.trackEvent(event);
      } catch (error) {
        console.error('Adjust flushEventQueue failed:', error);
      }
    }
  }
}

export default new AdjustService();
