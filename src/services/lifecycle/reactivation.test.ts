/**
 * Reactivation lifecycle tests (file 46).
 */
import { deriveLifecyclePhase, canWriteInPhase } from './reactivation';

describe('deriveLifecyclePhase', () => {
  const fixedNow = new Date('2026-05-08T00:00:00Z');

  it('reports trial when actively trialing', () => {
    const snap = deriveLifecyclePhase({
      isActive: true,
      isTrialing: true,
      willRenew: true,
      now: fixedNow,
    });
    expect(snap.phase).toBe('trial');
  });

  it('reports active when paid and renewing', () => {
    const snap = deriveLifecyclePhase({
      isActive: true,
      isTrialing: false,
      willRenew: true,
      now: fixedNow,
    });
    expect(snap.phase).toBe('active');
  });

  it('reports never-subscribed when no record', () => {
    const snap = deriveLifecyclePhase({
      isActive: false,
      isTrialing: false,
      willRenew: false,
      now: fixedNow,
    });
    expect(snap.phase).toBe('never-subscribed');
  });

  it('keeps phase active while pre-expiry after cancel', () => {
    const snap = deriveLifecyclePhase({
      isActive: false,
      isTrialing: false,
      willRenew: false,
      cancelledAt: '2026-05-01T00:00:00Z',
      expiresAt: '2026-05-15T00:00:00Z',
      now: fixedNow,
    });
    expect(snap.phase).toBe('active');
  });

  it('reports grace within 30 days post-expiry', () => {
    const snap = deriveLifecyclePhase({
      isActive: false,
      isTrialing: false,
      willRenew: false,
      cancelledAt: '2026-04-01T00:00:00Z',
      expiresAt: '2026-04-15T00:00:00Z',
      now: fixedNow, // 23 days after expiry
    });
    expect(snap.phase).toBe('grace');
    expect(snap.graceDaysRemaining).toBe(30 - 23);
  });

  it('reports lapsed-readonly after 30 days', () => {
    const snap = deriveLifecyclePhase({
      isActive: false,
      isTrialing: false,
      willRenew: false,
      cancelledAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-02-01T00:00:00Z',
      now: fixedNow,
    });
    expect(snap.phase).toBe('lapsed-readonly');
  });
});

describe('canWriteInPhase', () => {
  it('allows everything during active', () => {
    expect(canWriteInPhase('active', 'capture')).toBe(true);
    expect(canWriteInPhase('active', 'experiment')).toBe(true);
  });

  it('allows core writes but not experiments during grace', () => {
    expect(canWriteInPhase('grace', 'capture')).toBe(true);
    expect(canWriteInPhase('grace', 'experiment')).toBe(false);
  });

  it('blocks writes during lapsed-readonly', () => {
    expect(canWriteInPhase('lapsed-readonly', 'capture')).toBe(false);
    expect(canWriteInPhase('lapsed-readonly', 'diary-entry')).toBe(false);
  });

  it('blocks writes when never-subscribed', () => {
    expect(canWriteInPhase('never-subscribed', 'routine-task')).toBe(false);
  });
});
