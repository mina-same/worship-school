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
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { FormField } from '@/types/form';
import { ArrowLeft, Save, Send, User, Mail, CheckCircle } from 'lucide-react';

const DynamicForm: React.FC = () => {
  const { templateId, submissionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Define proper types for form template and submission
  type FormTemplate = {
    id: string;
    name: string;
    description?: string;
    fields: FormField[];
    created_at?: string;
    updated_at?: string;
  };

  type Submission = {
    id: string;
    form_template_id: string;
    user_id: string;
    form_data: Record<string, unknown>;
    status: 'draft' | 'submitted' | 'completed' | 'rejected';
    created_at?: string;
    updated_at?: string;
    last_updated?: string;
  };

  const [formTemplate, setFormTemplate] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
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
        setFormTemplate({
          ...templateData,
          fields: Array.isArray(templateData.fields) ? templateData.fields as FormField[] : []
        });

        // If we have a submissionId, fetch the submission data
        if (submissionId) {
          const { data: submissionData, error: submissionError } = await supabase
            .from('submissions')
            .select('*')
            .eq('id', submissionId)
            .eq('user_id', user?.id) // Ensure user can only access their own submissions
            .single();

          if (submissionError) {
            console.error('Error fetching submission:', submissionError);
            toast({
              title: "Error",
              description: "Cannot access this submission",
              variant: "destructive"
            });
            navigate('/dashboard');
            return;
          }
          
          setSubmission({
            ...submissionData,
            form_data: submissionData.form_data as Record<string, unknown>,
            status: submissionData.status as 'draft' | 'submitted' | 'completed' | 'rejected'
          });
          
          // Set form data from submission
          if (submissionData.form_data && typeof submissionData.form_data === 'object') {
            setFormData(submissionData.form_data as Record<string, unknown>);
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
            .maybeSingle();

          if (existingError) {
            console.error('Error checking existing submission:', existingError);
          } else if (existingSubmission) {
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
        await saveFormData('draft');
      }
    }, 3000); // Auto-save after 3 seconds

    return () => clearTimeout(saveTimeout);
  }, [formData]);

  const saveFormData = async (status: 'draft' | 'submitted' | 'completed' | 'rejected') => {
    if (!user || !templateId || !formTemplate) return;
    
    try {
      setSaving(true);
      
      // If we already have a submission, update it
      if (submission) {
        const { error } = await supabase
          .from('submissions')
          .update({
            form_data: formData as any,
            status: status,
            last_updated: new Date().toISOString(),
          })
          .eq('id', submission.id)
          .eq('user_id', user.id); // Ensure user can only update their own submissions

        if (error) throw error;
      } 
      // Otherwise create a new submission
      else {
        const { data, error } = await supabase
          .from('submissions')
          .insert({
            user_id: user.id,
            form_template_id: templateId,
            form_data: formData as any,
            status: status,
            last_updated: new Date().toISOString(),
          })
          .select();

        if (error) throw error;
        
        if (data && data[0]) {
          setSubmission({
            ...data[0],
            form_data: data[0].form_data as Record<string, unknown>,
            status: data[0].status as 'draft' | 'submitted' | 'completed' | 'rejected'
          });
          // Update URL to include submission ID for future navigation
          if (status === 'draft') {
            navigate(`/form/${templateId}/${data[0].id}`, { replace: true });
          }
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

  const handleFieldChange = (fieldId: string, value: unknown) => {
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

  // Function to parse markdown-style bold text (*text*) and bolder text (**text**) and return JSX
  const parseFieldLabel = (label: string, required: boolean) => {
    // First handle double asterisks (**text**), then single asterisks (*text*)
    const parts = label.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            // Remove double asterisks and make bolder (font-black)
            const bolderText = part.slice(2, -2);
            return <span key={index} className="font-black">{bolderText}</span>;
          } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            // Remove single asterisks and make bold
            const boldText = part.slice(1, -1);
            return <strong key={index}>{boldText}</strong>;
          }
          return part;
        })}
        {required && <span className="text-red-500">*</span>}
      </>
    );
  };

  const getSubmissionStatusBadge = () => {
    if (!submission) return null;
    
    switch (submission.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Draft</Badge>;
      default:
        return null;
    }
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.id] || '';
    
    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2" dir="rtl">
            <Label htmlFor={field.id} className="text-slate-700 font-medium whitespace-pre-wrap block text-right leading-relaxed" dir="rtl">
              {parseFieldLabel(field.label, field.required)}
            </Label>
            <Input
              id={field.id}
              placeholder={field.placeholder}
              value={String(value)}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-right"
              dir="rtl"
            />
          </div>
        );
        
      case 'number':
        return (
          <div key={field.id} className="space-y-2" dir="rtl">
            <Label htmlFor={field.id} className="text-slate-700 font-medium whitespace-pre-wrap block text-right leading-relaxed" dir="rtl">
              {parseFieldLabel(field.label, field.required)}
            </Label>
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              value={String(value)}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-right"
              dir="rtl"
            />
          </div>
        );
        
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2" dir="rtl">
            <Label htmlFor={field.id} className="text-slate-700 font-medium whitespace-pre-wrap block text-right leading-relaxed" dir="rtl">
              {parseFieldLabel(field.label, field.required)}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={String(value)}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              disabled={isReadOnly}
              className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 min-h-[100px] text-right"
              dir="rtl"
            />
          </div>
        );
        
      case 'dropdown':
        return (
          <div key={field.id} className="space-y-2" dir="rtl">
            <Label htmlFor={field.id} className="text-slate-700 font-medium whitespace-pre-wrap block text-right leading-relaxed" dir="rtl">
              {parseFieldLabel(field.label, field.required)}
            </Label>
            <Select
              value={String(value)}
              onValueChange={(value) => handleFieldChange(field.id, value)}
              disabled={isReadOnly}
            >
              <SelectTrigger className="border-slate-200 focus:border-blue-500 focus:ring-blue-500 text-right" dir="rtl">
                <SelectValue placeholder={field.placeholder || "اختر خياراً"} />
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
          <div key={field.id} className="space-y-2" dir="rtl">
            <div className="flex items-center gap-3" dir="rtl">
              <Checkbox
                id={field.id}
                checked={value === true || value === 'true'}
                onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
                disabled={isReadOnly}
              />
              <Label htmlFor={field.id} className="text-slate-700 font-medium whitespace-pre-wrap text-right leading-relaxed" dir="rtl">
                {parseFieldLabel(field.label, field.required)}
              </Label>
            </div>
          </div>
        );

      case 'file':
      case 'image':
        return (
          <div key={field.id} className="space-y-2" dir="rtl">
            <Label htmlFor={field.id} className="text-slate-700 font-medium whitespace-pre-wrap block text-right leading-relaxed" dir="rtl">
              {parseFieldLabel(field.label, field.required)}
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
              <p className="text-sm text-slate-600">Selected: {String(value)}</p>
            )}
          </div>
        );

      case 'header':
        const HeaderTag = `h${field.headerLevel || 2}` as keyof JSX.IntrinsicElements;
        const headerSizes = {
          1: 'text-4xl font-bold',
          2: 'text-3xl font-semibold',
          3: 'text-2xl font-semibold',
          4: 'text-xl font-medium',
          5: 'text-lg font-medium',
          6: 'text-base font-medium'
        };
        
        return (
          <div key={field.id} className="space-y-2 py-4">
            <HeaderTag className={`${headerSizes[field.headerLevel || 2]} text-slate-800 leading-tight whitespace-pre-wrap text-right`} dir="rtl">
              {field.label}
            </HeaderTag>
            {field.description && (
              <p className="text-slate-600 text-sm leading-relaxed text-right whitespace-pre-wrap" dir="rtl">
                {field.description}
              </p>
            )}
          </div>
        );

      case 'separator':
        return (
          <div key={field.id} className="py-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              {field.label && (
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-slate-500 font-medium whitespace-pre-wrap text-right" dir="rtl">
                    {field.label}
                  </span>
                </div>
              )}
            </div>
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
              onClick={() => saveFormData('draft')}
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
