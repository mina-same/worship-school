
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Clock } from 'lucide-react';

const AdminAssignedUsers: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssignments = async () => {
    try {
      if (!user) return;

      // Fetch assignments with user details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('admin_assignments')
        .select(`
          *,
          user:users!admin_assignments_user_id_fkey(id, email, role)
        `)
        .eq('admin_id', user.id);

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch submissions for assigned users
      if (assignmentsData && assignmentsData.length > 0) {
        const userIds = assignmentsData.map(assignment => assignment.user_id);
        
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select('*')
          .in('user_id', userIds);

        if (submissionsError) throw submissionsError;
        setSubmissions(submissionsData || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [user]);

  const getUserSubmissions = (userId: string) => {
    return submissions.filter(sub => sub.user_id === userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            Assigned Users ({assignments.length})
          </CardTitle>
          <p className="text-slate-600">Students under your supervision</p>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {assignments.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const userSubmissions = getUserSubmissions(assignment.user_id);
              const completedSubmissions = userSubmissions.filter(s => s.status === 'completed').length;
              const pendingSubmissions = userSubmissions.filter(s => s.status === 'pending').length;
              
              return (
                <div
                  key={assignment.id}
                  className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                      {assignment.user?.email?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                        {assignment.user?.email || 'Unknown User'}
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
                  
                  {/* Submission Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Total Submissions
                      </span>
                      <span className="font-medium">{userSubmissions.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Completed
                      </span>
                      <span className="font-medium">{completedSubmissions}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-yellow-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                      <span className="font-medium">{pendingSubmissions}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-16 w-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">No users assigned</h3>
            <p className="text-slate-600">Share your invite link above to get users assigned to you automatically.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAssignedUsers;
