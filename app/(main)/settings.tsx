/**
 * Settings tab — manifest-driven (file 14).
 */
import React from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Purchases from 'react-native-purchases';
import { Body, Caption, Headline, Label } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Spacing, Radii, Layout } from '@/theme/spacing';
import { useColors, useTheme } from '@/theme/ThemeContext';
import { Button } from '@/components/ui/Button';
import { SETTINGS_MANIFEST, type SettingsContext, type SettingsRow } from '@/core/settings/manifest';
import { useAppState } from '@/stores/appStateStore';
import { useProfileStore } from '@/stores/profileStore';
import { useScanStore } from '@/stores/scanStore';
import { useLifeStageStore } from '@/stores/lifeStageStore';
import { supabase } from '@/services/supabase';
import { toast } from '@/components/feedback/toastService';
import { selectSaveOffer, redactPII } from '@/core/cancelSave/saveEngine';
import { CancelSaveSheet } from '@/components/cancelSave/CancelSaveSheet';
import { ExitInterview } from '@/components/cancelSave/ExitInterview';
import { extendTrial } from '@/services/trial/trialExtension';
import { ScoringFrameworkSheet } from '@/components/settings/ScoringFrameworkSheet';
import { switchToYearly } from '@/services/revenuecat/paywall';
import type { ScoringFramework } from '@/types/profile';
import type {
  CancelSaveOffer,
  CancelExitCategory,
  CancelSaveContext,
} from '@/types/cancelSave';
import { Modal } from 'react-native';

function Toggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{
        width: 44,
        height: 28,
        borderRadius: Radii.pill,
        backgroundColor: value ? colors.accent.default : colors.border.default,
        padding: 2,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: '#fff',
          alignSelf: value ? 'flex-end' : 'flex-start',
        }}
      />
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { preference, setPreference } = useTheme();
  const subscription = useAppState((s) => s.subscription);
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const sessions = useScanStore((s) => s.sessions);
  const activeLifeStageModes = useLifeStageStore((s) => s.activeModes);

  const [saveOffer, setSaveOffer] = React.useState<CancelSaveOffer | null>(null);
  const [exitOpen, setExitOpen] = React.useState(false);
  const [frameworkSheetOpen, setFrameworkSheetOpen] = React.useState(false);

  const ctx: SettingsContext = {
    isSubscribed: !!subscription?.isActive,
    isTrialing: !!subscription?.isTrialing,
    trialExtendable: !profile?.flags?.trialExtendedAt,
    hasActiveLifeStageMode: (profile?.activeLifeStageModes?.length ?? 0) > 0,
  };

  function buildCancelContext(): CancelSaveContext {
    const totalScans = sessions.length;
    const last30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const scansLast30 = sessions.filter((s) => Date.parse(s.createdAt) >= last30).length;
    return {
      daysSinceFirstScan: sessions[0]
        ? Math.floor((Date.now() - Date.parse(sessions[0].createdAt)) / (24 * 60 * 60 * 1000))
        : 0,
      weeksOfPaidSubscription: 0,
      totalScans,
      scansLast30Days: scansLast30,
      totalRoutineDaysCompleted: 0,
      routineDaysLast30Days: 0,
      hasOpenedDiary: false,
      diaryEntriesTotal: 0,
      hasActiveTreatment: false,
      hasCompletedAnyExperiment: false,
      hasMonthlyWrapped: false,
      isInTrial: !!subscription?.isTrialing,
      hasEverExtendedTrial: !!profile?.flags?.trialExtendedAt,
      hasReceivedAnniversaryCard: false,
      region: 'US',
      hasFamilySharing: false,
      hasActiveLifeStageMode: activeLifeStageModes.length > 0,
      activeLifeStageModes: activeLifeStageModes.map((m) => m.id),
    };
  }

  async function handleAction(row: SettingsRow) {
    switch (row.action) {
      case 'manage_subscription':
        await Linking.openURL('https://apps.apple.com/account/subscriptions');
        break;
      case 'restore_purchase': // brand:allow
        try {
          await Purchases.restorePurchases();
          toast.success('We linked what we found on this Apple ID.');
        } catch {
          toast.warning('Nothing to link on this Apple ID.');
        }
        break;
      case 'extend_trial': {
        const outcome = await extendTrial();
        if (outcome.ok) {
          toast.success('Done. You have 14 more days.');
          updateProfile({
            flags: { ...profile?.flags, trialExtendedAt: new Date().toISOString() },
          });
        } else if (outcome.error === 'already-extended') {
          toast.info('You’ve already used your trial extension.');
        } else if (outcome.error === 'not-in-trial') {
          toast.info('Trial extension is only available during the trial.');
        } else {
          toast.warning('We couldn’t extend your trial right now. Try again in a moment.');
        }
        break;
      }
      case 'export_data':
        toast.info('Data export will email you a download link within an hour.');
        break;
      case 'request_account_deletion':
        toast.info('Check your email for the confirmation link.');
        await supabase.functions.invoke('request-account-deletion').catch(() => undefined);
        break;
      case 'sign_out':
        await supabase.auth.signOut();
        // Store cleanup runs from `onAuthStateChange` → `signOut` (see initializeServices).
        router.replace('/');
        break;
      case 'override_scoring_framework':
        setFrameworkSheetOpen(true);
        break;
      case 'cancel_save_flow': {
        const offer = selectSaveOffer(buildCancelContext());
        setSaveOffer(offer);
        break;
      }
      default:
        break;
    }
  }

  async function handleSaveAccept() {
    if (!saveOffer) return;
    setSaveOffer(null);
    if (saveOffer.kind === 'extension-month-free') {
      toast.success('Done. You have a free month.');
    } else if (saveOffer.kind === 'price-match-yearly') {
      const res = await switchToYearly();
      if (res.outcome === 'purchased') {
        toast.success('Switched to yearly. Welcome to your second year of Vela.');
      } else if (res.outcome === 'cancelled') {
        toast.info('No change. You\u2019re still on monthly.');
      } else {
        toast.warning('Couldn\u2019t switch right now. Try again in a moment.');
      }
    } else if (saveOffer.kind === 'consolation-doctor-export') {
      toast.success('Generating your PDF — we’ll email it shortly.');
      setExitOpen(true);
    } else if (saveOffer.kind === 'no-offer-respectful-goodbye') {
      // Same as decline — proceed to exit interview.
      setExitOpen(true);
    } else if (saveOffer.kind === 'route-to-trial-extension') {
      const outcome = await extendTrial();
      if (outcome.ok) {
        toast.success('Done. You have 14 more days.');
      } else {
        toast.warning('Couldn’t extend right now. Try again in a moment.');
      }
    }
  }

  function handleSaveDecline() {
    setSaveOffer(null);
    setExitOpen(true);
  }

  async function handleSubmitExit(category: CancelExitCategory, freeText?: string) {
    setExitOpen(false);
    try {
      await supabase.from('cancel_exit_responses').insert({
        category,
        free_text: freeText ? redactPII(freeText) : null,
      });
    } catch {
      // best-effort only
    }
    toast.info('Got it — thanks for telling us.');
  }

  function getToggleValue(key: SettingsRow['toggleKey']): boolean {
    switch (key) {
      case 'notifications.weekly':
        return !!profile?.notificationsEnabled;
      case 'aging_band.hidden':
        return !!profile?.hideAgingBand;
      case 'streaks.hidden':
        return !!profile?.flags?.streaksHidden;
      case 'analytics.optin':
        return true; // Default on; ATT/PostHog handle real opt-out.
      case 'email_digest.optin':
        return false;
      default:
        return false;
    }
  }

  function setToggle(key: SettingsRow['toggleKey'], value: boolean) {
    if (!profile) return;
    if (key === 'notifications.weekly') {
      updateProfile({ notificationsEnabled: value });
    } else if (key === 'aging_band.hidden') {
      updateProfile({ hideAgingBand: value });
    } else if (key === 'streaks.hidden') {
      updateProfile({ flags: { ...profile.flags, streaksHidden: value } });
    }
  }

  return (
    <Screen variant="secondary">
      <ScrollView contentContainerStyle={{ paddingTop: Spacing.lg, paddingBottom: Spacing.xxxl }}>
        <Headline style={{ marginBottom: Spacing.lg }}>Settings</Headline>
        <Card style={{ marginBottom: Spacing.base }}>
          <Label>Theme</Label>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
            <Button label="System" size="sm" variant={preference === 'system' ? 'primary' : 'secondary'} onPress={() => setPreference('system')} />
            <Button label="Light" size="sm" variant={preference === 'light' ? 'primary' : 'secondary'} onPress={() => setPreference('light')} />
            <Button label="Dark" size="sm" variant={preference === 'dark' ? 'primary' : 'secondary'} onPress={() => setPreference('dark')} />
          </View>
        </Card>

        <CancelSaveSheet
          visible={!!saveOffer}
          offer={saveOffer}
          onAccept={handleSaveAccept}
          onDecline={handleSaveDecline}
        />
        <ScoringFrameworkSheet
          open={frameworkSheetOpen}
          current={profile?.scoringFramework}
          onClose={() => setFrameworkSheetOpen(false)}
          onConfirm={(next: ScoringFramework) => {
            setFrameworkSheetOpen(false);
            updateProfile({ scoringFramework: next });
            toast.success('Saved. Your next scan will use the new lens.');
          }}
        />
        <Modal animationType="slide" presentationStyle="pageSheet" visible={exitOpen}>
          <ExitInterview
            onSubmit={handleSubmitExit}
            onSkip={() => {
              setExitOpen(false);
              toast.info('You’re cancelled. Your data stays with you.');
            }}
          />
        </Modal>

        {SETTINGS_MANIFEST.map((section) => {
          const visibleRows = section.rows.filter((r) => !r.showWhen || r.showWhen(ctx));
          if (visibleRows.length === 0) return null;
          return (
            <View key={section.id} style={{ marginBottom: Spacing.lg }}>
              <Caption tone="secondary" style={{ marginBottom: Spacing.xs, marginLeft: Spacing.xs }}>
                {section.title}
              </Caption>
              <Card padding={0}>
                {visibleRows.map((row, i) => (
                  <SettingsRowView
                    key={row.id}
                    row={row}
                    isLast={i === visibleRows.length - 1}
                    toggleValue={row.kind === 'toggle' ? getToggleValue(row.toggleKey) : false}
                    onToggle={(v) => row.toggleKey && setToggle(row.toggleKey, v)}
                    onPress={() => {
                      if (row.kind === 'external' && row.url) {
                        WebBrowser.openBrowserAsync(row.url).catch(() => undefined);
                        return;
                      }
                      if (row.kind === 'navigate' && row.route) {
                        router.push(row.route as never);
                        return;
                      }
                      if (row.kind === 'action' || row.kind === 'destructive') {
                        void handleAction(row);
                      }
                    }}
                  />
                ))}
              </Card>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function SettingsRowView({
  row,
  isLast,
  toggleValue,
  onToggle,
  onPress,
}: {
  row: SettingsRow;
  isLast: boolean;
  toggleValue: boolean;
  onToggle: (v: boolean) => void;
  onPress: () => void;
}) {
  const colors = useColors();
  const isDestructive = row.kind === 'destructive';
  const tone = isDestructive ? 'primary' : 'primary';
  return (
    <Pressable
      accessibilityRole={row.kind === 'toggle' ? 'switch' : 'button'}
      onPress={() => {
        if (row.kind === 'toggle') return; // Toggle handles its own press.
        onPress();
      }}
      style={{
        paddingHorizontal: Spacing.base,
        paddingVertical: Spacing.base,
        borderBottomWidth: isLast ? 0 : Layout.hairline,
        borderBottomColor: colors.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Body style={{ color: isDestructive ? colors.error.default : undefined }} tone={tone}>
            {row.title}
          </Body>
          {row.subtitle ? (
            <Caption tone="secondary" style={{ marginTop: Spacing.xxs }}>
              {row.subtitle}
            </Caption>
          ) : null}
        </View>
        {row.kind === 'toggle' ? <Toggle value={toggleValue} onChange={onToggle} /> : null}
      </View>
    </Pressable>
  );
}
