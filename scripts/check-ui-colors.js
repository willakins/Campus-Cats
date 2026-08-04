const fs = require('node:fs');
const path = require('node:path');

const targets = [
  'app/(app)/(tabs)/_layout.tsx',
  'app/(app)/(tabs)/announcements.tsx',
  'app/(app)/(tabs)/catalog.tsx',
  'app/(app)/(tabs)/index.tsx',
  'app/(app)/(tabs)/settings.tsx',
  'app/(app)/(tabs)/stations.tsx',
  'app/(app)/_layout.tsx',
  'app/(app)/announcements/view-ann.tsx',
  'app/(app)/announcements/create-ann.tsx',
  'app/(app)/announcements/edit-ann.tsx',
  'app/(app)/catalog/create-entry.tsx',
  'app/(app)/catalog/edit-entry.tsx',
  'app/(app)/catalog/view-entry.tsx',
  'app/(app)/sighting/create-sighting.tsx',
  'app/(app)/sighting/edit-sighting.tsx',
  'app/(app)/sighting/view-sighting.tsx',
  'app/(app)/stations/create-station.tsx',
  'app/(app)/stations/edit-station.tsx',
  'app/(app)/stations/view-station.tsx',
  'app/(app)/settings',
  'app/(auth)',
  'app/index.tsx',
  'components/auth',
  'components/administration',
  'components/design',
  'components/details',
  'components/forms',
  'components/entries/AnnouncementEntry.tsx',
  'components/entries/CatalogEntryElement.tsx',
  'components/entries/SightingEntry.tsx',
  'components/entries/StationEntry.tsx',
  'components/items/AnnouncementItem.tsx',
  'components/items/CatalogItem.tsx',
  'components/items/StationItem.tsx',
  'components/items/UserItem.tsx',
  'components/items/WhitelistItem.tsx',
  'components/SightingMapView.tsx',
  'components/ui/LoadingIndicator.tsx',
  'components/ui/DateTimeInput.android.tsx',
  'components/ui/DateTimeInput.shared.tsx',
  'components/ui/DateTimeInput.tsx',
  'components/ui/MapView.tsx',
  'forms/AnnouncementForm.tsx',
  'forms/CatalogForm.tsx',
  'forms/Login.tsx',
  'forms/SightingForm.tsx',
  'forms/StationForm.tsx',
];
const colorPattern = /#[0-9a-f]{3,8}\b|(['"])(?:red|green|black|white|gray|grey|tomato)\1/gi;
const sourcePattern = /\.(?:js|jsx|ts|tsx)$/;

const filesUnder = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(filename) : sourcePattern.test(filename) ? [filename] : [];
  });

const violations = targets
  .flatMap((target) => (fs.statSync(target).isDirectory() ? filesUnder(target) : [target]))
  .filter((filename) => !filename.endsWith('.test.tsx'))
  .flatMap((filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    return [...source.matchAll(colorPattern)].map((match) => `${filename}:${source.slice(0, match.index).split('\n').length}`);
  });

if (violations.length > 0) {
  console.error(`Use semantic theme colors instead of raw colors:\n${violations.join('\n')}`);
  process.exitCode = 1;
}
