import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, MessageSquare, TrendingUp, Clock, Activity, CheckCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import SubmissionsTable from '@/components/submissions/SubmissionsTable';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    try {
      if (!user) return;

      console.log('Fetching assignments for admin:', user.id);

      // First, get all assignments for this admin
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('admin_assignments')
        .select(`
          *,
          user:users!admin_assignments_user_id_fkey(id, email, role)
        `)
        .eq('admin_id', user.id);

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError);
        throw assignmentsError;
      }

      console.log('Assignments data:', assignmentsData);

      if (assignmentsData) {
        setAssignments(assignmentsData);
        
        // Get user IDs from assignments
        const userIds = assignmentsData.map(assignment => assignment.user_id);
        console.log('User IDs to fetch submissions for:', userIds);
        
        if (userIds.length > 0) {
          // Fetch submissions from assigned users
          const { data: submissionsData, error: submissionsError } = await supabase
            .from('submissions')
            .select(`
              *,
              user:users!submissions_user_id_fkey(email, role),
              form_template:form_templates!submissions_form_template_id_fkey(name, fields),
              admin_notes(
                id,
                note,
                created_at,
                admin:users!admin_notes_admin_id_fkey(email)
              )
            `)
            .in('user_id', userIds)
            .order('last_updated', { ascending: false });

          if (submissionsError) {
            console.error('Error fetching submissions:', submissionsError);
            throw submissionsError;
          }
          
          console.log('Submissions data:', submissionsData);
          setSubmissions(submissionsData || []);
        } else {
          console.log('No user assignments found');
          setSubmissions([]);
        }
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();

    // Set up real-time subscription for submissions
    const submissionsChannel = supabase
      .channel('admin-submissions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'submissions'
      }, () => {
        console.log('Submissions changed, refreshing data');
        fetchAssignments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_notes'
      }, () => {
        console.log('Admin notes changed, refreshing data');
        fetchAssignments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_assignments'
      }, () => {
        console.log('Admin assignments changed, refreshing data');
        fetchAssignments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const completedSubmissions = submissions.filter(s => s.status === 'completed').length;
  const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
  const totalNotes = submissions.reduce((acc, sub) => acc + (sub.admin_notes?.length || 0), 0);

  return (
    <div className="space-y-8">
      {/* Profile Settings Link */}
      <div className="flex justify-end">
        <Button asChild variant="outline" className="flex items-center gap-2">
          <Link to="/profile">
            <Settings className="h-4 w-4" />
            Profile Settings
          </Link>
        </Button>
      </div>
      {/* Enhanced Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-blue-100 text-sm font-medium">Assigned Users</p>
                <p className="text-3xl font-bold">{assignments.length}</p>
                <div className="flex items-center text-blue-100 text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Active assignments
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-green-100 text-sm font-medium">Total Submissions</p>
                <p className="text-3xl font-bold">{submissions.length}</p>
                <div className="flex items-center text-green-100 text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {completedSubmissions} completed
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-purple-100 text-sm font-medium">Admin Notes</p>
                <p className="text-3xl font-bold">{totalNotes}</p>
                <div className="flex items-center text-purple-100 text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Total feedback
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-800">
                  {submissions.length > 0 ? Math.round((completedSubmissions / submissions.length) * 100) : 0}%
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-slate-800">{pendingSubmissions}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold text-slate-800">{completedSubmissions}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">User Management</p>
                <Button 
                  onClick={() => navigate('/admin/user-management')}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Manage Users
                </Button>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Settings className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <SubmissionsTable submissions={submissions} onRefresh={fetchAssignments} />
    </div>
  );
};

export default AdminDashboard;
