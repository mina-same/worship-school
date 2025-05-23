
export type FieldOption = {
  label: string;
  value: string;
};

export type FormField = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'dropdown' | 'file' | 'image' | 'boolean';
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
};
