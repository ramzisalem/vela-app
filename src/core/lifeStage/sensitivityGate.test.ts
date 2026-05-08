import { visibleModesForPicker } from './sensitivityGate';

describe('visibleModesForPicker', () => {
  it('hides HRT and cancer recovery by default (pre-review)', () => {
    const modes = visibleModesForPicker();
    expect(modes).toEqual(expect.arrayContaining(['pregnancy', 'postpartum', 'menopause']));
    expect(modes).not.toContain('hrt_estrogen');
    expect(modes).not.toContain('hrt_testosterone');
    expect(modes).not.toContain('cancer_recovery');
  });
});
