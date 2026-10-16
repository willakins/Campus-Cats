import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { appModules } from '@/composition/appModules';
import {
  SafetyReport,
  SafetyReportCursor,
  SafetyReportStatus,
} from '@/core/ports/safetyReports';
import { useAuth } from '@/presentation/providers';
import { FormTextInput } from '@/presentation/forms';
import {
  AccessDeniedState,
  AppHeader,
  AppText,
  Button,
  Card,
  FeedbackBanner,
  Screen,
  SegmentedControl,
} from '@/presentation/ui';
import { useAppTheme } from '@/theme';
import { safetyError } from './SafetyReportScreen';

function CaseReview({
  report,
  onSaved,
}: {
  report: SafetyReport;
  onSaved: (report: SafetyReport) => void;
}) {
  const theme = useAppTheme();
  const [status, setStatus] = useState(report.status);
  const [note, setNote] = useState('');
  const [targetId, setTargetId] = useState('');
  const [clubId, setClubId] = useState(report.clubId);
  const [pendingAction, setPendingAction] = useState<
    'remove-chat' | 'restrict-account'
  >();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const locked = useRef(false);
  const save = async (moderate = false) => {
    if (locked.current || !note.trim()) return;
    locked.current = true;
    setBusy(true);
    setMessage(undefined);
    setError(undefined);
    try {
      if (moderate && pendingAction) {
        await appModules.safetyReports.moderate({
          id: report.id,
          action: pendingAction,
          targetId: targetId.trim(),
          ...(pendingAction === 'remove-chat' ? { clubId: clubId.trim() } : {}),
          note: note.trim(),
        });
        setPendingAction(undefined);
        setMessage(
          'Safety action applied and recorded. Refresh the inbox to see the latest case information.',
        );
      } else {
        onSaved(
          await appModules.safetyReports.update({
            id: report.id,
            revision: report.revision,
            status,
            note: note.trim(),
          }),
        );
        setNote('');
        setMessage('Review saved.');
      }
    } catch (failure) {
      setError(safetyError(failure, moderate));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <AppText variant="section">Case review</AppText>
      <AppText selectable>Reference: {report.id}</AppText>
      <AppText selectable>
        Reporter: {report.reporterEmail || report.reporterId}
      </AppText>
      <AppText selectable>Club: {report.clubId || 'None'}</AppText>
      <AppText selectable>{report.description}</AppText>
      {report.contentReference ? (
        <AppText selectable>
          Content reference: {report.contentReference}
        </AppText>
      ) : null}
      <AppText color="muted">
        Received {new Date(report.createdAtMs).toLocaleString()}. Email
        notification: {report.notificationState}.
      </AppText>
      {report.lastNote ? (
        <AppText selectable>Latest case note: {report.lastNote}</AppText>
      ) : null}
      <SegmentedControl
        label="Case status"
        value={status}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'reviewing', label: 'Reviewing' },
          { value: 'closed', label: 'Closed' },
        ]}
        onChange={setStatus}
      />
      <FormTextInput
        label="Case note or action reason"
        required
        multiline
        maxLength={2000}
        value={note}
        onChangeText={setNote}
        editable={!busy}
        helper="Record review, removal, and any authority report reference. Do not copy illegal content here. Closing a case does not report it to an authority."
      />
      <Button
        label="Save case review"
        disabled={!note.trim() || Boolean(pendingAction)}
        loading={busy}
        onPress={() => void save()}
      />
      <AppText variant="label">Content and account actions</AppText>
      <AppText>
        Verify the target in the original record before acting. Use the response
        procedure for other content types and authority reporting.
      </AppText>
      <FormTextInput
        label="Target message ID or user ID"
        value={targetId}
        onChangeText={(value) => {
          setTargetId(value);
          setPendingAction(undefined);
        }}
        editable={!busy}
        maxLength={128}
      />
      <FormTextInput
        label="Club ID for message removal"
        value={clubId}
        onChangeText={(value) => {
          setClubId(value);
          setPendingAction(undefined);
        }}
        editable={!busy}
        maxLength={128}
      />
      <Button
        label="Remove chat message…"
        variant="secondary"
        disabled={busy || !targetId.trim() || !clubId.trim() || !note.trim()}
        onPress={() => setPendingAction('remove-chat')}
      />
      <Button
        label="Restrict account…"
        variant="secondary"
        disabled={busy || !targetId.trim() || !note.trim()}
        onPress={() => setPendingAction('restrict-account')}
      />
      {pendingAction ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <AppText>
            {pendingAction === 'remove-chat'
              ? `Remove message ${targetId} from club ${clubId}? The message body will be replaced.`
              : `Restrict user ${targetId}? This blocks access, including officer and president access.`}
          </AppText>
          <Button
            label="Confirm safety action"
            variant="danger"
            loading={busy}
            onPress={() => void save(true)}
          />
          <Button
            label="Cancel safety action"
            variant="tertiary"
            disabled={busy}
            onPress={() => setPendingAction(undefined)}
          />
        </Card>
      ) : null}
      {message ? <FeedbackBanner tone="success" message={message} /> : null}
      {error ? <FeedbackBanner tone="danger" message={error} /> : null}
    </Card>
  );
}

