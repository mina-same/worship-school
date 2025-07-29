
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Shield, Activity, Settings, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import SubmissionsTable from '@/components/submissions/SubmissionsTable';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalSubmissions: 0,
    totalForms: 0
  });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [formTemplates, setFormTemplates] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch user counts
      const { data: users } = await supabase
        .from('users')
        .select('role');
      
      const totalUsers = users?.filter(u => u.role === 'user').length || 0;
      const totalAdmins = users?.filter(u => u.role === 'admin').length || 0;

      // Fetch admins for filter
      const { data: adminsData } = await supabase
        .from('users')
        .select('id, email')
        .eq('role', 'admin');

      // Fetch submissions count (excluding admin/super_admin submissions)
      const { data: submissionsData } = await supabase
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

      // Fetch form templates
      const { data: forms } = await supabase
        .from('form_templates')
        .select('*')
        .order('created_at', { ascending: false });

      setStats({
        totalUsers,
        totalAdmins,
        totalSubmissions: submissionsData?.length || 0,
        totalForms: forms?.length || 0
      });

      setSubmissions(submissionsData || []);
      setFormTemplates(forms || []);
      setAdmins(adminsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions
    const submissionsChannel = supabase
      .channel('super-admin-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'submissions'
      }, fetchData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, fetchData)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'form_templates'
      }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(submissionsChannel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          <p className="text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-blue-100 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-purple-100 text-sm font-medium">Total Admins</p>
                <p className="text-3xl font-bold">{stats.totalAdmins}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
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
                <p className="text-3xl font-bold">{stats.totalSubmissions}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-orange-100 text-sm font-medium">Total Forms</p>
                <p className="text-3xl font-bold">{stats.totalForms}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 h-24 w-24 rounded-full bg-white/10 transform translate-x-8 -translate-y-8"></div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Settings className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">User & Admin Management</h3>
            <p className="text-slate-600 text-sm mb-4">Manage users, promote to admins, and handle assignments</p>
            <Button 
              onClick={() => navigate('/super-admin/user-management')}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              Manage Users
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Form Builder</h3>
            <p className="text-slate-600 text-sm mb-4">Create and manage form templates</p>
            <Button 
              onClick={() => navigate('/form-builder')}
              variant="outline" 
              className="w-full sm:w-auto"
            >
              Build Forms
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <Edit className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">Previous Forms</h3>
            <p className="text-slate-600 text-sm mb-4">View and edit existing form templates</p>
            <Button 
              onClick={() => navigate('/super-admin/forms')}
              variant="outline" 
              className="w-full sm:w-auto"
            >
              Manage Forms
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <SubmissionsTable submissions={submissions} admins={admins} onRefresh={fetchData} />
    </div>
  );
};

export default SuperAdminDashboard;
