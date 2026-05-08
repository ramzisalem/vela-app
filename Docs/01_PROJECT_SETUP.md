# 01 — Project Setup (Expo + React Native + TypeScript)

## Toolchain Pinning

| Tool | Pinned version | Mechanism |
|---|---|---|
| Node.js | `20.x` LTS | `.nvmrc` (`20.15.0`) + `engines` field in `package.json` |
| npm | `10.x` | `engines` field |
| Expo SDK | `51.x` | `package.json` |
| TypeScript | `5.4.x` | `package.json`, `strict: true` |

Add at repo root:

```
// .nvmrc
20.15.0
```

```jsonc
// package.json (excerpt)
{
  "engines": { "node": ">=20.0.0 <21.0.0", "npm": ">=10.0.0" }
}
```

CI uses the same Node version (file 27 → `actions/setup-node` with `node-version-file: .nvmrc`).

## Linting & Formatting

```bash
npm install --save-dev eslint eslint-config-expo prettier eslint-plugin-prettier eslint-config-prettier
```

```jsonc
// .eslintrc.json
{
  "extends": ["expo", "prettier"],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "warn",
    "no-restricted-imports": ["error", {
      "paths": [
        { "name": "@/theme/palette", "message": "Use semantic tokens via useColors() — never import Palette directly outside src/theme/colors.ts." },
        { "name": "@react-native-async-storage/async-storage", "importNames": ["default"], "message": "Auth tokens go through SecureStorageAdapter (file 03). AsyncStorage is fine for non-sensitive prefs." }
      ]
    }]
  }
}
```

```jsonc
// .prettierrc
{ "printWidth": 100, "singleQuote": true, "trailingComma": "all", "semi": true, "arrowParens": "always" }
```

CI runs `npm run lint` and `npm run typecheck` on every PR (file 27). A pre-commit hook via `husky` + `lint-staged` is recommended but not required.

## Initial Project Creation

```bash
# Create project with Expo + TypeScript template
npx create-expo-app@latest vela --template blank-typescript

cd vela

# Use the new architecture (required for native modules)
npx expo prebuild --clean

# Install Expo Router for file-based routing
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar

# Install Expo Dev Client (required for custom native modules)
npx expo install expo-dev-client
```

## Required Dependencies

```bash
# Core
npm install zustand
npm install @nozbe/watermelondb
npm install --save-dev @nozbe/with-observables

# Backend & Auth
npm install @supabase/supabase-js
npx expo install expo-auth-session expo-crypto expo-web-browser

# Subscriptions
npm install react-native-purchases

# Camera & Vision
npx expo install react-native-vision-camera
npx expo install expo-camera

# AR (custom module — see file 04)
# We'll create our own native module

# Notifications
npx expo install expo-notifications expo-device

# UI & Animations
npx expo install react-native-reanimated react-native-gesture-handler
npm install victory-native
npx expo install react-native-svg
npm install @shopify/react-native-skia

# Storage & File System
npx expo install expo-file-system expo-secure-store

# Sharing
npx expo install expo-sharing expo-media-library
npm install react-native-view-shot

# Utilities
npm install date-fns
npm install zod  # Schema validation

# Dev tools
npm install --save-dev @types/node
```

## app.json Configuration

