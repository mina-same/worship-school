import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type FieldOption = {
  label: string;
  value: string;
};

type FormField = {
  id: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'dropdown';
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
};

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'dropdown', label: 'Dropdown' },
];

const FormBuilder: React.FC = () => {
  const { templateId } = useParams();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  
  const [formName, setFormName] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [isPredefined, setIsPredefined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [predefinedTemplates, setPredefinedTemplates] = useState<any[]>([]);

  useEffect(() => {
    // Redirect if not super admin
    if (userRole && userRole !== 'super_admin') {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        // If editing an existing template
        if (templateId) {
          const { data, error } = await supabase
            .from('form_templates')
            .select('*')
            .eq('id', templateId)
            .single();

          if (error) throw error;

          if (data) {
            setFormName(data.name);
            setFields(data.fields || []);
            setIsPredefined(data.is_predefined || false);
          }
        }

        // Fetch predefined templates for reference
        const { data: templatesData, error: templatesError } = await supabase
          .from('form_templates')
          .select('*')
          .eq('is_predefined', true);

        if (templatesError) throw templatesError;
        setPredefinedTemplates(templatesData || []);
      } catch (error) {
        console.error('Error fetching form template:', error);
        toast({
          title: "Error",
          description: "Failed to load form template",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [templateId, userRole, navigate]);

  const addField = () => {
    const newField: FormField = {
      id: uuidv4(),
      label: 'New Field',
      type: 'text',
      placeholder: '',
      required: false,
    };
    
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    setFields(fields.filter((field) => field.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(
      fields.map((field) => (field.id === id ? { ...field, ...updates } : field))
    );
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === fields.length - 1)) {
      return;
    }

    const newFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
    setFields(newFields);
  };

  const addOption = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    
    const newOption = {
      label: `Option ${(field.options?.length || 0) + 1}`,
      value: `option${(field.options?.length || 0) + 1}`,
    };
    
    updateField(fieldId, {
      options: [...(field.options || []), newOption],
    });
  };

  const updateOption = (
    fieldId: string,
    optionIndex: number,
    updates: Partial<FieldOption>
  ) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    
    const updatedOptions = [...field.options];
    updatedOptions[optionIndex] = {
      ...updatedOptions[optionIndex],
      ...updates,
    };
    
    updateField(fieldId, { options: updatedOptions });
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !field.options) return;
    
    const updatedOptions = field.options.filter((_, i) => i !== optionIndex);
    updateField(fieldId, { options: updatedOptions });
  };

  const saveForm = async () => {
    if (!user) return;
    
    if (!formName.trim()) {
      toast({
        title: "Error",
        description: "Form name is required",
        variant: "destructive"
      });
      return;
    }
    
    if (fields.length === 0) {
      toast({
        title: "Error",
        description: "At least one field is required",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    
    try {
      const formData = {
        name: formName,
        fields,
        is_predefined: isPredefined,
        created_by: user.id,
      };
      
      if (templateId) {
        // Update existing template
        const { error } = await supabase
          .from('form_templates')
          .update(formData)
          .eq('id', templateId);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Form template updated successfully",
        });
      } else {
        // Create new template
        const { error } = await supabase
          .from('form_templates')
          .insert(formData);
          
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Form template created successfully",
        });
      }
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving form template:', error);
      toast({
        title: "Error",
        description: "Failed to save form template",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const loadPredefinedTemplate = (templateId: string) => {
    const template = predefinedTemplates.find((t) => t.id === templateId);
    if (!template) return;
    
    // Only load fields, keep the current form name
    setFields(template.fields);
    toast({
      title: "Template Loaded",
      description: "Fields have been loaded from the predefined template",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-4xl">
        <Button variant="outline" className="mb-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>{templateId ? 'Edit Form Template' : 'Create Form Template'}</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="formName">Form Name</Label>
              <Input
                id="formName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter form name"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="isPredefined"
                checked={isPredefined}
                onCheckedChange={setIsPredefined}
              />
              <Label htmlFor="isPredefined">Make this a predefined template</Label>
            </div>
            
            {predefinedTemplates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="predefinedTemplate">
                  Load from predefined template
                </Label>
                <Select onValueChange={loadPredefinedTemplate}>
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
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Form Fields</h3>
                <Button onClick={addField} size="sm" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                </Button>
              </div>
              
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Field {index + 1}</h4>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveField(index, 'up')}
                              disabled={index === 0}
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => moveField(index, 'down')}
                              disabled={index === fields.length - 1}
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeField(field.id)}
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
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`${field.id}-type`}>Field Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value) => 
                                updateField(field.id, { 
                                  type: value as 'text' | 'number' | 'textarea' | 'dropdown',
                                  options: value === 'dropdown' ? 
                                    field.options || [{ label: 'Option 1', value: 'option1' }] : 
                                    undefined
                                })
                              }
                            >
                              <SelectTrigger id={`${field.id}-type`}>
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
                          
                          <div className="space-y-2">
                            <Label htmlFor={`${field.id}-placeholder`}>Placeholder (Optional)</Label>
                            <Input
                              id={`${field.id}-placeholder`}
                              value={field.placeholder || ''}
                              onChange={(e) =>
                                updateField(field.id, { placeholder: e.target.value })
                              }
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`${field.id}-required`}
                              checked={field.required}
                              onCheckedChange={(checked) =>
                                updateField(field.id, { required: checked })
                              }
                            />
                            <Label htmlFor={`${field.id}-required`}>Required field</Label>
                          </div>
                        </div>
                        
                        {field.type === 'dropdown' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Options</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addOption(field.id)}
                              >
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                              </Button>
                            </div>
                            
                            {field.options?.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <Input
                                  value={option.label}
                                  placeholder="Option label"
                                  onChange={(e) =>
                                    updateOption(field.id, optionIndex, {
                                      label: e.target.value,
                                      value: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                                    })
                                  }
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeOption(field.id, optionIndex)}
                                  disabled={field.options?.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {fields.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">
                      No fields added yet. Click "Add Field" to start building your form.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end">
            <Button 
              onClick={saveForm} 
              disabled={saving || !formName.trim() || fields.length === 0}
            >
              {saving ? 'Saving...' : templateId ? 'Update Form' : 'Create Form'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default FormBuilder;
