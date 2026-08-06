import { ExpoImageSelection } from '../adapters/expo/ExpoImageSelection';
import { createFirebaseBackend } from '../adapters/firebase/createFirebaseBackend';
import { RandomPasswordGenerator } from '../adapters/runtime/RandomPasswordGenerator';
import { UuidGenerator } from '../adapters/runtime/UuidGenerator';
import { SystemClock } from '../core/domain';
import { AppInfrastructure } from './createAppModules';

// Provider selection lives here. A future AWS adapter replaces only the
// backend factory; device and runtime adapters remain reusable.
export function createAppInfrastructure(): AppInfrastructure {
  return {
    ...createFirebaseBackend(),
    images: new ExpoImageSelection(),
    passwords: new RandomPasswordGenerator(),
    ids: new UuidGenerator(),
    clock: new SystemClock(),
  };
}
