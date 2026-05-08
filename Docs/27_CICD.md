# 27 — CI/CD & Environments

## Overview
How code gets from a developer's laptop to TestFlight, then to the App Store. Covers GitHub Actions, EAS Build, environment management, secret rotation, and deployment workflow.

The goal: a single command that lets you ship safely. Plus automated guardrails for what gets merged.

---

## Versioning Strategy

**Marketing version (`expo.version`):** `MAJOR.MINOR.PATCH`. Manual bump in `package.json`. Bump `MINOR` for any new user-facing feature, `PATCH` for bug-fix releases, `MAJOR` only for ground-up changes.

**Build number (`expo.ios.buildNumber`):** managed entirely by CI from `github.run_number`. Do not bump manually. Do not delete a workflow file (run number resets per file).

| Action | Version bump | Build number |
|---|---|---|
| Bug-fix patch release | `1.4.2 → 1.4.3` (manual) | next `run_number` (auto) |
| New feature release | `1.4.3 → 1.5.0` (manual) | next `run_number` (auto) |
| Major refactor / overhaul | `1.5.0 → 2.0.0` (manual) | next `run_number` (auto) |

A pre-release CI step asserts that `expo.version` is greater than the latest version in App Store Connect (use `eas metadata` or a small script). If it isn't, the deploy job fails, preventing accidental duplicate releases.

---

## Environments

Vela has three environments. Each has its own Supabase project, RevenueCat project, PostHog project, and env vars.

| Environment | Branch | Supabase Project | RevenueCat | App ID |
|-------------|--------|------------------|------------|--------|
| `development` | feature branches | `vela-dev` | sandbox | `com.velapp.vela.dev` |
| `staging` | `develop` | `vela-staging` | sandbox | `com.velapp.vela.staging` |
| `production` | `main` | `vela-prod` | live | `com.velapp.vela` |

### Why three environments
- **dev:** Each developer has their own data, can experiment freely
- **staging:** Internal QA before App Store submit, real-world test of CI/CD
- **production:** Real users, real money, real consequences

### Bundle IDs and visual indicators

Different bundle IDs let you install all three on the same phone:
- Production: `com.velapp.vela` (real Vela icon)
- Staging: `com.velapp.vela.staging` (Vela icon with orange "S" overlay)
- Dev: `com.velapp.vela.dev` (Vela icon with red "D" overlay)

```javascript
// app.config.js
const APP_VARIANT = process.env.APP_VARIANT || 'development';

const config = {
  development: {
    name: 'Vela Dev',
    bundleIdentifier: 'com.velapp.vela.dev',
    icon: './assets/icons/icon-dev.png',
    scheme: 'vela-dev',
  },
  staging: {
    name: 'Vela Staging',
    bundleIdentifier: 'com.velapp.vela.staging',
    icon: './assets/icons/icon-staging.png',
    scheme: 'vela-staging',
  },
  production: {
    name: 'Vela',
    bundleIdentifier: 'com.velapp.vela',
    icon: './assets/icons/icon.png',
    scheme: 'vela',
  },
}[APP_VARIANT];

export default {
  expo: {
    ...config,
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: config.bundleIdentifier,
      buildNumber: process.env.BUILD_NUMBER || '1',
    },
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
      variant: APP_VARIANT,
    },
  },
};
```

---

## Environment Variables

### Convention
- `EXPO_PUBLIC_*` — exposed to the client (use sparingly)
- Other vars — backend/build-time only

### Required env vars

```bash
# .env.example (committed to repo, no secrets)

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...

# PostHog
EXPO_PUBLIC_POSTHOG_KEY=phc_...
EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Sentry
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# App
EXPO_PUBLIC_APP_VARIANT=development
EXPO_PUBLIC_API_URL=https://dev.vela.app

# EAS (CI only, not in .env)
EAS_PROJECT_ID=xxx-xxx-xxx
EXPO_TOKEN=xxx
```

### Files
- `.env.development` — local dev defaults
- `.env.staging` — staging build values
- `.env.production` — production build values
- `.env.local` — local overrides (gitignored)
- `.env.example` — template (committed)

```gitignore
# .gitignore
.env
.env.local
.env.*.local
```

### Loading

Use `dotenv` automatically through Expo:

```javascript
// app.config.js auto-loads .env files based on APP_VARIANT
```

---

## Branching Strategy

```
main (production)
  ↑
  │ (PR after staging soak)
  │
develop (staging)
  ↑
  │ (PR after review)
  │
feature/xxx, fix/xxx, chore/xxx
```

