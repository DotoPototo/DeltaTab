// Regenerates tests/fixtures/accent-golden.json; bump ACCENT_VERSION with any deliberate picker change.
import { writeFileSync } from 'node:fs';
import { extractAccent } from '@/libs/accent';
import { synthetic } from '../tests/fixtures/syntheticWallpapers';

const path = new URL('../tests/fixtures/accent-golden.json', import.meta.url);
const golden = Array.from({ length: 300 }, (_, i) => extractAccent(synthetic(i + 1)));
writeFileSync(path, `${JSON.stringify(golden, null, 2)}\n`);
console.log(`Wrote ${golden.length} accents to tests/fixtures/accent-golden.json`);
