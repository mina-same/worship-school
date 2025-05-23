
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';

// Import components for different dashboards (we'll create these next)
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

  // Render loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-bold">Smart Save-and-Form System</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {user?.email} ({userRole})
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {userRole === 'super_admin' ? 'Super Admin Dashboard' : 
               userRole === 'admin' ? 'Admin Dashboard' : 'Your Forms'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userRole === 'super_admin' && (
              <SuperAdminDashboard formTemplates={formTemplates} />
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
