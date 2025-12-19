# iOS App Entitlements List

Based on Expo configuration analysis for `com.jdhilo2.unreal`

## Standard Entitlements

### 1. Apple Sign In
- **Entitlement Key**: `com.apple.developer.applesignin`
- **Configured via**: `"usesAppleSignIn": true` in app.json
- **Status**: ✅ Standard entitlement

### 2. In-App Purchases
- **Entitlement Key**: `com.apple.developer.in-app-payments`
- **Configured via**: RevenueCat/StoreKit integration
- **Products**:
  - `unreal_weekly_sub` (Weekly Subscription)
  - `unreal_lifetime` (Non-Consumable)
- **Status**: ✅ Standard entitlement

### 3. Location Services
- **Permission Keys**:
  - `NSLocationWhenInUseUsageDescription` - "When In Use" permission
  - `NSLocationAlwaysAndWhenInUseUsageDescription` - "Always" permission ⚠️
- **Configured via**: `expo-location` plugin
- **Usage Description**: "This app needs location access to provide personalized local recommendations for restaurants, bars, and things to do near you."
- **Status**: ⚠️ **NON-STANDARD** - "Always" location requires App Store justification

### 4. Microphone Access
- **Permission Key**: `NSMicrophoneUsageDescription`
- **Usage Description**: "This app needs microphone access to enable voice conversations with your AI twin builder, Sol."
- **Configured via**: Info.plist entry in app.json
- **Status**: ✅ Standard permission

### 5. Camera Access
- **Permission Key**: `NSCameraUsageDescription`
- **Configured via**: `expo-camera` plugin (if camera is accessed)
- **Status**: ✅ Standard permission (if used)

### 6. App Tracking Transparency
- **Permission Key**: `NSUserTrackingUsageDescription`
- **Configured via**: `expo-tracking-transparency` plugin
- **Status**: ✅ Standard permission (required for IDFA access)

## Special/Non-Standard Entitlements

### 7. WebRTC/Network Extensions
- **Configured via**: 
  - `@config-plugins/react-native-webrtc`
  - `@livekit/react-native-webrtc`
- **Purpose**: Real-time communication for voice/video features
- **Status**: ⚠️ May add network entitlements

### 8. Background Modes (Potential)
- **Configured via**: WebRTC/LiveKit plugins
- **Possible Modes**:
  - `audio` - Background audio playback
  - `voip` - Voice over IP (if used)
- **Status**: ⚠️ Depends on actual usage

## Info.plist Keys

### Encryption Declaration
- **Key**: `ITSAppUsesNonExemptEncryption`
- **Value**: `false`
- **Purpose**: Declares app does not use non-exempt encryption

## Complete Entitlements Format

If you had a built `.app` bundle, the entitlements would appear in this format:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>
    <key>com.apple.developer.in-app-payments</key>
    <array/>
    <key>com.apple.security.application-groups</key>
    <array>
        <!-- If any app groups are configured -->
    </array>
    <!-- Additional entitlements from plugins -->
</dict>
</plist>
```

## To Get Exact Entitlements from Built App

Once you have a built app bundle (from EAS Build or local build), run:

```bash
codesign -d --entitlements :- "path/to/unreal.app" 2>/dev/null | plutil -p -
```

Or check in Xcode:
1. Open the project in Xcode
2. Select your target → **Signing & Capabilities**
3. Review the **Capabilities** tab

## App Store Review Notes

⚠️ **Important**: The "Always" location permission (`NSLocationAlwaysAndWhenInUseUsageDescription`) is non-standard and requires:
- Clear justification in App Store Connect review notes
- Explanation of why "When In Use" is insufficient
- User-facing explanation of how location data is used

## Summary

**Standard Entitlements**: 5-6
- Apple Sign In ✅
- In-App Purchases ✅
- Microphone ✅
- Camera (if used) ✅
- App Tracking Transparency ✅

**Non-Standard Entitlements**: 1-2
- Location "Always" ⚠️ (requires justification)
- WebRTC/Background Modes (if applicable) ⚠️


