
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/components/ui/use-toast';
import { EyeOff, Lock, Download, FileText, Image as ImageIcon, Check, X } from 'lucide-react';

const SubmissionDetail: React.FC = () => {
  const { submissionId } = useParams();
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [submission, setSubmission] = useState<any>(null);
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminAccessLevel, setAdminAccessLevel] = useState<'full' | 'partial'>('partial');

  const [effectiveRole, setEffectiveRole] = useState<'user' | 'admin' | 'super_admin' | null>(null);
  const [roleResolving, setRoleResolving] = useState(true);

  const EVALUATION_PREFIX = 'EVALUATION_JSON:';

  type EvaluationState = {
    attendance: 'present' | 'absent' | '';
    homeworkCompleteness: 'كامل' | 'ناقص' | '';
    memorized: 'مكروت' | 'لا' | '';
    heard: 'سمع' | 'مسمعش' | '';
  };

  const [evaluation, setEvaluation] = useState<EvaluationState>({
    attendance: '',
    homeworkCompleteness: '',
    memorized: '',
    heard: ''
  });
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  useEffect(() => {
    let mounted = true;

    const resolveRole = async () => {
      if (authLoading) return;
      if (!user) {
        if (mounted) {
          setEffectiveRole(null);
          setRoleResolving(false);
        }
        return;
      }

      if (userRole === 'admin' || userRole === 'super_admin') {
        if (mounted) {
          setEffectiveRole(userRole);
          setRoleResolving(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        const dbRole = (data?.role as any) || userRole || 'user';
        if (mounted) {
          setEffectiveRole(dbRole);
          setRoleResolving(false);
        }
      } catch (e) {
        if (mounted) {
          setEffectiveRole(userRole || 'user');
          setRoleResolving(false);
        }
      }
    };

    resolveRole();

    return () => {
      mounted = false;
    };
  }, [authLoading, user, userRole]);

  useEffect(() => {
    if (roleResolving) return;

    if (effectiveRole && effectiveRole !== 'admin' && effectiveRole !== 'super_admin') {
      navigate('/dashboard');
      return;
    }

    const fetchSubmissionData = async () => {
      try {
        if (!submissionId || !user) return;

        // Get admin access level
        if (effectiveRole === 'admin') {
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

        const evaluationNote = (notesData || []).find((n: any) => {
          if (!n?.note || typeof n.note !== 'string') return false;
          if (!n.note.startsWith(EVALUATION_PREFIX)) return false;
          if (user?.id && n.admin_id && n.admin_id !== user.id) return false;
          return true;
        }) || (notesData || []).find((n: any) => typeof n?.note === 'string' && n.note.startsWith(EVALUATION_PREFIX));

        if (evaluationNote?.note && typeof evaluationNote.note === 'string') {
          try {
            const raw = evaluationNote.note.slice(EVALUATION_PREFIX.length);
            const parsed = JSON.parse(raw);
            setEvaluation({
              attendance: parsed.attendance || '',
              homeworkCompleteness: parsed.homeworkCompleteness || '',
              memorized: parsed.memorized || '',
              heard: parsed.heard || ''
            });
          } catch (e) {
            // ignore parse error
          }
        }
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
  }, [submissionId, user, effectiveRole, roleResolving, navigate]);


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

  const saveEvaluation = async () => {
    if (!user || !submissionId) return;

    if (!evaluation.attendance) {
      toast({
        title: "Missing Data",
        description: "اختر (حضر / محضرش)",
        variant: "destructive"
      });
      return;
    }

    if (evaluation.attendance === 'present') {
      if (!evaluation.homeworkCompleteness || !evaluation.memorized) {
        toast({
          title: "Missing Data",
          description: "كمّل اختيارات (الواجب كامل/ناقص) و (مكروت/لا)",
          variant: "destructive"
        });
        return;
      }
    }

    if (evaluation.attendance === 'absent') {
      if (!evaluation.heard || !evaluation.homeworkCompleteness || !evaluation.memorized) {
        toast({
          title: "Missing Data",
          description: "كمّل اختيارات (سمع/مسمعش) و (كامل/ناقص) و (مكروت/لا)",
          variant: "destructive"
        });
        return;
      }
    }

    setSavingEvaluation(true);
    try {
      const notePayload = `${EVALUATION_PREFIX}${JSON.stringify({
        attendance: evaluation.attendance,
        homeworkCompleteness: evaluation.homeworkCompleteness,
        memorized: evaluation.memorized,
        heard: evaluation.heard
      })}`;

      const { data: existing } = await supabase
        .from('admin_notes')
        .select('id, note, admin_id')
        .eq('submission_id', submissionId)
        .eq('admin_id', user.id)
        .ilike('note', `${EVALUATION_PREFIX}%`)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from('admin_notes')
          .update({ note: notePayload })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_notes')
          .insert({
            submission_id: submissionId,
            admin_id: user.id,
            note: notePayload,
          });
        if (error) throw error;
      }

      toast({
        title: "Saved",
        description: "تم حفظ التقييم بنجاح"
      });
    } catch (error) {
      console.error('Error saving evaluation:', error);
      toast({
        title: "Error",
        description: "Failed to save evaluation",
        variant: "destructive"
      });
    } finally {
      setSavingEvaluation(false);
    }
  };

  const canViewSensitiveField = (field: any) => {
    return userRole === 'super_admin' || adminAccessLevel === 'full' || !field.sensitive;
  };

  const isFileOrImage = (fieldType: string) => {
    return fieldType === 'file' || fieldType === 'image';
  };

  // Helper function to truncate long file names
  const truncateFileName = (fileName: string, maxLength: number = 30) => {
    if (fileName.length <= maxLength) return fileName;
    
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4) + '...';
    
    return `${truncatedName}.${extension}`;
  };

  // Helper function to check if file is an image
  const isImageFile = (fileName: string, fileType?: string) => {
    if (fileType) {
      return fileType.startsWith('image/');
    }
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico', '.heic', '.heif'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const getFileUrl = (fileName: string) => {
    // Get the public URL for the uploaded file from Supabase storage
    const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const renderFileOrImageField = (field: any, value: any) => {
    if (!value) return null;

    const isImage = field.type === 'image';
    
    // Handle array of files (multiple uploads)
    if (Array.isArray(value)) {
      return (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-medium text-slate-700">{value.length} file(s):</p>
          <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
            {value.map((file: any, index: number) => (
              <div key={file.id || index} className="p-3 bg-slate-50 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  {isImage ? (
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-sm font-medium truncate" title={file.fileName || file.name}>
                    {truncateFileName(file.fileName || file.name)}
                  </span>
                </div>
                
                {/* Always show image preview for image files */}
                {(isImage || isImageFile(file.fileName || file.name, file.fileType)) && (
                  <div className="mb-2">
                    <img 
                      src={file.publicUrl || file.previewUrl || file.base64Data || getFileUrl(file.fileName || file.name)}
                      alt={file.fileName || file.name}
                      className="max-w-full h-auto rounded border shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: '200px', display: 'block' }}
                      onClick={() => {
                        const imageUrl = file.publicUrl || file.previewUrl || file.base64Data || getFileUrl(file.fileName || file.name);
                        if (imageUrl) {
                          window.open(imageUrl, '_blank');
                        }
                      }}
                      onError={(e) => {
                        console.error('Image failed to load:', file.fileName || file.name);
                        // Hide the image if it fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className="flex gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fileUrl = file.publicUrl || file.previewUrl || file.base64Data || getFileUrl(file.fileName || file.name);
                      if (fileUrl) {
                        window.open(fileUrl, '_blank');
                      }
                    }}
                    className="flex items-center gap-1"
                  >
                    {isImage ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                    View
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const fileUrl = file.publicUrl || file.base64Data || getFileUrl(file.fileName || file.name);
                      const fileName = file.fileName || file.name;
                      
                      if (fileUrl) {
                        const a = document.createElement('a');
                        a.href = fileUrl;
                        a.download = fileName;
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
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
            ))}
          </div>
        </div>
      );
    }
    
    // Handle single file object (new format with publicUrl or base64)
    if (typeof value === 'object' && (value.fileName || value.name)) {
      const fileName = value.fileName || value.name;
      const fileUrl = value.publicUrl || value.previewUrl || value.base64Data || getFileUrl(fileName);
      
      return (
        <div className="mt-2 p-3 bg-slate-50 rounded border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isImage ? (
                <ImageIcon className="h-4 w-4 text-blue-500" />
              ) : (
                <FileText className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm font-medium" title={fileName}>
                {truncateFileName(fileName)}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (fileUrl) {
                    window.open(fileUrl, '_blank');
                  }
                }}
                className="flex items-center gap-1"
              >
                {isImage ? <ImageIcon className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                View
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (fileUrl) {
                    const a = document.createElement('a');
                    a.href = fileUrl;
                    a.download = fileName;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
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
          
          {/* Show image preview for image files */}
          {(isImage || isImageFile(fileName, value.fileType)) && fileUrl && (
            <img 
              src={fileUrl}
              alt={fileName}
              className="max-w-full h-auto rounded border cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '200px' }}
              onClick={() => window.open(fileUrl, '_blank')}
              onError={(e) => {
                console.error('Image failed to load:', fileName);
                // Hide the image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
      );
    }
    
    // Handle old string format (legacy)
    const fileName = typeof value === 'string' ? value : 'Unknown file';
    const fileUrl = getFileUrl(fileName);

    return (
      <div className="mt-2 p-3 bg-slate-50 rounded border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isImage ? (
              <ImageIcon className="h-4 w-4 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-sm font-medium" title={fileName}>
              {truncateFileName(fileName)}
            </span>
          </div>
          
          <div className="flex gap-2">
            {isImage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(fileUrl, '_blank');
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
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = fileName;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
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
        
        {/* Show image preview for image files */}
        {(isImage || isImageFile(fileName)) && (
          <div className="mt-2">
            <img 
              src={fileUrl}
              alt={fileName}
              className="max-w-full h-auto rounded border cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '300px' }}
              onClick={() => window.open(fileUrl, '_blank')}
              onError={(e) => {
                console.error('Image failed to load:', fileName);
                // Hide the image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    );
  };

  const renderValue = (value: any, fieldType?: string) => {
    // Handle boolean values with icons
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">نعم</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-600" />
              <span className="text-red-600 font-medium">لا</span>
            </>
          )}
        </div>
      );
    }
    
    // Handle string representations of booleans
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === 'نعم') {
        return (
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-600 font-medium">نعم</span>
          </div>
        );
      }
      if (lowerValue === 'false' || lowerValue === 'no' || lowerValue === 'لا') {
        return (
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-red-600" />
            <span className="text-red-600 font-medium">لا</span>
          </div>
        );
      }
    }
    
    // Default: return the value as-is with RTL support
    return <span className="whitespace-pre-wrap" dir="rtl">{value}</span>;
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
                  
                  // Handle header fields differently
                  if (field.type === 'header') {
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
                      <div key={field.id} className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Header
                          </Badge>
                        </div>
                        <HeaderTag className={`${headerSizes[field.headerLevel || 2]} text-slate-800 leading-tight whitespace-pre-wrap text-right`} dir="rtl">
                          {field.label}
                        </HeaderTag>
                        {field.description && (
                          <p className="text-slate-600 text-sm leading-relaxed text-right whitespace-pre-wrap mt-2" dir="rtl">
                            {field.description}
                          </p>
                        )}
                      </div>
                    );
                  }
                  
                  // Handle separator fields differently
                  if (field.type === 'separator') {
                    return (
                      <div key={field.id} className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                            Separator
                          </Badge>
                        </div>
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
                  }
                  
                  // Handle regular input fields
                  return (
                    <div key={field.id} className="mb-4">
                      <div className="flex items-center justify-end gap-2 mb-2">
                        {field.sensitive && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Sensitive
                          </Badge>
                        )}
                        <div className="text-sm font-medium text-right" dir="rtl">{field.label}</div>
                      </div>
                      
                      {/* Show answer based on permissions */}
                      {hasAnswer ? (
                        canView ? (
                          <div className="p-2 bg-slate-50 rounded border text-right" dir="rtl">
                            <div className="text-sm font-medium mb-2">إجابة:</div>
                            {isFileOrImage(field.type) ? (
                              <div>
                                <div className="text-sm mb-2">
                                  {typeof value === 'object' && value.fileName ? value.fileName : String(value)}
                                </div>
                                {renderFileOrImageField(field, value)}
                              </div>
                            ) : (
                              <div>
                                {renderValue(value, field.type)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-50 rounded border">
                            <div className="flex items-center gap-2 text-slate-500 italic text-right" dir="rtl">
                              <Lock className="h-4 w-4" />
                              <span className="text-sm">تم تقديم إجابة - المحتوى مقيد بسبب صلاحيات الوصول المحدودة</span>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="p-2 bg-slate-50 rounded border text-slate-500 text-sm text-right" dir="rtl">
                          لم يتم تقديم إجابة
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

        <Card className="mb-6 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center justify-between gap-4">
              <CardTitle dir="rtl" className="text-right text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                التقييم
              </CardTitle>
              <div className="flex items-center gap-2" dir="rtl">
                <Badge variant="outline" className="bg-slate-50">
                  {evaluation.attendance === 'present' ? 'حضر' : evaluation.attendance === 'absent' ? 'محضرش' : 'غير محدد'}
                </Badge>
                {evaluation.attendance && (
                  <Badge className="bg-indigo-600 hover:bg-indigo-600">
                    {evaluation.attendance === 'present'
                      ? `${evaluation.homeworkCompleteness || '...'} / ${evaluation.memorized || '...'}`
                      : `${evaluation.heard || '...'} / ${evaluation.homeworkCompleteness || '...'} / ${evaluation.memorized || '...'}`
                    }
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6" dir="rtl">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <Label className="text-right block text-sm sm:text-base font-semibold text-slate-800">حضر / محضرش</Label>
                <span className="text-xs text-slate-500">اختيار إلزامي</span>
              </div>

              <RadioGroup
                value={evaluation.attendance}
                onValueChange={(v) => {
                  const attendance = v as EvaluationState['attendance'];
                  setEvaluation(prev => ({
                    ...prev,
                    attendance,
                    heard: attendance === 'absent' ? prev.heard : '',
                    homeworkCompleteness: '',
                    memorized: ''
                  }));
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="relative">
                  <RadioGroupItem value="present" id="attendance-present" className="peer sr-only" />
                  <Label
                    htmlFor="attendance-present"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-indigo-50"
                  >
                    <span className="font-semibold text-slate-800">حضر</span>
                    <span className="text-xs text-slate-500">الحضور تم</span>
                  </Label>
                </div>

                <div className="relative">
                  <RadioGroupItem value="absent" id="attendance-absent" className="peer sr-only" />
                  <Label
                    htmlFor="attendance-absent"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-rose-300 hover:bg-rose-50/40 transition-colors peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-rose-50"
                  >
                    <span className="font-semibold text-slate-800">محضرش</span>
                    <span className="text-xs text-slate-500">غياب</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {evaluation.attendance === 'present' && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">لو حضر</div>
                  <Badge className="bg-indigo-600 hover:bg-indigo-600">حالة الحضور</Badge>
                </div>

                <div className="space-y-3">
                  <Label className="text-right block text-sm font-semibold text-slate-800">الواجب (كامل / ناقص)</Label>
                  <RadioGroup
                    value={evaluation.homeworkCompleteness}
                    onValueChange={(v) => setEvaluation(prev => ({ ...prev, homeworkCompleteness: v as any }))}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div className="relative">
                      <RadioGroupItem value="كامل" id="present-homework-full" className="peer sr-only" />
                      <Label htmlFor="present-homework-full" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-indigo-300 hover:bg-white transition-colors peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">كامل</span>
                        <span className="text-xs text-slate-500">مكتمل</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="ناقص" id="present-homework-partial" className="peer sr-only" />
                      <Label htmlFor="present-homework-partial" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-indigo-300 hover:bg-white transition-colors peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">ناقص</span>
                        <span className="text-xs text-slate-500">غير مكتمل</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-right block text-sm font-semibold text-slate-800">مكروت (مكروت / لا)</Label>
                  <RadioGroup
                    value={evaluation.memorized}
                    onValueChange={(v) => setEvaluation(prev => ({ ...prev, memorized: v as any }))}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div className="relative">
                      <RadioGroupItem value="مكروت" id="present-memorized-yes" className="peer sr-only" />
                      <Label htmlFor="present-memorized-yes" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-indigo-300 hover:bg-white transition-colors peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">مكروت</span>
                        <span className="text-xs text-slate-500">تم</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="لا" id="present-memorized-no" className="peer sr-only" />
                      <Label htmlFor="present-memorized-no" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-indigo-300 hover:bg-white transition-colors peer-data-[state=checked]:border-indigo-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">لا</span>
                        <span className="text-xs text-slate-500">لم يتم</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {evaluation.attendance === 'absent' && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 sm:p-5 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">لو محضرش</div>
                  <Badge className="bg-rose-600 hover:bg-rose-600">حالة الغياب</Badge>
                </div>

                <div className="space-y-3">
                  <Label className="text-right block text-sm font-semibold text-slate-800">سمع (سمع / مسمعش)</Label>
                  <RadioGroup
                    value={evaluation.heard}
                    onValueChange={(v) => setEvaluation(prev => ({ ...prev, heard: v as any }))}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div className="relative">
                      <RadioGroupItem value="سمع" id="absent-heard-yes" className="peer sr-only" />
                      <Label htmlFor="absent-heard-yes" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-rose-300 hover:bg-white transition-colors peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">سمع</span>
                        <span className="text-xs text-slate-500">استمع</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="مسمعش" id="absent-heard-no" className="peer sr-only" />
                      <Label htmlFor="absent-heard-no" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-rose-300 hover:bg-white transition-colors peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">مسمعش</span>
                        <span className="text-xs text-slate-500">لم يستمع</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-right block text-sm font-semibold text-slate-800">الواجب (كامل / ناقص)</Label>
                  <RadioGroup
                    value={evaluation.homeworkCompleteness}
                    onValueChange={(v) => setEvaluation(prev => ({ ...prev, homeworkCompleteness: v as any }))}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div className="relative">
                      <RadioGroupItem value="كامل" id="absent-homework-full" className="peer sr-only" />
                      <Label htmlFor="absent-homework-full" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-rose-300 hover:bg-white transition-colors peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">كامل</span>
                        <span className="text-xs text-slate-500">مكتمل</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="ناقص" id="absent-homework-partial" className="peer sr-only" />
                      <Label htmlFor="absent-homework-partial" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-rose-300 hover:bg-white transition-colors peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">ناقص</span>
                        <span className="text-xs text-slate-500">غير مكتمل</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-right block text-sm font-semibold text-slate-800">مكروت (مكروت / لا)</Label>
                  <RadioGroup
                    value={evaluation.memorized}
                    onValueChange={(v) => setEvaluation(prev => ({ ...prev, memorized: v as any }))}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div className="relative">
                      <RadioGroupItem value="مكروت" id="absent-memorized-yes" className="peer sr-only" />
                      <Label htmlFor="absent-memorized-yes" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-rose-300 hover:bg-white transition-colors peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">مكروت</span>
                        <span className="text-xs text-slate-500">تم</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem value="لا" id="absent-memorized-no" className="peer sr-only" />
                      <Label htmlFor="absent-memorized-no" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer hover:border-rose-300 hover:bg-white transition-colors peer-data-[state=checked]:border-rose-500 peer-data-[state=checked]:bg-white">
                        <span className="font-semibold">لا</span>
                        <span className="text-xs text-slate-500">لم يتم</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={saveEvaluation}
                disabled={savingEvaluation}
                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg"
              >
                {savingEvaluation ? '...جاري الحفظ' : 'حفظ التقييم'}
              </Button>
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
