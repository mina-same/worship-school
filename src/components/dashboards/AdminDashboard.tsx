
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAssignments = async () => {
      try {
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
            // Then fetch all submissions for assigned users
            const { data: submissionsData, error: submissionsError } = await supabase
              .from('submissions')
              .select(`
                *,
                user:users(email),
                form_template:form_templates(name)
              `)
              .in('user_id', userIds);

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

    fetchAssignments();

    // Set up real-time subscription for submissions
    const submissionsChannel = supabase
      .channel('admin-submissions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'submissions'
      }, (payload) => {
        console.log('Submissions change received:', payload);
        // Refresh submissions when a change is detected
        fetchAssignments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, [user]);

  if (loading) {
    return <div>Loading assignments...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Assigned Users</h2>
        <div className="mt-3 space-y-3">
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-lg border p-4"
              >
                <h3 className="font-medium">{assignment.user.email}</h3>
                <p className="text-sm text-muted-foreground">
                  Assigned on: {new Date(assignment.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No users assigned to you yet.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">User Submissions</h2>
        <div className="mt-3 space-y-3">
          {submissions.length > 0 ? (
            submissions.map((submission) => {
              const percentComplete = submission.form_data 
                ? Object.keys(submission.form_data).length / 
                  (submission.form_template.fields?.length || 1) * 100
                : 0;
              
              return (
                <div
                  key={submission.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{submission.form_template.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        User: {submission.user.email}<br />
                        Status: {submission.status}<br />
                        Progress: {Math.round(percentComplete)}%<br />
                        Last updated: {new Date(submission.last_updated).toLocaleString()}
                      </p>
                    </div>
                    <Button asChild variant="outline">
                      <Link to={`/admin/submission/${submission.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground">No submissions from assigned users yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
