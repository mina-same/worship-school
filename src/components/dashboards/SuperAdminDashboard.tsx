
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

type SuperAdminDashboardProps = {
  formTemplates: Tables<'form_templates'>[];
};

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ formTemplates }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuperAdminData = async () => {
      try {
        // Fetch all users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('role');
          
        if (usersError) throw usersError;
        setUsers(usersData || []);
        
        // Filter admins
        const adminsData = usersData?.filter(user => user.role === 'admin') || [];
        setAdmins(adminsData);
        
        // Fetch all submissions
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            *,
            user:users(email),
            form_template:form_templates(name)
          `)
          .order('last_updated', { ascending: false });
          
        if (submissionsError) throw submissionsError;
        setSubmissions(submissionsData || []);
      } catch (error) {
        console.error('Error fetching super admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuperAdminData();

    // Set up real-time subscription for submissions
    const submissionsChannel = supabase
      .channel('superadmin-submissions-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'submissions'
      }, () => {
        fetchSuperAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, []);

  if (loading) {
    return <div>Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Form Templates</h2>
          <Button asChild>
            <Link to="/form-builder">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Form
            </Link>
          </Button>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {formTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{template.name}</h3>
                {template.is_predefined && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800">
                    Predefined
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Fields: {Array.isArray(template.fields) ? template.fields.length : 'N/A'}<br />
                Created: {new Date(template.created_at).toLocaleDateString()}
              </p>
              <div className="mt-4 flex space-x-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/form/${template.id}`}>Preview</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to={`/form-builder/${template.id}`}>Edit</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium">Admin-User Assignments</h2>
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">Manage Assignments</h3>
            <Button asChild size="sm">
              <Link to="/admin-assignments">Manage Assignments</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Admins: {admins.length}<br />
            Users: {users.filter(user => user.role === 'user').length}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-medium">Recent Submissions</h2>
        <div className="space-y-3">
          {submissions.slice(0, 5).map((submission) => (
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
                    Last updated: {new Date(submission.last_updated).toLocaleString()}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/admin/submission/${submission.id}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </div>
          ))}
          {submissions.length > 5 && (
            <Button asChild variant="link" className="mt-2">
              <Link to="/all-submissions">View All Submissions</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
