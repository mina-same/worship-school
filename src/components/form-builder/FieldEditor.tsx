
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MoveUp, MoveDown, Trash2, PlusCircle, Eye, EyeOff, Type, Minus } from 'lucide-react';
import { FormField, FieldOption } from '@/types/form';
import { FieldTypeSelector } from './FieldTypeSelector';
import { OptionsList } from './OptionsList';

interface FieldEditorProps {
  field: FormField;
  index: number;
  totalFields: number;
  onUpdate: (id: string, updates: Partial<FormField>) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onAddOption: (fieldId: string) => void;
  onUpdateOption: (fieldId: string, optionIndex: number, updates: Partial<FieldOption>) => void;
  onRemoveOption: (fieldId: string, optionIndex: number) => void;
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
  field,
  index,
  totalFields,
  onUpdate,
  onRemove,
  onMove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}) => {
  return (
    <Card key={field.id}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Field {index + 1}</h4>
            <div className="flex items-center space-x-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onMove(index, 'up')}
                disabled={index === 0}
              >
                <MoveUp className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onMove(index, 'down')}
                disabled={index === totalFields - 1}
              >
                <MoveDown className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onRemove(field.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-1">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`${field.id}-label`}>Field Label</Label>
              <Textarea
                id={`${field.id}-label`}
                value={field.label}
                onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                placeholder="أدخل تسمية الحقل (يدعم عدة أسطر)"
                rows={4}
                className="resize-none w-full text-right"
                dir="rtl"
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            
            <FieldTypeSelector
              fieldId={field.id}
              fieldType={field.type}
              onTypeChange={(value) => 
                onUpdate(field.id, { 
                  type: value as 'text' | 'number' | 'textarea' | 'dropdown' | 'file' | 'image' | 'boolean' | 'header' | 'separator',
                  options: value === 'dropdown' ? 
                    field.options || [{ label: 'Option 1', value: 'option1' }] : 
                    undefined,
                  headerLevel: value === 'header' ? (field.headerLevel || 2) : undefined,
                  required: value === 'separator' ? false : field.required
                })
              }
            />
            
            {field.type !== 'separator' && (
              <div className="space-y-2">
                <Label htmlFor={`${field.id}-placeholder`}>Placeholder (Optional)</Label>
                <Input
                  id={`${field.id}-placeholder`}
                  value={field.placeholder || ''}
                  onChange={(e) =>
                    onUpdate(field.id, { placeholder: e.target.value })
                  }
                  className="text-right"
                  dir="rtl"
                />
              </div>
            )}
            
            {field.type !== 'separator' && field.type !== 'header' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id={`${field.id}-required`}
                  checked={field.required}
                  onCheckedChange={(checked) =>
                    onUpdate(field.id, { required: checked })
                  }
                />
                <Label htmlFor={`${field.id}-required`}>Required field</Label>
              </div>
            )}
          </div>

          {field.type !== 'separator' && field.type !== 'header' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`${field.id}-sensitive`}
                  checked={field.sensitive || false}
                  onCheckedChange={(checked) =>
                    onUpdate(field.id, { sensitive: checked })
                  }
                />
                <Label htmlFor={`${field.id}-sensitive`} className="flex items-center gap-2">
                  {field.sensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  Sensitive Information
                </Label>
              </div>
            </div>
          )}
          
          {/* Header-specific options */}
          {field.type === 'header' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${field.id}-header-level`}>Header Level</Label>
                <Select 
                  value={field.headerLevel?.toString() || '2'} 
                  onValueChange={(value) => onUpdate(field.id, { headerLevel: parseInt(value) as 1 | 2 | 3 | 4 | 5 | 6 })}
                >
                  <SelectTrigger id={`${field.id}-header-level`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">H1 - Main Title</SelectItem>
                    <SelectItem value="2">H2 - Section Title</SelectItem>
                    <SelectItem value="3">H3 - Subsection</SelectItem>
                    <SelectItem value="4">H4 - Minor Heading</SelectItem>
                    <SelectItem value="5">H5 - Small Heading</SelectItem>
                    <SelectItem value="6">H6 - Smallest Heading</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${field.id}-description`}>Description (Optional)</Label>
                <Textarea
                  id={`${field.id}-description`}
                  value={field.description || ''}
                  onChange={(e) => onUpdate(field.id, { description: e.target.value })}
                  placeholder="أضف وصفاً أو عنواناً فرعياً لهذا العنوان"
                  rows={2}
                  className="text-right"
                  dir="rtl"
                />
              </div>
            </div>
          )}
          
          {field.type === 'dropdown' && (
            <OptionsList
              fieldId={field.id}
              options={field.options || []}
              onAddOption={onAddOption}
              onUpdateOption={onUpdateOption}
              onRemoveOption={onRemoveOption}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