### Branch rules
- `main` — protected, requires PR + approvals + CI green
- `develop` — protected, requires PR + CI green
- `feature/*` — short-lived, branched from `develop`
- `hotfix/*` — branched from `main`, merged back to both `main` and `develop`

### PR requirements (enforced by GitHub branch protection)
- 1 reviewer approval (or solo dev: self-merge after CI passes)
- All CI checks pass
- No merge commits (rebase or squash only)
- Linear history

---

## GitHub Actions Workflows

### Workflow 1: PR Checks

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks

on:
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: TypeScript check
        run: npm run typecheck
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  build-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Verify Expo config
        run: npx expo-doctor
      
      - name: Verify metro builds
        run: npx expo export --platform ios --dev
```

### Workflow 2: Deploy to Staging

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: EAS Build (staging)
        # BUILD_NUMBER comes from `github.run_number`, which is monotonic per
        # workflow file — guaranteed to never collide on TestFlight, even on
        # rebuilds, as long as we never delete the workflow file.
        run: eas build --platform ios --profile staging --non-interactive --auto-submit
        env:
          APP_VARIANT: staging
          BUILD_NUMBER: ${{ github.run_number }}
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          EXPO_PUBLIC_REVENUECAT_IOS_KEY: ${{ secrets.STAGING_REVENUECAT_KEY }}
          EXPO_PUBLIC_POSTHOG_KEY: ${{ secrets.STAGING_POSTHOG_KEY }}
          EXPO_PUBLIC_SENTRY_DSN: ${{ secrets.STAGING_SENTRY_DSN }}
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,ref
          text: 'Staging build complete - check TestFlight'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

### Workflow 3: Deploy to Production

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      release_notes:
        description: 'Release notes'
        required: true

jobs:
  build:
    runs-on: ubuntu-latest
    environment: production  # GitHub environment with required reviewers
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Read version
        id: version
        run: echo "VERSION=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT
      
      - name: EAS Build (production)
        run: eas build --platform ios --profile production --non-interactive --auto-submit
        env:
          APP_VARIANT: production
          BUILD_NUMBER: ${{ github.run_number }}
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PROD_SUPABASE_ANON_KEY }}
          EXPO_PUBLIC_REVENUECAT_IOS_KEY: ${{ secrets.PROD_REVENUECAT_KEY }}
          EXPO_PUBLIC_POSTHOG_KEY: ${{ secrets.PROD_POSTHOG_KEY }}
          EXPO_PUBLIC_SENTRY_DSN: ${{ secrets.PROD_SENTRY_DSN }}
      
      - name: Create GitHub Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ steps.version.outputs.VERSION }}
          release_name: Release v${{ steps.version.outputs.VERSION }}
          body: ${{ github.event.inputs.release_notes }}
          draft: false
          prerelease: false
      
      - name: Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: vela
          SENTRY_PROJECT: vela-mobile
        with:
          environment: production
          version: v${{ steps.version.outputs.VERSION }}
```

### Workflow 4: Nightly E2E

```yaml
# .github/workflows/e2e-nightly.yml
name: Nightly E2E

on:
  schedule:
    - cron: '0 5 * * *'  # 5am UTC
  workflow_dispatch:

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH
      
      - name: Setup iOS Simulator
        run: |
          xcrun simctl list devices
          xcrun simctl boot "iPhone 15 Pro"
      
      - name: Install staging build
        run: |
          # Download latest staging build from EAS
          eas build:list --platform ios --status finished --limit 1 --json | jq -r '.[0].artifacts.buildUrl' | xargs curl -L -o staging.tar.gz
          tar -xzf staging.tar.gz
          xcrun simctl install booted Vela.app
      
      - name: Run Maestro tests
        run: maestro test .maestro/
      
      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-screenshots
          path: ~/.maestro/tests/
```

### Workflow 5: Dependency updates

Use Renovate or Dependabot for automated dep updates:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      expo:
        patterns:
          - "expo"
          - "expo-*"
      react:
        patterns:
          - "react"
          - "react-*"
          - "@react-native*"
      dev-deps:
        dependency-type: development
