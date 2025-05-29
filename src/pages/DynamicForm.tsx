
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
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { FormField } from '@/types/form';
import { ArrowLeft, Save, Send, User, Mail, CheckCircle } from 'lucide-react';

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
          
          // For completed forms, allow editing but show different UI
          if (submissionData.status === 'completed') {
            setIsReadOnly(false); // Allow editing even for completed forms
          }
        } else {
          // Check if user already has a submission for this template
          const { data: existingSubmission, error: existingError } = await supabase
            .from('submissions')
            .select('*')
            .eq('user_id', user?.id)
            .eq('form_template_id', templateId)
            .single();

          if (!existingError && existingSubmission) {
            // Redirect to the existing submission
            navigate(`/form/${templateId}/${existingSubmission.id}`);
            return;
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
  }, [templateId, submissionId, user?.id, navigate]);

  // Auto-save functionality
  useEffect(() => {
    if (!formTemplate || !user || isReadOnly) return;

    // Debounced save function
    const saveTimeout = setTimeout(async () => {
      // Only save if we have some data
      if (Object.keys(formData).length > 0) {
        await saveFormData('in_progress');
      }
    }, 3000); // Auto-save after 3 seconds

    return () => clearTimeout(saveTimeout);
  }, [formData]);

  const saveFormData = async (status: 'in_progress' | 'completed') => {
    if (!user || !templateId || !formTemplate) return;
    
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

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getSubmissionStatusBadge = () => {
    if (!submission) return null;
    
    switch (submission.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      default:
        return null;
    }
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.id] || '';
    
    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-slate-700 font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        );
        
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-slate-700 font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        );
        
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-slate-700 font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 min-h-[100px]"
            />
          </div>
        );
        
      case 'dropdown':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-slate-700 font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(value) => handleFieldChange(field.id, value)}
              disabled={isReadOnly}
            >
              <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'boolean':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center space-x-3">
              <Switch
                id={field.id}
                checked={value === true || value === 'true'}
                onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor={field.id} className="text-slate-700 font-medium">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </Label>
            </div>
          </div>
        );

      case 'file':
      case 'image':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-slate-700 font-medium">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id={field.id}
              type="file"
              accept={field.type === 'image' ? 'image/*' : undefined}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFieldChange(field.id, file.name);
                }
              }}
              required={field.required}
              disabled={isReadOnly}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
            {value && (
              <p className="text-sm text-slate-600">Selected: {value}</p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-600 font-medium">Loading form...</p>
        </div>
      </div>
    );
  }

  const getButtonText = () => {
    if (submission?.status === 'completed') {
      return 'Update Submission';
    }
    return 'Submit Form';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            {/* User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
                {getSubmissionStatusBadge()}
              </div>
              
              <Avatar className="h-10 w-10 ring-2 ring-blue-500/20">
                <AvatarImage 
                  src={user?.user_metadata?.avatar_url} 
                  alt={user?.email || 'User'} 
                />
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{formTemplate?.name}</CardTitle>
                {submission?.status === 'completed' && (
                  <div className="flex items-center space-x-2 mt-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-blue-100">This form has been completed and can be edited</span>
                  </div>
                )}
              </div>
              
              {/* User Avatar in header */}
              <Avatar className="h-16 w-16 ring-4 ring-white/30">
                <AvatarImage 
                  src={user?.user_metadata?.avatar_url} 
                  alt={user?.email || 'User'} 
                />
                <AvatarFallback className="bg-white/20 text-white font-bold text-lg">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="space-y-6">
              {formTemplate?.fields && Array.isArray(formTemplate.fields) ? (
                formTemplate.fields.map((field: FormField) => (
                  <React.Fragment key={field.id}>
                    {renderFormField(field)}
                  </React.Fragment>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-600">No form fields found</p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between bg-slate-50 rounded-b-lg p-6">
            <Button 
              variant="outline" 
              onClick={() => saveFormData('in_progress')}
              disabled={saving || submitting}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Progress'}</span>
            </Button>
            
            <Button 
              onClick={handleSubmit}
              disabled={saving || submitting}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'Submitting...' : getButtonText()}</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DynamicForm;
