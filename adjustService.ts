import { Adjust, AdjustConfig, AdjustEvent } from 'react-native-adjust'; 
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
      'Key',
      __DEV__
        ? AdjustConfig.EnvironmentSandbox
        : AdjustConfig.EnvironmentProduction
    );
    Adjust.initSdk(adjustConfig);
    this.isInitialized = true;
  }
}

export default new AdjustService();
