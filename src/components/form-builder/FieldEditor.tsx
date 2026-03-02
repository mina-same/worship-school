
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MoveUp, MoveDown, Trash2, PlusCircle, Eye, EyeOff, Type, Minus, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Card key={field.id} className="border shadow-sm">
      <CardContent className="pt-3 sm:pt-6 px-2 sm:px-6 pb-4">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleCollapse}
                  className="h-7 w-7 p-0"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </Button>
                <h4 className="font-medium text-sm sm:text-base lg:text-lg">Field {index + 1}</h4>
              </div>
            </div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {field.type === 'text' && 'Text Input'}
                  {field.type === 'number' && 'Number Input'}
                  {field.type === 'textarea' && 'Text Area'}
                  {field.type === 'dropdown' && 'Dropdown'}
                  {field.type === 'file' && 'File Upload'}
                  {field.type === 'image' && 'Image Upload'}
                  {field.type === 'boolean' && 'Yes/No'}
                  {field.type === 'header' && 'Header'}
                  {field.type === 'separator' && 'Separator'}
                </span>
                {!isCollapsed && field.label && (
                  <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate max-w-[150px] sm:max-w-[200px]">
                    {field.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMove(index, 'up')}
                  disabled={index === 0}
                  className="h-7 w-7 sm:h-9 sm:w-9 p-0"
                >
                  <MoveUp className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMove(index, 'down')}
                  disabled={index === totalFields - 1}
                  className="h-7 w-7 sm:h-9 sm:w-9 p-0"
                >
                  <MoveDown className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(field.id)}
                  className="h-7 w-7 sm:h-9 sm:w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {!isCollapsed && (
            <>
              <div className="grid gap-3 grid-cols-1">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor={`${field.id}-label`} className="text-xs sm:text-sm font-medium">Field Label</Label>
                  <Textarea
                    id={`${field.id}-label`}
                    value={field.label}
                    onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                    placeholder="أدخل تسمية الحقل (يدعم عدة أسطر)"
                    rows={2}
                    className="resize-none w-full text-right text-xs sm:text-sm min-h-[60px]"
                    dir="rtl"
                  />
                </div>
              </div>
              
              <div className="grid gap-3 grid-cols-1">
                
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">Field Type</Label>
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
                </div>
                
                {field.type !== 'separator' && (
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor={`${field.id}-placeholder`} className="text-xs sm:text-sm font-medium">Placeholder (Optional)</Label>
                    <Input
                      id={`${field.id}-placeholder`}
                      value={field.placeholder || ''}
                      onChange={(e) =>
                        onUpdate(field.id, { placeholder: e.target.value })
                      }
                      className="text-right text-xs sm:text-sm h-9 sm:h-10"
                      dir="rtl"
                      placeholder="Enter placeholder text..."
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {field.type !== 'separator' && field.type !== 'header' && (
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${field.id}-required`}
                        checked={field.required}
                        onCheckedChange={(checked) =>
                          onUpdate(field.id, { required: checked })
                        }
                        className="scale-75 sm:scale-100"
                      />
                      <Label htmlFor={`${field.id}-required`} className="text-xs sm:text-sm font-medium cursor-pointer">Required</Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {field.required ? 'Must be filled' : 'Optional'}
                    </span>
                  </div>
                )}
                
                {field.type !== 'separator' && field.type !== 'header' && (
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${field.id}-sensitive`}
                        checked={field.sensitive || false}
                        onCheckedChange={(checked) =>
                          onUpdate(field.id, { sensitive: checked })
                        }
                        className="scale-75 sm:scale-100"
                      />
                      <Label htmlFor={`${field.id}-sensitive`} className="flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer">
                        {field.sensitive ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                        Sensitive
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {field.sensitive ? 'Protected data' : 'Normal data'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Header-specific options */}
              {field.type === 'header' && (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor={`${field.id}-header-level`} className="text-xs sm:text-sm font-medium">Header Level</Label>
                    <Select 
                      value={field.headerLevel?.toString() || '2'} 
                      onValueChange={(value) => onUpdate(field.id, { headerLevel: parseInt(value) as 1 | 2 | 3 | 4 | 5 | 6 })}
                    >
                      <SelectTrigger id={`${field.id}-header-level`} className="h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1" className="text-xs sm:text-sm">H1 - Main Title</SelectItem>
                        <SelectItem value="2" className="text-xs sm:text-sm">H2 - Section Title</SelectItem>
                        <SelectItem value="3" className="text-xs sm:text-sm">H3 - Subsection</SelectItem>
                        <SelectItem value="4" className="text-xs sm:text-sm">H4 - Minor Heading</SelectItem>
                        <SelectItem value="5" className="text-xs sm:text-sm">H5 - Small Heading</SelectItem>
                        <SelectItem value="6" className="text-xs sm:text-sm">H6 - Smallest Heading</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor={`${field.id}-description`} className="text-xs sm:text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      id={`${field.id}-description`}
                      value={field.description || ''}
                      onChange={(e) => onUpdate(field.id, { description: e.target.value })}
                      placeholder="أضف وصفاً أو عنواناً فرعياً لهذا العنوان"
                      rows={2}
                      className="text-right text-xs sm:text-sm min-h-[60px]"
                      dir="rtl"
                    />
                  </div>
                </div>
              )}
              
              {field.type === 'dropdown' && (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium">Dropdown Options</Label>
                  <OptionsList
                    fieldId={field.id}
                    options={field.options || []}
                    onAddOption={onAddOption}
                    onUpdateOption={onUpdateOption}
                    onRemoveOption={onRemoveOption}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
