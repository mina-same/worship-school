import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';
import { Link } from 'react-router-dom';
import { PlusCircle, Users, FileText, Settings, BarChart3, TrendingUp, Activity, Clock } from 'lucide-react';
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
      
      // Fetch submissions only from regular users (exclude admin/super_admin submissions)
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
        .eq('user.role', 'user')
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
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-blue-100 text-sm font-medium">Total Forms</p>
                <p className="text-3xl font-bold">{formTemplates.length}</p>
                <div className="flex items-center text-blue-100 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Active templates
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-emerald-100 text-sm font-medium">Total Submissions</p>
                <p className="text-3xl font-bold">{submissions.length}</p>
                <div className="flex items-center text-emerald-100 text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {completedSubmissions} completed
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-purple-100 text-sm font-medium">System Admins</p>
                <p className="text-3xl font-bold">{admins.length}</p>
                <div className="flex items-center text-purple-100 text-xs">
                  <Settings className="h-3 w-3 mr-1" />
                  Admin users
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-orange-100 text-sm font-medium">Active Users</p>
                <p className="text-3xl font-bold">{users.filter(user => user.role === 'user').length}</p>
                <div className="flex items-center text-orange-100 text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Regular users
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
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
                <p className="text-slate-600 text-sm font-medium">Admin Notes</p>
                <p className="text-2xl font-bold text-slate-800">{totalNotes}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Templates Section */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                Form Templates
              </CardTitle>
              <p className="text-slate-600">Manage and create form templates</p>
            </div>
            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              <Link to="/form-builder">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Form
              </Link>
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {formTemplates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {formTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    {template.is_predefined && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                        Predefined
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {template.name}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <span className="font-medium">{Array.isArray(template.fields) ? template.fields.length : 'N/A'}</span>
                      <span className="ml-1">fields</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button asChild variant="outline" size="sm" className="flex-1 text-xs">
                      <Link to={`/form/${template.id}`}>Preview</Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1 text-xs bg-slate-800 hover:bg-slate-900">
                      <Link to={`/form-builder/${template.id}`}>Edit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-16 w-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-2">No forms yet</h3>
              <p className="text-slate-600 mb-4">Create your first form template to get started.</p>
              <Button asChild>
                <Link to="/form-builder">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Form
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin-User Assignments */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
                User Management
              </CardTitle>
              <p className="text-slate-600">Manage admin-user assignments</p>
            </div>
            <Button asChild variant="outline" className="border-slate-300 hover:bg-slate-50">
              <Link to="/admin-assignments">Manage Assignments</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800">System Overview</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <span className="text-slate-600">Total Admins</span>
                  <span className="font-semibold text-slate-800">{admins.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <span className="text-slate-600">Total Users</span>
                  <span className="font-semibold text-slate-800">{users.filter(user => user.role === 'user').length}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800">Recent Activity</h4>
              <div className="space-y-2">
                <div className="text-sm text-slate-600 p-3 rounded-lg bg-green-50 border border-green-200">
                  System running smoothly
                </div>
                <div className="text-sm text-slate-600 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  {submissions.length} total submissions
                </div>
              </div>
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
