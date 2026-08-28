import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Dialog, FeedbackBanner } from '@/components/design';
import {
  LEGAL_EFFECTIVE_DATE,
  LegalDocument,
  privacyPolicy,
  termsOfService,
} from '@/legal/policies';
import { useAppTheme } from '@/theme';

interface TermsAgreementGateProps {
  readonly visible: boolean;
  readonly onAgree: () => Promise<void>;
}

export const TermsAgreementGate = ({
  visible,
  onAgree,
}: TermsAgreementGateProps) => {
  const theme = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [document, setDocument] = useState<LegalDocument>();

  if (!visible) return null;

  const agree = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await onAgree();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not record your agreement. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      visible
      dismissible={false}
      closeLabel="Terms agreement cannot be dismissed"
      onClose={() => undefined}
      maxWidth={theme.layout.maxAuthWidth}
      contentStyle={{ gap: theme.spacing.md, padding: theme.spacing.xl }}
    >
      {document ? (
        <>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="section">{document.title}</AppText>
            <AppText variant="caption" color="muted">
              Effective {LEGAL_EFFECTIVE_DATE}
            </AppText>
            <AppText>{document.summary}</AppText>
          </View>
          {document.sections.map((section) => (
            <View key={section.title} style={{ gap: theme.spacing.xs }}>
              <AppText variant="cardTitle">{section.title}</AppText>
              {section.paragraphs?.map((paragraph) => (
                <AppText key={paragraph}>{paragraph}</AppText>
              ))}
              {section.bullets?.map((bullet) => (
                <View
                  key={bullet}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: theme.spacing.xs,
                  }}
                >
                  <AppText accessibilityElementsHidden>•</AppText>
                  <AppText style={{ flex: 1 }}>{bullet}</AppText>
                </View>
              ))}
            </View>
          ))}
          <Button
            label="Back to agreement"
            variant="secondary"
            fullWidth
            onPress={() => setDocument(undefined)}
          />
        </>
      ) : (
        <>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="section">Review and accept</AppText>
            <AppText color="muted">
              Before you continue to Campus Cats, please review and accept our
              Terms of Service and acknowledge our Privacy Policy.
            </AppText>
            <AppText variant="caption" color="muted">
              Effective {LEGAL_EFFECTIVE_DATE}
            </AppText>
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <Button
              label="View Terms of Service"
              variant="secondary"
              fullWidth
              onPress={() => setDocument(termsOfService)}
            />
            <Button
              label="View Privacy Policy"
              variant="secondary"
              fullWidth
              onPress={() => setDocument(privacyPolicy)}
            />
          </View>

          <AppText variant="caption" color="muted">
            By selecting “I agree,” you confirm that you have read and agree to
            the Terms of Service and acknowledge the Privacy Policy.
          </AppText>
          {error ? <FeedbackBanner message={error} tone="danger" /> : null}
          <Button
            label="I agree"
            fullWidth
            loading={busy}
            loadingLabel="Recording agreement…"
            onPress={() => void agree()}
          />
        </>
      )}
    </Dialog>
  );
};
