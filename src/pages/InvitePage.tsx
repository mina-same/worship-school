
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { GraduationCap, Mail, Lock, Eye, EyeOff, UserCheck } from 'lucide-react';

const InvitePage: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();
  
  const [adminEmail, setAdminEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [isAlreadyAssigned, setIsAlreadyAssigned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchAdminInfo = async () => {
      if (!inviteCode) return;
      
      try {
        const adminId = atob(inviteCode);
        const { data: adminData, error } = await supabase
          .from('users')
          .select('email')
          .eq('id', adminId)
          .eq('role', 'admin')
          .single();
          
        if (error) {
          console.error('Error fetching admin:', error);
          return;
        }

        if (adminData) {
          setAdminEmail(adminData.email);
        }

        // If user is already signed in, check if assignment exists and create if not
        if (user) {
          await handleExistingUserAssignment(adminId, user.id);
        }
      } catch (error) {
        console.error('Error fetching admin info:', error);
      }
    };

    fetchAdminInfo();
  }, [inviteCode, user]);

  const handleExistingUserAssignment = async (adminId: string, userId: string) => {
    try {
      setIsProcessing(true);
      
      // Check if assignment already exists
      const { data: existingAssignment, error: checkError } = await supabase
        .from('admin_assignments')
        .select('id')
        .eq('admin_id', adminId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking assignment:', checkError);
        return;
      }

      if (existingAssignment) {
        setIsAlreadyAssigned(true);
        toast({
          title: "Already Assigned",
          description: `You are already assigned to admin ${adminEmail}`,
        });
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        // Create new assignment
        const { error: insertError } = await supabase
          .from('admin_assignments')
          .insert({
            admin_id: adminId,
            user_id: userId
          });

        if (insertError) {
          console.error('Error creating assignment:', insertError);
          toast({
            title: "Assignment Failed",
            description: "Failed to assign you to the admin. Please try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Success",
            description: `You have been assigned to admin ${adminEmail}`,
          });
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error handling assignment:', error);
      toast({
        title: "Error",
        description: "An error occurred while processing your assignment.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    
    setLoading(true);
    try {
      const adminId = atob(inviteCode);
      
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) throw error;
        
        // Wait a moment for the user to be created in our users table
        setTimeout(async () => {
          await createAssignment(adminId);
        }, 1000);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        // The assignment will be handled in useEffect when user state updates
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (adminId: string) => {
    try {
      // Get current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Check if assignment already exists
      const { data: existingAssignment, error: checkError } = await supabase
        .from('admin_assignments')
        .select('id')
        .eq('admin_id', adminId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking assignment:', checkError);
        return;
      }

      if (!existingAssignment) {
        const { error } = await supabase
          .from('admin_assignments')
          .insert({
            admin_id: adminId,
            user_id: currentUser.id
          });

        if (error) {
          console.error('Error creating assignment:', error);
          toast({
            title: "Assignment Failed",
            description: "Failed to assign you to the admin.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Success",
            description: `You have been assigned to admin ${adminEmail}`,
          });
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
    }
  };

  if (!inviteCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Invalid invite link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is already signed in and assigned
  if (user && isAlreadyAssigned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold text-slate-800">
                Already Assigned
              </CardTitle>
              <CardDescription className="text-slate-600">
                You are already assigned to admin {adminEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-slate-500 mb-4">Redirecting to dashboard...</p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If user is already signed in but assignment is being processed
  if (user && isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              </div>
              <CardTitle className="text-xl font-semibold text-slate-800">
                Assignment in Progress
              </CardTitle>
              <CardDescription className="text-slate-600">
                You are being assigned to admin {adminEmail}...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  // If user is already signed in but not assigned yet
  if (user && !isAlreadyAssigned && !isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-semibold text-slate-800">
                Processing Assignment
              </CardTitle>
              <CardDescription className="text-slate-600">
                Please wait while we assign you to admin {adminEmail}...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Join The School of Worship
            </h1>
            {adminEmail && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Invited by: {adminEmail}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-semibold text-slate-800">
                {isSignUp ? 'Create Your Account' : 'Sign In'}
              </CardTitle>
              <CardDescription className="text-slate-600">
                {isSignUp ? 'Join and get assigned to your admin automatically' : 'Sign in to continue'}
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleAuth}>
              <CardContent className="space-y-6 px-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email"
                      className="pl-10 h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder={isSignUp ? "Create a password" : "Enter your password"}
                      className="pl-10 pr-10 h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              
              <div className="flex flex-col space-y-4 px-6 pb-6">
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isSignUp ? 'Creating account...' : 'Signing in...'}
                    </div>
                  ) : (
                    isSignUp ? 'Create Account' : 'Sign In'
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
