
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { MoveUp, MoveDown, Trash2, PlusCircle } from 'lucide-react';
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
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${field.id}-label`}>Field Label</Label>
              <Input
                id={`${field.id}-label`}
                value={field.label}
                onChange={(e) => onUpdate(field.id, { label: e.target.value })}
              />
            </div>
            
            <FieldTypeSelector
              fieldId={field.id}
              fieldType={field.type}
              onTypeChange={(value) => 
                onUpdate(field.id, { 
                  type: value as 'text' | 'number' | 'textarea' | 'dropdown' | 'file' | 'image' | 'boolean',
                  options: value === 'dropdown' ? 
                    field.options || [{ label: 'Option 1', value: 'option1' }] : 
                    undefined
                })
              }
            />
            
            <div className="space-y-2">
              <Label htmlFor={`${field.id}-placeholder`}>Placeholder (Optional)</Label>
              <Input
                id={`${field.id}-placeholder`}
                value={field.placeholder || ''}
                onChange={(e) =>
                  onUpdate(field.id, { placeholder: e.target.value })
                }
              />
            </div>
            
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
          </div>
          
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