```

---

## EAS Build Profiles

```json
// eas.json
{
  "cli": {
    "version": ">= 5.9.0",
    "appVersionSource": "remote"
  },
  
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true,
        "resourceClass": "m-medium"
      },
      "env": {
        "APP_VARIANT": "development"
      }
    },
    
    "staging": {
      "distribution": "internal",
      "channel": "staging",
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release"
      },
      "env": {
        "APP_VARIANT": "staging"
      }
    },
    
    "production": {
      "channel": "production",
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release"
      },
      "env": {
        "APP_VARIANT": "production"
      },
      "autoIncrement": true
    }
  },
  
  "submit": {
    "staging": {
      "ios": {
        "appleId": "team@vela.app",
        "ascAppId": "STAGING_APP_ID",
        "appleTeamId": "TEAM_ID"
      }
    },
    "production": {
      "ios": {
        "appleId": "team@vela.app",
        "ascAppId": "PROD_APP_ID",
        "appleTeamId": "TEAM_ID"
      }
    }
  }
}
```

---

## Secret Management

### GitHub Secrets

Configure under `Settings → Secrets and variables → Actions`:

```
# Repository secrets (used in workflows)
EXPO_TOKEN
CODECOV_TOKEN
SLACK_WEBHOOK
SENTRY_AUTH_TOKEN

# Environment secrets (per environment)
# Staging
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
STAGING_REVENUECAT_KEY
STAGING_POSTHOG_KEY
STAGING_SENTRY_DSN

# Production
PROD_SUPABASE_URL
PROD_SUPABASE_ANON_KEY
PROD_REVENUECAT_KEY
PROD_POSTHOG_KEY
PROD_SENTRY_DSN
```

### EAS-side secrets (server-only values)

Anything that is **not** prefixed `EXPO_PUBLIC_` is not bundled into the app and lives only on EAS Build's machines. Use this for `OPENAI_API_KEY` (if referenced in native build scripts), `SUPABASE_SERVICE_ROLE_KEY`, `SINGULAR_SECRET`, etc. Set them with:

```bash
# Per environment, scoped to a build profile.
eas secret:create --scope project --name OPENAI_API_KEY \
  --value "sk-..." --type string
eas secret:list   # confirm
eas secret:delete --name OLD_KEY  # rotation
```

EAS surfaces these as env vars during the build — reference them in `eas.json` build profiles if needed (`"env": { "SOME_SERVER_ONLY": "$SOME_SERVER_ONLY" }`). **Note:** the AI key used at runtime is **`OPENAI_API_KEY` on Supabase Edge** (`supabase secrets set`), not in the mobile binary.

**Anything in `EXPO_PUBLIC_*` is shipped to clients in plaintext.** Never put a service-role key, an OpenAI key, or anything else that could be abused if extracted from the binary.

### Local development secrets

Never commit `.env.local`. Each developer has their own.

For sharing secrets within the team, use 1Password or Doppler.

### Secret rotation policy

| Secret type | Rotation frequency |
|-------------|---------------------|
| Supabase service_role key | Every 90 days |
| Supabase anon key | Annually (or on incident) |
| RevenueCat key | On incident only |
| PostHog API key | Annually |
| Sentry DSN | Annually |
| Apple App Store Connect | Annually |

### Rotation runbook

When rotating a secret:

1. Generate new secret in source system
2. Add new secret to GitHub with name suffix `_NEW` (e.g., `PROD_SUPABASE_ANON_KEY_NEW`)
3. Deploy with both old and new accepted (if possible)
4. Verify new is working
5. Replace old secret with new value
6. Remove `_NEW` suffix
7. Revoke old secret in source system

---

## Database Migrations (Supabase)

Migrations live in `supabase/migrations/` and run automatically against each environment.

### Migration workflow

```bash
# Create a new migration locally
supabase migration new add_streak_tracking

# Edit the SQL file
# supabase/migrations/20251015120000_add_streak_tracking.sql

# Test locally
supabase db reset

# Apply to staging via CI (automatic on develop branch push)
# Apply to production via CI (automatic on main branch push)
```

### CI workflow for migrations

```yaml
# .github/workflows/migrate-staging.yml
name: Migrate Staging DB

