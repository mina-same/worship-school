
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import { AdminAccessToggle } from '@/components/admin/AdminAccessToggle';
import { supabase } from '@/integrations/supabase/client';

const SuperAdminUserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin');

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-8">
          <div className="mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="mb-4 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
                User & Admin Management
              </h1>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
                Manage users, promote to admins, and handle admin access levels
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Admin Access Management */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Admin Access Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                  </div>
                ) : admins.length > 0 ? (
                  <div className="space-y-4">
                    {admins.map((admin) => (
                      <AdminAccessToggle
                        key={admin.id}
                        adminId={admin.id}
                        adminEmail={admin.email}
                        currentAccessLevel={admin.metadata?.access_level || 'partial'}
                        onAccessLevelChange={fetchAdmins}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-600 py-8">No admins found</p>
                )}
              </CardContent>
            </Card>

            {/* User Management */}
            <UserManagement />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;
