import React from 'react';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import Settings from '../../app/(app)/(tabs)/settings';
import InaturalistAdministration from '../../app/(app)/settings/inaturalist';
import ManageUsers from '../../app/(app)/settings/manage_users';
import ManageWhitelist from '../../app/(app)/settings/manage_whitelist';
import {
  ImportedCatalogProfile,
  Role,
  parseContact,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';

let mockRole: Role = Role.Member;
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockSignOut = jest.fn();
const mockListContacts = jest.fn();
const mockCreateContact = jest.fn();
const mockUpdateContact = jest.fn();
const mockRemoveContact = jest.fn();
const mockListUsers = jest.fn();
const mockListWhitelist = jest.fn();
const mockInaturalistStatus = jest.fn();
const mockInaturalistRecords = jest.fn();
const mockRunInaturalist = jest.fn();
const mockSetInaturalistVisibility = jest.fn();
const mockLinkInaturalistCatalog = jest.fn();
const mockCatalogList = jest.fn();

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useRouter: () => ({ back: mockBack, push: mockPush, replace: mockReplace }),
    useFocusEffect: (callback: () => void) => mockReact.useEffect(callback, [callback]),
  };
});

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'actor-1', email: 'actor@gatech.edu', role: mockRole },
    signOut: mockSignOut,
  }),
}));

