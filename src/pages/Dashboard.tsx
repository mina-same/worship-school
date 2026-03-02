
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { LogOut, Settings, FileText, Plus } from 'lucide-react';
import UserAvatar from '@/components/UserAvatar';
import BottomNavigation from '@/components/BottomNavigation';

// Import components for different dashboards
import UserDashboard from '@/components/dashboards/UserDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import SuperAdminDashboard from '@/components/dashboards/SuperAdminDashboard';

const Dashboard: React.FC = () => {
  const { user, userRole, signOut, loading: authLoading } = useAuth();
  const [formTemplates, setFormTemplates] = useState<Tables<'form_templates'>[]>([]);
  const [loading, setLoading] = useState(false); // Start with false - we'll only set true if needed

  useEffect(() => {
    const fetchFormTemplates = async () => {
      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Form templates fetch timeout')), 5000);
        });
        
        const queryPromise = supabase
          .from('form_templates')
          .select('*');
        
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('Error fetching form templates:', error);
        } else if (data) {
          setFormTemplates(data);
        }
      } catch (error) {
        console.error('Error fetching form templates:', error);
      }
    };

    // Only fetch if we have a user - but don't block rendering
    if (user) {
      fetchFormTemplates();
    }
  }, [user]);

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'admin':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white';
      default:
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
  };

  const getDashboardTitle = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin Dashboard';
      case 'admin':
        return 'Admin Dashboard';
      default:
        return 'Your Learning Journey';
    }
  };

  // No need for timeout - we're not blocking on role loading anymore

  // Show loading only if auth is loading or we don't have a user
  // Don't wait for userRole - we have a fallback
  const shouldShowLoading = authLoading || !user;
  
  // Debug logging
  console.log('Dashboard render state:', {
    authLoading,
    loading,
    user: !!user,
    userRole,
    shouldShowLoading
  });
  
  if (shouldShowLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
          <p className="text-slate-400 text-sm">
            {authLoading ? 'Authenticating...' : !user ? 'Loading user...' : userRole === null ? 'Loading user role...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // If we have a user but no role (and auth is not loading), default to 'user' role
  const effectiveUserRole = userRole || 'user';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/20 bg-white/70 backdrop-blur-xl shadow-[0_1px_0_0_rgba(15,23,42,0.06)]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3 md:py-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/30">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent truncate">
                  The School of Worship
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:block">Learning Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <Badge className={`text-[10px] sm:text-xs ${getRoleBadgeColor(effectiveUserRole)} shadow-sm`}> 
                  {effectiveUserRole?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              <UserAvatar />

              <div className="flex items-center gap-1 sm:gap-2">
                {effectiveUserRole === 'super_admin' && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 border-slate-200/80 bg-white/80 hover:bg-white"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={signOut}
                  className="h-9 w-9 border-slate-200/80 bg-white/80 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="hidden sm:flex h-9 border-slate-200/80 bg-white/80 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-4 sm:mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 mb-1 sm:mb-2">
                  Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}! 👋
                </h2>
                <p className="text-slate-600 text-base sm:text-lg">
                  {getDashboardTitle(effectiveUserRole)}
                </p>
              </div>
              
              {effectiveUserRole === 'super_admin' && (
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Form
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
          <CardContent className="p-4 sm:p-6 md:p-8">
            {effectiveUserRole === 'super_admin' && (
              <SuperAdminDashboard />
            )}
            
            {effectiveUserRole === 'admin' && (
              <AdminDashboard />
            )}
            
            {effectiveUserRole === 'user' && (
              <UserDashboard formTemplates={formTemplates} />
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Bottom Navigation - Mobile Only */}
      <BottomNavigation />
    </div>
  );
};

export default Dashboard;
