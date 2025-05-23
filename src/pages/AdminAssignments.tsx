
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Trash2 } from 'lucide-react';

const AdminAssignments: React.FC = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check if user is super_admin
    if (userRole && userRole !== 'super_admin') {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .order('role');
          
        if (usersError) throw usersError;
        
        if (usersData) {
          // Filter admins and regular users
          const adminUsers = usersData.filter((u) => u.role === 'admin');
          const regularUsers = usersData.filter((u) => u.role === 'user');
          
          setAdmins(adminUsers);
          setUsers(regularUsers);
        }
        
        // Fetch all assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('admin_assignments')
          .select(`
            *,
            admin:users!admin_assignments_admin_id_fkey(id, email),
            user:users!admin_assignments_user_id_fkey(id, email)
          `);
          
        if (assignmentsError) throw assignmentsError;
        setAssignments(assignmentsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole, navigate]);

  const createAssignment = async () => {
    if (!selectedAdmin || !selectedUser) {
      toast({
        title: "Error",
        description: "Please select both an admin and a user",
        variant: "destructive"
      });
      return;
    }
    
    // Check if assignment already exists
    const existingAssignment = assignments.find(
      (a) => a.admin_id === selectedAdmin && a.user_id === selectedUser
    );
    
    if (existingAssignment) {
      toast({
        title: "Error",
        description: "This admin-user assignment already exists",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('admin_assignments')
        .insert({
          admin_id: selectedAdmin,
          user_id: selectedUser,
        })
        .select(`
          *,
          admin:users!admin_assignments_admin_id_fkey(id, email),
          user:users!admin_assignments_user_id_fkey(id, email)
        `);

      if (error) throw error;
      
      if (data) {
        setAssignments([...assignments, ...data]);
        setSelectedUser('');
        toast({
          title: "Success",
          description: "User assigned to admin successfully",
        });
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAssignments(assignments.filter((a) => a.id !== id));
      toast({
        title: "Success",
        description: "Assignment removed successfully",
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-4xl">
        <Button variant="outline" className="mb-4" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Admin-User Assignments</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Create New Assignment</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an Admin" />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a User" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={createAssignment} 
                disabled={!selectedAdmin || !selectedUser || saving}
              >
                {saving ? 'Assigning...' : 'Assign User to Admin'}
              </Button>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Existing Assignments</h3>
              
              {assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <div className="font-medium">
                          Admin: {assignment.admin?.email}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          User: {assignment.user?.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(assignment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No assignments created yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAssignments;
