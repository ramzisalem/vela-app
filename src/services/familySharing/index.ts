/**
 * Family Sharing service (file 45).
 *
 * Reads the RevenueCat `customerInfo.entitlements.active['vela_premium']`
 * `isFamilySharing` flag. The organizer never sees member data — Family
 * Sharing here only governs paywall entitlement, NOT data sharing. Member
 * face data, diary, HealthKit and life-stage modes remain private to each
 * member's account.
 *
 * Sharing of any data between accounts (organizer ↔ member) is a separate,
 * explicit consent flow that the user must opt into; defaults are off.
 */
import type { FamilySharingState } from '@/types/longTerm';

export interface FamilySharingService {
  getState(): FamilySharingState | null;
  /**
   * Called when RevenueCat reports `isFamilyShare: true` on the active
   * entitlement. Organizers always pay; members may join for free.
   */
  recognizeFamilyMember(input: { userId: string; organizerUserId: string }): void;
  reset(): void;
}

class InMemoryFamilySharingService implements FamilySharingService {
  private state: FamilySharingState | null = null;

  getState(): FamilySharingState | null {
    return this.state;
  }

  recognizeFamilyMember(input: { userId: string; organizerUserId: string }): void {
    const now = new Date().toISOString();
    this.state = {
      enabled: true,
      organizerUserId: input.organizerUserId,
      members: [
        {
          userId: input.userId,
          inviteAcceptedAt: now,
          shareDataWithOrganizer: false,
        },
      ],
      enabledAt: now,
    };
  }

  reset(): void {
    this.state = null;
  }
}

let instance: FamilySharingService | null = null;

export function getFamilySharingService(): FamilySharingService {
  if (!instance) instance = new InMemoryFamilySharingService();
  return instance;
}

export function setFamilySharingServiceForTesting(service: FamilySharingService): void {
  instance = service;
}