function Inbox() {
  const theme = useAppTheme();
  const router = useRouter();
  const [reports, setReports] = useState<readonly SafetyReport[]>([]);
  const [cursor, setCursor] = useState<SafetyReportCursor | null>(null);
  const [filter, setFilter] = useState<SafetyReportStatus | 'all'>('open');
  const [selected, setSelected] = useState<SafetyReport>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const requestVersion = useRef(0);
  const load = useCallback(
    async (page?: SafetyReportCursor) => {
      const version = ++requestVersion.current;
      setLoading(true);
      setError(undefined);
      setSelected(undefined);
      if (!page) {
        setReports([]);
        setCursor(null);
      }
      try {
        const result = await appModules.safetyReports.list({
          ...(filter !== 'all' ? { status: filter } : {}),
          ...(page ? { cursor: page } : {}),
        });
        if (version !== requestVersion.current) return;
        setReports((previous) =>
          page ? [...previous, ...result.reports] : result.reports,
        );
        setCursor(result.nextCursor);
      } catch (failure) {
        if (version === requestVersion.current) {
          setReports([]);
          setCursor(null);
          setError(safetyError(failure));
        }
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    },
    [filter],
  );
  useEffect(() => {
    void load();
    return () => {
      requestVersion.current++;
    };
  }, [load]);
  return (
    <Screen scroll>
      <AppHeader
        title="Safety inbox"
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace('/settings')
        }
      />
      <View style={{ gap: theme.spacing.md }}>
        <AppText>
          Private reports across Campus Cats clubs. Do not forward report
          contents or open suspicious links outside the response procedure.
        </AppText>
        <SegmentedControl
          label="Filter reports"
          value={filter}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'reviewing', label: 'Reviewing' },
            { value: 'closed', label: 'Closed' },
            { value: 'all', label: 'All' },
          ]}
          onChange={setFilter}
        />
        <Button
          label="Refresh inbox"
          variant="secondary"
          loading={loading}
          onPress={() => void load()}
        />
        {error ? <FeedbackBanner tone="danger" message={error} /> : null}
        {!loading && !error && reports.length === 0 ? (
          <AppText>No reports in this view.</AppText>
        ) : null}
        {selected ? (
          <CaseReview
            key={selected.id}
            report={selected}
            onSaved={(updated) => {
              setSelected(updated);
              setReports((previous) =>
                previous.map((report) =>
                  report.id === updated.id ? updated : report,
                ),
              );
            }}
          />
        ) : null}
        {reports.map((report) => (
          <Button
            key={report.id}
            label={`${report.status} · ${new Date(report.createdAtMs).toLocaleString()} · ${report.id.slice(0, 8)}`}
            variant="secondary"
            disabled={loading}
            onPress={() => setSelected(report)}
          />
        ))}
        {cursor ? (
          <Button
            label="Load more reports"
            variant="secondary"
            loading={loading}
            onPress={() => void load(cursor)}
          />
        ) : null}
      </View>
    </Screen>
  );
}

export default function SafetyInboxScreen() {
  const { currentUser } = useAuth();
  if (!currentUser?.platformAdmin)
    return (
      <Screen>
        <AccessDeniedState message="Only designated platform administrators may review safety reports." />
      </Screen>
    );
  return <Inbox key={currentUser.id} />;
}
