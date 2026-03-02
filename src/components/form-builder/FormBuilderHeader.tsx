
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShareFormButton } from './ShareFormButton';

interface FormBuilderHeaderProps {
  formName: string;
  onFormNameChange: (value: string) => void;
  isPredefined: boolean;
  onIsPredefinedChange: (value: boolean) => void;
  predefinedTemplates: any[];
  onTemplateSelect: (templateId: string) => void;
  formId?: string;
}

export const FormBuilderHeader: React.FC<FormBuilderHeaderProps> = ({
  formName,
  onFormNameChange,
  isPredefined,
  onIsPredefinedChange,
  predefinedTemplates,
  onTemplateSelect,
  formId,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Label htmlFor="formName">Form Name</Label>
          <Input
            id="formName"
            value={formName}
            onChange={(e) => onFormNameChange(e.target.value)}
            placeholder="Enter form name"
            className="w-full"
          />
        </div>
        
        {formId && (
          <div className="flex-shrink-0">
            <ShareFormButton formId={formId} />
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="isPredefined"
            checked={isPredefined}
            onCheckedChange={onIsPredefinedChange}
          />
          <Label htmlFor="isPredefined">Predefined Template</Label>
        </div>
        
        {predefinedTemplates.length > 0 && (
          <div className="w-full sm:w-[200px]">
            <Select onValueChange={onTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Load Template" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Predefined Templates</SelectLabel>
                  {predefinedTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};