on:
  push:
    branches: [develop]
    paths: ['supabase/migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Supabase CLI
        uses: supabase/setup-cli@v1
      
      - name: Run migrations on staging
        run: |
          supabase link --project-ref ${{ secrets.STAGING_PROJECT_REF }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}
```

### Migration safety rules

- **Always backwards compatible.** New columns nullable or with defaults. Don't drop columns in same release as deploying code that doesn't use them.
- **Test on staging first.** Even small migrations can have surprising effects.
- **Manual review for destructive migrations.** Add `# REQUIRES MANUAL REVIEW` comment, block auto-deploy.
- **Backup before production migrations.** Supabase provides point-in-time recovery, but verify it's enabled.

---

## Edge Function Deployment

Edge functions deploy through Supabase CLI in CI:

```yaml
# .github/workflows/deploy-edge-functions.yml
name: Deploy Edge Functions

on:
  push:
    branches: [develop, main]
    paths: ['supabase/functions/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Supabase CLI
        uses: supabase/setup-cli@v1
      
      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: |
          supabase functions deploy --project-ref ${{ secrets.STAGING_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: |
          supabase functions deploy --project-ref ${{ secrets.PROD_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## Release Workflow

### For a routine release (every 1-2 weeks)

1. Developer merges PRs to `develop` throughout the week
2. CI auto-deploys to staging on each merge
3. Internal team tests on TestFlight (staging)
4. Friday: PR from `develop` → `main`
5. Required: bump version in `package.json` + `app.config.js`
6. Required: write release notes
7. Merge to `main` triggers production deploy
8. EAS auto-submits to App Store
9. Apple review (~24-48h)
10. Manual release in App Store Connect

### For a hotfix

1. Branch from `main`: `hotfix/critical-bug`
2. Fix, test locally
3. PR to `main` directly
4. After merge, also PR to `develop` (forward-merge)
5. Same release flow continues

---

## Build Numbering

### Version format
- `1.2.3` — semantic versioning
  - **Major:** breaking changes (user-visible feature removal)
  - **Minor:** new features
  - **Patch:** bug fixes

### Build number
- Auto-incrementing on EAS production builds (`autoIncrement: true`)
- Tied to git commit count or timestamp

### Where to update
1. `package.json` (version)
2. `app.config.js` (version)
3. App Store Connect (auto-synced via submit)

---

## Rollback Strategy

### Rolling back a release

iOS apps can't be "rolled back" the way servers can. Mitigations:

1. **Phased rollout** — release to 1% → 10% → 50% → 100% over 7 days
2. **Feature flags** — disable problematic features remotely via PostHog
3. **Forced update** — bump min version in remote config, force users to update
4. **Hotfix release** — fast-track a fix through expedited review

### Database rollbacks

- All migrations forward-only (no `DOWN` migrations)
- For breaking schema change: keep old schema for 1 release cycle, deprecate, then remove
- Supabase point-in-time recovery available for last 7 days (paid plan)

### Code rollback

- Revert commit on `main`
- Auto-deploys revert to staging
- Confirm fix works on staging
- PR revert to production

---

## Monitoring CI Health

### Metrics to track

- **CI duration:** PR checks should take <5 minutes. Investigate if creeping.
- **Flaky test rate:** Track which tests fail intermittently. Fix or remove.
- **Build success rate:** Production builds should succeed >95%.
- **Deploy frequency:** Aim for at least weekly to staging, biweekly to production.

### Alerts

Slack notifications for:
- Production deploy success/failure
- Staging deploy failure
- Nightly E2E failure
- Flaky test detected (failure followed by retry success)

---

## Local Development Workflow

### First-time setup

```bash
# Clone
git clone https://github.com/vela/vela-mobile.git
cd vela-mobile

# Install dependencies
npm install

# Setup env
cp .env.example .env.local
# Edit .env.local with your dev Supabase credentials

# Setup pre-commit hooks
npx husky install

# Build dev client (one-time)
eas build --profile development --platform ios

# Install on simulator
# Or scan QR code for physical device
```

### Daily workflow

```bash
# Pull latest
git checkout develop
git pull

# Create feature branch
git checkout -b feature/improve-onboarding

# Start dev server
npm start

# Make changes, test locally
npm test
npm run typecheck
npm run lint

# Commit (pre-commit hook runs lint + typecheck)
git add .
git commit -m "feat: improve onboarding step 3"

# Push and open PR
git push origin feature/improve-onboarding
gh pr create --base develop
```

### Pre-commit hook

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## CI/CD Maturity Roadmap

### Phase 1 (v1.0 launch — current)
- PR checks (test, lint, typecheck)
- Auto-deploy to staging
- Manual production releases
- Manual TestFlight testing

### Phase 2 (post-launch, 0-3 months)
- Nightly E2E
- Phased rollouts in App Store Connect
- Sentry release tracking
- Slack notifications

### Phase 3 (3-6 months)
- Visual regression testing (Percy / Chromatic)
- Performance budgets in CI
- Accessibility audits in CI
- Auto-changelog generation

### Phase 4 (6-12 months)
- Feature flags driving 100% of new feature releases
- A/B testing infrastructure
- Continuous deployment to production (gated by feature flags)
- Multi-region deployment if needed
