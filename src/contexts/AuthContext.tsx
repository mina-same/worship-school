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
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  // CRITICAL: Set loading to false and default role immediately if we have a user
  useEffect(() => {
    if (user) {
      console.log('User exists, setting loading to false immediately');
      setLoading(false);
      
      // Also ensure we have a role
      if (!userRole) {
        console.log('User exists but no role, setting default role');
        setUserRole('user');
      }
    }
  }, [user, userRole]);

  useEffect(() => {
    let mounted = true;
    
    // Skip if already initialized
    if (isInitialized) {
      console.log('Already initialized, skipping auth setup');
      setLoading(false);
      return;
    }
    
    // Quick check for existing auth state
    supabase.auth.getSession().then(({ data: { session: existingSession }, error }) => {
      if (!mounted) return;
      
      // Check for session errors (expired, invalid, etc.)
      if (error) {
        console.error('Session error on mount:', error);
        setSession(null);
        setUser(null);
        setUserRole(null);
        setLoading(false);
        setIsInitialized(true);
        // Don't navigate here - let the user stay on login if they're already there
        return;
      }
      
      if (existingSession?.user) {
        // Verify the session is still valid
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = existingSession.expires_at;
        
        if (expiresAt && expiresAt < now) {
          console.log('Session expired on mount, clearing state');
          setSession(null);
          setUser(null);
          setUserRole(null);
          setLoading(false);
          setIsInitialized(true);
          return;
        }
        
        console.log('Found valid existing session on mount:', existingSession.user.id);
        setSession(existingSession);
        setUser(existingSession.user);
        
        // Set default role immediately if not already set
        if (!userRole) {
          console.log('Setting default role for existing session');
          setUserRole('user');
        }
        
        // CRITICAL: Set loading to false immediately for existing sessions
        console.log('Setting loading to false for existing session');
        setLoading(false);
        setIsInitialized(true);
      } else if (!user) {
        // Only set loading to false if we don't have a user
        console.log('No session and no user, setting loading to false');
        setLoading(false);
        setIsInitialized(true);
      }
    }).catch((error) => {
      console.error('Error checking initial session:', error);
      setSession(null);
      setUser(null);
      setLoading(false);
      setIsInitialized(true);
    });
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        // Handle SIGNED_OUT event immediately
        if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing state and redirecting to login');
          setSession(null);
          setUser(null);
          setUserRole(null);
          setUserProfile(null);
          setLoading(false);
          // Clear any stale URL parameters
          if (window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          navigate('/login');
          return; // Exit early for sign out
        }
        
        // Handle expired sessions
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('Token refresh failed - session expired, redirecting to login');
          setSession(null);
          setUser(null);
          setUserRole(null);
          setUserProfile(null);
          setLoading(false);
          // Clear any stale URL parameters
          if (window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          navigate('/login');
          return; // Exit early for expired session
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user data for specific events to avoid excessive API calls
          // Include INITIAL_SESSION to handle existing logged-in users (e.g., Google OAuth on page refresh)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            console.log('Fetching user role and profile for event:', event, 'user:', session.user.id);
            
            // Set a default role immediately to prevent blocking
            if (!userRole) {
              console.log('Setting immediate fallback role while fetching from database');
              setUserRole('user');
            }
            
            // CRITICAL: Set loading to false immediately for SIGNED_IN events
            // Don't wait for database queries to complete
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
              console.log('Setting loading to false IMMEDIATELY for event:', event);
              setLoading(false);
            }
            
            // Fetch user data in background (non-blocking)
            try {
              // Add a timeout for the entire operation
              const fetchTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('User data fetch timeout')), 5000); // Reduced to 5 seconds
              });
              
              const fetchPromise = Promise.all([
                fetchUserRole(session.user.id),
                fetchUserProfile(session.user.id)
              ]);
              
              // Don't await - let it run in background
              Promise.race([fetchPromise, fetchTimeout])
                .then(() => {
                  console.log('User role and profile fetching completed successfully');
                })
                .catch((error) => {
                  console.error('Error fetching user data (non-blocking):', error);
                  // Ensure we always have a role set
                  if (!userRole) {
                    console.log('Setting fallback user role due to fetch error');
                    setUserRole('user');
                  }
                });
            } catch (error) {
              console.error('Error starting user data fetch:', error);
              if (!userRole) {
                setUserRole('user');
              }
            }
          } else {
            // For other events, still set loading to false if needed
            setLoading(false);
          }
          
          // Navigate to dashboard after successful sign in (but not on initial session or token refresh)
          if (event === 'SIGNED_IN') {
            // Check if session is valid before navigating
            if (session && session.expires_at) {
              const now = Math.floor(Date.now() / 1000);
              const expiresAt = session.expires_at;
              
              if (expiresAt > now) {
                console.log('Session is valid, navigating to dashboard');
                navigate('/dashboard');
              } else {
                console.log('Session is expired or about to expire, not navigating');
                // Force a sign out
                await supabase.auth.signOut();
              }
            } else {
              navigate('/dashboard');
            }
          }
        } else {
          setUserRole(null);
          setUserProfile(null);
          // Set loading to false even when no session
          if (event === 'INITIAL_SESSION') {
            setLoading(false);
          }
        }
      }
    );

    // Note: Initial session is now handled by initializeAuth() above

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isInitialized]);

  const createUserRecord = async (userId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      if (!user) {
        console.error('No user data available for creating user record');
        setUserRole('user');
        return;
      }

      console.log('Creating user record for:', user.email);
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
        // Even if creation fails, set the role so user can proceed
        setUserRole('user');
      } else {
        console.log('User record created successfully');
        setUserRole('user');
      }
    } catch (error) {
      console.error('Failed to create user record:', error);
      // Always set a role so the user isn't stuck in loading
      setUserRole('user');
    }
  };

  const fetchUserRole = async (userId: string) => {
    console.log('Starting fetchUserRole for user:', userId);
    
    try {
      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 10000); // 10 second timeout
      });
      
      const queryPromise = supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      console.log('Executing database query for user role...');
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      console.log('Database query completed. Data:', data, 'Error:', error);

      if (error) {
        console.error('Error fetching user role:', error);
        
        // If user doesn't exist in users table, create them with default role
        if (error.code === 'PGRST116') {
          console.log('User not found in users table, creating with default role...');
          await createUserRecord(userId);
          return; // createUserRecord will set the role
        }
        
        // For other errors, set default role
        console.log('Setting default role due to error:', error);
        setUserRole('user');
        return;
      }

      if (data && data.role) {
        console.log('User role fetched successfully:', data.role);
        setUserRole(data.role as 'user' | 'admin' | 'super_admin');
      } else {
        // If no role found, set default
        console.log('No role found in data, setting default role');
        setUserRole('user');
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      // Set default role on error
      console.log('Setting default user role due to catch block');
      setUserRole('user');
    }
    
    console.log('fetchUserRole completed for user:', userId);
  };

  const fetchUserProfile = async (userId: string) => {
    console.log('Starting fetchUserProfile for user:', userId);
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile query timeout')), 10000);
      });
      
      const queryPromise = supabase
        .from('users')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .single();
      
      console.log('Executing database query for user profile...');
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

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
    
    console.log('fetchUserProfile completed for user:', userId);
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
