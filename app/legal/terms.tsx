import { LegalDocumentScreen } from '@/components/legal';
import { termsOfService } from '@/legal/policies';

const TermsScreen = () => <LegalDocumentScreen document={termsOfService} />;

export default TermsScreen;
