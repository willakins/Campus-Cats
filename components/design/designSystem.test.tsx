import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import {
  AccessBanner,
  AccessDeniedState,
  AppText,
  AppHeader,
  Button,
  Card,
  CardListSkeleton,
  Chip,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FloatingActionButton,
  FormField,
  FormSkeleton,
  FormSection,
  IconButton,
  ListRow,
  MediaPicker,
  Screen,
  SegmentedControl,
  Skeleton,
  DetailSkeleton,
  StatusPill,
} from './index';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderThemed = async (content: React.ReactElement) =>
  await render(
    <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>,
  );

describe('Campus Cats design primitives', () => {
  it('exposes accessible button loading and disabled behavior', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await renderThemed(
      <Button label="Save cat" onPress={onPress} />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save cat' });
    await user.press(saveButton);
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(
      <AppThemeProvider colorScheme="light">
        <Button
          label="Save cat"
          loading
          loadingLabel="Saving…"
          onPress={onPress}
        />
      </AppThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Save cat' })).toBeDisabled();
    expect(screen.getByText('Saving…')).toBeOnTheScreen();
  });

  it('announces segmented selection and changes it through the public control', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <SegmentedControl
        label="Sighting age"
        value="7"
        options={[
          { value: '7', label: '7D' },
          { value: 'all', label: 'All' },
        ]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('button', { name: '7D' })).toHaveProp(
      'accessibilityState',
      {
        selected: true,
      },
    );
    await user.press(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('renders labeled status and recoverable screen states', async () => {
    const retry = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <>
        <StatusPill tone="success" icon="checkmark-circle" label="Stocked" />
        <EmptyState title="No announcements yet" message="Check back soon." />
        <ErrorState
          title="Could not load cats"
          message="You appear to be offline."
          onRetry={retry}
        />
        <AccessDeniedState message="Officer access is required." />
      </>,
    );

    expect(screen.getByText('Stocked')).toBeOnTheScreen();
    expect(screen.getByText('No announcements yet')).toBeOnTheScreen();
    expect(screen.getByText('Officer access is required.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('gives fields persistent labels, requirements, and announced errors', async () => {
    await renderThemed(
      <FormField label="Cat name" required error="Enter a name">
        {({ inputId, describedBy }) => (
          <StatusPill
            testID={inputId}
            accessibilityHint={describedBy}
            tone="info"
            label="Example input"
          />
        )}
      </FormField>,
    );

    expect(screen.getByText('Cat name *')).toBeOnTheScreen();
    expect(screen.getByText('Enter a name')).toHaveProp(
      'accessibilityLiveRegion',
      'polite',
    );
  });

  it('makes photo promotion and removal explicit', async () => {
    const onAdd = jest.fn();
    const onPromote = jest.fn();
    const onRemove = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <MediaPicker
        photos={['file://one.jpg', 'file://two.jpg']}
        coverUri="file://one.jpg"
        onAdd={onAdd}
        onPromote={onPromote}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText('Cover photo')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Set photo 2 as cover' }),
    );
    await user.press(screen.getByRole('button', { name: 'Remove photo 2' }));
    await user.press(screen.getByRole('button', { name: 'Add photos' }));
    expect(onPromote).toHaveBeenCalledWith('file://two.jpg');
    expect(onRemove).toHaveBeenCalledWith('file://two.jpg');
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('provides a consistent header and responsive screen surface', async () => {
    const onBack = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <Screen>
        <AppHeader eyebrow="Campus Cats" title="Goldie" onBack={onBack} />
      </Screen>,
    );
    expect(screen.getByLabelText('Goldie')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Go back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('supports each action emphasis and labeled icon-only controls', async () => {
    const onIconPress = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <>
        <Button label="Secondary" variant="secondary" icon="paw" />
        <Button label="Tertiary" variant="tertiary" size="small" />
        <Button label="Delete" variant="danger" fullWidth />
        <IconButton
          icon="close"
          accessibilityLabel="Close gallery"
          variant="primary"
          onPress={onIconPress}
        />
        <IconButton
          icon="trash"
          accessibilityLabel="Delete disabled"
          variant="danger"
          disabled
        />
        <FloatingActionButton
          accessibilityLabel="Create cat profile"
          onPress={onIconPress}
        />
      </>,
    );

    await user.press(screen.getByRole('button', { name: 'Close gallery' }));
    await user.press(
      screen.getByRole('button', { name: 'Create cat profile' }),
    );
    expect(screen.queryByText('Create cat profile')).not.toBeOnTheScreen();
    expect(onIconPress).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole('button', { name: 'Delete disabled' }),
    ).toBeDisabled();
  });

  it('supports scrolling, keyboard avoidance, full-bleed content, and a sticky footer', async () => {
    await renderThemed(
      <Screen
        scroll
        keyboardAware
        fullBleed
        footer={<Button label="Save changes" />}
      >
        <AppText>Scrollable content</AppText>
      </Screen>,
    );

    expect(screen.getByText('Scrollable content')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeOnTheScreen();
  });

  it('keeps text scalable and interactive targets at least 44 points', async () => {
    await renderThemed(
      <>
        <AppText>Scalable field note</AppText>
        <Button label="Accessible target" />
      </>,
    );

    expect(screen.getByText('Scalable field note')).toHaveProp(
      'maxFontSizeMultiplier',
      2,
    );
    expect(
      screen.getByRole('button', { name: 'Accessible target' }),
    ).toHaveStyle({
      minHeight: 44,
      minWidth: 44,
    });
  });

  it('renders static and interactive cards and list rows', async () => {
    const openCard = jest.fn();
    const openRow = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <>
        <Card>
          <AppText>Field note</AppText>
        </Card>
        <Card
          accessibilityLabel="Open Goldie"
          accent="coral"
          onPress={openCard}
        >
          <AppText>Goldie</AppText>
        </Card>
        <ListRow
          title="Club contacts"
          subtitle="Reach an officer"
          icon="people"
        />
        <ListRow
          title="Manage users"
          onPress={openRow}
          trailing={<StatusPill label="Admin" tone="primary" />}
        />
      </>,
    );

    await user.press(screen.getByRole('button', { name: 'Open Goldie' }));
    await user.press(screen.getByRole('button', { name: 'Manage users' }));
    expect(openCard).toHaveBeenCalledTimes(1);
    expect(openRow).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Reach an officer')).toBeOnTheScreen();
    expect(screen.getByText('Admin')).toBeOnTheScreen();
  });

  it('renders form helpers, static children, and grouped sections', async () => {
    const editSection = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <FormSection
        title="Basics"
        action={
          <IconButton
            icon="create-outline"
            accessibilityLabel="Edit basics"
            onPress={editSection}
          />
        }
      >
        <FormField label="Nickname" helper="The name students know.">
          <AppText>Text input placeholder</AppText>
        </FormField>
      </FormSection>,
    );

    expect(screen.getByText('Basics')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Edit basics' }));
    expect(editSection).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Nickname')).toBeOnTheScreen();
    expect(screen.getByText('The name students know.')).toBeOnTheScreen();
  });

  it('renders passive chips, feedback announcements, and loading geometry', async () => {
    await renderThemed(
      <>
        <Chip label="Featured" selected />
        <AccessBanner
          title="Catalog access"
          message="Only officers can create entries."
        />
        <FeedbackBanner message="Saved successfully." tone="success" />
        <FeedbackBanner message="Could not save." tone="danger" />
        <Skeleton />
        <Skeleton label="Loading cat cards" />
        <CardListSkeleton label="Loading station cards" layout="leading" />
        <DetailSkeleton label="Loading cat profile" />
        <FormSkeleton label="Loading cat form" />
      </>,
    );

    expect(screen.getByText('Featured')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Catalog access. Only officers can create entries.',
      ),
    ).not.toHaveProp('accessibilityRole', 'alert');
    expect(
      screen.getByRole('alert', { name: 'Saved successfully.' }),
    ).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(screen.getByRole('alert', { name: 'Could not save.' })).toHaveProp(
      'accessibilityLiveRegion',
      'assertive',
    );
    expect(
      screen.getByRole('progressbar', { name: 'Loading content' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading cat cards' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading station cards' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading cat profile' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading cat form' }),
    ).toBeOnTheScreen();
  });

  it('uses the first photo as the cover when no explicit cover is supplied', async () => {
    await renderThemed(
      <MediaPicker
        photos={['file://only.jpg']}
        onAdd={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByText('Cover photo')).toBeOnTheScreen();
    expect(screen.queryByText(/Set photo/)).not.toBeOnTheScreen();
  });
});
