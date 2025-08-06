import { describe, it, expect } from 'vitest';
import { loadYaml, exportYaml } from '../utils/yaml';
import { Annotation } from '../types';

describe('YAML roundtrip', () => {
  it('loads existing yaml, adds new annotation, exports correctly', () => {
    const existing = `template: fronte.jpeg\nfields:\n  name:\n    x_left: 1\n    y_top: 2\n    width: 3\n    height: 4\n    font: Arial\n    font_size: 10\n    font_color: "#000000"\n    field_type: testo\n`;
    const annotations = loadYaml(existing);
    const newAnn: Annotation = {
      id: '1',
      field_name: 'newField',
      font: 'Times',
      font_size: 12,
      font_color: '#ffffff',
      field_type: 'firma',
      left: 10,
      top: 20,
      width: 30,
      height: 40,
    };
    annotations.push(newAnn);
    const out = exportYaml('fronte.jpeg', annotations);
    const round = loadYaml(out);
    expect(round).toHaveLength(2);
    const names = round.map(a => a.field_name).sort();
    expect(names).toEqual(['name', 'newField']);
  });
});
