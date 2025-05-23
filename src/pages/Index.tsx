
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Smart Save-and-Form System</CardTitle>
          <CardDescription>
            Create, manage, and submit forms with real-time saving
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {user ? (
            <Button className="w-full" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          ) : (
            <Button className="w-full" onClick={() => navigate('/login')}>
              Login / Sign Up
            </Button>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>A powerful form management system with:</p>
            <ul className="mt-2 list-inside list-disc text-left">
              <li>Dynamic form creation</li>
              <li>Auto-save functionality</li>
              <li>Role-based access control</li>
              <li>Admin user assignments</li>
              <li>Form templates and submissions</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
