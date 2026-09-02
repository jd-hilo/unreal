import { Adjust, AdjustConfig, AdjustEvent } from 'react-native-adjust';

/**
 * Mora Adjust app token (12-char app_token). Set intentionally in
 * commit 05356d6 ("set Adjust app token") by J.D. Sullivan — do not replace
 * with ad click/link tokens.
 *
 * Reddit Unreal/Mora ads currently use Adjust *tracker* token `1vos7l0d`
 * (8 chars = link/tracker token, NOT an app token). That tracker must be
 * recreated/reattached under this app in the Adjust dashboard / ad platforms
 * so click → install → session land on the same app. Updating ad trackers is
 * out of scope for the retention PR (do not spend / unpause campaigns here).
 *
 * Event tokens below must exist under this app in Adjust to attribute.
 * Sessions are also recorded automatically by the SDK on init.
 */
const ADJUST_APP_TOKEN = '9xs312sd0t8g';
/** Documented Reddit click tracker — NOT for AdjustConfig; ads ops only. */
export const REDDIT_ADJUST_TRACKER_TOKEN = '1vos7l0d';
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
      ADJUST_APP_TOKEN,
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
