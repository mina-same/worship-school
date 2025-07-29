import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
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
  Shield
} from 'lucide-react';

interface Submission {
  id: string;
  status: string;
  last_updated: string;
  form_data: any;
  user: {
    email: string;
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
  const { user, userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formFilter, setFormFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [newNote, setNewNote] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    const totalFields = submission.form_template.fields.length;
    const filledFields = Object.keys(submission.form_data).length;
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Submissions Management
          </CardTitle>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
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
                <SelectTrigger className="w-full sm:w-48">
                  <FileText className="h-4 w-4 mr-2" />
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
                  <SelectTrigger className="w-full sm:w-48">
                    <Shield className="h-4 w-4 mr-2" />
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
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                              {submission.user.email.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-medium">{submission.user.email}</span>
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
    </Card>
  );
};

export default SubmissionsTable;
