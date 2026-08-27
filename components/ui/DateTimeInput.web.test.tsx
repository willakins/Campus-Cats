import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppThemeProvider } from '../../theme';
import { DateTimeInput } from './DateTimeInput.web';

describe('web date input', () => {
  it('uses the browser date picker and limits selection to the maximum day', async () => {
    const date = new Date(2026, 7, 20, 9);
    const setDate = jest.fn();
    await render(
      <AppThemeProvider colorScheme="light">
        <DateTimeInput date={date} maximumDate={date} setDate={setDate} />
      </AppThemeProvider>,
    );

    const picker = screen.getByLabelText(
      'Choose date, current date Thu Aug 20 2026',
    );
    expect(picker).toHaveProp('type', 'date');
    expect(picker).toHaveProp('max', '2026-08-20');

    fireEvent(picker, 'change', {
      currentTarget: { value: '2026-08-18' },
    });
    expect(setDate).toHaveBeenCalledWith(new Date(2026, 7, 18, 9));
  });
});
