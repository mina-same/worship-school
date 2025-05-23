
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

type UserDashboardProps = {
  formTemplates: Tables<'form_templates'>[];
};

const UserDashboard: React.FC<UserDashboardProps> = ({ formTemplates }) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSubmissions = async () => {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            *,
            form_template:form_templates(name)
          `)
          .eq('user_id', user.id);

        if (error) throw error;
        setSubmissions(data || []);
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [user]);

  if (loading) {
    return <div>Loading your forms...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Available Forms</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {formTemplates.map((template) => {
            // Check if user has already created a submission for this template
            const existingSubmission = submissions.find(
              (s) => s.form_template_id === template.id
            );

            return (
              <div
                key={template.id}
                className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
              >
                <h3 className="font-medium">{template.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {existingSubmission ? (
                    <>
                      Status: {existingSubmission.status}
                      <br />
                      Last updated: {new Date(existingSubmission.last_updated).toLocaleString()}
                    </>
                  ) : (
                    'Not started yet'
                  )}
                </p>
                <Button asChild className="mt-4 w-full">
                  <Link
                    to={`/form/${template.id}${
                      existingSubmission ? `/${existingSubmission.id}` : ''
                    }`}
                  >
                    {existingSubmission
                      ? existingSubmission.status === 'completed'
                        ? 'View Submission'
                        : 'Continue Form'
                      : 'Start Form'}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium">Your Submissions</h2>
        <div className="mt-3 space-y-3">
          {submissions.length > 0 ? (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <h3 className="font-medium">
                    {submission.form_template?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {submission.status}
                    <br />
                    Last updated: {new Date(submission.last_updated).toLocaleString()}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to={`/form/${submission.form_template_id}/${submission.id}`}>
                    {submission.status === 'completed' ? 'View' : 'Continue'}
                  </Link>
                </Button>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">No submissions yet. Start filling out a form!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
