import yaml from 'js-yaml';
import { Annotation } from '../types';

export function loadYaml(text: string): Annotation[] {
  const data = yaml.load(text) as any;
  if (!data || !data.fields) return [];
  return Object.entries<any>(data.fields).map(([field_name, v], idx) => {
    const field_type = v.field_type || 'testo';
    const ann: Annotation = {
      id: String(idx),
      field_name,
      field_type,
      left: v.x_left || 0,
      top: v.y_top || 0,
      width: v.width || 0,
      height: v.height || 0,
    };
    if (field_type === 'testo') {
      ann.font = v.font || '';
      ann.font_size = v.font_size || 0;
      ann.font_color = v.font_color || '#000000';
      ann.text_type = v.text_type || '';
      ann.text_align = v.text_align || 'left';
    }
    return ann;
  });
}

export function exportYaml(imageName: string, annotations: Annotation[]): string {
  const fields: any = {};
  annotations.forEach(a => {
    const field: any = {
      x_left: Math.round(a.left),
      y_top: Math.round(a.top),
      width: Math.round(a.width),
      height: Math.round(a.height),
      field_type: a.field_type,
      text_type: a.text_type,
    };
    if (a.field_type === 'testo') {
      field.font = a.font;
      field.font_size = a.font_size;
      field.font_color = a.font_color;
      field.text_type = a.text_type;
      field.text_align = a.text_align;
    }
    fields[a.field_name] = field;
  });
  return yaml.dump({ template: imageName, fields });
}
