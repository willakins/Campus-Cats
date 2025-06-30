import { DocumentReference } from 'firebase/firestore';
import { z } from 'zod';

export const firestoreDocRefSchema = z
  .any()
  .refine(
    (x: object): x is DocumentReference => x instanceof DocumentReference,
    {
      message: 'Invalid Firestore DocumentReference',
    },
  );
