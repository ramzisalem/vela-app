# 29 — Performance & Optimization

## Overview
How Vela stays fast, snappy, and battery-efficient. Covers image optimization, bundle size, frame rate, memory, startup time, and the metrics we track to know if we're succeeding.

Performance is a feature. A premium app feels premium when it's fast. Vela's competitors include Oura and Whoop — apps that load instantly and respond immediately. We must match that bar.

---

## Performance Targets

### Hard targets (must hit)

| Metric | Target | Critical because |
|--------|--------|------------------|
| App cold start | < 2.5s on iPhone 12 | First impression |
| App warm start | < 600ms | Daily ritual feels instant |
| Tab switch | < 100ms | Native iOS feel |
| Capture screen open | < 1.5s including AR session start | Avoid feeling slow |
| Photo capture to score reveal | < 8s including AI | Anticipation, not frustration |
| Score reveal animation | exactly 1.2s, no jank | Premium reveal moment |
| Touch response | < 16ms (60fps) | Native feel |
| Memory footprint | < 200MB during normal use | iOS may kill app over 250MB |
| Memory during capture | < 350MB peak | AR + image processing is expensive |
| Bundle size (iOS IPA) | < 30MB | App Store optimization |

### Soft targets (nice to hit)

| Metric | Target |
|--------|--------|
| Time to interactive after onboarding | < 1s |
| Pull-to-refresh response | < 800ms |
| Comparison slider drag | 60fps with 1080p images |
| Battery drain during capture | < 1% per scan |
| Background sync | < 5s |

---

## Bundle Size Optimization

### Measure first

```bash
# Build production bundle
npx expo export --platform ios --output-dir dist

# Analyze bundle
npx expo-bundle-analyzer dist/_expo/static/js/ios/index-*.hbc
```

### Strategies

#### 1. Tree-shake aggressively

Avoid namespace imports:

```typescript
// ❌ Imports the entire library
import * as Icons from '@expo/vector-icons';
import _ from 'lodash';

// ✅ Imports only what you need
import { Ionicons } from '@expo/vector-icons';
import groupBy from 'lodash/groupBy';
```

#### 2. Use lighter alternatives where possible

| Library | Alternative | Saves |
|---------|-------------|-------|
| `moment` | `date-fns` (tree-shakable) | ~60KB gzipped |
| `lodash` | Per-function imports | ~50KB |
| `axios` | Native `fetch` | ~25KB |
| `react-native-vector-icons` | `@expo/vector-icons` (already used) | included |

#### 3. Defer heavy modules

Load big modules only when needed:

```typescript
// Don't load ARKit at app start — only when entering capture
async function startCapture() {
  const { startSession } = await import('@/native/VelaArKit');
  await startSession();
}
```

#### 4. Image assets

- Use SVG for icons and illustrations (smallest, scalable)
- Use WebP for photos (when not capturing them — e.g., onboarding artwork)
- Compress all PNGs through ImageOptim or sharp before commit
- Use `@2x`, `@3x` only when needed

#### 5. Hermes engine

Hermes is enabled by default in modern Expo. Verify in `app.config.js`:

```javascript
{
  jsEngine: 'hermes', // Default, but explicit is better
}
```

Hermes ahead-of-time compiles JavaScript to bytecode, reducing parse/eval time at startup.

---

## Image Optimization

The biggest performance lever in Vela. We capture and store many photos.

### Image lifecycle

```
Capture (ARKit, 1920×1080+) 
  → Save full-res to local FS (HEIC, ~500KB)
  → Generate thumbnail (320×180, JPEG, ~30KB) for UI
  → Score computed on-device (no network)
  → Score data syncs to Supabase (no images)
  → Photos NEVER leave device
```

### Capture format

Use HEIC (iOS native) for stored photos — half the size of JPEG, lossless quality:

```typescript
// In native ARKit module (Swift)
let photoSettings = AVCapturePhotoSettings(format: [
  AVVideoCodecKey: AVVideoCodecType.hevc,  // HEIC/HEVC
])
```

### Thumbnail generation

Generate small thumbnails for use in dashboard, history, comparisons:

