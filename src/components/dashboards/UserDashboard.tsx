
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, PlayCircle, FileText, Calendar, UserCheck, Mail, Settings, Shield } from 'lucide-react';

type UserDashboardProps = {
  formTemplates: Tables<'form_templates'>[];
};

const UserDashboard: React.FC<UserDashboardProps> = ({ formTemplates }) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignedAdmin, setAssignedAdmin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Fetch submissions
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('submissions')
          .select(`
            *,
            form_template:form_templates(name)
          `)
          .eq('user_id', user.id);

        if (submissionsError) throw submissionsError;
        setSubmissions(submissionsData || []);

        // Fetch assigned admin
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('admin_assignments')
          .select(`
            admin:users!admin_assignments_admin_id_fkey(email)
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (assignmentError) {
          console.error('Error fetching admin assignment:', assignmentError);
        } else if (assignmentData?.admin) {
          setAssignedAdmin(assignmentData.admin.email);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <PlayCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Not Started</Badge>;
    }
  };

  const getButtonText = (existingSubmission: any) => {
    if (!existingSubmission) return 'Start Form';
    return existingSubmission.status === 'completed' ? 'Edit Form Submission' : 'Continue Form';
  };

  const getButtonVariant = (existingSubmission: any) => {
    if (!existingSubmission) return 'default';
    return existingSubmission.status === 'completed' ? 'outline' : 'default';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <p className="mt-4 text-slate-600">Loading your forms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Settings Link */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link to="/profile">
            <Settings className="h-4 w-4 mr-2" />
            Profile Settings
          </Link>
        </Button>
      </div>
      {/* Admin Assignment Section */}
      {assignedAdmin && (
        <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Your Assigned Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {assignedAdmin.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{assignedAdmin}</p>
                <p className="text-sm text-muted-foreground">
                  Contact your admin if you have any questions about your forms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Forms Section */}
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-800">Available Forms</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {formTemplates.map((template) => {
            const existingSubmission = submissions.find(
              (s) => s.form_template_id === template.id
            );

            return (
              <div
                key={template.id}
                className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 hover:border-blue-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                        {template.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusIcon(existingSubmission?.status || 'not_started')}
                        {getStatusBadge(existingSubmission?.status || 'not_started')}
                      </div>
                    </div>
                  </div>

                  {/* Status Details */}
                  <div className="space-y-2 text-sm text-slate-600">
                    {existingSubmission ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Last updated: {new Date(existingSubmission.last_updated).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <p className="text-slate-500">Ready to begin</p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 pb-6">
                  <Button 
                    asChild 
                    className="w-full"
                    variant={getButtonVariant(existingSubmission)}
                  >
                    <Link
                      to={`/form/${template.id}${
                        existingSubmission ? `/${existingSubmission.id}` : ''
                      }`}
                    >
                      {getButtonText(existingSubmission)}
                    </Link>
                  </Button>
                </div>

                {/* Decorative gradient */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              </div>
            );
          })}
        </div>

        {formTemplates.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No forms available</h3>
            <p className="text-slate-600">Check back later for new learning materials.</p>
          </div>
        )}
      </div>

      {/* Your Progress Section */}
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-slate-800">Your Progress</h2>
        </div>
        
        <div className="space-y-4">
          {submissions.length > 0 ? (
            submissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(submission.status)}
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {submission.form_template?.name}
                      </h3>
                      <div className="flex flex-wrap items-center space-x-4 mt-1">
                        {getStatusBadge(submission.status)}
                        <span className="text-sm text-slate-500">
                          {new Date(submission.last_updated).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                    <Link to={`/form/${submission.form_template_id}/${submission.id}`}>
                      {submission.status === 'completed' ? 'View' : 'Continue'}
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
              <Clock className="h-8 w-8 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No submissions yet. Start filling out a form to track your progress!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
