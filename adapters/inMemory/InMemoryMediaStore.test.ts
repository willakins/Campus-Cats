import { mediaStoreContract } from '../../test/contracts/mediaStoreContract';
import { InMemoryMediaStore } from './InMemoryMediaStore';

mediaStoreContract('in-memory', () => new InMemoryMediaStore());
