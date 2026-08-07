import React from 'react';
import { Linking } from 'react-native';

import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from '@testing-library/react-native';

import Settings from '../../app/(app)/(tabs)/settings';
import InaturalistAdministration from '../../app/(app)/settings/inaturalist';
import ManageUsers from '../../app/(app)/settings/manage_users';
import ManageWhitelist from '../../app/(app)/settings/manage_whitelist';
import {
  ImportedCatalogProfile,
  Role,
  parseContact,
  parseManagedUser,
  parseWhitelistApplication,
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
    useFocusEffect: (callback: () => void) =>
      mockReact.useEffect(callback, [callback]),
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
      transferPresidency: jest.fn(),
      addDisciplinaryNotice: jest.fn(),
      setBanned: jest.fn(),
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
      setVisibility: (...args: unknown[]) =>
        mockSetInaturalistVisibility(...args),
      linkCatalog: (...args: unknown[]) => mockLinkInaturalistCatalog(...args),
    },
    catalog: { list: (...args: unknown[]) => mockCatalogList(...args) },
    billing: {
      presentation: {
        settingsSubtitle: 'Review monthly cloud costs',
      },
    },
  },
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const contact = parseContact({
  id: 'contact-1',
  name: 'Campus Cats Officers',
  email: 'cats@gatech.edu',
  instagramUrl: 'https://www.instagram.com/gtcampuscats',
  facebookUrl: 'https://www.facebook.com/gtcampuscats',
  websiteUrl: 'https://campuscats.gatech.edu',
});
const member = parseManagedUser({
  id: 'member-1',
  email: 'member@gatech.edu',
  role: Role.Member,
});
const vicePresident = parseManagedUser({
  id: 'vice-1',
  email: 'vice@gatech.edu',
  role: Role.VicePresident,
});
const developer = parseManagedUser({
  id: 'developer-2',
  email: 'developer2@gatech.edu',
  role: Role.Developer,
});
const bannedMember = parseManagedUser({
  id: 'banned-1',
  email: 'banned@gatech.edu',
  role: Role.Member,
  banned: true,
});
const applicationWithCodeWord = parseWhitelistApplication({
  id: 'application-1',
  name: 'Alex Catfan',
  email: 'alex@gatech.edu',
  graduationYear: '2028',
  codeWord: 'Goldie',
});
const applicationWithoutCodeWord = parseWhitelistApplication({
  id: 'application-2',
  name: 'Sam Volunteer',
  email: 'sam@gatech.edu',
  graduationYear: '2027',
  codeWord: '',
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

const renderThemed = async (content: React.ReactElement) =>
  await render(
    <AppThemeProvider colorScheme="light">{content}</AppThemeProvider>,
  );

describe('settings and administration routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole = Role.Member;
    mockSignOut.mockResolvedValue(undefined);
    mockListContacts.mockResolvedValue({
      ok: true,
      value: [contact],
      warnings: [],
    });
    mockCreateContact.mockResolvedValue({
      ok: true,
      value: contact,
      warnings: [],
    });
    mockUpdateContact.mockResolvedValue({
      ok: true,
      value: contact,
      warnings: [],
    });
    mockRemoveContact.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
    mockListUsers.mockResolvedValue({
      ok: true,
      value: [member, bannedMember, vicePresident, developer],
      warnings: [],
    });
    mockListWhitelist.mockResolvedValue({ ok: true, value: [], warnings: [] });
    mockInaturalistStatus.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
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
    mockSetInaturalistVisibility.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
    mockLinkInaturalistCatalog.mockResolvedValue({
      ok: true,
      value: undefined,
      warnings: [],
    });
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
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('organizes More for members and signs out from an explicit account action', async () => {
    const user = userEvent.setup();
    await renderThemed(<Settings />);

    expect(screen.getByText('Account')).toBeOnTheScreen();
    expect(screen.getByText('Club contacts')).toBeOnTheScreen();
    expect(await screen.findByText('Campus Cats Officers')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Instagram' }));
    await user.press(screen.getByRole('button', { name: 'Facebook' }));
    await user.press(screen.getByRole('button', { name: 'Website' }));
    expect(Linking.openURL).toHaveBeenNthCalledWith(
      1,
      'https://www.instagram.com/gtcampuscats',
    );
    expect(Linking.openURL).toHaveBeenNthCalledWith(
      2,
      'https://www.facebook.com/gtcampuscats',
    );
    expect(Linking.openURL).toHaveBeenNthCalledWith(
      3,
      'https://campuscats.gatech.edu',
    );
    expect(screen.getByText('Officer-only tools')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Feeding stations and administrative tools are available only to officers, so they do not appear in your navigation.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Officer tools')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('keeps account content visible while contacts load independently', async () => {
    mockListContacts.mockImplementation(() => new Promise(() => undefined));
    await renderThemed(<Settings />);

    expect(screen.getByText('Account')).toBeOnTheScreen();
    expect(screen.getByText('Club contacts')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading club contacts' }),
    ).toBeOnTheScreen();
  });

  it('shows officer tools to administrators without changing their routes', async () => {
    mockRole = Role.Officer;
    const user = userEvent.setup();
    await renderThemed(<Settings />);

    expect(screen.getByText('Officer tools')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Manage Catalog Tags' }));
    await user.press(screen.getByRole('button', { name: 'Manage Users' }));
    await user.press(screen.getByRole('button', { name: 'Manage Whitelist' }));
    await user.press(screen.getByRole('button', { name: 'iNaturalist Sync' }));
    await user.press(screen.getByRole('button', { name: 'App Billing' }));
    expect(mockPush).toHaveBeenNthCalledWith(1, '/settings/catalog-tags');
    expect(mockPush).toHaveBeenNthCalledWith(2, '/settings/manage_users');
    expect(mockPush).toHaveBeenNthCalledWith(3, '/settings/manage_whitelist');
    expect(mockPush).toHaveBeenNthCalledWith(4, '/settings/inaturalist');
    expect(mockPush).toHaveBeenNthCalledWith(5, '/settings/billing');
  });

  it('shows app settings only to the President', async () => {
    mockRole = Role.President;
    const user = userEvent.setup();
    await renderThemed(<Settings />);

    expect(screen.getByText('President tools')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'App Settings' }));
    expect(mockPush).toHaveBeenCalledWith('/settings/app-settings');

    mockRole = Role.Developer;
    await renderThemed(<Settings />);
    expect(screen.queryByText('President tools')).not.toBeOnTheScreen();
  });

  it('edits and saves contact information through the contacts module', async () => {
    mockRole = Role.Officer;
    const user = userEvent.setup();
    await renderThemed(<Settings />);
    await screen.findByText('Campus Cats Officers');

    await user.press(screen.getByRole('button', { name: 'Edit Contacts' }));
    await fireEvent.changeText(
      screen.getByLabelText('Contact name'),
      'Campus Cats Leadership',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Instagram link'),
      'https://www.instagram.com/campuscatsgt',
    );
    await user.press(screen.getByRole('button', { name: 'Save Contacts' }));

    await waitFor(() =>
      expect(mockUpdateContact).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'contact-1',
        {
          name: 'Campus Cats Leadership',
          email: 'cats@gatech.edu',
          instagramUrl: 'https://www.instagram.com/campuscatsgt',
          facebookUrl: 'https://www.facebook.com/gtcampuscats',
          websiteUrl: 'https://campuscats.gatech.edu',
        },
      ),
    );
  });

  it('does not recreate contacts that succeeded during a partial save', async () => {
    mockRole = Role.Officer;
    const createdContact = parseContact({
      id: 'contact-2',
      name: 'Volunteer Coordinator',
      email: 'volunteers@gatech.edu',
    });
    mockUpdateContact.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'dependency_failure',
        message: 'Could not update the contact',
      },
    });
    mockCreateContact.mockResolvedValueOnce({
      ok: true,
      value: createdContact,
      warnings: [],
    });
    const user = userEvent.setup();
    await renderThemed(<Settings />);
    await screen.findByText('Campus Cats Officers');

    await user.press(screen.getByRole('button', { name: 'Edit Contacts' }));
    await user.press(screen.getByRole('button', { name: 'Add Contact' }));
    await fireEvent.changeText(
      screen.getAllByLabelText('Contact name')[1],
      createdContact.name,
    );
    await fireEvent.changeText(
      screen.getAllByLabelText('Contact email')[1],
      createdContact.email,
    );
    await user.press(screen.getByRole('button', { name: 'Save Contacts' }));
    expect(
      await screen.findByText('Could not update the contact'),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Save Contacts' }));

    await waitFor(() =>
      expect(mockUpdateContact).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'actor-1' }),
        'contact-2',
        {
          name: createdContact.name,
          email: createdContact.email,
          instagramUrl: '',
          facebookUrl: '',
          websiteUrl: '',
        },
      ),
    );
    expect(mockCreateContact).toHaveBeenCalledTimes(1);
  });

  it('renders an access-denied state instead of loading users for members', async () => {
    await renderThemed(<ManageUsers />);

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('loads readable user cards for administrators', async () => {
    mockRole = Role.Officer;
    await renderThemed(<ManageUsers />);

    expect(await screen.findByText('member@gatech.edu')).toBeOnTheScreen();
    expect(screen.getAllByText('Member').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('Search users')).toBeOnTheScreen();
  });

  it('searches and filters grouped user accounts', async () => {
    mockRole = Role.President;
    const user = userEvent.setup();
    await renderThemed(<ManageUsers />);

    await screen.findByText('member@gatech.edu');
    await user.type(screen.getByLabelText('Search users'), 'member');
    expect(screen.getByText('member@gatech.edu')).toBeOnTheScreen();
    expect(screen.queryByText('vice@gatech.edu')).not.toBeOnTheScreen();
    fireEvent.changeText(screen.getByLabelText('Search users'), '');
    await user.press(screen.getByRole('button', { name: 'Leadership' }));
    expect(screen.queryByText('member@gatech.edu')).not.toBeOnTheScreen();
    expect(screen.getByText('vice@gatech.edu')).toBeOnTheScreen();
  });

  it('filters banned accounts and exposes the unban action', async () => {
    mockRole = Role.Officer;
    const user = userEvent.setup();
    await renderThemed(<ManageUsers />);

    await screen.findByText('member@gatech.edu');
    await user.press(screen.getByRole('button', { name: 'Banned' }));

    expect(screen.getByText('Banned Member')).toBeOnTheScreen();
    expect(screen.getByText('banned@gatech.edu')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Unban User' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('member@gatech.edu')).not.toBeOnTheScreen();
  });

  it('shows a read-only Developers tab only to developers', async () => {
    mockRole = Role.Officer;
    const officerView = await renderThemed(<ManageUsers />);
    await screen.findByText('member@gatech.edu');
    expect(
      screen.queryByRole('button', { name: 'Developers' }),
    ).not.toBeOnTheScreen();
    await officerView.unmount();

    mockRole = Role.Developer;
    const user = userEvent.setup();
    await renderThemed(<ManageUsers />);
    await screen.findByText('member@gatech.edu');
    await user.press(screen.getByRole('button', { name: 'Developers' }));

    expect(screen.getByText('actor@gatech.edu')).toBeOnTheScreen();
    expect(screen.getByText('developer2@gatech.edu')).toBeOnTheScreen();
    expect(screen.queryByText('member@gatech.edu')).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: /^Promote to / }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: /^Demote to / }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Remove User' }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        'This protected role cannot be changed with ordinary user controls.',
      ),
    ).not.toBeOnTheScreen();
  });

  it('keeps administration headers visible while their collections load', async () => {
    mockRole = Role.Officer;
    mockListUsers.mockImplementation(() => new Promise(() => undefined));
    const { unmount } = await renderThemed(<ManageUsers />);

    expect(screen.getByText('Manage users')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', { name: 'Loading users' }),
    ).toBeOnTheScreen();
    await unmount();

    mockListWhitelist.mockImplementation(() => new Promise(() => undefined));
    await renderThemed(<ManageWhitelist />);
    expect(screen.getByText('Whitelist applications')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', {
        name: 'Loading whitelist applications',
      }),
    ).toBeOnTheScreen();
  });

  it('shows an explicit empty whitelist state', async () => {
    mockRole = Role.Officer;
    await renderThemed(<ManageWhitelist />);

    expect(
      await screen.findByText('No pending applications'),
    ).toBeOnTheScreen();
  });

  it('searches and filters whitelist applications', async () => {
    mockRole = Role.Officer;
    mockListWhitelist.mockResolvedValue({
      ok: true,
      value: [applicationWithCodeWord, applicationWithoutCodeWord],
      warnings: [],
    });
    const user = userEvent.setup();
    await renderThemed(<ManageWhitelist />);

    await screen.findByText('Alex Catfan');
    await user.press(screen.getByRole('button', { name: 'No code word' }));
    expect(screen.queryByText('Alex Catfan')).not.toBeOnTheScreen();
    expect(screen.getByText('Sam Volunteer')).toBeOnTheScreen();
    await user.type(
      screen.getByLabelText('Search whitelist applications'),
      '2028',
    );
    expect(
      await screen.findByText('No matching applications'),
    ).toBeOnTheScreen();
  });

  it('denies iNaturalist administration to members before loading imported data', async () => {
    await renderThemed(<InaturalistAdministration />);

    expect(screen.getByText('Access restricted')).toBeOnTheScreen();
    expect(mockInaturalistRecords).not.toHaveBeenCalled();
  });

  it('lets administrators retry imports and hide records with an audit reason', async () => {
    mockRole = Role.Officer;
    const user = userEvent.setup();
    await renderThemed(<InaturalistAdministration />);

    expect(await screen.findByText('Goldie')).toBeOnTheScreen();
    expect(screen.getByText('Ambiguous local match')).toBeOnTheScreen();
    await user.press(
      screen.getByRole('button', { name: 'Sync with iNaturalist now' }),
    );
    await waitFor(() => expect(mockRunInaturalist).toHaveBeenCalled());
    expect(
      screen.getByText('iNaturalist synchronization completed.'),
    ).toBeOnTheScreen();

    await fireEvent.changeText(
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

  it('keeps iNaturalist administration chrome visible while data loads', async () => {
    mockRole = Role.Officer;
    mockInaturalistStatus.mockImplementation(
      () => new Promise(() => undefined),
    );
    await renderThemed(<InaturalistAdministration />);

    expect(screen.getByText('iNaturalist sync')).toBeOnTheScreen();
    expect(
      screen.getByRole('progressbar', {
        name: 'Loading iNaturalist synchronization',
      }),
    ).toBeOnTheScreen();
  });

  it('explains overlapping manual synchronization instead of reporting success', async () => {
    mockRole = Role.Officer;
    mockRunInaturalist.mockResolvedValue({
      ok: true,
      value: { status: 'skipped', runId: 'run-overlap' },
      warnings: [],
    });
    const user = userEvent.setup();
    await renderThemed(<InaturalistAdministration />);

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
    mockRole = Role.Officer;
    const user = userEvent.setup();
    await renderThemed(<InaturalistAdministration />);

    await screen.findByText('Goldie');
    await fireEvent.changeText(
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
