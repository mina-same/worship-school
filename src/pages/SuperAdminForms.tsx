
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Plus, FileText, Calendar, User, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const SuperAdminForms: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const { data, error } = await supabase
          .from('form_templates')
          .select(`
            *,
            creator:users(email)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setForms(data || []);
      } catch (error) {
        console.error('Error fetching forms:', error);
        toast({
          title: "Error",
          description: "Failed to load forms",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const handleDeleteForm = async (formId: string, formName: string) => {
    if (!confirm(`Are you sure you want to delete the form "${formName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(formId);
      
      // Delete all submissions for this form first
      const { error: submissionsError } = await supabase
        .from('submissions')
        .delete()
        .eq('form_template_id', formId);

      if (submissionsError) throw submissionsError;

      // Delete the form template
      const { error: formError } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', formId);

      if (formError) throw formError;

      // Update local state
      setForms(forms.filter(form => form.id !== formId));
      
      toast({
        title: "Success",
        description: `Form "${formName}" has been deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-600 font-medium">Loading forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="mb-4 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
                  Form Templates Management
                </h1>
                <p className="text-slate-600 text-lg max-w-2xl">
                  View and edit existing form templates
                </p>
              </div>
              
              <Button 
                onClick={() => navigate('/form-builder')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Form
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Card key={form.id} className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-800 mb-2">
                        {form.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {form.is_predefined && (
                          <Badge variant="secondary" className="text-xs">
                            Predefined
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {form.fields?.length || 0} fields
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/form-builder/${form.id}`)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteForm(form.id, form.name)}
                        disabled={deleting === form.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      Created {new Date(form.created_at).toLocaleDateString()}
                    </div>
                    
                    {form.creator && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="h-4 w-4" />
                        By {form.creator.email}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FileText className="h-4 w-4" />
                      {form.fields?.filter((field: any) => field.sensitive).length || 0} sensitive fields
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {forms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 mb-2">No forms created yet</h3>
              <p className="text-slate-500 mb-6">Start by creating your first form template</p>
              <Button 
                onClick={() => navigate('/form-builder')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Form
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminForms;