```typescript
// src/services/imageProcessing/generateThumbnail.ts
import * as ImageManipulator from 'expo-image-manipulator';

export async function generateThumbnail(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 320 } }],  // Width only — height auto-scales
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri;
}
```

Generate thumbnails immediately after capture. Store both in WatermelonDB:

```typescript
// In CaptureSession schema
{
  full_photo_uri_front: string,
  thumbnail_uri_front: string,
  full_photo_uri_left: string,
  thumbnail_uri_left: string,
  // ...
}
```

UI uses thumbnails by default. Full-res only loaded on Compare screen and Session Detail.

### Lazy loading images

For lists with many photos (history screen):

```typescript
// Use react-native-fast-image for better caching and lazy loading
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: thumbnail_uri, priority: FastImage.priority.normal }}
  style={{ width: 60, height: 80 }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

For visible-only loading in lists:

```typescript
import { FlatList } from 'react-native';

<FlatList
  data={sessions}
  renderItem={renderSession}
  initialNumToRender={5}
  maxToRenderPerBatch={5}
  windowSize={5}
  removeClippedSubviews
/>
```

### Image cleanup

When sessions are deleted (or account deleted), remove image files from local FS:

```typescript
import * as FileSystem from 'expo-file-system';

async function deleteSessionImages(session: CaptureSession) {
  const files = [
    session.full_photo_uri_front,
    session.full_photo_uri_left,
    session.full_photo_uri_right,
    session.thumbnail_uri_front,
    session.thumbnail_uri_left,
    session.thumbnail_uri_right,
  ];
  
  await Promise.all(
    files.filter(Boolean).map(uri => 
      FileSystem.deleteAsync(uri, { idempotent: true })
    )
  );
}
```

---

## Memory Management

### Common leaks

#### 1. Subscriptions not cleaned up

```typescript
// ❌ Leak
useEffect(() => {
  const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', handler);
  // No cleanup
}, []);

// ✅ Clean up
useEffect(() => {
  const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', handler);
  return () => subscription.remove();
}, []);
```

#### 2. Timers not cleared

```typescript
// ❌ Leak
useEffect(() => {
  const timer = setTimeout(doThing, 5000);
}, []);

// ✅ Clean up
useEffect(() => {
  const timer = setTimeout(doThing, 5000);
  return () => clearTimeout(timer);
}, []);
```

#### 3. Animated values referenced after unmount

```typescript
// ❌ May log warning
const scale = useSharedValue(1);
async function doThing() {
  await sleep(1000);
  scale.value = 2; // Component may have unmounted
}

// ✅ Use cancelAnimation or check mounted
const isMounted = useRef(true);
useEffect(() => () => { isMounted.current = false; }, []);

async function doThing() {
  await sleep(1000);
  if (isMounted.current) scale.value = 2;
}
```

#### 4. Large objects retained in closures

```typescript
// ❌ Image data retained for the whole component lifetime
const [imageData, setImageData] = useState(null);
const handleSomething = () => {
  // Uses imageData even though we're done with it
};

// ✅ Clear when no longer needed
const handleSomething = () => {
  doStuffWithImage(imageData);
  setImageData(null); // Allow GC
};
```

### Capture flow memory

The most memory-intensive part of the app. Strategies:

1. **Stop AR session immediately after last photo**
2. **Generate thumbnails one at a time**, don't queue
3. **Release full-res image references** after thumbnail generated
4. **Force a GC hint** before processing if possible:

```typescript
// Native module addition: hint to release memory
import { NativeModules } from 'react-native';

NativeModules.MemoryUtils?.releaseMemory?.();
```

---

## Frame Rate (60fps)

iOS targets 60fps (16.67ms per frame). 90fps and 120fps possible on newer devices but stick with 60 as baseline.

### Common janky places

#### 1. Animated values driven from JS

```typescript
// ❌ Janks during gesture (JS thread)
const [position, setPosition] = useState(0);
gesture.onUpdate((e) => setPosition(e.translationX));

// ✅ Smooth (UI thread via Reanimated)
const position = useSharedValue(0);
gesture.onUpdate((e) => {
  'worklet';
  position.value = e.translationX;
});
```

#### 2. Large lists without virtualization

```typescript
// ❌ Renders all items
<ScrollView>
  {sessions.map(s => <SessionRow key={s.id} session={s} />)}
