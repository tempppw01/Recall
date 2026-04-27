const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const standaloneRoot = path.join(projectRoot, '.next', 'standalone');

const copyRecursive = (source, destination) => {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
};

const syncStandaloneAssets = () => {
  if (!fs.existsSync(standaloneRoot)) {
    console.warn('[sync-standalone-assets] standalone output not found, skipping');
    return;
  }

  copyRecursive(path.join(projectRoot, 'public'), path.join(standaloneRoot, 'public'));
  copyRecursive(
    path.join(projectRoot, '.next', 'static'),
    path.join(standaloneRoot, '.next', 'static'),
  );

  console.log('[sync-standalone-assets] synced public and .next/static into standalone output');
};

syncStandaloneAssets();
