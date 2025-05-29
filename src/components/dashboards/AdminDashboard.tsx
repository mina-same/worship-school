
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, MessageSquare } from 'lucide-react';
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
        
        // Get user IDs from assignments
        const userIds = assignmentsData.map(assignment => assignment.user_id);
        
        if (userIds.length > 0) {
          // Then fetch all submissions for assigned users with notes
          const { data: submissionsData, error: submissionsError } = await supabase
            .from('submissions')
            .select(`
              *,
              user:users(email),
              form_template:form_templates(name, fields),
              admin_notes(
                id,
                note,
                created_at,
                admin:users(email)
              )
            `)
            .in('user_id', userIds)
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
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Assigned Users</p>
                <p className="text-3xl font-bold">{assignments.length}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Total Submissions</p>
                <p className="text-3xl font-bold">{submissions.length}</p>
              </div>
              <FileText className="h-12 w-12 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Total Notes</p>
                <p className="text-3xl font-bold">
                  {submissions.reduce((acc, sub) => acc + (sub.admin_notes?.length || 0), 0)}
                </p>
              </div>
              <MessageSquare className="h-12 w-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assigned Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium">
                      {assignment.user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium">{assignment.user.email}</h3>
                      <p className="text-sm text-muted-foreground">
                        Assigned: {new Date(assignment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No users assigned to you yet.
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
