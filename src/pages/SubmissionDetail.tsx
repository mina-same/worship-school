
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

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

  useEffect(() => {
    // Check if user is admin or super_admin
    if (userRole && userRole !== 'admin' && userRole !== 'super_admin') {
      navigate('/dashboard');
      return;
    }

    const fetchSubmissionData = async () => {
      try {
        if (!submissionId) return;

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
            <CardTitle>Submission Details</CardTitle>
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
                  
                  return (
                    <div key={field.id} className="mb-4">
                      <div className="text-sm font-medium">{field.label}</div>
                      <div>{value !== undefined && value !== '' ? value : 'Not provided'}</div>
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
