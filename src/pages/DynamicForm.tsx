import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

const DynamicForm: React.FC = () => {
  const { templateId, submissionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // Load form template and submission data
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        if (!templateId) return;

        // Fetch the form template
        const { data: templateData, error: templateError } = await supabase
          .from('form_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (templateError) throw templateError;
        setFormTemplate(templateData);

        // If we have a submissionId, fetch the submission data
        if (submissionId) {
          const { data: submissionData, error: submissionError } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .single();

          if (submissionError) throw submissionError;
          setSubmission(submissionData);
          
          // Set form data from submission
          if (submissionData.form_data && typeof submissionData.form_data === 'object') {
            setFormData(submissionData.form_data as Record<string, any>);
          }
          
          // If status is completed, set readonly mode
          if (submissionData.status === 'completed') {
            setIsReadOnly(true);
          }
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast({
          title: "Error",
          description: "Failed to load form data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [templateId, submissionId]);

  // Auto-save functionality
  useEffect(() => {
    if (!formTemplate || !user || isReadOnly) return;

    // Debounced save function
    const saveTimeout = setTimeout(async () => {
      // Only save if we have some data and the form isn't in readonly mode
      if (Object.keys(formData).length > 0) {
        await saveFormData('in_progress');
      }
    }, 3000); // Auto-save after 3 seconds

    return () => clearTimeout(saveTimeout);
  }, [formData]);

  const saveFormData = async (status: 'in_progress' | 'completed') => {
    if (!user || !templateId || !formTemplate || (isReadOnly && status === 'completed')) return;
    
    try {
      setSaving(true);
      
      // If we already have a submission, update it
      if (submission) {
        const { error } = await supabase
          .from('submissions')
          .update({
            form_data: formData,
            status: status,
            last_updated: new Date().toISOString(),
          })
          .eq('id', submission.id);

        if (error) throw error;
      } 
      // Otherwise create a new submission
      else {
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            user_id: user.id,
            form_template_id: templateId,
            form_data: formData,
            status: status,
            last_updated: new Date().toISOString(),
          })
          .select();

        if (error) throw error;
        
        if (data && data[0]) {
          setSubmission(data[0]);
        }
      }

      // Show notification for manual saves and submissions
      if (status === 'completed') {
        toast({
          title: "Success",
          description: "Form submitted successfully!",
        });
        // Navigate back to dashboard after submission
        navigate('/dashboard');
      } else {
        toast({
          title: "Saved",
          description: "Your progress has been saved",
        });
      }
    } catch (error) {
      console.error('Error saving form data:', error);
      toast({
        title: "Error",
        description: "Failed to save form data",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await saveFormData('completed');
  };

  const renderFormField = (field: any) => {
    const value = formData[field.id] || '';
    
    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label} {field.required && '*'}</Label>
            <Input
              id={field.id}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
            />
          </div>
        );
        
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label} {field.required && '*'}</Label>
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
            />
          </div>
        );
        
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label} {field.required && '*'}</Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
            />
          </div>
        );
        
      case 'dropdown':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label} {field.required && '*'}</Label>
            <Select
              value={value}
              onValueChange={(value) => handleFieldChange(field.id, value)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: any) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
        
      default:
        return null;
    }
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
      <div className="mx-auto max-w-3xl">
        <Button variant="outline" className="mb-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>{formTemplate?.name}</CardTitle>
            {isReadOnly && (
              <p className="text-sm text-muted-foreground">This form has been submitted and cannot be edited.</p>
            )}
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {formTemplate?.fields && Array.isArray(formTemplate.fields) ? (
                formTemplate.fields.map(renderFormField)
              ) : (
                <p>No form fields found</p>
              )}
            </div>
          </CardContent>
          
          {!isReadOnly && (
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => saveFormData('in_progress')}
                disabled={saving || submitting}
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={saving || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Form'}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DynamicForm;
