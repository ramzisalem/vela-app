# 14 — Settings & Subscription Management

## Overview
Settings tab handles subscription management (with cancellation save flow), notification preferences, privacy controls, data export, and account deletion (Apple-required).

---

## Settings Screen

```typescript
// app/(main)/settings.tsx
import { ScrollView, View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppState } from '@/stores/appStateStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useScanStore } from '@/stores/scanStore';
import { ProfileService } from '@/services/profileService';
import { CancellationSaveModal } from '@/components/settings/CancellationSaveModal';
import { NotificationPreferences } from '@/components/settings/NotificationPreferences';
import { DataExportService } from '@/services/dataExportService';
import { Colors } from '@/theme/colors';
import Constants from 'expo-constants';
import { format } from 'date-fns';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAppState();
  const { isSubscribed, expirationDate, productIdentifier, isInTrial } = useSubscriptionStore();
  const { sessions } = useScanStore();
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const appVersion = Constants.expoConfig?.version || '1.0';
  
  function getSubscriptionDescription(): string {
    if (!isSubscribed) return 'Not subscribed';
    if (isInTrial) {
      return expirationDate 
        ? `Trial — ends ${format(expirationDate, 'MMM d')}` 
        : 'Trial active';
    }
    return expirationDate 
      ? `Active — renews ${format(expirationDate, 'MMM d, yyyy')}` 
      : 'Active';
  }
  
  function getPlanName(): string {
    if (!productIdentifier) return '';
    if (productIdentifier.includes('annual')) return 'Annual ($79/year)';
    if (productIdentifier.includes('monthly')) return 'Monthly ($9.99/month)';
    return productIdentifier;
  }
  
  async function handleExportData() {
    if (!user) return;
    
    setIsExporting(true);
    try {
      await DataExportService.exportUserData(user.id);
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }
  
  // GDPR + Apple 5.1.1(v) compliant deletion.
  //
  // Two-step flow:
  //   1. User taps "Delete Account" → we send a verification email with a
  //      signed token (24 h expiry). The account is NOT yet deleted.
  //   2. User taps the link in the email → app opens via deep link
  //      (file 30: `vela://delete-account/confirm?token=…`) and the
  //      Edge Function `delete-account` (file 03) verifies the token,
  //      writes a `deletion_audit_log` row, then deletes auth +
  //      `profiles` + cascades to `scan_results` + `subscriptions`
  //      and revokes RC entitlement.
  //
  // We do not delete locally on step 1 — if the user changes their mind
  // we simply let the token expire. If they never click, nothing is lost.
  async function handleDeleteAccount() {
    if (!user) return;

    Alert.alert(
      'Delete account?',
      `We will email ${user.email ?? 'your address'} a confirmation link. ` +
        `Your account will not be deleted until you tap that link. ` +
        `The link expires in 24 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send confirmation email',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProfileService.requestAccountDeletion(user.id);
              Alert.alert(
                'Check your email',
                'We sent a confirmation link. The deletion will only happen after you tap it.',
              );
            } catch (error) {
              Alert.alert(
                'Could not start deletion',
                'Please try again, or contact support@getvela.app.',
              );
            }
          },
        },
      ],
    );
  }

  // Restore Purchases — required by App Store guideline 3.1.1.
  // Wraps RC's restore call with explicit error/empty/success states.
  async function handleRestorePurchases() {
    try {
      const { default: Purchases } = await import('react-native-purchases');
      const customerInfo = await Purchases.restorePurchases();
      const hasEntitlement =
        !!customerInfo.entitlements.active['vela_premium'];

      if (hasEntitlement) {
        Alert.alert(
          'Subscription restored',
          'Your Vela subscription is active again.',
        );
        // The subscription store listens to RC's customerInfoUpdate event,
        // so it will refresh on its own — no manual refetch needed.
      } else {
        Alert.alert(
          'No active subscription found',
          'We checked your Apple ID and didn\'t find a Vela subscription. ' +
            'If you think this is wrong, try again on Wi-Fi or contact support.',
        );
      }
    } catch (error: any) {
      // RC throws on network errors and on user cancellation. Distinguish:
      const isNetwork =
        error?.code === 'NETWORK_ERROR' || error?.message?.includes('network');
      Alert.alert(
        isNetwork ? 'No internet' : 'Restore failed',
        isNetwork
          ? 'Connect to the internet and try again.'
          : 'Something went wrong. Please try again or contact support.',
      );
    }
  }
  
  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'You can sign back in anytime to access your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ]
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Settings</Text>
        
        {/* Subscription Section */}
        <Section title="Subscription">
          <Row icon="checkmark-seal" iconColor={isSubscribed ? Colors.success : Colors.textSecondary}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{isSubscribed ? 'Vela Premium' : 'Free'}</Text>
              <Text style={styles.rowSubtitle}>{getSubscriptionDescription()}</Text>
              {isSubscribed && productIdentifier && (
                <Text style={styles.rowSubtitle}>{getPlanName()}</Text>
              )}
            </View>
          </Row>
          
          {isSubscribed && (
            // SPEC_REVIEW_3 clarification: "Manage Subscription" was ambiguous.
            // Resolution: this row is the entry point to the file 47 cancel-save
            // flow. Tapping it opens the SAVE flow (showCancelModal), NOT the
            // App Store's native subscription management page. We split into
            // two clear rows to remove the ambiguity:
            <>
              <Pressable onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
                <Text style={styles.actionLink}>Manage in App Store</Text>
              </Pressable>
              <Pressable onPress={() => setShowCancelModal(true)}>
                <Text style={styles.dangerLink}>Cancel subscription</Text>
              </Pressable>
            </>
          )}
          
          {!isSubscribed && (
            <Pressable onPress={() => router.push('/paywall')}>
              <Text style={styles.actionLink}>Subscribe</Text>
            </Pressable>
          )}
        </Section>
        
        {/* Notifications Section */}
        <Section title="Notifications">
          <NotificationPreferences />
        </Section>
        
        {/* Privacy Section */}
        <Section title="Privacy">
          <Row icon="lock-closed">
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Photos stored on device only</Text>
              <Text style={styles.rowSubtitle}>{getStorageInfo(sessions.length)}</Text>
            </View>
          </Row>
          
          {/*
            Label honesty (SPEC_REVIEW_3): the row used to read "Export my data"
            but the export only includes scan numbers + routine + diary metadata,
            not photos (which are device-only per file 07 privacy primer). Calling
            it "Export my data" misleads users who expect everything. Rename to
            "Export scan data" + caption.
          */}
          <Pressable onPress={handleExportData} disabled={isExporting}>
            <View>
              <Text style={styles.actionLink}>
                {isExporting ? 'Exporting...' : 'Export scan data'}
              </Text>
              <Text style={styles.rowSubtitle}>
                Scans, routine, diary text. Photos stay on your device.
              </Text>
            </View>
          </Pressable>
        </Section>
        
        {/* Account Section */}
        <Section title="Account">
          <Row icon="person">
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{user?.email || 'Apple ID'}</Text>
            </View>
          </Row>
          
          <Pressable onPress={handleSignOut}>
            <Text style={styles.actionLink}>Sign out</Text>
          </Pressable>
          
          <Pressable onPress={handleDeleteAccount}>
            <Text style={styles.dangerLink}>Delete account</Text>
          </Pressable>
        </Section>
        
        {/* About Section */}
        <Section title="About">
          <Pressable onPress={() => Linking.openURL('https://getvela.app/privacy')}>
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={16} color={Colors.textSecondary} />
            </View>
          </Pressable>
          
          <Pressable onPress={() => Linking.openURL('https://getvela.app/terms')}>
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Terms of Service</Text>
              <Ionicons name="open-outline" size={16} color={Colors.textSecondary} />
            </View>
          </Pressable>
          
          <Pressable onPress={() => Linking.openURL('mailto:support@getvela.app')}>
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Contact Support</Text>
              <Ionicons name="mail-outline" size={16} color={Colors.textSecondary} />
            </View>
          </Pressable>
          
          <Text style={styles.version}>Version {appVersion}</Text>
          
          <Text style={styles.disclaimer}>
            Vela provides general wellness guidance and is not medical advice. Consult a healthcare professional for skin or hair concerns.
          </Text>
        </Section>
      </ScrollView>
      
      {/*
        CancellationSaveModal renders the file 47 cancel-save flow:
        1. Save offer (one of 5 kinds — see file 47 "selectSaveOffer")
        2. If declined: exit interview (file 47 Step 2)
        3. Honest goodbye screen (file 47 Step 3 — explains 30-day grace per file 46)
        See 47_CANCEL_SAVE.md for the full flow specification.
      */}
      <CancellationSaveModal
        visible={showCancelModal}
        sessionCount={sessions.length}
        weekCount={sessions.length}
        onClose={() => setShowCancelModal(false)}
      />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ icon, iconColor, children }: { icon: any; iconColor?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={iconColor || Colors.accent} />
      {children}
    </View>
  );
}

function getStorageInfo(sessionCount: number): string {
  // Rough estimate: 3 photos × 500KB each = 1.5MB per session
  const sizeMB = sessionCount * 1.5;
  if (sizeMB < 1) return 'No scans yet';
  return `${sessionCount} scan${sessionCount === 1 ? '' : 's'} (~${sizeMB.toFixed(0)}MB)`;
}

// Bug fix: Settings uses Colors outside component
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '700', padding: 16 },
  section: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowSubtitle: { fontSize: 13, marginTop: 2 },
  actionLink: { fontSize: 15, fontWeight: '600' },
  dangerLink: { fontSize: 15, color: '#E8A598', fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkText: { fontSize: 15 },
  version: { fontSize: 12, marginTop: 8 },
  disclaimer: { fontSize: 11, marginTop: 12, lineHeight: 16, fontStyle: 'italic' },
});
```

---

## Settings sections introduced by feature files

The Settings screen above is the v1 baseline. Subsequent feature files extend Settings with their own sections. The full v1.x Settings tree:

```
Settings
├── Subscription                                       (file 14, 47)
├── Notifications                                      (file 12)
├── Privacy
│   ├── Photos stored on device only                   (file 14)
│   ├── Export my data                                 (file 14)
│   ├── Analytics opt-out                              (file 25)
│   ├── Singular GDPR consent                          (file 31)
│   └── Cancel feedback                                (file 47)
├── Account
│   ├── Email / Apple ID                               (file 14)
│   ├── Sign out                                       (file 14)
│   └── Delete account                                 (file 14, 03)
├── Daily routine
│   ├── Streak visibility                              (file 39)
│   ├── Holiday auto-freezes                           (file 39)
│   ├── Daily nudge                                    (file 12, 39)
│   ├── Scan anchor                                    (file 42)
│   └── Experiment mode                                (file 44)
├── Health & lifestyle
│   ├── Apple Health connection                        (file 33)
│   ├── Cycle phase tracking                           (file 33)
│   ├── Apple Health Vital                             (file 42)
│   └── Life-stage modes                               (file 48)
├── Diary & recap
│   ├── Diary nudge + voice notes                      (file 37)
│   ├── Allow AI to read entries                       (file 37)
│   └── Monthly recap                                  (file 38)
├── iOS surfaces
│   ├── Widgets                                        (file 42)
│   ├── Lock Screen complications                      (file 42)
│   ├── Apple Watch companion                          (file 42)
│   └── Siri shortcuts                                 (file 42)
├── Connections
│   ├── Enrolled clinics                               (file 49)
│   └── Family Sharing                                 (file 45)
├── Charts
│   ├── Show natural-aging bands                       (file 36)
│   ├── Show controllability callouts                  (file 36)
│   └── Sex assigned at birth                          (file 36)
├── What's new in Vela                                 (file 43)
└── About
    ├── From Vela (journal)                            (file 50)
    ├── Evidence behind your routine                   (file 50)
    ├── Privacy policy                                 (file 14)
    ├── Terms of service                               (file 14)
    ├── Contact support                                (file 14)
    └── Version + medical disclaimer                   (file 14)
```

This is the full Settings tree for v1.x. When implementing, build the Section / Row primitives once and let each feature file's owner contribute their rows. The lint rule from file 01 (`no-restricted-imports` for `Palette`) plus a new convention — every new Settings row must be tagged with the file ID that owns it — keeps the tree auditable.

### Settings Manifest (canonical inventory)

Every Settings row in the entire app, in render order. This is the single source of truth — feature files reference rows from here rather than re-stating them. Cursor implements the Settings screen by reading this manifest and binding to the owner file's logic.

```typescript
// src/screens/settings/manifest.ts
// This is the canonical Settings tree. Cursor must NOT add rows here without also
// adding the implementing logic in the owner file. Lint enforces 1:1 mapping.

export const SETTINGS_MANIFEST: ReadonlyArray<SettingsSection> = [
  {
    id: 'subscription',
    title: 'Subscription',
    rows: [
      { id: 'sub-status',         label: 'Status',                   type: 'display', owner: 'file_14', event: null },
      { id: 'sub-plan',           label: 'Plan',                     type: 'display', owner: 'file_14', event: null },
      { id: 'sub-manage',         label: 'Manage in App Store',      type: 'action',  owner: 'file_14', event: 'subscription_manage_tapped' },
      { id: 'sub-restore',        label: 'Restore purchases',        type: 'action',  owner: 'file_14', event: 'subscription_restore_tapped' },
      { id: 'sub-cancel',         label: 'Cancel subscription',      type: 'action-destructive', owner: 'file_47', event: 'cancel_intent_started' },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    rows: [
      { id: 'notif-master',       label: 'Allow notifications',      type: 'toggle',  owner: 'file_12', defaultValue: true,  event: 'notif_master_toggled' },
      { id: 'notif-weekly-day',   label: 'Weekly check-in day',      type: 'select',  owner: 'file_12', defaultValue: 'sunday', event: 'notif_day_changed' },
      { id: 'notif-weekly-time',  label: 'Weekly check-in time',     type: 'time',    owner: 'file_12', defaultValue: '09:00', event: 'notif_time_changed' },
      { id: 'notif-quiet-hours',  label: 'Quiet hours',              type: 'time-range', owner: 'file_12', defaultValue: '22:00-08:00', event: 'notif_quiet_hours_changed' },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy',
    rows: [
      { id: 'priv-photos-info',   label: 'Photos stored on device only', type: 'display', owner: 'file_14', event: null },
      { id: 'priv-export',        label: 'Export my data',           type: 'action',  owner: 'file_14', event: 'data_export_started' },
      { id: 'priv-analytics',     label: 'Share product analytics',  type: 'toggle',  owner: 'file_25', defaultValue: true,  event: 'analytics_optout_toggled' },
      { id: 'priv-attribution',   label: 'Allow attribution tracking', type: 'toggle', owner: 'file_31', defaultValue: true, event: 'singular_consent_toggled' },
      { id: 'priv-cancel-fb',     label: 'Cancel feedback',          type: 'action',  owner: 'file_47', event: 'cancel_feedback_viewed' },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    rows: [
      { id: 'acct-email',         label: 'Email',                    type: 'display', owner: 'file_14', event: null },
      { id: 'acct-change-email',  label: 'Change email',             type: 'action',  owner: 'file_14', event: 'email_change_started' },
      { id: 'acct-reset-pw',      label: 'Reset password',           type: 'action',  owner: 'file_14', event: 'password_reset_started' },
      { id: 'acct-signout',       label: 'Sign out',                 type: 'action',  owner: 'file_14', event: 'sign_out' },
      { id: 'acct-delete',        label: 'Delete my data',           type: 'action-destructive', owner: 'file_14', event: 'account_deletion_requested' },
    ],
  },
  {
    id: 'daily-routine',
    title: 'Daily routine',
    rows: [
      { id: 'streak-visibility',  label: 'Streak visibility',        type: 'select',  owner: 'file_39', defaultValue: 'standard', event: 'streak_visibility_changed' },
      { id: 'streak-holidays',    label: 'Holiday auto-freezes',     type: 'toggle',  owner: 'file_39', defaultValue: true,  event: 'streak_holidays_toggled' },
      { id: 'routine-nudge',      label: 'Daily nudge',              type: 'toggle',  owner: 'file_39', defaultValue: false, event: 'routine_nudge_toggled' },
      { id: 'routine-nudge-time', label: 'Daily nudge time',         type: 'time',    owner: 'file_39', defaultValue: '20:00', event: 'routine_nudge_time_changed' },
      { id: 'scan-anchor',        label: 'Scan anchor',              type: 'select',  owner: 'file_42', defaultValue: 'none', event: 'scan_anchor_changed' },
      { id: 'experiment-mode',    label: 'Experiment mode',          type: 'navigate', owner: 'file_44', event: 'experiment_settings_viewed' },
    ],
  },
  {
    id: 'health-lifestyle',
    title: 'Health & lifestyle',
    rows: [
      { id: 'health-connect',     label: 'Apple Health connection',  type: 'navigate', owner: 'file_33', event: 'health_settings_viewed' },
      { id: 'health-cycle',       label: 'Cycle phase tracking',     type: 'toggle',  owner: 'file_33', defaultValue: false, event: 'health_cycle_toggled' },
      { id: 'health-vital',       label: 'Apple Health Vital',       type: 'toggle',  owner: 'file_42', defaultValue: false, event: 'health_vital_toggled' },
      { id: 'lifestage-modes',    label: 'Life-stage modes',         type: 'navigate', owner: 'file_48', event: 'lifestage_modes_viewed' },
    ],
  },
  {
    id: 'diary-recap',
    title: 'Diary & recap',
    rows: [
      { id: 'diary-nudge',        label: 'Daily diary nudge',        type: 'toggle',  owner: 'file_37', defaultValue: false, event: 'diary_nudge_toggled' },
      { id: 'diary-voice',        label: 'Voice notes',              type: 'toggle',  owner: 'file_37', defaultValue: true,  event: 'diary_voice_toggled' },
      { id: 'diary-show-tags',    label: 'Show inferred tags',       type: 'toggle',  owner: 'file_37', defaultValue: false, event: 'diary_tags_visibility_toggled' },
      { id: 'diary-allow-ai',     label: 'Allow AI to read entries', type: 'toggle',  owner: 'file_37', defaultValue: true,  event: 'diary_ai_consent_toggled' },
      { id: 'wrapped-monthly',    label: 'Monthly recap',            type: 'toggle',  owner: 'file_38', defaultValue: true,  event: 'wrapped_optin_toggled' },
      { id: 'wrapped-notify',     label: 'Notify when ready',        type: 'toggle',  owner: 'file_38', defaultValue: true,  event: 'wrapped_notify_toggled' },
    ],
  },
  {
    id: 'ios-surfaces',
    title: 'iOS surfaces',
    rows: [
      { id: 'ios-widgets',        label: 'Widgets',                  type: 'navigate', owner: 'file_42', event: 'widgets_settings_viewed' },
      { id: 'ios-lockscreen',     label: 'Lock Screen complications',type: 'navigate', owner: 'file_42', event: 'lockscreen_settings_viewed' },
      { id: 'ios-watch',          label: 'Apple Watch companion',    type: 'navigate', owner: 'file_42', event: 'watch_settings_viewed' },
      { id: 'ios-siri',           label: 'Siri shortcuts',           type: 'navigate', owner: 'file_42', event: 'siri_settings_viewed' },
    ],
  },
  {
    id: 'connections',
    title: 'Connections',
    rows: [
      { id: 'conn-clinics',       label: 'Enrolled clinics',         type: 'navigate', owner: 'file_49', event: 'practice_settings_viewed' },
      { id: 'conn-family',        label: 'Family Sharing',           type: 'navigate', owner: 'file_45', event: 'family_settings_viewed' },
    ],
  },
  {
    id: 'charts',
    title: 'Charts',
    rows: [
      { id: 'charts-aging-band',  label: 'Show natural-aging bands', type: 'toggle',  owner: 'file_36', defaultValue: true,  event: 'aging_band_visibility_toggled' },
      { id: 'charts-callouts',    label: 'Show controllability callouts', type: 'toggle', owner: 'file_36', defaultValue: true, event: 'aging_callouts_toggled' },
      { id: 'charts-sex-at-birth',label: 'Sex assigned at birth',    type: 'select',  owner: 'file_36', defaultValue: 'unknown', event: 'sex_at_birth_set' },
      { id: 'charts-yoy',         label: 'Show last year overlay',   type: 'toggle',  owner: 'file_45', defaultValue: false, event: 'yoy_toggle' },
    ],
  },
  {
    id: 'whats-new',
    title: "What's new in Vela",
    rows: [
      { id: 'reveals-list',       label: 'Reveals catalogue',        type: 'navigate', owner: 'file_43', event: 'reveals_list_viewed' },
      { id: 'reveals-master',     label: 'Show suggestion cards',    type: 'toggle',  owner: 'file_43', defaultValue: true, event: 'reveals_master_toggled' },
    ],
  },
  {
    id: 'about',
    title: 'About',
    rows: [
      { id: 'about-journal',      label: 'From Vela',                type: 'navigate', owner: 'file_50', event: 'journal_archive_viewed' },
      { id: 'about-evidence',     label: 'Evidence behind your routine', type: 'navigate', owner: 'file_50', event: 'evidence_aggregate_viewed' },
      { id: 'about-privacy',      label: 'Privacy policy',           type: 'link',    owner: 'file_14', event: 'privacy_policy_opened' },
      { id: 'about-terms',        label: 'Terms of service',         type: 'link',    owner: 'file_14', event: 'terms_opened' },
      { id: 'about-support',      label: 'Contact support',          type: 'mailto',  owner: 'file_14', event: 'support_email_started' },
      { id: 'about-version',      label: 'Version',                  type: 'display', owner: 'file_14', event: null },
      { id: 'about-disclaimer',   label: 'Medical disclaimer',       type: 'display', owner: 'file_14', event: null },
    ],
  },
];

export interface SettingsSection {
  id: string;
  title: string;
  rows: ReadonlyArray<SettingsRow>;
}

export interface SettingsRow {
  id: string;                          // unique across the whole app
  label: string;
  type: 'toggle' | 'select' | 'time' | 'time-range' | 'action'
       | 'action-destructive' | 'navigate' | 'display' | 'link' | 'mailto';
  owner: string;                       // 'file_NN' identifier
  defaultValue?: string | boolean;     // for toggles/selects
  event: string | null;                // analytics event fired on interaction
}
```

### Lint rules

1. **No row may exist in the implementation that isn't in this manifest.** ESLint rule `vela/settings-row-must-be-in-manifest`.
2. **Every row's `event`** must be in the analytics event enum (file 25).
3. **Every row's `owner`** must point to an existing file in the spec.
4. **Section + row IDs are immutable once shipped** — analytics taxonomy depends on them.

### Implementation: Settings screen reads the manifest

The Settings screen iterates `SETTINGS_MANIFEST` and renders each section + row using primitives. Owner files do not own rendering — they own the **state and side effects** behind each row (the toggle's persisted value, the action's onPress handler, etc.). The rendering is centralized.

This resolves: cross-file inconsistency in row ordering, duplicate rows, divergent default values, and the original sprawl problem from SPEC_REVIEW_3 finding A.

### Practice tier — the "Enrolled clinics" section

For users enrolled with one or more clinics via file 49, the Connections section is dynamic:

```
Connections
├── Enrolled clinics
│   ├── Skin & Co Aesthetics                          >  (per-clinic detail screen — file 49)
│   └── Manage clinic enrollments                     >
└── Family Sharing                                    >  (file 45)
```

Tap an enrolled clinic → consent scope toggles, sent notes inbox, audit log of who accessed data, leave-clinic action. All defined in file 49.

### "From Vela" — the journal entry point

A small entry under About (file 50). Tap → in-app journal archive. The latest essay is highlighted; older ones listed below; an opt-in checkbox to receive new essays by email.

### "Evidence behind your routine" — the evidence aggregate view

Also under About (file 50). Tap → list of every routine task and treatment in the user's current set, with each one's evidence level at a glance. Tap any → the same "About this" sheet that's accessible from the routine screen.

---

## Data Export Service

Exports all user data as a downloadable JSON file (GDPR compliant).

```typescript
// src/services/dataExportService.ts
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ProfileService } from './profileService';
import { useScanStore } from '@/stores/scanStore';
import { useRoutineStore } from '@/stores/routineStore';

export class DataExportService {
  static async exportUserData(userId: string): Promise<void> {
    // Gather all data
    const profile = await ProfileService.fetchProfile(userId);
    const sessions = useScanStore.getState().sessions;
    const routine = useRoutineStore.getState().currentRoutine;
    
    // Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      user: {
        id: userId,
      },
      profile,
      scanResults: sessions.map((s) => ({
        id: s.id,
        capturedAt: s.capturedAt,
        weekNumber: s.weekNumber,
        isBaseline: s.isBaseline,
        scores: s.scores,
        context: s.context,
        alignmentQuality: s.alignmentQuality,
        // Photo paths excluded — photos can be exported separately if needed
      })),
      currentRoutine: routine,
    };
    
    // Save to file
    const filename = `vela-data-export-${Date.now()}.json`;
    const filePath = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.writeAsStringAsync(
      filePath,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    
    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Vela Data',
      });
    }
  }
}
```

---

## Cancellation Save Modal

Reused from file 08, but worth keeping the pattern referenced here too.

```typescript
// src/components/settings/CancellationSaveModal.tsx
// (already documented in file 08 — same component)
```

---

## Subscription Status Indicators

Visual indicators throughout the app for subscription state:

```typescript
// src/components/ui/SubscriptionBadge.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Colors } from '@/theme/colors';

export function SubscriptionBadge() {
  const { isInTrial, expirationDate } = useSubscriptionStore();
  
  if (!isInTrial || !expirationDate) return null;
  
  const daysLeft = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (daysLeft <= 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>
        {daysLeft} day{daysLeft === 1 ? '' : 's'} left in trial
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(91, 141, 184, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
```

---

## Account Deletion Backend (Edge Function)

Apple requires fully functional account deletion. The frontend can't delete the auth user — only the backend can with admin privileges.

```typescript
// supabase/functions/delete-user/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }
  
  try {
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Verify the user is deleting their own account
    const { user_id } = await req.json();
    if (user_id !== user.id) {
      return new Response('Forbidden', { status: 403 });
    }
    
    // Use admin client to delete the auth user
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    
    if (error) {
      throw error;
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
```

Deploy with:
```bash
supabase functions deploy delete-user
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Local Data Cleanup on Account Deletion

When the user deletes their account, also clear local data:

```typescript
// In src/services/profileService.ts — extend deleteAccount
import * as FileSystem from 'expo-file-system';
import { database } from '@/db';
import { NotificationService } from './notifications';

static async deleteAccount(userId: string): Promise<void> {
  // 1. Delete from Supabase (cascades through RLS)
  await supabase.from('profiles').delete().eq('id', userId);
  
  // 2. Delete auth user via Edge Function
  const { error } = await supabase.functions.invoke('delete-user', {
    body: { user_id: userId },
  });
  if (error) throw error;
  
  // 3. Cancel all notifications
  await NotificationService.cancelAll();
  
  // 4. Clear WatermelonDB
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
  
  // 5. Delete all photos
  const photosDir = `${FileSystem.documentDirectory}VelaPhotos/`;
  const dirInfo = await FileSystem.getInfoAsync(photosDir);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(photosDir, { idempotent: true });
  }
  
  // 6. Sign out
  await supabase.auth.signOut();
}
```
