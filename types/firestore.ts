import { z } from 'zod';
import { DocumentReference } from 'firebase/firestore';

export const firestoreDocRefSchema = z.any().refine(
  (x: object): x is DocumentReference => x instanceof DocumentReference,
  {
    message: 'Invalid Firestore DocumentReference'
  }
);
