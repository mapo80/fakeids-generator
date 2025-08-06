import yaml from 'js-yaml';
import { Annotation } from '../types';

export function loadYaml(text: string): Annotation[] {
  const data = yaml.load(text) as any;
  if (!data || !data.fields) return [];
  return Object.entries<any>(data.fields).map(([field_name, v], idx) => ({
    id: String(idx),
    field_name,
    font: v.font || '',
    font_size: v.font_size || 0,
    font_color: v.font_color || '#000000',
    field_type: v.field_type || 'testo',
    text_type: v.text_type || '',
    left: v.x_left || 0,
    top: v.y_top || 0,
    width: v.width || 0,
    height: v.height || 0,
  }));
}

export function exportYaml(imageName: string, annotations: Annotation[]): string {
  const fields: any = {};
  annotations.forEach(a => {
    const field: any = {
      x_left: Math.round(a.left),
      y_top: Math.round(a.top),
      width: Math.round(a.width),
      height: Math.round(a.height),
      font: a.font,
      font_size: a.font_size,
      font_color: a.font_color,
      field_type: a.field_type,
    };
    if (a.field_type === 'testo') {
      field.text_type = a.text_type;
    }
    fields[a.field_name] = field;
  });
  return yaml.dump({ template: imageName, fields });
}