</ScrollView>

// ✅ Virtualizes
<FlatList
  data={sessions}
  renderItem={({ item }) => <SessionRow session={item} />}
  keyExtractor={item => item.id}
/>

// ✅✅ Even better for very long lists
import { FlashList } from '@shopify/flash-list';
<FlashList
  data={sessions}
  renderItem={({ item }) => <SessionRow session={item} />}
  estimatedItemSize={80}
/>
```

#### 3. Re-renders cascading

```typescript
// ❌ Whole screen re-renders on every char typed
function Screen() {
  const [text, setText] = useState('');
  return (
    <View>
      <ExpensiveChart /> {/* Re-renders unnecessarily */}
      <TextInput value={text} onChangeText={setText} />
    </View>
  );
}

// ✅ Memo the expensive parts
const MemoChart = React.memo(ExpensiveChart);
```

### Profiling

Use Flipper or React DevTools Profiler to find slow renders:

```bash
# Install Flipper
brew install --cask flipper

# Open in dev mode and connect
```

Look for:
- Components rendering > 16ms
- Components rendering on every keystroke
- Long worklets blocking the UI thread

---

## Startup Time

### Measure

```typescript
// src/services/perf/startupMetrics.ts
import { Platform } from 'react-native';

const APP_LAUNCH_TIME = Date.now();

export function logStartupTime(stage: string) {
  const elapsed = Date.now() - APP_LAUNCH_TIME;
  console.log(`[Startup] ${stage}: ${elapsed}ms`);
  
  // Track in analytics for production monitoring
  if (stage === 'first_screen_rendered') {
    track(Events.APP_OPENED, {
      cold_start: !__DEV__,
      ttfs_ms: elapsed, // Time to first screen
      app_version: '1.0.0',
    });
  }
}

// Usage in app/_layout.tsx
useEffect(() => {
  logStartupTime('first_screen_rendered');
}, []);
```

### Optimize

#### 1. Defer non-critical init

```typescript
// app/_layout.tsx
useEffect(() => {
  // Critical: theme, auth check
  initTheme();
  checkAuth();
  
  // Non-critical: defer 1 frame
  requestAnimationFrame(() => {
    initAnalytics();
    initSentry();
    initRevenueCat();
    preloadIcons();
  });
}, []);
```

#### 2. Splash screen until ready

Use Expo's `SplashScreen` API to keep splash visible until app is interactive:

```typescript
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// Inside ThemeProvider after isReady
useEffect(() => {
  if (isReady) {
    SplashScreen.hideAsync();
  }
}, [isReady]);
```

#### 3. Lazy-load screens

```typescript
// app/(main)/settings.tsx — only loaded when user navigates to it
// Expo Router does this automatically
```

#### 4. Reduce initial JS bundle

- Move heavy libraries behind dynamic imports
- Don't import everything in `index.tsx`

---

## Network Optimization

Vela is mostly offline-first (WatermelonDB). Network calls are limited:

- Auth (Supabase)
- AI generation (Edge Function)
- Subscription (RevenueCat)
- Analytics (PostHog)
- Sync (Supabase, on schedule)

### Strategies

#### 1. Batch requests

For sync, batch multiple changes into one request:

```typescript
// ❌ One request per session
sessions.forEach(s => supabase.from('sessions').insert(s));

// ✅ One request for all
supabase.from('sessions').insert(sessions);
```

#### 2. Request deduplication

For frequently-fetched data, cache aggressively:

```typescript
import { useQuery } from '@tanstack/react-query';

const { data: profile } = useQuery({
  queryKey: ['profile', userId],
  queryFn: () => fetchProfile(userId),
  staleTime: 5 * 60 * 1000, // 5 min
  cacheTime: 30 * 60 * 1000, // 30 min
});
```

#### 3. Optimistic updates

For routine task check-offs, update locally first, sync after:

```typescript
function toggleTask(taskId: string, completed: boolean) {
  // Local update (instant)
  routineStore.toggleLocal(taskId, completed);
  
  // Background sync (no user wait)
  syncQueue.add({ type: 'task_toggle', taskId, completed });
}
```

#### 4. Request prioritization

Critical (block UI):
- Auth check
- AI generation during capture flow

Non-critical (background):
- Analytics events
- Sync of historical data
- Subscription status refresh

```typescript
// Use priority queue for non-critical
const priorityQueue = {
  critical: [],
  normal: [],
  background: [],
};

