import { Linking, View } from 'react-native';

import { useRouter } from 'expo-router';

import { AppHeader, AppText, Button, Card, Screen } from '@/components/design';
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_EFFECTIVE_DATE,
  LegalDocument,
} from '@/legal/policies';
import { useAppTheme } from '@/theme';

export const LegalDocumentScreen = ({ document }: { readonly document: LegalDocument }) => {
  const router = useRouter();
  const theme = useAppTheme();
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/login');
  };

  return (
    <Screen scroll>
      <AppHeader title={document.title} eyebrow="Legal" onBack={goBack} />
      <View style={{ gap: theme.spacing.lg }}>
        <Card accent={theme.colors.primary} style={{ gap: theme.spacing.xs }}>
          <AppText variant="label">Effective {LEGAL_EFFECTIVE_DATE}</AppText>
          <AppText>{document.summary}</AppText>
        </Card>

        {document.sections.map((section) => (
          <View key={section.title} style={{ gap: theme.spacing.sm }}>
            <AppText variant="section">{section.title}</AppText>
            {section.paragraphs?.map((paragraph) => (
              <AppText key={paragraph}>{paragraph}</AppText>
            ))}
            {section.bullets?.map((bullet) => (
              <View
                key={bullet}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs }}
              >
                <AppText accessibilityElementsHidden>•</AppText>
                <AppText style={{ flex: 1 }}>{bullet}</AppText>
              </View>
            ))}
          </View>
        ))}

        <Button
          label={`Email ${LEGAL_CONTACT_EMAIL}`}
          icon="mail-outline"
          variant="secondary"
          onPress={() => void Linking.openURL(`mailto:${LEGAL_CONTACT_EMAIL}`)}
        />
      </View>
    </Screen>
  );
};
