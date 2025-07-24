
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings, Users, FileText, Plus } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';

// Import components for different dashboards
import UserDashboard from '@/components/dashboards/UserDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';

const Dashboard: React.FC = () => {
  const { user, userRole, signOut } = useAuth();
  const [formTemplates, setFormTemplates] = useState<Tables<'form_templates'>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('form_templates')
          .select('*');
        
        if (error) throw error;
        
        if (data) {
          setFormTemplates(data);
        }
      } catch (error) {
        console.error('Error fetching form templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFormTemplates();
  }, []);

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = () => {
    switch (userRole) {
      case 'super_admin':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'admin':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
      default:
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
  };

  const getDashboardTitle = () => {
    switch (userRole) {
      case 'super_admin':
        return 'Super Admin Dashboard';
      case 'admin':
        return 'Admin Dashboard';
      default:
        return 'Your Learning Journey';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="container mx-auto px-6">
          <div className="flex h-20 items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  The School of Worship
                </h1>
                <p className="text-sm text-slate-500 font-medium">Learning Management System</p>
              </div>
            </div>

            {/* User Avatar and Info */}
            <div className="flex items-center space-x-4">
              <UserAvatar />
              
              <div className="hidden md:block">
                <Badge className={`text-xs ${getRoleBadgeColor()}`}>
                  {userRole?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center space-x-2">
                {userRole === 'super_admin' && (
                  <Button variant="outline" size="sm" className="hidden sm:flex">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={signOut} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! 👋
                </h2>
                <p className="text-slate-600 text-lg">
                  {getDashboardTitle()}
                </p>
              </div>
              
              {userRole === 'super_admin' && (
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Form
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="p-8">
            {userRole === 'super_admin' && (
              <SuperAdminDashboard />
            )}
            
            {userRole === 'admin' && (
              <AdminDashboard />
            )}
            
            {userRole === 'user' && (
              <UserDashboard formTemplates={formTemplates} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
