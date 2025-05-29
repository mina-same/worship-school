import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, MessageSquare, TrendingUp, Clock, Activity, CheckCircle } from 'lucide-react';
import SubmissionsTable from '@/components/submissions/SubmissionsTable';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    try {
      if (!user) return;

      // First, get all assignments for this admin
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('admin_assignments')
        .select('*, user:users(id, email)')
        .eq('admin_id', user.id);

      if (assignmentsError) throw assignmentsError;

      if (assignmentsData) {
        setAssignments(assignmentsData);
        
        // Get user IDs from assignments (these should be regular users only)
        const userIds = assignmentsData.map(assignment => assignment.user_id);
        
        if (userIds.length > 0) {
          // Fetch submissions only from assigned regular users (exclude admin/super_admin submissions)
          const { data: submissionsData, error: submissionsError } = await supabase
            .from('submissions')
            .select(`
              *,
              user:users!inner(email, role),
              form_template:form_templates(name, fields),
              admin_notes(
                id,
                note,
                created_at,
                admin:users(email)
              )
            `)
            .in('user_id', userIds)
            .eq('user.role', 'user')
            .order('last_updated', { ascending: false });

          if (submissionsError) throw submissionsError;
          setSubmissions(submissionsData || []);
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
        fetchAssignments();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_notes'
      }, () => {
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
      <div className="grid gap-6 md:grid-cols-3">
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
      </div>

      {/* Assigned Users */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              Assigned Users
            </CardTitle>
            <p className="text-slate-600">Students under your supervision</p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {assignments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                      {assignment.user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {assignment.user.email}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Assigned {new Date(assignment.created_at).toLocaleDateString()}
                      </p>
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No users assigned</h3>
              <p className="text-slate-600">You don't have any users assigned to you yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <SubmissionsTable submissions={submissions} onRefresh={fetchAssignments} />
    </div>
  );
};

export default AdminDashboard;
