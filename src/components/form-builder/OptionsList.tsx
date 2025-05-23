
import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { FieldOption } from '@/types/form';

interface OptionsListProps {
  fieldId: string;
  options: FieldOption[];
  onAddOption: (fieldId: string) => void;
  onUpdateOption: (fieldId: string, optionIndex: number, updates: Partial<FieldOption>) => void;
  onRemoveOption: (fieldId: string, optionIndex: number) => void;
}

export const OptionsList: React.FC<OptionsListProps> = ({
  fieldId,
  options,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Options</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAddOption(fieldId)}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add Option
        </Button>
      </div>
      
      {options.map((option, optionIndex) => (
        <div key={optionIndex} className="flex items-center space-x-2">
          <Input
            value={option.label}
            placeholder="Option label"
            onChange={(e) =>
              onUpdateOption(fieldId, optionIndex, {
                label: e.target.value,
                value: e.target.value.toLowerCase().replace(/\s+/g, '_'),
              })
            }
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemoveOption(fieldId, optionIndex)}
            disabled={options.length === 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};
