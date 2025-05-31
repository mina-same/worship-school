
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';

const SuperAdminUserManagement: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-8">
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
                User & Admin Management
              </h1>
              <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                Manage users, promote to admins, and handle admin-user assignments
              </p>
            </div>
          </div>

          <UserManagement />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUserManagement;
