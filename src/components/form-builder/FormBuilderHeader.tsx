
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface FormBuilderHeaderProps {
  formName: string;
  onFormNameChange: (name: string) => void;
  isPredefined: boolean;
  onIsPredefinedChange: (value: boolean) => void;
  predefinedTemplates: any[];
  onTemplateSelect: (templateId: string) => void;
}

export const FormBuilderHeader: React.FC<FormBuilderHeaderProps> = ({
  formName,
  onFormNameChange,
  isPredefined,
  onIsPredefinedChange,
  predefinedTemplates,
  onTemplateSelect,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="formName">Form Name</Label>
        <Input
          id="formName"
          value={formName}
          onChange={(e) => onFormNameChange(e.target.value)}
          placeholder="Enter form name"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          id="isPredefined"
          checked={isPredefined}
          onCheckedChange={onIsPredefinedChange}
        />
        <Label htmlFor="isPredefined">Make this a predefined template</Label>
      </div>
      
      {predefinedTemplates.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="predefinedTemplate">
            Load from predefined template
          </Label>
          <Select onValueChange={onTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a predefined template" />
            </SelectTrigger>
            <SelectContent>
              {predefinedTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <Separator className="my-4" />
    </div>
  );
};
