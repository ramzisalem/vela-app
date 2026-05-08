#!/usr/bin/env node
/**
 * Inspect an Apple AuthKey `.p8` (PEM PKCS#8 EC private key).
 *
 * The file is not "encoded" ciphertext — it is plain PEM. This script:
 *   - Validates the key loads in Node
 *   - Prints safe metadata (type, size, optional Key ID from filename)
 *   - With --public: writes the SPKI **public** key (safe to share / compare)
 *   - With --jwt: prints a short-lived Apple **client secret** JWT for Supabase OAuth
 *     (requires: npm install jsonwebtoken --save-dev)
 *
 * Usage:
 *   node scripts/decode-apple-p8.mjs /path/AuthKey_ZSHD8PXXWX.p8
 *   node scripts/decode-apple-p8.mjs /path/AuthKey_ZSHD8PXXWX.p8 --public
 *   APPLE_TEAM_ID=666MXKGN46 APPLE_CLIENT_ID=com.velapp.auth node scripts/decode-apple-p8.mjs ~/Downloads/AuthKey_ZSHD8PXXWX.p8 --jwt --key-id ZSHD8PXXWX
 *
 * Do not commit .p8 files or paste private keys into chat.
 */

import { createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function usage() {
  console.error(`Usage:
  node scripts/decode-apple-p8.mjs <path-to-AuthKey.p8> [--public] [--jwt] [--key-id KID]

Options:
  --public     Print derived public key (PEM SPKI) — no secret material from the private body.
  --jwt        Print Apple OAuth client secret JWT (stdout). Needs jsonwebtoken + env:
               APPLE_TEAM_ID   (10-char Team ID)
               APPLE_CLIENT_ID (Services ID for web OAuth, or per Apple/Supabase docs)
               Optional: APPLE_KEY_ID (defaults to --key-id or parsed from filename)
  --key-id K   Explicit Key ID (else parsed from AuthKey_<KID>.p8)

Examples:
  node scripts/decode-apple-p8.mjs ~/Downloads/AuthKey_ZSHD8PXXWX.p8
  node scripts/decode-apple-p8.mjs ~/Downloads/AuthKey_ZSHD8PXXWX.p8 --public
  APPLE_TEAM_ID=666MXKGN46 APPLE_CLIENT_ID=com.velapp.auth node scripts/decode-apple-p8.mjs ~/Downloads/AuthKey_ZSHD8PXXWX.p8 --jwt --key-id ZSHD8PXXWX
`);
  process.exit(1);
}

function keyIdFromFilename(name) {
  const m = /^AuthKey_([^.]+)\.p8$/i.exec(basename(name));
  return m ? m[1] : null;
}

async function main() {
  const argv = process.argv.slice(2);
  const wantPublic = argv.includes('--public');
  const wantJwt = argv.includes('--jwt');
  const path = argv.find((a) => !a.startsWith('--'));
  if (!path) usage();

  let keyIdFlag = null;
  const kidIdx = argv.indexOf('--key-id');
  if (kidIdx !== -1 && argv[kidIdx + 1]) keyIdFlag = argv[kidIdx + 1];

  const pem = readFileSync(path, 'utf8');
  if (!pem.includes('BEGIN PRIVATE KEY')) {
    console.error('File does not look like a PKCS#8 PEM private key (expect BEGIN PRIVATE KEY).');
    process.exit(1);
  }

  const privateKey = createPrivateKey(pem);
  const fromFile = keyIdFromFilename(path);
  const keyId = keyIdFlag || fromFile || process.env.APPLE_KEY_ID;

  // With --jwt only, keep stdout as a single pasteable line (Supabase / pipes).
  const logInspect = wantJwt && !wantPublic ? console.error.bind(console) : console.log.bind(console);
  logInspect('--- Apple AuthKey (.p8) inspection ---');
  logInspect('Path:', path);
  logInspect('Asymmetric type:', privateKey.asymmetricKeyType);
  logInspect('PEM byte length:', Buffer.byteLength(pem, 'utf8'));
  if (fromFile) logInspect('Key ID (from filename):', fromFile);
  else logInspect('Key ID (from filename): (could not parse; use AuthKey_<KEYID>.p8 or --key-id)');
  logInspect('');

  if (wantPublic) {
    const pub = privateKey.export({ format: 'pem', type: 'spki' });
    console.log('--- Public key (SPKI PEM) — safe to share ---\n');
    console.log(pub);
  }

  if (wantJwt) {
    const teamId = process.env.APPLE_TEAM_ID;
    const clientId = process.env.APPLE_CLIENT_ID;
    const kid = keyId || process.env.APPLE_KEY_ID;
    if (!teamId || !clientId || !kid) {
      console.error('Missing env for --jwt: need APPLE_TEAM_ID, APPLE_CLIENT_ID, and Key ID (--key-id or filename or APPLE_KEY_ID).');
      process.exit(1);
    }
    let jwt;
    try {
      jwt = (await import('jsonwebtoken')).default;
    } catch {
      console.error('Install jsonwebtoken: npm install jsonwebtoken --save-dev');
      process.exit(1);
    }
    // Apple allows max ~6 months; stay under with 150d
    const token = jwt.sign({}, pem, {
      algorithm: 'ES256',
      issuer: teamId,
      audience: 'https://appleid.apple.com',
      subject: clientId,
      expiresIn: '150d',
      header: { alg: 'ES256', kid },
    });
    console.error('--- Apple client secret (JWT) — paste into Supabase Apple provider "Secret Key" ---');
    console.log(token);
    console.error('\n(i) Rotate before Apple\'s 6-month secret expiry; do not log or commit this string.)');
  }

  if (!wantPublic && !wantJwt) {
    console.log('Tip: add --public to print the derived public key, or --jwt (+ env) for OAuth client secret.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
