import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { PlusCircle } from 'lucide-react';
import { FormField, FieldOption } from '@/types/form';
import { generateUUID } from '@/lib/uuid';
import { FieldEditor } from '@/components/form-builder/FieldEditor';
import { FormBuilderHeader } from '@/components/form-builder/FormBuilderHeader';

const FormBuilder: React.FC = () => {
  const { templateId } = useParams();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  
  const [formName, setFormName] = useState<string>('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [isPredefined, setIsPredefined] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
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
            // Ensure we're properly typing the fields data from Supabase
            if (data.fields && Array.isArray(data.fields)) {
              setFields(data.fields as FormField[]);
            } else {
              setFields([]);
            }
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
      id: generateUUID(),
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
    if (template.fields && Array.isArray(template.fields)) {
      setFields(template.fields as FormField[]);
    }
    
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
            <FormBuilderHeader
              formName={formName}
              onFormNameChange={setFormName}
              isPredefined={isPredefined}
              onIsPredefinedChange={setIsPredefined}
              predefinedTemplates={predefinedTemplates}
              onTemplateSelect={loadPredefinedTemplate}
            />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Form Fields</h3>
                <Button onClick={addField} size="sm" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Field
                </Button>
              </div>
              
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    index={index}
                    totalFields={fields.length}
                    onUpdate={updateField}
                    onRemove={removeField}
                    onMove={moveField}
                    onAddOption={addOption}
                    onUpdateOption={updateOption}
                    onRemoveOption={removeOption}
                  />
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
