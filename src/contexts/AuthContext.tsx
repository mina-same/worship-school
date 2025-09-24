import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

type UserProfile = {
  display_name?: string;
  avatar_url?: string;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userProfile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  updateEmail: (newEmail: string) => Promise<{ error?: any }>;
  updateProfile: (profile: UserProfile) => Promise<{ error?: any }>;
  uploadAvatar: (file: File) => Promise<{ url?: string; error?: any }>;
  userRole: 'user' | 'admin' | 'super_admin' | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'super_admin' | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only fetch user data for specific events to avoid excessive API calls
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await Promise.all([
              fetchUserRole(session.user.id),
              fetchUserProfile(session.user.id)
            ]);
          }
          
          // Navigate to dashboard after successful sign in (but not on initial session or token refresh)
          if (event === 'SIGNED_IN') {
            navigate('/dashboard');
          }
        } else {
          setUserRole(null);
          setUserProfile(null);
        }
        
        // Set loading to false for initial session and after successful sign in
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setLoading(false);
        }
      }
    );

    // Get initial session - this will trigger INITIAL_SESSION event
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      // The auth state change listener will handle the session
      // We don't need to duplicate the logic here
      if (!session) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const createUserRecord = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          role: 'user',
          avatar_url: user.user_metadata?.avatar_url
        });

      if (error) {
        console.error('Error creating user record:', error);
        setUserRole('user'); // Set default role even if creation fails
      } else {
        console.log('User record created successfully');
        setUserRole('user');
      }
    } catch (error) {
      console.error('Failed to create user record:', error);
      setUserRole('user');
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        
        // If user doesn't exist in users table, create them with default role
        if (error.code === 'PGRST116') {
          console.log('User not found in users table, creating with default role...');
          await createUserRecord(userId);
          return;
        }
        
        // For other errors, set default role
        setUserRole('user');
        return;
      }

      if (data) {
        console.log('User role fetched:', data.role);
        setUserRole(data.role as 'user' | 'admin' | 'super_admin');
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      // Set default role on error
      setUserRole('user');
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // If user doesn't exist, we'll get the profile from auth metadata
        if (error.code === 'PGRST116') {
          const { data: userData } = await supabase.auth.getUser();
          const user = userData.user;
          if (user) {
            setUserProfile({
              display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              avatar_url: user.user_metadata?.avatar_url
            });
          }
        }
        return;
      }

      if (data) {
        console.log('User profile fetched:', data);
        setUserProfile({
          display_name: data.display_name,
          avatar_url: data.avatar_url
        });
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle rate limiting specifically
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          toast({
            title: "Too many login attempts",
            description: "Please wait a few minutes before trying again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive"
          });
        }
        return { error };
      }

      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      // Navigate based on role
      if (data.user) {
        navigate('/dashboard');
      }
      
      return {};
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Additional rate limiting check
      if (error?.status === 429) {
        toast({
          title: "Rate limit exceeded",
          description: "Please wait a few minutes before trying to sign in again.",
          variant: "destructive"
        });
      }
      
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        // Handle rate limiting specifically
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          toast({
            title: "Too many login attempts",
            description: "Please wait a few minutes before trying again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Google login failed",
            description: error.message,
            variant: "destructive"
          });
        }
        throw error;
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      
      // Additional rate limiting check
      if (error?.status === 429) {
        toast({
          title: "Rate limit exceeded",
          description: "Please wait a few minutes before trying to sign in again.",
          variant: "destructive"
        });
      }
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Registration successful",
        description: "Please check your email for verification.",
      });
      
      return {};
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        toast({
          title: "Email update failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      toast({
        title: "Email update initiated",
        description: "Please check both your old and new email addresses for confirmation links.",
      });
      
      return {};
    } catch (error) {
      console.error('Email update error:', error);
      return { error };
    }
  };

  const updateProfile = async (profile: UserProfile) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: profile.display_name,
          avatar_url: profile.avatar_url
        })
        .eq('id', user.id);

      if (error) {
        toast({
          title: "Profile update failed",
          description: error.message,
          variant: "destructive"
        });
        return { error };
      }

      // Update local state
      setUserProfile(profile);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      return {};
    } catch (error) {
      console.error('Profile update error:', error);
      return { error };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: 'No user logged in' };

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive"
        });
        return { error: uploadError };
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      return { url: data.publicUrl };
    } catch (error) {
      console.error('Avatar upload error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userProfile,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        updateEmail,
        updateProfile,
        uploadAvatar,
        userRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
