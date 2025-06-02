
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
import { EyeOff, Lock, Download, FileText, Image as ImageIcon } from 'lucide-react';

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

  const isFileOrImage = (fieldType: string) => {
    return fieldType === 'file' || fieldType === 'image';
  };

  const renderFileOrImageField = (field: any, value: any) => {
    if (!value) return null;

    const isImage = field.type === 'image';
    const fileName = typeof value === 'string' ? value : value.name || 'Unknown file';

    return (
      <div className="mt-2 p-3 bg-slate-50 rounded border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isImage ? (
              <ImageIcon className="h-4 w-4 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm font-medium">{fileName}</span>
          </div>
          
          <div className="flex gap-2">
            {isImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Create a mock image URL for demonstration
                  const imageUrl = `https://via.placeholder.com/600x400?text=${encodeURIComponent(fileName)}`;
                  window.open(imageUrl, '_blank');
                }}
                className="flex items-center gap-1"
              >
                <ImageIcon className="h-3 w-3" />
                View
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isImage) {
                  // For images, create a canvas and download as image
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const img = new Image();
                  
                  img.crossOrigin = 'anonymous';
                  img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);
                    
                    canvas.toBlob((blob) => {
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName.includes('.') ? fileName : `${fileName}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }
                    }, 'image/png');
                  };
                  
                  img.onerror = () => {
                    // Fallback: download as text file with image info
                    const blob = new Blob([`Image file: ${fileName}\nNote: This is a placeholder. In a real application, this would be the actual image file.`], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${fileName.replace(/\.[^/.]+$/, "")}_info.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  };
                  
                  img.src = `https://via.placeholder.com/600x400?text=${encodeURIComponent(fileName)}`;
                } else {
                  // For other files, create a text file with file info
                  const blob = new Blob([`File: ${fileName}\nNote: This is a placeholder. In a real application, this would be the actual file content.`], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName.includes('.') ? fileName : `${fileName}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }
                
                toast({
                  title: "Download Started",
                  description: `Downloading ${fileName}`,
                });
              }}
              className="flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          </div>
        </div>
        
        {isImage && (
          <div className="mt-2">
            <img 
              src={`https://via.placeholder.com/300x200?text=${encodeURIComponent(fileName)}`}
              alt={fileName}
              className="max-w-full h-auto rounded border"
              style={{ maxHeight: '200px' }}
            />
          </div>
        )}
      </div>
    );
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
                  const hasAnswer = value !== undefined && value !== '';
                  
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
                      
                      {/* Always show the question */}
                      <div className="text-sm text-slate-600 mb-2">
                        Question: {field.label}
                      </div>
                      
                      {/* Show answer based on permissions */}
                      {hasAnswer ? (
                        canView ? (
                          <div className="p-2 bg-slate-50 rounded border">
                            <span className="text-sm font-medium">Answer: </span>
                            {isFileOrImage(field.type) ? (
                              <div>
                                <div className="text-sm mb-2">{value}</div>
                                {renderFileOrImageField(field, value)}
                              </div>
                            ) : (
                              value
                            )}
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-50 rounded border">
                            <div className="flex items-center gap-2 text-slate-500 italic">
                              <Lock className="h-4 w-4" />
                              <span className="text-sm">Answer provided - Content restricted due to limited access permissions</span>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="p-2 bg-slate-50 rounded border text-slate-500 text-sm">
                          No answer provided
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
