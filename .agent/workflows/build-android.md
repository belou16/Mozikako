---
description: How to build and deploy Mozikako for Android (Play Store)
---

# Mozikako — Build & Deploy for Android

## Prerequisites
- Android Studio installed
- JDK 17+ installed
- Android SDK installed (via Android Studio)

## Development
// turbo
1. Start the dev server:
```
npm run dev
```

## Build for Android

// turbo
2. Build the production web bundle:
```
npm run build
```

// turbo
3. Sync web assets to the Android project:
```
npx cap sync android
```

4. Open in Android Studio:
```
npx cap open android
```

5. In Android Studio:
   - Go to **Build → Generate Signed Bundle / APK**
   - Choose **Android App Bundle** for Play Store
   - Create or select a keystore
   - Build the release bundle (.aab file)

6. Upload the .aab file to the Google Play Console

## Hot Reload (Development on device)
```
npx cap run android --livereload --external
```
