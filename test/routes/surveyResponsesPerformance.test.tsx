import React from 'react';

import { render, screen } from '@testing-library/react-native';

import SurveyResponses from '../../app/(app)/surveys/responses';
import {
  Role,
  parseSurvey,
  parseSurveyResponse,
  parseUser,
} from '../../core/domain';
import { AppThemeProvider } from '../../theme';

const mockGet = jest.fn();
const mockResponses = jest.fn();
let mockFlatListProps: Record<string, unknown> | undefined;

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const mockReact = require('react');
  const MockFlatList = (props: Record<string, unknown>) => {
    mockFlatListProps = props;
    return mockReact.createElement(
      actual.View,
      { testID: props.testID },
      props.ListHeaderComponent,
    );
  };
  return Object.defineProperty(actual, 'FlatList', {
    configurable: true,
    value: MockFlatList,
  });
});

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
    useLocalSearchParams: () => ({ id: 'survey-1' }),
    useRouter: () => ({ back: jest.fn() }),
  };
});

jest.mock('../../composition/appModules', () => ({
  appModules: {
    surveys: {
      get: (...args: unknown[]) => mockGet(...args),
      responses: (...args: unknown[]) => mockResponses(...args),
      close: jest.fn(),
    },
  },
}));

jest.mock('../../providers', () => ({
  useAuth: () => ({
    user: { id: 'officer-1', email: 'officer@example.com', role: 1 },
  }),
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const officer = parseUser({
  id: 'officer-1',
  email: 'officer@example.com',
  role: Role.Officer,
});

describe('survey response rendering performance', () => {
  it('virtualizes a large response history with bounded render batches', async () => {
    mockGet.mockResolvedValue({
      ok: true,
      value: parseSurvey({
        id: 'survey-1',
        title: 'Volunteer feedback',
        details: '',
        anonymous: false,
        participationAudience: 'all_members',
        status: 'closed',
        questions: [{
          id: 'question-1',
          type: 'long_text',
          prompt: 'What should we improve?',
          options: [],
        }],
        createdAt: new Date('2026-08-01T12:00:00.000Z'),
        createdBy: officer,
        closedAt: new Date('2026-08-02T12:00:00.000Z'),
      }),
      warnings: [],
    });
    mockResponses.mockResolvedValue({
      ok: true,
      value: Array.from({ length: 250 }, (_, index) =>
        parseSurveyResponse({
          id: `response-${index}`,
          surveyId: 'survey-1',
          answers: [{ questionId: 'question-1', value: `Answer ${index}` }],
          submittedAt: new Date(1_780_000_000_000 + index),
        }),
      ),
      warnings: [],
    });

    await render(
      <AppThemeProvider colorScheme="light">
        <SurveyResponses />
      </AppThemeProvider>,
    );
    expect(await screen.findByText('250 responses')).toBeOnTheScreen();

    expect(mockFlatListProps?.data).toHaveLength(250);
    expect(mockFlatListProps?.initialNumToRender).toBe(8);
    expect(mockFlatListProps?.maxToRenderPerBatch).toBe(8);
    expect(mockFlatListProps?.windowSize).toBe(7);
  });
});
