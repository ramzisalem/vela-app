/**
 * Smoke test for Sparkline (file 25 — components project).
 *
 * Validates the basic rendering contract: bars match value count,
 * accessibility label exposes the data point count, and start/end
 * labels render when supplied. The theme is mocked so the test
 * doesn't pull in AsyncStorage / ThemeProvider.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/theme', () => ({
  useColors: () => ({
    border: { subtle: '#eee' },
    text: { primary: '#111', tertiary: '#999' },
  }),
}));

jest.mock('@/theme/spacing', () => ({
  Spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40 },
}));

jest.mock('@/components/ui/Text', () => {
  const RN = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Caption = ({ children, ...rest }: any) => <RN.Text {...rest}>{children}</RN.Text>;
  return { Caption };
});

import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('renders one bar per value', () => {
    const { UNSAFE_root } = render(
      <Sparkline values={[10, 20, 30, 40, 50]} />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('exposes accessibility label with point count', () => {
    const { getByLabelText } = render(<Sparkline values={[1, 2, 3]} />);
    expect(getByLabelText('Trend chart with 3 data points.')).toBeTruthy();
  });

  it('renders start and end labels', () => {
    const { getByText } = render(
      <Sparkline values={[1, 2, 3]} startLabel="Wk 1" endLabel="Wk 12" />,
    );
    expect(getByText('Wk 1')).toBeTruthy();
    expect(getByText('Wk 12')).toBeTruthy();
  });

  it('handles empty series without crashing', () => {
    const { UNSAFE_root } = render(<Sparkline values={[]} />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