async function processQueue() {
  while (priorityQueue.critical.length > 0) {
    await priorityQueue.critical.shift()();
  }
  while (priorityQueue.normal.length > 0) {
    await priorityQueue.normal.shift()();
  }
  // Background tasks run when idle
  requestIdleCallback(() => {
    while (priorityQueue.background.length > 0) {
      priorityQueue.background.shift()();
    }
  });
}
```

#### 5. AI streaming

When possible, stream AI responses for faster perceived performance:

```typescript
// In Edge Function (future — today `ai-proxy` uses non-streaming Chat Completions)
// const stream = await openai.chat.completions.create({
//   model: 'gpt-4o',
//   stream: true,
//   messages: [{ role: 'user', content: prompt }],
// });
// for await (const chunk of stream) { /* forward SSE */ }
```

User sees text appearing immediately, even while AI is still thinking.

---

## Database Performance (WatermelonDB)

### Indices

Add indices on commonly-queried columns:

```typescript
// In schema definition (file 02)
{
  name: 'sessions',
  columns: [
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'captured_at', type: 'number', isIndexed: true },
    { name: 'week_number', type: 'number', isIndexed: true },
  ],
}
```

### Query patterns

```typescript
// ❌ Loads all sessions then filters
const all = await sessionsCollection.query().fetch();
const recent = all.filter(s => s.capturedAt > thirtyDaysAgo);

// ✅ Filters in DB
const recent = await sessionsCollection
  .query(
    Q.where('captured_at', Q.gt(thirtyDaysAgo.getTime())),
    Q.sortBy('captured_at', Q.desc),
    Q.take(30)
  )
  .fetch();
```

### Reactive queries

Use `observe()` for live data:

```typescript
const sessions$ = sessionsCollection
  .query(Q.where('user_id', userId))
  .observe();

// In component
const sessions = useObservable(sessions$, []);
```

WatermelonDB only re-renders when the query result actually changes.

---

## AR/Capture Performance

The most performance-critical part of the app.

### ARKit session management

- **Start AR session lazily.** Only when user enters capture flow.
- **Stop session immediately after capture.** AR uses CPU/GPU continuously.
- **Pause when app goes to background.** Don't drain battery.

```swift
// In native module
func capturePhoto(...) {
  // Capture
  ...
  
  // Stop session right after
  arSession.pause()
}
```

### Camera resolution

Use the appropriate resolution. Higher = slower + more memory:

```swift
// In ARKit setup
let configuration = ARFaceTrackingConfiguration()
configuration.videoFormat = ARFaceTrackingConfiguration.supportedVideoFormats.first(where: {
  $0.imageResolution.width <= 1920 // Cap at 1080p
})!
```

### Face metric throttling

Don't update face metrics on every frame (60Hz). 10Hz is enough for alignment feedback:

```swift
private var lastMetricsUpdate: Date = Date()
private let metricsUpdateInterval: TimeInterval = 0.1 // 10 Hz

func session(_ session: ARSession, didUpdate frame: ARFrame) {
  let now = Date()
  if now.timeIntervalSince(lastMetricsUpdate) < metricsUpdateInterval { return }
  lastMetricsUpdate = now
  
  // Compute and send metrics
  ...
}
```

---

## Performance Monitoring

### Sentry Performance

Sentry tracks transaction durations:

```typescript
import * as Sentry from '@sentry/react-native';

const transaction = Sentry.startTransaction({
  name: 'capture_full_flow',
  op: 'user_action',
});

await captureFlow();

transaction.finish();
```

### Custom metrics

```typescript
import { track, Events } from '@/services/analytics';

const startTime = Date.now();
await heavyOperation();
const duration = Date.now() - startTime;

