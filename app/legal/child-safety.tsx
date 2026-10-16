import { LegalDocumentScreen } from '@/presentation/legal';
import { childSafetyStandards } from '@/presentation/legal/childSafetyStandards';

export default function ChildSafetyScreen() {
  return <LegalDocumentScreen document={childSafetyStandards} />;
}
