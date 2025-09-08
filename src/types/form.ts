
export type FieldOption = {
  label: string;
  value: string;
};

export type FormField = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'dropdown' | 'file' | 'image' | 'boolean' | 'header' | 'separator';
  placeholder?: string;
  required: boolean;
  sensitive?: boolean;
  options?: FieldOption[];
  // Additional properties for header fields
  headerLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  description?: string;
};