track(Events.OPERATION_COMPLETED, {
  duration_ms: duration,
  operation: 'capture_processing',
});
```

### Production monitoring dashboard

Track these in PostHog:
- p50, p95, p99 startup time
- p50, p95, p99 capture-to-reveal time
- p50, p95, p99 AI generation time
- Error rate per surface
- Crash-free session rate (from Sentry)

Alert if:
- p95 startup > 4s
- p95 capture-to-reveal > 12s
- Crash-free rate < 99.5%

---

## Battery Usage

### Avoid drain

- **No background location**
- **No persistent background tasks** (we sync on app open, not in background)
- **Pause AR session immediately** after capture
- **Pause animations** when app goes to background
- **Throttle network requests**

### Test

```bash
# Xcode → Window → Devices and Simulators → [device] → "Energy" tab
# Run app for 10 min, observe battery usage
```

Should be:
- Idle (dashboard view): ~1% per hour
- Capture flow: ~1% per scan
- Background: ~0% per hour

---

## Build-Time Optimizations

### Production build flags

```json
// app.config.js
{
  ios: {
    infoPlist: {
      LSApplicationCategoryType: 'public.app-category.healthcare-fitness',
    },
  },
  jsEngine: 'hermes',
  newArchEnabled: true, // Fabric + TurboModules
}
```

### EAS Build optimizations

```json
// eas.json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "resourceClass": "m-medium" // Faster builds
      }
    }
  }
}
```

---

## Performance Anti-Patterns

### Things to avoid

1. **Re-rendering on every animation frame** (use Reanimated worklets)
2. **Loading all data upfront** (paginate, lazy-load)
3. **Storing large data in Zustand** (use WatermelonDB for collections, Zustand for UI state only)
4. **Inline function definitions in render** (memoize callbacks if passed to children)
5. **Missing keys on lists** (causes full re-render)
6. **Heavy computation in render** (move to useMemo or useEffect)
7. **Blocking the JS thread** (offload to native modules or workers)

### Real example: rendering 100 sessions

```typescript
// ❌ Slow
function HistoryScreen() {
  const sessions = useObservable(allSessions$, []);
  
  return (
    <ScrollView>
      {sessions.map(s => (
        <SessionCard
          key={s.id}
          session={s}
          onPress={() => openSession(s.id)} // New function each render
        />
      ))}
    </ScrollView>
  );
}

// ✅ Fast
const SessionCard = React.memo(({ session, onPress }) => {
  return (
    <Pressable onPress={onPress}>
      ...
    </Pressable>
  );
});

function HistoryScreen() {
  const sessions = useObservable(allSessions$, []);
  
  const handlePress = useCallback((id: string) => {
    openSession(id);
  }, []);
  
  return (
    <FlatList
      data={sessions}
      keyExtractor={s => s.id}
      renderItem={({ item }) => (
        <SessionCard session={item} onPress={() => handlePress(item.id)} />
      )}
      removeClippedSubviews
      windowSize={5}
    />
  );
}
```

---

## Performance Audit Checklist (Pre-Launch)

### Bundle
- [ ] Bundle size < 30MB IPA
- [ ] No unused dependencies in package.json
- [ ] Hermes enabled
- [ ] New architecture enabled
- [ ] Tree-shaking verified

### Startup
- [ ] Cold start < 2.5s on iPhone 12
- [ ] Splash screen prevents content flash
- [ ] Non-critical init deferred

### Memory
- [ ] No leaks detected in Xcode Instruments
- [ ] Capture flow peak memory < 350MB
- [ ] All subscriptions cleaned up
- [ ] All timers cleared

### Frame rate
- [ ] All gestures use Reanimated worklets
- [ ] Long lists use FlatList/FlashList
- [ ] No re-renders cascading on input

### Images
- [ ] HEIC for storage
- [ ] Thumbnails for list views
- [ ] FastImage for caching
- [ ] Cleanup on session deletion

### Network
- [ ] Optimistic UI for fast feedback
- [ ] Batched sync requests
- [ ] React Query for cached fetches
- [ ] Streaming AI responses

### Battery
- [ ] AR session stops after capture
- [ ] No background work
- [ ] No persistent timers

### Monitoring
- [ ] Sentry performance traces
- [ ] PostHog timing events
- [ ] Production dashboards set up
