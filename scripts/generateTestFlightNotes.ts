/**
 * Generate TestFlight test notes from CHANGELOG.md (file 17).
 *
 * Run before each build:
 *   npx ts-node scripts/generateTestFlightNotes.ts > .testflight-notes.txt
 *
 * Read by EAS Build via the iOS-specific submit hook.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const TEMPLATE = `Vela {version} — TestFlight build

What's new in this build:
{bullets}

Areas to test:
- Capture flow under multiple lighting conditions
- Score reveal copy + brand voice
- Comparison three modes (slider / side-by-side / difference)
- Daily routine adaptation after week 2 scan
- Day-7 forecast band + trial extension
- Settings → cancel-save flow + exit interview
- Life-stage modes (pregnancy / postpartum / menopause)
- Notification budget per surface

Known issues:
- ARKit features require a TrueDepth iPhone (X+)
- Singular MMP only initializes after the ATT response

Feedback via: support@getvela.app
`;

function readChangelog(): { version: string; bullets: string[] } {
  if (!fs.existsSync(CHANGELOG)) {
    return { version: '1.0.0', bullets: ['Initial TestFlight build.'] };
  }
  const raw = fs.readFileSync(CHANGELOG, 'utf-8');
  const lines = raw.split('\n');
  let version = '1.0.0';
  const bullets: string[] = [];
  let inLatest = false;
  for (const line of lines) {
    const versionMatch = line.match(/^##\s+\[?([0-9]+\.[0-9]+\.[0-9]+)/);
    if (versionMatch) {
      if (inLatest) break;
      version = versionMatch[1];
      inLatest = true;
      continue;
    }
    if (inLatest && line.startsWith('- ')) {
      bullets.push(line);
    }
  }
  if (bullets.length === 0) bullets.push('- Routine maintenance and stability fixes.');
  return { version, bullets };
}

function main() {
  const { version, bullets } = readChangelog();
  const out = TEMPLATE.replace('{version}', version).replace('{bullets}', bullets.join('\n'));
  process.stdout.write(out);
}

main();
