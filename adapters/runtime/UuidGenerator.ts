import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

import { IdGenerator } from '../../core/domain';

export class UuidGenerator implements IdGenerator {
  next(): string {
    return uuid();
  }
}
