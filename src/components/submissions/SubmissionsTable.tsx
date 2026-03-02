import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { 
  Eye, 
  Filter, 
  Search, 
  Calendar, 
  User, 
  FileText, 
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Shield,
  Download,
  Package
} from 'lucide-react';

interface Submission {
  id: string;
  status: string;
  last_updated: string;
  form_data: any;
  user: {
    email: string;
    display_name?: string;
  };
  form_template: {
    name: string;
    fields?: any[];
  };
  admin_notes?: Array<{
    id: string;
    note: string;
    created_at: string;
    admin: {
      email: string;
    };
  }>;
}

interface Admin {
  id: string;
  email: string;
}

interface SubmissionsTableProps {
  submissions: Submission[];
  admins?: Admin[];
  onRefresh: () => void;
}

const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ submissions, admins = [], onRefresh }) => {
  const { user, userRole, userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formFilter, setFormFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [newNote, setNewNote] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exportFormFilter, setExportFormFilter] = useState('all');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, {display_name?: string, avatar_url?: string}>>(new Map());

  const sanitizeExcelFileName = (name: string) => {
    const sanitized = name.replace(/[<>:"/\\|?*]/g, '').trim();
    return sanitized.length > 0 ? sanitized : 'export';
  };

  const buildExcelRowData = (submission: Submission, index: number) => {
    const progress = calculateProgress(submission);
    const notesCount = submission.admin_notes?.length || 0;

    const userProfileFromMap = userProfiles.get(submission.user.email);
    const rowData: any = {
      'Row #': index + 1,
      'User Name': userProfileFromMap?.display_name || submission.user.display_name || 'N/A',
      'User Email': submission.user.email,
      'Form Name': submission.form_template.name,
      'Status': submission.status.replace('_', ' ').toUpperCase(),
      'Progress (%)': progress,
      'Last Updated': submission.last_updated ? new Date(submission.last_updated).toLocaleDateString() : '',
      'Notes Count': notesCount,
    };

    if (submission.form_template.fields && submission.form_data) {
      submission.form_template.fields.forEach((field: any) => {
        if (field.type === 'header' || field.type === 'separator') {
          return;
        }

        const questionText = field.label || field.id || 'Unknown Field';
        let fieldValue = submission.form_data[field.id];

        if (field.type === 'boolean') {
          fieldValue = fieldValue === true ? 'Yes' : fieldValue === false ? 'No' : '';
        } else if (field.type === 'file' || field.type === 'image') {
          if (fieldValue && typeof fieldValue === 'object' && fieldValue.name) {
            fieldValue = `File: ${fieldValue.name}`;
          } else if (fieldValue && typeof fieldValue === 'string') {
            fieldValue = `File: ${fieldValue}`;
          } else {
            fieldValue = '';
          }
        } else if (field.type === 'dropdown' && Array.isArray(field.options)) {
          const selectedOption = field.options.find((opt: any) => opt.value === fieldValue);
          fieldValue = selectedOption ? selectedOption.label : fieldValue || '';
        } else if (fieldValue === null || fieldValue === undefined) {
          fieldValue = '';
        }

        rowData[questionText] = fieldValue;
      });
    }

    if (submission.admin_notes && submission.admin_notes.length > 0) {
      const notesText = submission.admin_notes
        .map(note => `${note.admin.email}: ${note.note}`)
        .join('\n');
      rowData['Admin Notes'] = notesText;
    } else {
      rowData['Admin Notes'] = '';
    }

    return rowData;
  };

  // Fetch user profiles for avatars
  React.useEffect(() => {
    const fetchUserProfiles = async () => {
      const uniqueUserEmails = [...new Set(submissions.map(s => s.user.email))];
      if (uniqueUserEmails.length === 0) return;

      try {
        const { data } = await supabase
          .from('users')
          .select('email, display_name, avatar_url')
          .in('email', uniqueUserEmails);

        if (data) {
          const profileMap = new Map();
          data.forEach(profile => {
            profileMap.set(profile.email, {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url
            });
          });
          setUserProfiles(profileMap);
        }
      } catch (error) {
        console.error('Error fetching user profiles:', error);
      }
    };

    fetchUserProfiles();
  }, [submissions]);

  // Get unique form names for filter
  const formNames = useMemo(() => {
    const names = [...new Set(submissions.map(s => s.form_template.name))];
    return names.sort();
  }, [submissions]);

  // Get admin assignments for filtering
  const [adminAssignments, setAdminAssignments] = useState<any[]>([]);

  React.useEffect(() => {
    if (userRole === 'super_admin' && admins.length > 0) {
      const fetchAdminAssignments = async () => {
        try {
          const { data } = await supabase
            .from('admin_assignments')
            .select(`
              admin_id,
              user_id,
              user:users!admin_assignments_user_id_fkey(email)
            `);
          setAdminAssignments(data || []);
        } catch (error) {
          console.error('Error fetching admin assignments:', error);
        }
      };
      fetchAdminAssignments();
    }
  }, [userRole, admins]);

  // Filter submissions based on admin assignment
  const getSubmissionsForAdmin = (adminId: string) => {
    const assignedUserIds = adminAssignments
      .filter(assignment => assignment.admin_id === adminId)
      .map(assignment => assignment.user_id);
    
    return submissions.filter(submission => {
      // Find user ID by email (since submission has user email)
      const userEmail = submission.user.email;
      const matchingAssignment = adminAssignments.find(
        assignment => assignment.user?.email === userEmail
      );
      return matchingAssignment && assignedUserIds.includes(matchingAssignment.user_id);
    });
  };

  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    let filteredData = submissions;

    // Filter by admin assignment if super admin and admin filter is selected
    if (userRole === 'super_admin' && adminFilter !== 'all') {
      filteredData = getSubmissionsForAdmin(adminFilter);
    }

    return filteredData.filter(submission => {
      const matchesSearch = 
        submission.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.form_template.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
      const matchesForm = formFilter === 'all' || submission.form_template.name === formFilter;
      
      return matchesSearch && matchesStatus && matchesForm;
    });
  }, [submissions, searchTerm, statusFilter, formFilter, adminFilter, userRole, adminAssignments]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'bg-green-500' },
      in_progress: { variant: 'secondary' as const, icon: Clock, color: 'bg-yellow-500' },
      submitted: { variant: 'default' as const, icon: CheckCircle, color: 'bg-blue-500' },
      pending: { variant: 'outline' as const, icon: AlertCircle, color: 'bg-orange-500' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'bg-red-500' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const calculateProgress = (submission: Submission) => {
    if (!submission.form_template.fields || !submission.form_data) return 0;
    
    // Filter out header and separator fields as they don't require answers
    const answerableFields = submission.form_template.fields.filter(
      field => field.type !== 'header' && field.type !== 'separator'
    );
    
    const totalFields = answerableFields.length;
    if (totalFields === 0) return 100; // If no answerable fields, consider it complete
    
    // Count only filled fields that correspond to answerable fields
    const filledFields = answerableFields.filter(
      field => submission.form_data[field.id] !== undefined && 
               submission.form_data[field.id] !== '' &&
               submission.form_data[field.id] !== null
    ).length;
    
    return Math.round((filledFields / totalFields) * 100);
  };

  const addNote = async (submissionId: string) => {
    if (!user || !newNote.trim()) return;
    
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
      setSelectedSubmission(null);
      onRefresh();
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

  const exportAllFormsToExcel = async () => {
    setDownloading(true);
    
    try {
      const { data: allSubmissions, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          user:users!inner(email, display_name, role),
          form_template:form_templates(name, fields),
          admin_notes(
            id,
            note,
            created_at,
            admin:users(email)
          )
        `)
        .eq('user.role', 'user')
        .order('last_updated', { ascending: false });

      if (submissionsError) throw submissionsError;

      const submissionsForExport = (allSubmissions || []) as Submission[];
      const uniqueForms = [...new Set(submissionsForExport.map(s => s.form_template.name))];

      if (uniqueForms.length === 0) {
        toast({
          title: "No Data",
          description: "No submissions found to export",
          variant: "destructive"
        });
        return;
      }

      for (const formName of uniqueForms) {
        const formSubmissions = submissionsForExport.filter(s => s.form_template.name === formName);
        const excelData = formSubmissions.map((submission, index) => buildExcelRowData(submission, index));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Submissions');

        const colWidths = Object.keys(excelData[0] || {}).map(() => ({ wch: 25 }));
        ws['!cols'] = colWidths;

        const filename = `${sanitizeExcelFileName(formName)}.xlsx`;

        XLSX.writeFile(wb, filename);

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "Success",
        description: `Exported ${uniqueForms.length} forms to separate Excel files`,
      });
    } catch (error) {
      console.error('Error downloading Excel files:', error);
      toast({
        title: "Error",
        description: "Failed to export Excel files",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  const downloadExcel = async () => {
    if (downloading) return;
    
    setDownloading(true);
    
    try {
      // Filter submissions for export based on selected form
      const submissionsToExport = exportFormFilter === 'all' 
        ? filteredSubmissions 
        : filteredSubmissions.filter(s => s.form_template.name === exportFormFilter);
      
      if (submissionsToExport.length === 0) {
        toast({
          title: "No Data",
          description: "No submissions found for the selected form",
          variant: "destructive"
        });
        setDownloading(false);
        return;
      }
      
      // Prepare data for Excel
      const excelData = submissionsToExport.map((submission, index) => {
        const progress = calculateProgress(submission);
        const notesCount = submission.admin_notes?.length || 0;
        
        // Basic submission info
        const userProfile = userProfiles.get(submission.user.email);
        const rowData: any = {
          'Row #': index + 1,
          'User Name': userProfile?.display_name || submission.user.display_name || 'N/A',
          'User Email': submission.user.email,
          'Form Name': submission.form_template.name,
          'Status': submission.status.replace('_', ' ').toUpperCase(),
          'Progress (%)': progress,
          'Last Updated': new Date(submission.last_updated).toLocaleDateString(),
          'Notes Count': notesCount,
        };

        // Add form field data with question labels as headers
        if (submission.form_template.fields && submission.form_data) {
          submission.form_template.fields.forEach((field: any) => {
            // Skip headers and separators as they don't contain user data
            if (field.type === 'header' || field.type === 'separator') {
              return;
            }
            
            // Use the field label (question) as the column header
            const questionText = field.label || field.id || 'Unknown Field';
            let fieldValue = submission.form_data[field.id];
            
            // Handle different field types
            if (field.type === 'boolean') {
              fieldValue = fieldValue === true ? 'Yes' : fieldValue === false ? 'No' : '';
            } else if (field.type === 'file' || field.type === 'image') {
              if (fieldValue && typeof fieldValue === 'object' && fieldValue.name) {
                fieldValue = `File: ${fieldValue.name}`;
              } else if (fieldValue && typeof fieldValue === 'string') {
                fieldValue = `File: ${fieldValue}`;
              } else {
                fieldValue = '';
              }
            } else if (field.type === 'dropdown' && Array.isArray(field.options)) {
              const selectedOption = field.options.find((opt: any) => opt.value === fieldValue);
              fieldValue = selectedOption ? selectedOption.label : fieldValue || '';
            } else if (fieldValue === null || fieldValue === undefined) {
              fieldValue = '';
            }
            
            // Use the question text as the column header
            rowData[questionText] = fieldValue;
          });
        }

        // Add admin notes
        if (submission.admin_notes && submission.admin_notes.length > 0) {
          const notesText = submission.admin_notes
            .map(note => `${note.admin.email}: ${note.note}`)
            .join('\n');
          rowData['Admin Notes'] = notesText;
        } else {
          rowData['Admin Notes'] = '';
        }

        return rowData;
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Submissions');

      // Auto-size columns
      const colWidths = Object.keys(excelData[0] || {}).map(() => ({ wch: 25 }));
      ws['!cols'] = colWidths;

      // Generate filename with exact form name and timestamp
      const formName = exportFormFilter === 'all' 
        ? 'all-forms' 
        : exportFormFilter.replace(/[<>:"/\\|?*]/g, '').trim();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `${formName}-submissions-${timestamp}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      
      toast({
        title: "Success",
        description: `Downloaded ${submissionsToExport.length} submissions to ${filename}`,
      });
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast({
        title: "Error",
        description: "Failed to download Excel file",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="w-full border-0 shadow-xl bg-gradient-to-br from-white via-slate-50 to-blue-50/30">
      <CardHeader className="pb-6 border-b border-slate-100/50">
        {/* Mobile-First Header */}
        <div className="flex flex-col space-y-6">
          {/* Title Section - Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Submissions Management
                </CardTitle>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 hidden sm:block">
                  Manage and export form submissions efficiently
                </p>
              </div>
            </div>
          </div>
          
          {/* Search and Filters - Responsive */}
          <div className="flex flex-col space-y-3">
            {/* Search Bar - Full Width on Mobile */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full h-10 border-slate-200 focus:border-blue-400 focus:ring-blue-100"
              />
            </div>
            
            {/* Filters Row - Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-10 border-slate-200 hover:border-slate-300">
                  <Filter className="h-4 w-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger className="w-full h-10 border-slate-200 hover:border-slate-300">
                  <FileText className="h-4 w-4 mr-2 text-slate-500" />
                  <SelectValue placeholder="Form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {formNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {userRole === 'super_admin' && admins.length > 0 && (
                <Select value={adminFilter} onValueChange={setAdminFilter}>
                  <SelectTrigger className="w-full h-10 border-slate-200 hover:border-slate-300">
                    <Shield className="h-4 w-4 mr-2 text-slate-500" />
                    <SelectValue placeholder="Admin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Admins</SelectItem>
                    {admins.map(admin => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Export Buttons - Responsive */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowExportDialog(true)}
                  disabled={filteredSubmissions.length === 0}
                  className="flex-1 h-10 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm"
                >
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Download Excel</span>
                  <span className="sm:hidden">Excel</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Bar - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 pt-4 border-t border-slate-100/50">
          <div className="flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2 bg-blue-50 rounded-lg border border-blue-100">
            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-medium text-blue-700 block truncate">
                Total: {filteredSubmissions.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2 bg-green-50 rounded-lg border border-green-100">
            <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-medium text-green-700 block truncate">
                Completed: {filteredSubmissions.filter(s => s.status === 'completed').length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2 bg-amber-50 rounded-lg border border-amber-100">
            <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-medium text-amber-700 block truncate">
                In Progress: {filteredSubmissions.filter(s => s.status === 'in_progress').length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 py-2 sm:px-3 sm:py-2 bg-slate-50 rounded-lg border border-slate-200">
            <div className="h-2 w-2 rounded-full bg-slate-500 flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-medium text-slate-700 block truncate">
                Pending: {filteredSubmissions.filter(s => s.status === 'pending' || s.status === 'submitted').length}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-lg border bg-white">
          <ScrollArea className="h-[600px] w-full">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="font-semibold whitespace-nowrap">User</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Form</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Status</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Progress</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Last Updated</TableHead>
                    <TableHead className="font-semibold whitespace-nowrap">Notes</TableHead>
                    <TableHead className="font-semibold text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((submission) => {
                    const progress = calculateProgress(submission);
                    const notesCount = submission.admin_notes?.length || 0;
                    
                    return (
                      <TableRow key={submission.id} className="hover:bg-slate-50/50">
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-primary/20">
                              <AvatarImage 
                                src={userProfiles.get(submission.user.email)?.avatar_url} 
                                alt={userProfiles.get(submission.user.email)?.display_name || submission.user.email}
                                className="object-cover"
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                onError={(e) => {
                                  console.log('Avatar failed to load for', submission.user.email, ':', userProfiles.get(submission.user.email)?.avatar_url);
                                  // Force fallback to show
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                                onLoad={() => {
                                  console.log('Avatar loaded successfully for', submission.user.email);
                                }}
                              />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {userProfiles.get(submission.user.email)?.display_name 
                                  ? userProfiles.get(submission.user.email).display_name!.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                  : submission.user.email.substring(0, 2).toUpperCase()
                                }
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {userProfiles.get(submission.user.email)?.display_name || submission.user.display_name || 'Unknown User'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {submission.user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell className="whitespace-nowrap">
                          <div className="font-medium">{submission.form_template.name}</div>
                        </TableCell>
                        
                        <TableCell>
                          {getStatusBadge(submission.status)}
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{progress}%</span>
                          </div>
                        </TableCell>
                        
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(submission.last_updated).toLocaleDateString()}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {notesCount > 0 && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {notesCount}
                              </Badge>
                            )}
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-w-[95vw] w-full">
                                <DialogHeader>
                                  <DialogTitle>Notes for {submission.user.email}</DialogTitle>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                  {submission.admin_notes && submission.admin_notes.length > 0 && (
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                      {submission.admin_notes.map((note) => (
                                        <div key={note.id} className="p-3 bg-slate-50 rounded-lg">
                                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                                            <span className="text-sm font-medium">{note.admin.email}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(note.created_at).toLocaleString()}
                                            </span>
                                          </div>
                                          <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  <div className="space-y-2">
                                    <Textarea
                                      placeholder="Add a note..."
                                      value={selectedSubmission === submission.id ? newNote : ''}
                                      onChange={(e) => {
                                        setNewNote(e.target.value);
                                        setSelectedSubmission(submission.id);
                                      }}
                                    />
                                    <Button 
                                      onClick={() => addNote(submission.id)}
                                      disabled={!newNote.trim() || saving}
                                      className="w-full"
                                    >
                                      {saving ? 'Adding...' : 'Add Note'}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right whitespace-nowrap">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/admin/submission/${submission.id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
        
        {filteredSubmissions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No submissions found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || formFilter !== 'all' 
                ? 'Try adjusting your filters' 
                : 'No submissions have been created yet'}
            </p>
          </div>
        )}
      </CardContent>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle>Export Submissions to Excel</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Form to Export</Label>
              <Select value={exportFormFilter} onValueChange={setExportFormFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {formNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {exportFormFilter === 'all' 
                ? `This will export all ${filteredSubmissions.length} filtered submissions.`
                : `This will export ${filteredSubmissions.filter(s => s.form_template.name === exportFormFilter).length} submissions for "${exportFormFilter}".`
              }
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowExportDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={exportAllFormsToExcel}
                disabled={downloading || filteredSubmissions.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {downloading ? 'Exporting...' : 'Export All Forms'}
              </Button>
              <Button 
                onClick={downloadExcel}
                disabled={downloading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {downloading ? 'Exporting...' : 'Export Selected'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SubmissionsTable;
