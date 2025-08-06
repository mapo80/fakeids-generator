export interface Annotation {
  id: string;
  field_name: string;
  field_type: string;
  font?: string;
  font_size?: number;
  font_color?: string;
  text_type?: string;
  text_align?: 'left' | 'center' | 'right';
  left: number;
  top: number;
  width: number;
  height: number;
}
