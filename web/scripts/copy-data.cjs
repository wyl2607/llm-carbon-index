#!/usr/bin/env node
/**
 * prebuild / copy-data script for Phase 4 static frontend.
 * - Prefers ../data/output/latest.json (real pipeline output) if present.
 * - Otherwise falls back to ../tests/fixtures/latest.sample.json as placeholder.
 * - Always writes to public/data/latest.json so the app can fetch('/data/latest.json').
 *
 * IMPORTANT: This is SAMPLE / placeholder data until Phase 3 pipeline lands real
 * data/output/latest.json. Labelled as such in UI and web/README.md.
 * The app makes NO other network calls.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DATA = path.join(ROOT, 'public', 'data');
const REAL = path.resolve(ROOT, '../data/output/latest.json');
const SAMPLE = path.resolve(ROOT, '../tests/fixtures/latest.sample.json');
const DEST = path.join(PUBLIC_DATA, 'latest.json');

fs.mkdirSync(PUBLIC_DATA, { recursive: true });

let used;
if (fs.existsSync(REAL)) {
  fs.copyFileSync(REAL, DEST);
  used = 'real (data/output/latest.json)';
} else {
  if (!fs.existsSync(SAMPLE)) {
    console.error('FATAL: neither real latest.json nor sample fixture found.');
    process.exit(1);
  }
  fs.copyFileSync(SAMPLE, DEST);
  used = 'SAMPLE (tests/fixtures/latest.sample.json) — placeholder until pipeline output exists';
}
console.log(`[copy-data] Copied ${used} -> public/data/latest.json`);