```json
{
  "expo": {
    "name": "Vela",
    "slug": "vela",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "vela",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FAFAF8"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.velapp.vela",
      "buildNumber": "1",
      "_comment_bundleIdentifier": "⚠️ The literal value here is the production bundle ID. Builds use `app.config.js` (file 27), which sets `com.velapp.vela`, `com.velapp.vela.staging`, or `com.velapp.vela.dev` from `EAS_BUILD_PROFILE` / `EXPO_PUBLIC_API_ENV`. When you rely entirely on `app.config.js`, you can drop duplicate `bundleIdentifier` / `buildNumber` from this file.",
      "infoPlist": {
        "NSCameraUsageDescription": "Vela uses your camera to capture weekly face scans using AR alignment. Photos are stored only on your device.",
        "NSFaceIDUsageDescription": "Vela uses Face ID hardware for precise face alignment measurements.",
        "NSPhotoLibraryAddUsageDescription": "Vela saves your comparison photos to your camera roll when you choose to share them.",
        "ITSAppUsesNonExemptEncryption": false
      },
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.velapp.vela",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FAFAF8"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      "expo-dev-client",
      [
        "react-native-vision-camera",
        {
          "cameraPermissionText": "Vela needs camera access to capture your weekly face scans.",
          "enableFrameProcessors": true
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#5B8DB8"
        }
      ],
      "./plugins/vela-face-tracker.js"
    ],
    "experiments": {
      "typedRoutes": true,
      "tsconfigPaths": true
    },
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

## Folder Structure

```
vela/
├── app/                          # Expo Router file-based routes
│   ├── _layout.tsx               # Root layout with providers
│   ├── index.tsx                 # Entry point — routes based on app state
│   ├── (onboarding)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── section-a.tsx
│   │   ├── section-b.tsx
│   │   ├── section-c.tsx
│   │   ├── section-d.tsx
│   │   ├── section-e.tsx
│   │   └── permissions.tsx
│   ├── (capture)/
│   │   ├── _layout.tsx
│   │   ├── capture.tsx
│   │   ├── processing.tsx
│   │   └── results-reveal.tsx
│   ├── paywall.tsx
│   └── (main)/
│       ├── _layout.tsx           # Tab navigator
│       ├── dashboard.tsx
│       ├── compare.tsx
│       ├── history.tsx
│       └── settings.tsx
│
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ui/                   # Primitives (Button, Card, etc.)
│   │   ├── onboarding/           # Onboarding-specific
│   │   ├── capture/              # Capture-specific
│   │   ├── dashboard/
│   │   └── shared/               # Cross-feature
│   │
│   ├── stores/                   # Zustand stores
│   │   ├── authStore.ts
│   │   ├── profileStore.ts
│   │   ├── scanStore.ts
│   │   ├── routineStore.ts
│   │   └── subscriptionStore.ts
│   │
│   ├── services/                 # External service clients
│   │   ├── supabase.ts
│   │   ├── revenuecat.ts
│   │   ├── ai.ts                 # AI proxy client
│   │   ├── notifications.ts
│   │   ├── storage.ts            # File system + photos
│   │   └── faceTracker.ts        # Wrapper around native module
│   │
│   ├── core/                     # Business logic
│   │   ├── scoring/
│   │   │   ├── scoringEngine.ts
│   │   │   ├── calibration.ts
│   │   │   └── weights.ts
│   │   ├── routine/
│   │   │   ├── routineEngine.ts
│   │   │   ├── contentLibrary.ts
│   │   │   └── adaptation.ts
│   │   └── profile/
│   │       └── profileManager.ts
│   │
│   ├── types/                    # TypeScript types
│   │   ├── profile.ts
│   │   ├── scan.ts
│   │   ├── routine.ts
│   │   └── index.ts
│   │
│   ├── db/                       # WatermelonDB
│   │   ├── schema.ts
│   │   ├── models/
│   │   │   ├── ScanSession.ts
│   │   │   ├── DailyRoutine.ts
│   │   │   └── UserProduct.ts
│   │   └── index.ts
│   │
│   ├── theme/                    # Design system
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   │
│   └── utils/                    # Helpers
│       ├── dates.ts
│       ├── images.ts
│       └── validation.ts
│
├── modules/                      # Native modules
│   └── vela-face-tracker/        # Custom ARKit module
│       ├── ios/
│       │   ├── VelaFaceTrackerModule.swift
│       │   ├── VelaFaceTrackerView.swift
│       │   └── VelaFaceTracker.podspec
│       ├── android/              # ARCore (v2)
│       │   └── ...
│       ├── src/
│       │   └── index.ts          # JS API
│       └── expo-module.config.json
│
├── plugins/                      # Expo config plugins
│   └── vela-face-tracker.js
│
├── supabase/                     # Backend configuration
│   ├── migrations/
│   │   └── 20240101000000_initial_schema.sql
│   └── functions/
│       └── ai-proxy/
│           └── index.ts
│
├── assets/
│   ├── icon.png
│   ├── splash.png
│   ├── adaptive-icon.png
│   └── fonts/
│
├── .env                          # gitignored
├── .env.example
├── app.json
├── babel.config.js
├── metro.config.js
├── tsconfig.json
└── package.json
```

## Babel Config

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/stores': './src/stores',
            '@/services': './src/services',
            '@/core': './src/core',
            '@/types': './src/types',
            '@/db': './src/db',
            '@/theme': './src/theme',
            '@/utils': './src/utils',
          },
        },
      ],
      ['@babel/plugin-proposal-decorators', { legacy: true }],  // Required for WatermelonDB
      'react-native-reanimated/plugin',  // Must be last
    ],
  };
};
```

