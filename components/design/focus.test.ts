import { lightTheme } from '../../theme';
import { focusRingStyle } from './focus';

describe('keyboard focus presentation', () => {
  it('adds a visible semantic outline on web only while focused', () => {
    expect(focusRingStyle(true, lightTheme.colors.info, 'web')).toEqual({
      outlineColor: lightTheme.colors.info,
      outlineOffset: 2,
      outlineStyle: 'solid',
      outlineWidth: 3,
    });
    expect(focusRingStyle(false, lightTheme.colors.info, 'web')).toBeUndefined();
    expect(focusRingStyle(true, lightTheme.colors.info, 'ios')).toBeUndefined();
  });
});
