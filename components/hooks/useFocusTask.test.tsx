import React from 'react';

import { render } from '@testing-library/react-native';

import { useFocusTask } from './useFocusTask';

jest.mock('expo-router', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (effect: () => void | (() => void)) =>
      mockReact.useEffect(effect, [effect]),
  };
});

const Probe = ({ task }: {
  readonly task: Parameters<typeof useFocusTask>[0];
}) => {
  useFocusTask(task);
  return null;
};

describe('useFocusTask', () => {
  it('invalidates in-flight work when its focused owner unmounts', async () => {
    let isActive: (() => boolean) | undefined;
    const rendered = await render(
      <Probe task={(activity) => {
        isActive = activity;
      }} />,
    );

    expect(isActive?.()).toBe(true);
    await rendered.unmount();
    expect(isActive?.()).toBe(false);
  });
});
