import { inaturalistReaderContract } from '../../test/contracts/inaturalistReaderContract';
import { InMemoryInaturalistReader } from './InMemoryInaturalist';

inaturalistReaderContract('in-memory', () => {
  const reader = new InMemoryInaturalistReader();
  reader.observations.set('1001', { visible: true, displayName: 'Goldie' });
  reader.observations.set('1002', { visible: false, displayName: 'Hidden cat' });
  reader.catalog.set('2001', { visible: true, displayName: 'Goldie' });
  reader.catalog.set('2002', { visible: false, displayName: 'Retired profile' });
  reader.status = {
    id: 'inaturalist',
    data: { running: false, lastStatus: 'success' },
  };
  return reader;
});
