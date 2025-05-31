
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { EyeOff, Lock } from 'lucide-react';

const SubmissionDetail: React.FC = () => {
  const { submissionId } = useParams();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState<any>(null);
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminAccessLevel, setAdminAccessLevel] = useState<'full' | 'partial'>('partial');

  useEffect(() => {
    // Check if user is admin or super_admin
    if (userRole && userRole !== 'admin' && userRole !== 'super_admin') {
      navigate('/dashboard');
      return;
    }

    const fetchSubmissionData = async () => {
      try {
        if (!submissionId || !user) return;

        // Get admin access level
        if (userRole === 'admin') {
          const { data: adminData } = await supabase
            .from('users')
            .select('metadata')
            .eq('id', user.id)
            .single();
          
          if (adminData?.metadata && typeof adminData.metadata === 'object' && adminData.metadata !== null) {
            const metadata = adminData.metadata as { access_level?: string };
            if (metadata.access_level) {
              setAdminAccessLevel(metadata.access_level as 'full' | 'partial');
            }
          }
        } else {
          // Super admins have full access
          setAdminAccessLevel('full');
        }

        // Fetch the submission
        const { data: submissionData, error: submissionError } = await supabase
          .from('submissions')
          .select(`
            *,
            user:users(email),
            form_template:form_templates(*)
          `)
          .eq('id', submissionId)
          .single();

        if (submissionError) throw submissionError;
        
        setSubmission(submissionData);
        setFormTemplate(submissionData.form_template);

        // Fetch submission notes
        const { data: notesData, error: notesError } = await supabase
          .from('admin_notes')
          .select(`
            *,
            admin:users(email)
          `)
          .eq('submission_id', submissionId)
          .order('created_at', { ascending: false });

        if (notesError) throw notesError;
        setNotes(notesData || []);
      } catch (error) {
        console.error('Error fetching submission data:', error);
        toast({
          title: "Error",
          description: "Failed to load submission data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionData();

    // Set up real-time subscription for notes
    const notesChannel = supabase
      .channel('admin-notes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_notes',
          filter: `submission_id=eq.${submissionId}`
        },
        () => {
          fetchSubmissionData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notesChannel);
    };
  }, [submissionId, user, userRole, navigate]);

  const addNote = async () => {
    if (!user || !submissionId || !newNote.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_notes')
        .insert({
          submission_id: submissionId,
          admin_id: user.id,
          note: newNote.trim(),
        });

      if (error) throw error;
      
      setNewNote('');
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const canViewSensitiveField = (field: any) => {
    return userRole === 'super_admin' || adminAccessLevel === 'full' || !field.sensitive;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!submission || !formTemplate) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="p-8 text-center">
              Submission not found or you don't have access to view it.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-3xl">
        <Button variant="outline" className="mb-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
        
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Submission Details</CardTitle>
              {userRole === 'admin' && (
                <Badge variant={adminAccessLevel === 'full' ? 'default' : 'secondary'} className="flex items-center gap-1">
                  {adminAccessLevel === 'full' ? 'Full Access' : 'Partial Access'}
                  {adminAccessLevel === 'partial' && <EyeOff className="h-3 w-3" />}
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium">Form</div>
                <div>{formTemplate.name}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium">Submitted By</div>
                <div>{submission.user?.email}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium">Status</div>
                <div className="capitalize">{submission.status}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium">Last Updated</div>
                <div>{new Date(submission.last_updated).toLocaleString()}</div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="mb-4 font-medium">Form Responses</h3>
              
              {formTemplate.fields && Array.isArray(formTemplate.fields) ? (
                formTemplate.fields.map((field: any) => {
                  const value = submission.form_data?.[field.id];
                  const canView = canViewSensitiveField(field);
                  
                  return (
                    <div key={field.id} className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium">{field.label}</div>
                        {field.sensitive && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Sensitive
                          </Badge>
                        )}
                      </div>
                      
                      {canView ? (
                        <div className={`${field.sensitive && adminAccessLevel === 'partial' ? 'opacity-50' : ''}`}>
                          {value !== undefined && value !== '' ? value : 'Not provided'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-500 italic">
                          <Lock className="h-4 w-4" />
                          Question answered - Content restricted due to partial access
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>No form fields found</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Admin Notes</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="rounded-lg border p-4">
                  <div className="mb-2 text-sm text-muted-foreground">
                    {note.admin?.email} - {new Date(note.created_at).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap">{note.note}</div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No notes yet</p>
            )}
          </CardContent>
          
          <CardFooter>
            <div className="w-full space-y-4">
              <Textarea
                placeholder="Add a note about this submission..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button 
                onClick={addNote} 
                disabled={!newNote.trim() || saving}
                className="w-full"
              >
                {saving ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SubmissionDetail;