jest.mock('../../composition/appModules', () => ({
  appModules: {
    contacts: {
      list: (...args: unknown[]) => mockListContacts(...args),
      create: (...args: unknown[]) => mockCreateContact(...args),
      update: (...args: unknown[]) => mockUpdateContact(...args),
      remove: (...args: unknown[]) => mockRemoveContact(...args),
    },
    users: {
      list: (...args: unknown[]) => mockListUsers(...args),
      promote: jest.fn(),
      demote: jest.fn(),
      remove: jest.fn(),
    },
    whitelist: {
      list: (...args: unknown[]) => mockListWhitelist(...args),
      accept: jest.fn(),
      deny: jest.fn(),
    },
    inaturalist: {
      status: (...args: unknown[]) => mockInaturalistStatus(...args),
      records: (...args: unknown[]) => mockInaturalistRecords(...args),
      runNow: (...args: unknown[]) => mockRunInaturalist(...args),
      setVisibility: (...args: unknown[]) => mockSetInaturalistVisibility(...args),
      linkCatalog: (...args: unknown[]) => mockLinkInaturalistCatalog(...args),
    },
    catalog: { list: (...args: unknown[]) => mockCatalogList(...args) },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const contact = parseContact({
  id: 'contact-1',
  name: 'Campus Cats Officers',
  email: 'cats@gatech.edu',
});
const member = parseUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const importedProfile: ImportedCatalogProfile = {
  id: 2001,
  guideId: 18800,
  sourceUrl: 'https://www.inaturalist.org/guide_taxa/2001',
  sourceUpdatedAt: new Date('2026-08-01T12:00:00.000Z'),
  displayName: 'Goldie',
  shortDescription: 'A friendly orange cat.',
  metadata: {
    yearsRecorded: ['2022–present'],
    areasOfResidence: ['Library'],
    furPatterns: ['Tabby'],
  },
  photos: [],
  sourceActive: true,
  visible: true,
  importedAt: new Date('2026-08-01T12:00:00.000Z'),
  syncedAt: new Date('2026-08-04T07:17:00.000Z'),
  lastSeenRunId: 'run-1',
  moderation: { hidden: false, reason: '' },
  overrides: {},
  matchStatus: 'ambiguous',
};

const renderThemed = (content: React.ReactElement) =>
  render(<AppThemeProvider colorScheme="light">{content}</AppThemeProvider>);

describe('settings and administration routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Member;
    mockSignOut.mockResolvedValue(undefined);
    mockListContacts.mockResolvedValue({ ok: true, value: [contact], warnings: [] });
    mockCreateContact.mockResolvedValue({ ok: true, value: contact, warnings: [] });
    mockUpdateContact.mockResolvedValue({ ok: true, value: contact, warnings: [] });
    mockRemoveContact.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockListUsers.mockResolvedValue({ ok: true, value: [member], warnings: [] });
    mockListWhitelist.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockInaturalistStatus.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockInaturalistRecords.mockResolvedValue({
      ok: true,
      value: { observations: [], catalog: [importedProfile] },
      warnings: [],
    });
    mockRunInaturalist.mockResolvedValue({
      ok: true,
      value: { status: 'success', runId: 'run-1' },
      warnings: [],
    });
    mockSetInaturalistVisibility.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockLinkInaturalistCatalog.mockResolvedValue({ ok: true, value: undefined, warnings: [] });
    mockCatalogList.mockResolvedValue({
      ok: true,
      value: [
        {
          source: 'campus-cats',
          id: 'catalog-1',
          cat: { name: 'Goldie' },
        },
      ],
      warnings: [],
    });
  });

  it('organizes More for members and signs out from an explicit account action', async () => {
    const user = userEvent.setup();
    renderThemed(<Settings />);

    expect(screen.getByText('Account')).toBeOnTheScreen();
    expect(screen.getByText('Club contacts')).toBeOnTheScreen();
    expect(await screen.findByText('Campus Cats Officers')).toBeOnTheScreen();
    expect(screen.queryByText('Officer tools')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('shows officer tools to administrators without changing their routes', async () => {
    mockRole = Role.Admin;
    const user = userEvent.setup();
    renderThemed(<Settings />);

    expect(screen.getByText('Officer tools')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Manage Users' }));
    await user.press(screen.getByRole('button', { name: 'Manage Whitelist' }));
    await user.press(screen.getByRole('button', { name: 'iNaturalist Sync' }));
    expect(mockPush).toHaveBeenNthCalledWith(1, '/settings/manage_users');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/settings/manage_whitelist');
    expect(mockPush).toHaveBeenNthCalledWith(3, '/settings/inaturalist');
  });

  it('edits and saves contact information through the contacts module', async () => {
    mockRole = Role.Admin;
    const user = userEvent.setup();
    renderThemed(<Settings />);
    await screen.findByText('Campus Cats Officers');

    await user.press(screen.getByRole('button', { name: 'Edit Contacts' }));
    fireEvent.changeText(screen.getByLabelText('Contact name'), 'Campus Cats Leadership');
    await user.press(screen.getByRole('button', { name: 'Save Contacts' }));

    await waitFor(() =>
      expect(mockUpdateContact).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'contact-1',
        { name: 'Campus Cats Leadership', email: 'cats@gatech.edu' },
      ),
    );
  });

  it('renders an access-denied state instead of loading users for members', () => {
    renderThemed(<ManageUsers />);

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('loads readable user cards for administrators', async () => {
    mockRole = Role.Admin;
    renderThemed(<ManageUsers />);

    expect(await screen.findByText('member@gatech.edu')).toBeOnTheScreen();
    expect(screen.getByText('Member')).toBeOnTheScreen();
  });

  it('shows an explicit empty whitelist state', async () => {
    mockRole = Role.Admin;
    renderThemed(<ManageWhitelist />);

    expect(await screen.findByText('No pending applications')).toBeOnTheScreen();
  });

  it('denies iNaturalist administration to members before loading imported data', () => {
    renderThemed(<InaturalistAdministration />);

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockInaturalistRecords).not.toHaveBeenCalled();
  });

  it('lets administrators retry imports and hide records with an audit reason', async () => {
    mockRole = Role.Admin;
    const user = userEvent.setup();
    renderThemed(<InaturalistAdministration />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.getByText('Ambiguous local match')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Sync with iNaturalist now' }));
    await waitFor(() => expect(mockRunInaturalist).toHaveBeenCalled());
    expect(screen.getByText('iNaturalist synchronization completed.')).toBeOnTheScreen();

    fireEvent.changeText(
      screen.getByLabelText('Reason for hiding a record'),
      'Duplicate profile confirmed by an officer',
    );
    await user.press(screen.getByRole('button', { name: 'Hide Goldie' }));
    await waitFor(() =>
      expect(mockSetInaturalistVisibility).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'catalog',
        2001,
        false,
        'Duplicate profile confirmed by an officer',
      ),
    );
  });

  it('explains overlapping manual synchronization instead of reporting success', async () => {
    mockRole = Role.Admin;
    mockRunInaturalist.mockResolvedValue({
      ok: true,
      value: { status: 'skipped', runId: 'run-overlap' },
      warnings: [],
    });
    const user = userEvent.setup();
    renderThemed(<InaturalistAdministration />);

    await screen.findByText('Goldie');
    await user.press(
      screen.getByRole('button', { name: 'Sync with iNaturalist now' }),
    );

    expect(
      await screen.findByText(
        'Another synchronization is already running. Try again after it finishes.',
      ),
    ).toBeOnTheScreen();
  });

  it('lets administrators resolve ambiguous catalog links explicitly', async () => {
    mockRole = Role.Admin;
    const user = userEvent.setup();
    renderThemed(<InaturalistAdministration />);

    await screen.findByText('Goldie');
    fireEvent.changeText(
      screen.getByLabelText('Local catalog ID for Goldie'),
      'catalog-1',
    );
    await user.press(screen.getByRole('button', { name: 'Link Goldie' }));
    await waitFor(() =>
      expect(mockLinkInaturalistCatalog).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        2001,
        'catalog-1',
      ),
    );
  });
});
