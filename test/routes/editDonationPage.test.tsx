import React from 'react';
import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import EditDonationPage from '../../app/(app)/donations/edit-donation';
import { DEFAULT_APP_SETTINGS, Role } from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockBack = jest.fn();
const mockGet = jest.fn();
const mockSaveDonationPage = jest.fn();
const mockApplySettings = jest.fn();
const mockScrollTo = jest.fn();
const mockPickFromLibrary = jest.fn();
let mockRole: Role = Role.President;

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../components/design', () => {
  const actual = jest.requireActual('../../components/design');
  const ReactRuntime = require('react');
  const { View: NativeView } = require('react-native');
  return {
    ...actual,
    Screen: ({
      children,
      footer,
      scrollRef,
    }: {
      children: React.ReactNode;
      footer?: React.ReactNode;
      scrollRef?: {
        current: { scrollTo: (options: unknown) => void } | null;
      };
    }) => {
      ReactRuntime.useEffect(() => {
        if (!scrollRef) return undefined;
        scrollRef.current = { scrollTo: mockScrollTo };
        return () => {
          scrollRef.current = null;
        };
      }, [scrollRef]);
      return ReactRuntime.createElement(NativeView, null, children, footer);
    },
  };
});
jest.mock('../../composition/appModules', () => ({
  appModules: {
    appSettings: {
      get: (...args: unknown[]) => mockGet(...args),
      saveDonationPage: (...args: unknown[]) => mockSaveDonationPage(...args),
    },
    imageSelection: {
      takePhoto: jest.fn(),
      pickFromLibrary: (...args: unknown[]) => mockPickFromLibrary(...args),
    },
  },
}));
jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'president-1', email: 'president@gatech.edu', role: mockRole },
  }),
  useAppSettings: () => ({ applySettings: mockApplySettings }),
}));

const renderRoute = async () =>
  await render(
    <AppThemeProvider colorScheme="light">
      <EditDonationPage />
    </AppThemeProvider>,
  );

describe('edit donation page route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.President;
    mockGet.mockResolvedValue({
      ok: true,
      value: DEFAULT_APP_SETTINGS,
      warnings: [],
    });
    mockSaveDonationPage.mockResolvedValue({
      ok: true,
      value: DEFAULT_APP_SETTINGS,
      warnings: [],
    });
    mockPickFromLibrary.mockResolvedValue({
      ok: true,
      value: { localUri: 'file://eleventh.jpg' },
      warnings: [],
    });
  });

  it('marks missing external donation content, scrolls, and clears corrected errors', async () => {
    const user = userEvent.setup();
    await renderRoute();
    await screen.findByLabelText('Donation page title');

    const layout = (y: number) => ({
      nativeEvent: { layout: { x: 0, y, width: 320, height: 48 } },
    });
    await fireEvent(
      screen.getByTestId('form-screen-content'),
      'layout',
      layout(100),
    );
    await fireEvent(
      screen.getByTestId('donation-section-content'),
      'layout',
      layout(200),
    );
    await fireEvent(
      screen.getByTestId('donation-field-title'),
      'layout',
      layout(30),
    );

    await user.press(
      screen.getByRole('button', { name: 'Create Donation Page' }),
    );

    expect(
      await screen.findByText('Donation page title is required.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Donation page description is required.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('External donation website is required.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Donation page title')).toHaveStyle({
      borderColor: '#B23A3A',
    });
    expect(
      screen.getByRole('alert', {
        name: 'Please fill in the missing information.',
      }),
    ).toBeOnTheScreen();
    expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 318, animated: true });
    expect(mockSaveDonationPage).not.toHaveBeenCalled();

    await fireEvent.changeText(
      screen.getByLabelText('Donation page title'),
      'Help the cats',
    );
    await waitFor(() =>
      expect(
        screen.queryByText('Donation page title is required.'),
      ).not.toBeOnTheScreen(),
    );
  });

  it('shows a coming-soon card and disables saving for in-app donations', async () => {
    const user = userEvent.setup();
    await renderRoute();
    await screen.findByLabelText('Donation page title');

    await user.press(
      screen.getByRole('radio', { name: 'Integrate donations directly' }),
    );

    expect(screen.getByText('Direct donations')).toBeOnTheScreen();
    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
    expect(
      screen.queryByLabelText('External donation website'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Create Donation Page' }),
    ).toBeDisabled();
    expect(mockSaveDonationPage).not.toHaveBeenCalled();
  });

  it('publishes configured external donation content and returns to Community', async () => {
    const saved = {
      ...DEFAULT_APP_SETTINGS,
      donationPage: {
        title: 'Help feed the cats',
        description: 'Support food and veterinary care.',
        images: [],
        method: 'external' as const,
        externalUrl: 'https://give.example.org/campus-cats',
      },
    };
    mockSaveDonationPage.mockResolvedValue({
      ok: true,
      value: saved,
      warnings: [],
    });
    const user = userEvent.setup();
    await renderRoute();
    await screen.findByLabelText('Donation page title');

    await user.type(
      screen.getByLabelText('Donation page title'),
      'Help feed the cats',
    );
    await user.type(
      screen.getByLabelText('Donation page description'),
      'Support food and veterinary care.',
    );
    await user.type(
      screen.getByLabelText('External donation website'),
      'https://give.example.org/campus-cats',
    );
    await user.press(
      screen.getByRole('button', { name: 'Create Donation Page' }),
    );

    await waitFor(() =>
      expect(mockSaveDonationPage).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'president-1', role: Role.President }),
        {
          title: 'Help feed the cats',
          description: 'Support food and veterinary care.',
          method: 'external',
          externalUrl: 'https://give.example.org/campus-cats',
        },
        [],
      ),
    );
    expect(mockApplySettings).toHaveBeenCalledWith(saved);
    expect(mockBack).toHaveBeenCalled();
  });

  it('prevents non-President officers from editing donation content', async () => {
    mockRole = Role.Officer;
    await renderRoute();

    expect(
      await screen.findByText(
        'President-level access is required to set up or edit donations.',
      ),
    ).toBeOnTheScreen();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('lets Developers edit donation content through cascading authorization', async () => {
    mockRole = Role.Developer;
    await renderRoute();

    expect(await screen.findByLabelText('Donation page title')).toBeOnTheScreen();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('identifies the setup page as President-level with the shield button', async () => {
    const user = userEvent.setup();
    await renderRoute();
    await screen.findByLabelText('Donation page title');

    expect(screen.getByText('Create donation page')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', {
        name: 'Explain president-level access',
      }),
    );

    expect(
      screen.getByText(
        'President-level access is required to set up or edit donations.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('President-level page')).toBeOnTheScreen();
  });
});
