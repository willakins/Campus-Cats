import { useState } from 'react';
import { View } from 'react-native';

import { useRouter } from 'expo-router';

import {
  AccessBanner,
  AccessDeniedState,
  AppHeader,
  Button,
  FormSection,
  Screen,
  SegmentedControl,
} from '@/components/design';
import { FormScreen, FormTextInput, PhotoField } from '@/components/forms';
import { appModules } from '@/composition/appModules';
import { Role, canManageFeature, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { useAppTheme } from '@/theme';

type VoteKind = 'contest' | 'presidential_election';

interface ContestOptionForm {
  readonly key: string;
  readonly label: string;
  readonly imageLocalUri?: string;
}

const CreateCommunityVote = () => {
  const router = useRouter();
  const actor = parseUser(useAuth().user);
  const theme = useAppTheme();
  const isOfficer = canManageFeature(actor.role);
  const isPresident = actor.role === Role.President;
  const [kind, setKind] = useState<VoteKind>('contest');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [nominationDays, setNominationDays] = useState('7');
  const [votingDays, setVotingDays] = useState('7');
  const [options, setOptions] = useState<readonly ContestOptionForm[]>([
    { key: 'option-1', label: '' },
    { key: 'option-2', label: '' },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!isOfficer) {
    return (
      <Screen>
        <AppHeader title="Create vote" onBack={() => router.back()} />
        <AccessDeniedState message="Only officers may create contests, and only the President may start a presidential election." />
      </Screen>
    );
  }

  const updateOption = (
    key: string,
    update: (option: ContestOptionForm) => ContestOptionForm,
  ) =>
    setOptions((current) =>
      current.map((option) => (option.key === key ? update(option) : option)),
    );

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await appModules.communityVoting.create(
      actor,
      kind === 'contest'
        ? {
            kind,
            title,
            details,
            votingDays: Number(votingDays),
            options: options.map(({ key: _key, ...option }) => option),
          }
        : {
            kind,
            title,
            details,
            nominationDays: Number(nominationDays),
            votingDays: Number(votingDays),
          },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace({
      pathname: '/votes/view-vote' as never,
      params: { id: result.value.id },
    });
  };

  return (
    <FormScreen
      title="Create vote"
      eyebrow="Community decision"
      saveLabel={kind === 'contest' ? 'Open Contest Voting' : 'Start Election'}
      savingLabel="Creating vote…"
      busy={busy}
      error={error}
      onBack={() => router.back()}
      onSave={() => void create()}
    >
      <AccessBanner
        title="Private ballots"
        message="Members can participate once. Ballots are anonymous and results appear after voting closes."
      />
      {isPresident ? (
        <FormSection title="Vote type">
          <SegmentedControl
            label="Vote type"
            value={kind}
            options={[
              { value: 'contest', label: 'Contest' },
              { value: 'presidential_election', label: 'President election' },
            ]}
            onChange={setKind}
          />
        </FormSection>
      ) : null}
      <FormSection title={kind === 'contest' ? 'Contest details' : 'Election details'}>
        <FormTextInput
          label="Title"
          required
          value={title}
          maxLength={120}
          placeholder={kind === 'contest' ? 'Choose our new club logo' : 'Club president election'}
          onChangeText={setTitle}
        />
        <FormTextInput
          label="Description"
          value={details}
          maxLength={5000}
          multiline
          placeholder="What should members know before participating?"
          onChangeText={setDetails}
        />
      </FormSection>
      <FormSection title="Schedule">
        {kind === 'presidential_election' ? (
          <FormTextInput
            label="Nomination days"
            required
            helper="Choose 1 to 31 days."
            value={nominationDays}
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={setNominationDays}
          />
        ) : null}
        <FormTextInput
          label="Voting days"
          required
          helper="Choose 1 to 14 days."
          value={votingDays}
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={setVotingDays}
        />
      </FormSection>
      {kind === 'contest' ? (
        <>
          {options.map((option, index) => (
            <FormSection key={option.key} title={`Contest option ${index + 1}`}>
              <FormTextInput
                label={`Option ${index + 1} label`}
                required
                value={option.label}
                maxLength={120}
                placeholder="Design or candidate name"
                onChangeText={(label) =>
                  updateOption(option.key, (current) => ({ ...current, label }))
                }
              />
              <PhotoField
                photos={option.imageLocalUri ? [option.imageLocalUri] : []}
                coverUri={option.imageLocalUri}
                onAddPhoto={(imageLocalUri) =>
                  updateOption(option.key, (current) => ({
                    ...current,
                    imageLocalUri,
                  }))
                }
                onRemovePhoto={() =>
                  updateOption(option.key, ({ imageLocalUri: _image, ...current }) => current)
                }
              />
              {options.length > 2 ? (
                <Button
                  label={`Remove option ${index + 1}`}
                  variant="danger"
                  size="small"
                  onPress={() =>
                    setOptions((current) =>
                      current.filter(({ key }) => key !== option.key),
                    )
                  }
                />
              ) : null}
            </FormSection>
          ))}
          <View style={{ paddingBottom: theme.spacing.md }}>
            <Button
              label="Add contest option"
              icon="add-outline"
              variant="secondary"
              fullWidth
              disabled={options.length >= 20}
              onPress={() =>
                setOptions((current) => [
                  ...current,
                  { key: `option-${Date.now()}-${current.length}`, label: '' },
                ])
              }
            />
          </View>
        </>
      ) : (
        <AccessBanner
          title="Two-round election"
          message="Round one lets each member nominate themself or abstain. Round two opens automatically with every nominee on the ballot."
        />
      )}
    </FormScreen>
  );
};

export default CreateCommunityVote;
