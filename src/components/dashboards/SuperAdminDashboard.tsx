
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import { PlusCircle, Users, FileText, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubmissionsTable from '@/components/submissions/SubmissionsTable';

type SuperAdminDashboardProps = {
  formTemplates: Tables<'form_templates'>[];
};

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ formTemplates }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      // Fetch all submissions with notes
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
        .order('last_updated', { ascending: false });
        
      if (submissionsError) throw submissionsError;
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error fetching super admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_notes'
      }, () => {
        fetchSuperAdminData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, []);

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
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Forms</p>
                <p className="text-3xl font-bold">{formTemplates.length}</p>
              </div>
              <FileText className="h-12 w-12 text-blue-200" />
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
                <p className="text-purple-100">Total Admins</p>
                <p className="text-3xl font-bold">{admins.length}</p>
              </div>
              <Settings className="h-12 w-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Total Users</p>
                <p className="text-3xl font-bold">{users.filter(user => user.role === 'user').length}</p>
              </div>
              <Users className="h-12 w-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Form Templates
            </CardTitle>
            <Button asChild>
              <Link to="/form-builder">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Form
              </Link>
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formTemplates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{template.name}</h3>
                  {template.is_predefined && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800">
                      Predefined
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Fields: {Array.isArray(template.fields) ? template.fields.length : 'N/A'}<br />
                  Created: {new Date(template.created_at).toLocaleDateString()}
                </p>
                <div className="flex space-x-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to={`/form/${template.id}`}>Preview</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1">
                    <Link to={`/form-builder/${template.id}`}>Edit</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admin-User Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Admin-User Assignments
            </CardTitle>
            <Button asChild size="sm">
              <Link to="/admin-assignments">Manage Assignments</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium mb-2">System Overview</h4>
              <p className="text-sm text-muted-foreground">
                Admins: <span className="font-medium">{admins.length}</span><br />
                Users: <span className="font-medium">{users.filter(user => user.role === 'user').length}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <SubmissionsTable submissions={submissions} onRefresh={fetchSuperAdminData} />
    </div>
  );
};

export default SuperAdminDashboard;
