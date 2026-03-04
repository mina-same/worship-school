
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Users, Shield, Crown, Trash2, ArrowRight, User, ChevronDown, ChevronUp, Search, Plus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  display_name?: string;
  avatar_url?: string;
}

interface Assignment {
  id: string;
  admin_id: string;
  user_id: string;
  admin: { email: string; display_name?: string; avatar_url?: string };
  user: { email: string; display_name?: string; avatar_url?: string };
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedUser, setDraggedUser] = useState<User | null>(null);
  const [expandedAdmins, setExpandedAdmins] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      // Fetch all users with display names and avatars
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, role, display_name, avatar_url')
        .order('role');
        
      if (usersError) throw usersError;
      
      if (usersData) {
        const regularUsers = usersData.filter(u => u.role === 'user');
        const adminUsers = usersData.filter(u => u.role === 'admin');
        setUsers(regularUsers);
        setAdmins(adminUsers);
      }
      
      // Fetch assignments with user details
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('admin_assignments')
        .select(`
          *,
          admin:users!admin_assignments_admin_id_fkey(email, display_name, avatar_url),
          user:users!admin_assignments_user_id_fkey(email, display_name, avatar_url)
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

  const toggleAdminExpanded = (adminId: string) => {
    setExpandedAdmins(prev => {
      const newSet = new Set(prev);
      if (newSet.has(adminId)) {
        newSet.delete(adminId);
      } else {
        newSet.add(adminId);
      }
      return newSet;
    });
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, display_name, avatar_url')
        .or(`email.ilike.%${query}%,display_name.ilike.%${query}%`)
        .eq('role', 'user')
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const assignUserToAdmin = async (adminId: string, user: User) => {
    await createAssignment(adminId, user.id);
    setSearchQuery('');
    setSearchResults([]);
  };

  const deleteUser = async (targetUser: User) => {
    const confirmed = window.confirm(
      `Delete ${targetUser.email}? This will permanently remove the account and all related data.`
    );
    if (!confirmed) return;

    setDeletingUserId(targetUser.id);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: targetUser.id }
      });

      if (error) throw error;

      await fetchData();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    } finally {
      setDeletingUserId(null);
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
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage 
                        src={user.avatar_url} 
                        alt={user.display_name || user.email}
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {user.display_name 
                          ? user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          : user.email.substring(0, 2).toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">
                        {user.display_name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-slate-600 truncate">
                        {user.email}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">User</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      onClick={() => promoteToAdmin(user.id)}
                      size="sm"
                      variant="outline"
                      className="sm:opacity-0 group-hover:opacity-100 transition-opacity w-full mt-2 sm:mt-0"
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Promote
                    </Button>
                    <Button
                      onClick={() => deleteUser(user)}
                      size="sm"
                      variant="outline"
                      disabled={deletingUserId === user.id}
                      className="sm:opacity-0 group-hover:opacity-100 transition-opacity w-full mt-2 sm:mt-0 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Admins Section */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 relative">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            Admins & Their Assignments
          </CardTitle>
          <div className="space-y-2">
            <p className="text-slate-600">Drop zones for user assignments</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search users by name or email to assign..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={user.avatar_url} 
                          alt={user.display_name || user.email}
                          className="object-cover"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {user.display_name 
                            ? user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : user.email.substring(0, 2).toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {user.display_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-slate-600 truncate">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {admins.map((admin) => (
                          <Button
                            key={admin.id}
                            size="sm"
                            variant="outline"
                            onClick={() => assignUserToAdmin(admin.id, user)}
                            className="text-xs h-7 px-2"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {admin.display_name?.split(' ')[0] || admin.email.split('@')[0]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-6">
            {admins.map((admin) => {
              const adminAssignments = assignments.filter(a => a.admin_id === admin.id);
              const isExpanded = expandedAdmins.has(admin.id);
              
              return (
                <div
                  key={admin.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, admin.id)}
                  className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-purple-200">
                        <AvatarImage 
                          src={admin.avatar_url} 
                          alt={admin.display_name || admin.email}
                          className="object-cover"
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <AvatarFallback className="bg-purple-100 text-purple-800 font-semibold">
                          {admin.display_name 
                            ? admin.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            : admin.email.substring(0, 2).toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">
                          {admin.display_name || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-slate-600 truncate">
                          {admin.email}
                        </p>
                        <Badge className="bg-purple-100 text-purple-800 mt-1">Admin</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <Button
                        onClick={() => toggleAdminExpanded(admin.id)}
                        size="sm"
                        variant="outline"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Hide Assignments
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Show Assignments ({adminAssignments.length})
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => demoteToUser(admin.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Demote
                      </Button>
                      <Button
                        onClick={() => deleteUser(admin)}
                        size="sm"
                        variant="outline"
                        disabled={deletingUserId === admin.id}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <h4 className="text-sm font-medium text-slate-700">Assigned Users ({adminAssignments.length})</h4>
                      {adminAssignments.length > 0 ? (
                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                          {adminAssignments.map((assignment) => (
                            <div
                              key={assignment.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-slate-200 gap-2"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage 
                                    src={assignment.user.avatar_url} 
                                    alt={assignment.user.display_name || assignment.user.email}
                                    className="object-cover"
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                                    {assignment.user.display_name 
                                      ? assignment.user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                      : assignment.user.email.substring(0, 2).toUpperCase()
                                    }
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-slate-700 truncate block">
                                    {assignment.user.display_name || 'Unknown User'}
                                  </span>
                                  <span className="text-xs text-slate-500 truncate">
                                    {assignment.user.email}
                                  </span>
                                </div>
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
                  )}
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