## TypeScript Config

```json
// tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "experimentalDecorators": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/stores/*": ["src/stores/*"],
      "@/services/*": ["src/services/*"],
      "@/core/*": ["src/core/*"],
      "@/types/*": ["src/types/*"],
      "@/db/*": ["src/db/*"],
      "@/theme/*": ["src/theme/*"],
      "@/utils/*": ["src/utils/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

## Environment Variables

```bash
# .env (gitignored)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxxxx
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxxxx
EXPO_PUBLIC_AI_PROXY_URL=https://your-project.supabase.co/functions/v1/ai-proxy
```

## Root Layout

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { initializeServices } from '@/services/initialize';
import { ThemeProvider } from '@/theme/ThemeContext';

export default function RootLayout() {
  useEffect(() => {
    // ────────────────────────────────────────────────────────────────
    // INITIALIZATION ORDER (do not reorder)
    //
    // 1. RevenueCat       — safe to init at launch (no IDFA dependency)
    // 2. Supabase + DB    — via initializeServices()
    // 3. Sentry / PostHog — also via initializeServices()
    //
    // ⚠️  Singular MUST NOT be initialized here.
    //     ATT consent must be requested first, AFTER the user has seen
    //     value (post-baseline scan reveal). See `31_SINGULAR_MMP.md`
    //     and `useSingularPostBaselineInit()`. Initializing Singular
    //     before ATT permanently loses IDFA attribution for that install.
    // ────────────────────────────────────────────────────────────────

    // 1. RevenueCat
    if (Platform.OS === 'ios') {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS!,
      });
    } else {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID!,
      });
    }

    // 2 + 3. Supabase / WatermelonDB / Sentry / PostHog (no IDFA needed)
    initializeServices();

    // 4. Singular is intentionally NOT initialized here.
    //    See `useSingularPostBaselineInit` (file 31) — fires after baseline reveal.
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(capture)" />
            <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="(main)" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

## Entry Point Router

```typescript
// app/index.tsx
import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAppState } from '@/stores/appStateStore';

export default function Index() {
  const { flow, isLoading } = useAppState();
  
  if (isLoading) {
    return null; // Splash screen showing
  }
  
  switch (flow) {
    case 'onboarding':
      return <Redirect href="/(onboarding)/welcome" />;
    case 'capture':
      return <Redirect href="/(capture)/capture" />;
    case 'paywall':
      return <Redirect href="/paywall" />;
    case 'main':
      return <Redirect href="/(main)/dashboard" />;
  }
}
```

## Initialize Services

```typescript
// src/services/initialize.ts
import { supabase } from './supabase';
import { initializeDatabase } from '@/db';
import { useAppState } from '@/stores/appStateStore';

export async function initializeServices() {
  // 1. Initialize WatermelonDB
  await initializeDatabase();
  
  // 2. Check existing Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  
  // 3. Update app state based on session
  const appState = useAppState.getState();
  
  if (session) {
    appState.setUser(session.user);
    
    // Check subscription
    await appState.checkSubscription();
    
    // Determine flow
    appState.updateFlow();
  } else {
    appState.setFlow('onboarding');
  }
  
  appState.setLoading(false);
}
```

## Build & Run Commands

```bash
# Development on iOS
npx expo run:ios --device

# Development on iOS simulator (note: ARKit doesn't work in simulator)
npx expo start --ios

# Build dev client (required after adding native modules)
npx expo prebuild
npx expo run:ios --device

# EAS Build (production)
npm install -g eas-cli
eas build --platform ios

# Development hot reload
npx expo start
```

## Critical Notes

1. **You MUST use a physical iPhone for development.** ARKit does not work in simulator. Get an iPhone with TrueDepth (any Face ID iPhone — iPhone X or later).

2. **The new React Native architecture (Fabric/TurboModules) is enabled.** This is required for our custom native module. If you encounter issues, check `app.json` has `"newArchEnabled": true`.

3. **Expo Dev Client is required.** You can't use Expo Go for this app — custom native modules require a custom dev client.

4. **First build will be slow.** Plan for 15-30 minutes the first time you run `expo prebuild` and build the dev client. Subsequent builds are fast.
