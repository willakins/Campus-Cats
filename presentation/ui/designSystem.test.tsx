import React from 'react';
import { StyleSheet } from 'react-native';

import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from '@testing-library/react-native';

import { AppThemeProvider } from '@/theme';
import {
  FloatingTabBarCollapseContext,
  FloatingTabBarContentInsetContext,
} from '@/presentation/navigation/floatingTabBar';
import {
  AccessBanner,
  AccessDeniedState,
  AppText,
  AppHeader,
  BottomSheet,
  Button,
  Card,
  CardContent,
  CardListSkeleton,
  Chip,
  EmptyState,
  ErrorState,
  FeedbackBanner,
  FailureToast,
  FloatingActionButton,
  FormActionBar,
  FormField,
  FormSkeleton,
  FormSection,
  IconButton,
  ListRow,
  MediaPicker,
  Screen,
  SearchField,
  SegmentedControl,
  Skeleton,
  DetailSkeleton,
  Dialog,
  StatusPill,
  SuccessToast,
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
        <EmptyState title="No alerts yet" message="Check back soon." />
        <ErrorState
          title="Could not load cats"
          message="You appear to be offline."
          onRetry={retry}
        />
        <AccessDeniedState message="Officer access is required." />
      </>,
    );

    expect(screen.getByText('Stocked')).toBeOnTheScreen();
    expect(screen.getByText('No alerts yet')).toBeOnTheScreen();
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

    expect(screen.getByText('Cat name')).toBeOnTheScreen();
    expect(screen.getByText('Required')).toBeOnTheScreen();
    expect(screen.getByText('Enter a name')).toHaveProp(
      'accessibilityLiveRegion',
      'polite',
    );
  });

  it('gives search fields one clear action and reports focus', async () => {
    const onChangeText = jest.fn();
    const onFocus = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <SearchField
        accessibilityLabel="University"
        value="Emory"
        placeholder="Search universities"
        clearAccessibilityLabel="Clear university search"
        onChangeText={onChangeText}
        onFocus={onFocus}
      />,
    );

    const input = screen.getByLabelText('University');
    expect(input).toHaveProp('clearButtonMode', 'never');
    expect(input).toHaveStyle({
      paddingVertical: 0,
      textAlignVertical: 'center',
    });
    fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);

    await user.press(
      screen.getByRole('button', { name: 'Clear university search' }),
    );
    expect(onChangeText).toHaveBeenCalledWith('');
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
    expect(screen.getByRole('button', { name: 'Remove photo 1' })).toHaveStyle({
      marginTop: 'auto',
    });
    expect(screen.getByRole('button', { name: 'Remove photo 2' })).toHaveStyle({
      marginTop: 'auto',
    });
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

  it('slightly rounds the logo shown in page headers', async () => {
    await renderThemed(<AppHeader title="Sightings" />);

    expect(screen.getByLabelText('Club logo')).toHaveStyle({
      borderRadius: 12,
    });
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
    const onContentSizeChange = jest.fn();
    await renderThemed(
      <Screen
        scroll
        keyboardAware
        fullBleed
        onContentSizeChange={onContentSizeChange}
        footer={<Button label="Save changes" />}
      >
        <AppText>Scrollable content</AppText>
      </Screen>,
    );

    expect(screen.getByText('Scrollable content')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Save changes' }),
    ).toBeOnTheScreen();
    fireEvent(
      screen.getByTestId('screen-scroll-view'),
      'contentSizeChange',
      390,
      844,
    );
    expect(onContentSizeChange).toHaveBeenCalledWith(390, 844);
  });

  it('centralizes create and edit actions in a form action bar', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <Screen
        scroll
        footerPresentation="floating"
        footer={
          <FormActionBar
            label="Save cat"
            busyLabel="Saving cat…"
            busy={false}
            onPress={onPress}
            secondaryAction={{
              label: 'Edit details',
              icon: 'create-outline',
              onPress: jest.fn(),
            }}
          />
        }
      >
        <AppText>Cat form</AppText>
      </Screen>,
    );

    expect(screen.getByTestId('form-action-bar')).toBeOnTheScreen();
    expect(screen.getByTestId('form-action-bar-glass')).toBeOnTheScreen();
    expect(screen.getByTestId('form-action-bar-tint')).toHaveStyle({
      backgroundColor: '#E2E8EF38',
      borderColor: '#FFFFFF78',
      borderRadius: 999,
    });
    expect(screen.getByTestId('form-action-bar-actions')).toHaveStyle({
      flexDirection: 'row',
    });
    expect(
      screen
        .getAllByRole('button')
        .map(({ props }) => props.accessibilityLabel),
    ).toEqual(['Edit details', 'Save cat']);
    expect(screen.getByTestId('screen-floating-footer')).toHaveStyle({
      position: 'absolute',
      bottom: 0,
    });
    await act(async () => {
      fireEvent(screen.getByTestId('screen-floating-footer'), 'layout', {
        nativeEvent: {
          layout: { x: 0, y: 0, width: 390, height: 84 },
        },
      });
    });
    const contentStyle = StyleSheet.flatten(
      screen.getByTestId('screen-scroll-view').props.contentContainerStyle,
    );
    expect(contentStyle.paddingBottom).toBeGreaterThan(84);
    const saveButton = screen.getByRole('button', { name: 'Save cat' });
    expect(saveButton).toHaveStyle({
      borderWidth: 0,
      backgroundColor: 'transparent',
    });
    await user.press(saveButton);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Edit details' }),
    ).toBeOnTheScreen();
  });

  it('keeps tab content clear while its screen surface extends behind floating navigation', async () => {
    await renderThemed(
      <FloatingTabBarContentInsetContext.Provider value={118}>
        <Screen scroll>
          <AppText>Tab content</AppText>
        </Screen>
      </FloatingTabBarContentInsetContext.Provider>,
    );

    const contentStyle = StyleSheet.flatten(
      screen.getByTestId('screen-scroll-view').props.contentContainerStyle,
    );
    expect(contentStyle.paddingBottom).toBe(142);
  });

  it('lets non-scrolling tab surfaces extend behind floating navigation', async () => {
    await renderThemed(
      <FloatingTabBarContentInsetContext.Provider value={118}>
        <Screen>
          <AppText>Tab surface</AppText>
        </Screen>
      </FloatingTabBarContentInsetContext.Provider>,
    );

    const contentStyle = StyleSheet.flatten(
      screen.getByTestId('screen-content-view').props.style,
    );
    expect(contentStyle.paddingBottom).toBe(0);
  });

  it('collapses floating navigation after a vertical content drag', async () => {
    const collapseTabBar = jest.fn();
    await renderThemed(
      <FloatingTabBarCollapseContext.Provider value={collapseTabBar}>
        <Screen testID="drag-aware-screen">
          <AppText>Tab surface</AppText>
        </Screen>
      </FloatingTabBarCollapseContext.Provider>,
    );

    const tabScreen = screen.getByTestId('drag-aware-screen');
    await act(async () => {
      fireEvent(tabScreen, 'touchStart', {
        nativeEvent: { pageX: 40, pageY: 200 },
      });
      fireEvent(tabScreen, 'touchMove', {
        nativeEvent: { pageX: 60, pageY: 204 },
      });
    });
    expect(collapseTabBar).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent(tabScreen, 'touchMove', {
        nativeEvent: { pageX: 42, pageY: 180 },
      });
    });
    expect(collapseTabBar).toHaveBeenCalledTimes(1);
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
        <Card surface="glass" padded={false} testID="field-note-card">
          <CardContent>
            <AppText>Field note</AppText>
          </CardContent>
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
    expect(screen.getByTestId('field-note-card-glass')).toHaveStyle({
      borderRadius: 20,
      pointerEvents: 'none',
    });
    expect(screen.getByText('Reach an officer')).toBeOnTheScreen();
    expect(screen.getByText('Admin')).toBeOnTheScreen();
  });

  it.each(['light', 'dark'] as const)(
    'supports solid and glass cards in %s mode',
    async (mode) => {
      await render(
        <AppThemeProvider colorScheme={mode}>
          <Card surface="solid" testID="solid-card">
            <AppText>Solid</AppText>
          </Card>
          <Card surface="glass" testID="glass-card">
            <AppText>Glass</AppText>
          </Card>
        </AppThemeProvider>,
      );
      expect(screen.queryByTestId('solid-card-glass')).not.toBeOnTheScreen();
      expect(screen.getByTestId('solid-card')).toHaveStyle({
        backgroundColor: mode === 'dark' ? '#22303C' : '#FFFFFF',
        borderWidth: 0,
      });
      expect(screen.getByTestId('glass-card-glass')).toBeOnTheScreen();
      expect(screen.getByTestId('glass-card')).toHaveStyle({
        backgroundColor: 'transparent',
        borderWidth: 0,
      });
    },
  );

  it('provides shared dialog and bottom-sheet dismissal surfaces', async () => {
    const closeDialog = jest.fn();
    const closeSheet = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await renderThemed(
      <Dialog
        visible
        closeLabel="Close moderation dialog"
        onClose={closeDialog}
      >
        <AppText>Moderation actions</AppText>
      </Dialog>,
    );

    expect(screen.getByText('Moderation actions')).toBeOnTheScreen();
    expect(screen.getByTestId('dialog-scroll-view')).toHaveProp(
      'keyboardShouldPersistTaps',
      'handled',
    );
    await user.press(screen.getByLabelText('Close moderation dialog'));
    await rerender(
      <AppThemeProvider colorScheme="light">
        <BottomSheet
          visible
          closeLabel="Close sorting sheet"
          onClose={closeSheet}
        >
          <AppText>Sort options</AppText>
        </BottomSheet>
      </AppThemeProvider>,
    );
    expect(screen.getByText('Sort options')).toBeOnTheScreen();
    await user.press(screen.getByLabelText('Close sorting sheet'));
    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(closeSheet).toHaveBeenCalledTimes(1);
  });

  it('renders form helpers, static children, and grouped sections', async () => {
    const editSection = jest.fn();
    const user = userEvent.setup();
    await renderThemed(
      <FormSection
        testID="basics-section"
        title="Basics"
        required
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
    expect(screen.getByText('Required')).toBeOnTheScreen();
    expect(screen.getByTestId('basics-section')).toHaveStyle({
      overflow: 'visible',
      borderWidth: 0,
    });
    await user.press(screen.getByRole('button', { name: 'Edit basics' }));
    expect(editSection).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Nickname')).toBeOnTheScreen();
    expect(screen.getByText('The name students know.')).toBeOnTheScreen();
  });

  it('renders passive chips, feedback alerts, and loading geometry', async () => {
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

  it('dismisses success and failure toasts after five seconds', async () => {
    jest.useFakeTimers();
    const successDismissed = jest.fn();
    const view = await renderThemed(
      <>
        <SuccessToast
          message="Favorite updated."
          onDismiss={successDismissed}
        />
        <FailureToast message="Could not save." duration={6000} />
      </>,
    );

    expect(screen.getByRole('alert', { name: 'Favorite updated.' })).toHaveProp(
      'accessibilityLiveRegion',
      'polite',
    );
    expect(screen.getByRole('alert', { name: 'Could not save.' })).toHaveProp(
      'accessibilityLiveRegion',
      'assertive',
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(4999);
    });
    expect(
      screen.getByRole('alert', { name: 'Favorite updated.' }),
    ).toBeOnTheScreen();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(
      screen.queryByRole('alert', { name: 'Favorite updated.' }),
    ).not.toBeOnTheScreen();
    expect(successDismissed).toHaveBeenCalledTimes(1);

    view.unmount();
    jest.useRealTimers();
  });

  it('makes toast dismissal available by upward swipe and accessibility action', async () => {
    const onDismiss = jest.fn();
    await renderThemed(
      <SuccessToast message="Favorite updated." onDismiss={onDismiss} />,
    );
    const toast = screen.getByRole('alert', { name: 'Favorite updated.' });

    expect(toast).toHaveProp('accessibilityHint', 'Swipe up to dismiss');
    expect(toast).toHaveProp('accessibilityActions', [
      { name: 'dismiss', label: 'Dismiss' },
    ]);
    await act(async () => {
      toast.props.onAccessibilityAction({
        nativeEvent: { actionName: 'dismiss' },
      });
    });

    expect(
      screen.queryByRole('alert', { name: 'Favorite updated.' }),
    ).not.toBeOnTheScreen();
    expect(onDismiss).toHaveBeenCalledTimes(1);
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
