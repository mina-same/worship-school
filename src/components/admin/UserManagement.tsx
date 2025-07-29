
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Users, Shield, Crown, Trash2, ArrowRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
}

interface Assignment {
  id: string;
  admin_id: string;
  user_id: string;
  admin: { email: string };
  user: { email: string };
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedUser, setDraggedUser] = useState<User | null>(null);

  const fetchData = async () => {
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('role');
        
      if (usersError) throw usersError;
      
      if (usersData) {
        const regularUsers = usersData.filter(u => u.role === 'user');
        const adminUsers = usersData.filter(u => u.role === 'admin');
        setUsers(regularUsers);
        setAdmins(adminUsers);
      }
      
      // Fetch assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('admin_assignments')
        .select(`
          *,
          admin:users!admin_assignments_admin_id_fkey(email),
          user:users!admin_assignments_user_id_fkey(email)
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

  useEffect(() => {
    fetchData();
  }, []);

  const promoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

      if (error) throw error;
      
      await fetchData();
      toast({
        title: "Success",
        description: "User promoted to admin successfully",
      });
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: "Error",
        description: "Failed to promote user",
        variant: "destructive"
      });
    }
  };

  const demoteToUser = async (userId: string) => {
    try {
      // First remove all assignments for this admin
      await supabase
        .from('admin_assignments')
        .delete()
        .eq('admin_id', userId);

      // Then demote to user
      const { error } = await supabase
        .from('users')
        .update({ role: 'user' })
        .eq('id', userId);

      if (error) throw error;
      
      await fetchData();
      toast({
        title: "Success",
        description: "Admin demoted to user successfully",
      });
    } catch (error) {
      console.error('Error demoting admin:', error);
      toast({
        title: "Error",
        description: "Failed to demote admin",
        variant: "destructive"
      });
    }
  };

  const createAssignment = async (adminId: string, userId: string) => {
    try {
      // Check if assignment already exists
      const existingAssignment = assignments.find(
        a => a.admin_id === adminId && a.user_id === userId
      );
      
      if (existingAssignment) {
        toast({
          title: "Assignment exists",
          description: "This user is already assigned to this admin",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('admin_assignments')
        .insert({
          admin_id: adminId,
          user_id: userId
        });

      if (error) throw error;
      
      await fetchData();
      toast({
        title: "Success",
        description: "User assigned to admin successfully",
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive"
      });
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('admin_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      
      await fetchData();
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

  const handleDragStart = (user: User) => {
    setDraggedUser(user);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, adminId: string) => {
    e.preventDefault();
    if (draggedUser) {
      createAssignment(adminId, draggedUser.id);
      setDraggedUser(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Users Section */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            Regular Users
          </CardTitle>
          <p className="text-slate-600">Drag users to admins below to create assignments</p>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <div
                key={user.id}
                draggable
                onDragStart={() => handleDragStart(user)}
                className="group cursor-move rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
                      {user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">
                        {user.email}
                      </h3>
                      <Badge variant="secondary" className="text-xs">User</Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => promoteToAdmin(user.id)}
                    size="sm"
                    variant="outline"
                    className="sm:opacity-0 group-hover:opacity-100 transition-opacity w-full sm:w-auto mt-2 sm:mt-0"
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    Promote
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admins Section */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            Admins & Their Assignments
          </CardTitle>
          <p className="text-slate-600">Drop zones for user assignments</p>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-6">
            {admins.map((admin) => {
              const adminAssignments = assignments.filter(a => a.admin_id === admin.id);
              
              return (
                <div
                  key={admin.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, admin.id)}
                  className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                        {admin.email.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{admin.email}</h3>
                        <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => demoteToUser(admin.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 w-full sm:w-auto mt-2 sm:mt-0"
                    >
                      Demote
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-700">Assigned Users ({adminAssignments.length})</h4>
                    {adminAssignments.length > 0 ? (
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                        {adminAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-slate-200 gap-2"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <ArrowRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                              <span className="text-sm text-slate-700 truncate">{assignment.user.email}</span>
                            </div>
                            <Button
                              onClick={() => deleteAssignment(assignment.id)}
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 self-end sm:self-auto"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-500 text-sm">
                        No users assigned. Drag users here to assign them.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
