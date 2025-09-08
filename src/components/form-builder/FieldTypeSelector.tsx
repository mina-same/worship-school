
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FieldTypeSelectorProps {
  fieldId: string;
  fieldType: string;
  onTypeChange: (value: string) => void;
}

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'file', label: 'File' },
  { value: 'image', label: 'Image' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'header', label: 'Header' },
  { value: 'separator', label: 'Line Separator' },
];

export const FieldTypeSelector: React.FC<FieldTypeSelectorProps> = ({
  fieldId,
  fieldType,
  onTypeChange,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${fieldId}-type`}>Field Type</Label>
      <Select value={fieldType} onValueChange={onTypeChange}>
        <SelectTrigger id={`${fieldId}-type`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fieldTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
