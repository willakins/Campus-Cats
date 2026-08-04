import React from 'react';

import { render, screen, userEvent } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import {
  AccessDeniedState,
  AppText,
  AppHeader,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FormField,
  FormSection,
  IconButton,
  ListRow,
  MediaPicker,
  Screen,
  SegmentedControl,
  Skeleton,
  StatusPill,
} from './index';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const renderThemed = (content: React.ReactElement) =>
  render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('Campus Cats design primitives', () => {
  it('exposes accessible button loading and disabled behavior', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const { rerender } = renderThemed(
      <Button label="Save cat" onPress={onPress} />,
    );

    await user.press(screen.getByRole('button', { name: 'Save cat' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(
      <AppThemeProvider colorScheme="light">
        <Button label="Save cat" loading loadingLabel="Saving…" onPress={onPress} />
      </AppThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Save cat' })).toBeDisabled();
    expect(screen.getByText('Saving…')).toBeOnTheScreen();
  });

  it('announces segmented selection and changes it through the public control', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderThemed(
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

    expect(screen.getByRole('button', { name: '7D' })).toHaveProp('accessibilityState', {
      selected: true,
    });
    await user.press(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('renders labeled status and recoverable screen states', async () => {
    const retry = jest.fn();
    const user = userEvent.setup();
    renderThemed(
      <>
        <StatusPill tone="success" icon="checkmark-circle" label="Stocked" />
        <EmptyState title="No announcements yet" message="Check back soon." />
        <ErrorState title="Could not load cats" message="You appear to be offline." onRetry={retry} />
        <AccessDeniedState message="Officer access is required." />
      </>,
    );

    expect(screen.getByText('Stocked')).toBeOnTheScreen();
    expect(screen.getByText('No announcements yet')).toBeOnTheScreen();
    expect(screen.getByText('Officer access is required.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('gives fields persistent labels, requirements, and announced errors', () => {
    renderThemed(
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
    renderThemed(
      <MediaPicker
        photos={['file://one.jpg', 'file://two.jpg']}
        coverUri="file://one.jpg"
        onAdd={onAdd}
        onPromote={onPromote}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText('Cover photo')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Set photo 2 as cover' }));
    await user.press(screen.getByRole('button', { name: 'Remove photo 2' }));
    await user.press(screen.getByRole('button', { name: 'Add photos' }));
    expect(onPromote).toHaveBeenCalledWith('file://two.jpg');
    expect(onRemove).toHaveBeenCalledWith('file://two.jpg');
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('provides a consistent header and responsive screen surface', async () => {
    const onBack = jest.fn();
    const user = userEvent.setup();
    renderThemed(
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
    renderThemed(
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
      </>,
    );

    await user.press(screen.getByRole('button', { name: 'Close gallery' }));
    expect(onIconPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Delete disabled' })).toBeDisabled();
  });

  it('supports scrolling, keyboard avoidance, full-bleed content, and a sticky footer', () => {
    renderThemed(
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
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeOnTheScreen();
  });

  it('keeps text scalable and interactive targets at least 44 points', () => {
    renderThemed(
      <>
        <AppText>Scalable field note</AppText>
        <Button label="Accessible target" />
      </>,
    );

    expect(screen.getByText('Scalable field note')).toHaveProp('maxFontSizeMultiplier', 2);
    expect(screen.getByRole('button', { name: 'Accessible target' })).toHaveStyle({
      minHeight: 44,
      minWidth: 44,
    });
  });

  it('renders static and interactive cards and list rows', async () => {
    const openCard = jest.fn();
    const openRow = jest.fn();
    const user = userEvent.setup();
    renderThemed(
      <>
        <Card><AppText>Field note</AppText></Card>
        <Card accessibilityLabel="Open Goldie" accent="coral" onPress={openCard}>
          <AppText>Goldie</AppText>
        </Card>
        <ListRow title="Club contacts" subtitle="Reach an officer" icon="people" />
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

  it('renders form helpers, static children, and grouped sections', () => {
    renderThemed(
      <FormSection title="Basics">
        <FormField label="Nickname" helper="The name students know.">
          <AppText>Text input placeholder</AppText>
        </FormField>
      </FormSection>,
    );

    expect(screen.getByText('Basics')).toBeOnTheScreen();
    expect(screen.getByText('Nickname')).toBeOnTheScreen();
    expect(screen.getByText('The name students know.')).toBeOnTheScreen();
  });

  it('renders passive chips, feedback announcements, and loading geometry', () => {
    renderThemed(
      <>
        <Chip label="Featured" selected />
        <FeedbackBanner message="Saved successfully." tone="success" />
        <FeedbackBanner message="Could not save." tone="danger" />
        <Skeleton />
        <Skeleton label="Loading cat cards" />
      </>,
    );

    expect(screen.getByText('Featured')).toBeOnTheScreen();
    expect(screen.getByRole('alert', { name: 'Saved successfully.' })).toHaveProp(
      'accessibilityLiveRegion',
      'polite',
    );
    expect(screen.getByRole('alert', { name: 'Could not save.' })).toHaveProp(
      'accessibilityLiveRegion',
      'assertive',
    );
    expect(screen.getByRole('progressbar', { name: 'Loading content' })).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Loading cat cards' })).toBeOnTheScreen();
  });

  it('uses the first photo as the cover when no explicit cover is supplied', () => {
    renderThemed(
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
