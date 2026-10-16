import { useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { appModules } from '@/composition/appModules';
import { PLATFORM_INFO } from '@/config/platformInfo';
import { useAuth } from '@/presentation/providers';
import { FormTextInput } from '@/presentation/forms';
import {
  AppHeader,
  AppText,
  Button,
  Card,
  FeedbackBanner,
  Screen,
} from '@/presentation/ui';
import { useAppTheme } from '@/theme';

export const safetyError = (error: unknown, moderation = false): string => {
  const code = (error as { code?: string })?.code?.replace('functions/', '');
  if (code === 'resource-exhausted')
    return 'Please wait before sending another report, or use the safety contact email below.';
  if (code === 'permission-denied' || code === 'unauthenticated')
    return 'Your account cannot access this service. Sign in again or use the safety contact email below.';
  if (code === 'failed-precondition' && moderation)
    return 'This action cannot be applied to the selected account. Platform administrator accounts require a separate administrator response.';
  if (code === 'not-found')
    return 'The report or target could not be found. Refresh and verify the identifiers.';
  if (code === 'invalid-argument')
    return 'Check the required fields and identifiers, then try again.';
  if (code === 'failed-precondition')
    return 'This report changed. Refresh the inbox before saving again.';
  return 'The request could not be completed. Try again or contact the safety team by email.';
};

function ReportForm({ email }: { email?: string }) {
  const theme = useAppTheme();
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [contentReference, setContentReference] = useState('');
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<string>();
  const [error, setError] = useState<string>();
  const attempt = useRef<
    | { requestId: string; description: string; contentReference: string }
    | undefined
  >(undefined);
  const inFlight = useRef(false);

  const submit = async () => {
    if (inFlight.current || !description.trim()) return;
    inFlight.current = true;
    setSending(true);
    setError(undefined);
    const details = {
      description: description.trim(),
      contentReference: contentReference.trim(),
    };
    try {
      if (
        !attempt.current ||
        attempt.current.description !== details.description ||
        attempt.current.contentReference !== details.contentReference
      ) {
        attempt.current = {
          requestId: appModules.safetyReports.newRequestId(),
          ...details,
        };
      }
      const result = await appModules.safetyReports.submit(attempt.current);
      setReceipt(result.id);
      setDescription('');
      setContentReference('');
    } catch (failure) {
      setError(safetyError(failure));
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const emailSafetyTeam = async () => {
    setError(undefined);
    try {
      await Linking.openURL(
        `mailto:${PLATFORM_INFO.supportEmail}?subject=${encodeURIComponent('Campus Cats safety concern')}`,
      );
    } catch {
      setError(
        `An email app could not be opened. Write to ${PLATFORM_INFO.supportEmail} from your email service.`,
      );
    }
  };

  return (
    <Screen scroll>
      <AppHeader
        title="Report a safety concern"
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace('/login')
        }
      />
      <View style={{ gap: theme.spacing.md }}>
        <Card style={{ gap: theme.spacing.sm }}>
          <AppText>
            Report child safety concerns, abuse, or harmful content to the
            Campus Cats safety team.
          </AppText>
          <AppText>
            Describe what happened and where to find it. Do not upload, copy, or
            forward sexual images of children. This form accepts text only.
          </AppText>
          <AppText color="muted">
            If someone is in immediate danger, contact local emergency services.
            This is not an emergency service.
          </AppText>
        </Card>
        {receipt ? (
          <Card style={{ gap: theme.spacing.sm }}>
            <FeedbackBanner
              tone="success"
              message="Your report has been received by Campus Cats."
            />
            <AppText selectable>Reference: {receipt}</AppText>
            <AppText>
              Keep this reference for follow-up. The safety team may contact you
              at {email}.
            </AppText>
            <Button
              label="Report another concern"
              variant="secondary"
              onPress={() => {
                setReceipt(undefined);
                attempt.current = undefined;
              }}
            />
          </Card>
        ) : email ? (
          <>
            <AppText>
              Your report and account email are shared privately with platform
              administrators, not the club chat or reported user.
            </AppText>
            <FormTextInput
              label="What happened?"
              required
              multiline
              maxLength={3000}
              value={description}
              onChangeText={setDescription}
              editable={!sending}
              helper={`${description.length}/3000 characters`}
            />
            <FormTextInput
              label="Content or account reference (optional)"
              multiline
              maxLength={500}
              value={contentReference}
              onChangeText={setContentReference}
              editable={!sending}
              helper="Include a link, message date and time, profile name, or other details that help us find it."
            />
            <AppText color="muted">
              We may contact you at {email}. Safety records may be retained for
              investigation or legal obligations as described in our Privacy
              Policy.
            </AppText>
            <Button
              label="Send safety report"
              loading={sending}
              loadingLabel="Sending report…"
              disabled={!description.trim()}
              onPress={() => void submit()}
            />
          </>
        ) : (
          <AppText>
            Sign in to send the form, or report directly using the safety
            contact email below. You do not need an account to email us.
          </AppText>
        )}
        {error ? <FeedbackBanner tone="danger" message={error} /> : null}
        <AppText selectable>
          Safety contact: {PLATFORM_INFO.supportEmail}
        </AppText>
        <Button
          label="Email safety team"
          icon="mail-outline"
          variant="secondary"
          onPress={() => void emailSafetyTeam()}
        />
        <Button
          label="Child Safety Standards"
          variant="tertiary"
          onPress={() => router.push('/legal/child-safety' as never)}
        />
        <Button
          label="Privacy Policy"
          variant="tertiary"
          onPress={() => router.push('/legal/privacy')}
        />
      </View>
    </Screen>
  );
}

export default function SafetyReportScreen() {
  const { currentUser } = useAuth();
  // Remount on identity changes so drafts, receipts and in-flight results never cross accounts.
  return (
    <ReportForm
      key={currentUser?.id ?? 'signed-out'}
      email={currentUser?.email}
    />
  );
}
