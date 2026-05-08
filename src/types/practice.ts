/**
 * Legacy B2B practice-tier types (file 49).
 *
 * Product direction: insights and education stay **in the mobile app** via AI
 * explanations tied to **evidence citations** (e.g. routine task DOIs), not a
 * clinician web dashboard. These types remain so code and migrations that
 * reference `practices`, `patient_enrollments`, etc. still type-check; new
 * feature work should prefer AI + `/settings/evidence` patterns over staff UIs.
 *
 * Privacy floors for any future data path: diary, HealthKit correlations, and
 * life-stage signals stay patient-only unless the product explicitly changes.
 */

export type PracticeRole = 'owner' | 'clinician' | 'staff';

export interface Practice {
  id: string;
  /** ≤80 chars. */
  name: string;
  /** Free-form contact label, ≤120 chars. */
  contactLabel?: string;
  /** ISO timestamp. */
  createdAt: string;
}

export interface PracticeMember {
  id: string;
  practiceId: string;
  userId: string;
  role: PracticeRole;
  /** ISO timestamp. */
  invitedAt: string;
  acceptedAt?: string;
}

export type PatientConsentScope =
  /** The minimum: patient face data + scan timeline. */
  | 'face-scans'
  /** Optional: routine adherence summary (no individual product names). */
  | 'routine-adherence'
  /** Optional: treatment timeline + side effects. */
  | 'treatments'
  /** Optional: hair tracking. Off by default. */
  | 'hair';

export interface PatientEnrollment {
  id: string;
  practiceId: string;
  patientUserId: string;
  /** ≤80 chars; stored in plaintext, NOT encrypted. */
  patientLabel?: string;
  /** Specific scopes the patient has consented to share. */
  consentScopes: ReadonlyArray<PatientConsentScope>;
  /** ISO timestamp the patient accepted the invitation. */
  acceptedAt?: string;
  /** ISO timestamp the patient revoked consent. Cleared on re-acceptance. */
  revokedAt?: string;
  invitedAt: string;
  invitedBy: string;
}

export interface PatientNote {
  id: string;
  enrollmentId: string;
  authorUserId: string;
  /** ≤2000 chars; encrypted at rest. */
  body: string;
  /** ISO timestamp. */
  createdAt: string;
  updatedAt: string;
}

/**
 * Audit log entry for any practice-side data access. Required for HIPAA
 * audit trail; populated automatically by the API layer.
 */
export interface PracticeAuditEvent {
  id: string;
  practiceId: string;
  actorUserId: string;
  /** Patient userId being acted upon. */
  subjectUserId: string;
  action:
    | 'view-scans'
    | 'view-notes'
    | 'add-note'
    | 'export-pdf'
    | 'invite-patient'
    | 'revoke-patient';
  occurredAt: string;
  /** Optional structured payload, never PII. */
  metadata?: Record<string, string | number>;
}
