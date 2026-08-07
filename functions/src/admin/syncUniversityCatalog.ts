import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import { UniversityCatalogService } from '../universityCatalog';

async function main(): Promise<void> {
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY;
  if (!apiKey) throw new Error('COLLEGE_SCORECARD_API_KEY is required');
  if (getApps().length === 0) initializeApp();
  const result = await new UniversityCatalogService(
    getFirestore(),
    () => apiKey,
  ).sync();
  process.stdout.write(`Synchronized ${result.synchronized} universities.\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
