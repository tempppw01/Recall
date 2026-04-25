#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const nextConfigPath = path.join(rootDir, 'next.config.js');
const appVersionPath = path.join(rootDir, 'src', 'app', 'config', 'appVersion.ts');
const releasesDir = path.join(rootDir, 'docs', 'plan', 'releases');
const stagesDir = path.join(rootDir, 'docs', 'plan', 'stages');

const errors = [];

const readText = (targetPath) => fs.readFileSync(targetPath, 'utf8');

const parseSemver = (raw) => {
  const match = String(raw || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return match.slice(1).map(Number);
};

const compareSemver = (a, b) => {
  const parsedA = Array.isArray(a) ? a : parseSemver(a);
  const parsedB = Array.isArray(b) ? b : parseSemver(b);
  if (!parsedA || !parsedB) {
    throw new Error(`Cannot compare invalid semver values: ${a} vs ${b}`);
  }
  for (let index = 0; index < 3; index += 1) {
    if (parsedA[index] !== parsedB[index]) {
      return parsedA[index] - parsedB[index];
    }
  }
  return 0;
};

const listFiles = (dirPath) =>
  fs.existsSync(dirPath)
    ? fs.readdirSync(dirPath).filter((name) => fs.statSync(path.join(dirPath, name)).isFile())
    : [];

const pkg = JSON.parse(readText(packageJsonPath));
const pkgVersion = pkg.version;

if (!parseSemver(pkgVersion)) {
  errors.push(`package.json version must be strict semver (X.Y.Z), received: ${pkgVersion}`);
}

const nextConfigText = readText(nextConfigPath);
if (!nextConfigText.includes('NEXT_PUBLIC_APP_VERSION: pkg.version')) {
  errors.push('next.config.js must inject NEXT_PUBLIC_APP_VERSION directly from pkg.version.');
}

const appVersionText = readText(appVersionPath);
if (!appVersionText.includes('process.env.NEXT_PUBLIC_APP_VERSION')) {
  errors.push('src/app/config/appVersion.ts must read NEXT_PUBLIC_APP_VERSION at runtime.');
}

const releaseFiles = listFiles(releasesDir);
const allowedReleaseFilePattern = /^(CHANGELOG\.md|release_notes_v\d+\.\d+\.\d+\.md)$/;
for (const fileName of releaseFiles) {
  if (!allowedReleaseFilePattern.test(fileName)) {
    errors.push(`docs/plan/releases contains unsupported file: ${fileName}`);
  }
}

const currentReleaseNotes = `release_notes_v${pkgVersion}.md`;
if (!releaseFiles.includes(currentReleaseNotes)) {
  errors.push(`Missing release notes for current package version: docs/plan/releases/${currentReleaseNotes}`);
}

const releaseNoteVersions = releaseFiles
  .map((fileName) => {
    const match = fileName.match(/^release_notes_v(\d+\.\d+\.\d+)\.md$/);
    return match ? match[1] : null;
  })
  .filter(Boolean);

for (const version of releaseNoteVersions) {
  if (compareSemver(version, pkgVersion) > 0) {
    errors.push(`Release notes version ${version} is higher than package.json version ${pkgVersion}.`);
  }
}

const changelogText = readText(path.join(releasesDir, 'CHANGELOG.md'));
const changelogVersions = Array.from(changelogText.matchAll(/^## v(\d+\.\d+\.\d+)$/gm)).map((match) => match[1]);

if (changelogVersions.length === 0) {
  errors.push('CHANGELOG.md must contain at least one release heading like "## vX.Y.Z".');
} else {
  const highestChangelogVersion = [...changelogVersions].sort(compareSemver).pop();
  if (compareSemver(highestChangelogVersion, pkgVersion) !== 0) {
    errors.push(
      `Highest CHANGELOG version (${highestChangelogVersion}) must match package.json version (${pkgVersion}).`,
    );
  }
}

if (fs.existsSync(stagesDir)) {
  const bannedStagePatterns = [
    /GitHub Release/i,
    /release_notes_v\d+\.\d+\.\d+\.md/i,
    /package\.json\.version/i,
    /NEXT_PUBLIC_APP_VERSION/i,
  ];

  const stageFiles = listFiles(stagesDir);
  for (const fileName of stageFiles) {
    const stageText = readText(path.join(stagesDir, fileName));
    for (const pattern of bannedStagePatterns) {
      if (pattern.test(stageText)) {
        errors.push(`Stage document ${fileName} uses release-version language blocked by release:check (${pattern}).`);
        break;
      }
    }
  }
}

if (errors.length > 0) {
  console.error('release:check failed\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`release:check passed for version ${pkgVersion}`);
