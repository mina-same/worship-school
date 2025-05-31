
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import DynamicForm from "@/pages/DynamicForm";
import FormBuilder from "@/pages/FormBuilder";
import SubmissionDetail from "@/pages/SubmissionDetail";
import AdminAssignments from "@/pages/AdminAssignments";
import InvitePage from "@/pages/InvitePage";
import AdminUserManagement from "@/pages/AdminUserManagement";
import SuperAdminUserManagement from "@/pages/SuperAdminUserManagement";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/invite/:inviteCode" element={<InvitePage />} />
            
            {/* Protected routes that require authentication */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Form routes */}
            <Route 
              path="/form/:templateId" 
              element={
                <ProtectedRoute>
                  <DynamicForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/form/:templateId/:submissionId" 
              element={
                <ProtectedRoute>
                  <DynamicForm />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin routes */}
            <Route 
              path="/admin/submission/:submissionId" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <SubmissionDetail />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/user-management" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUserManagement />
                </ProtectedRoute>
              } 
            />
            
            {/* Super admin routes */}
            <Route 
              path="/form-builder" 
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <FormBuilder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/form-builder/:templateId" 
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <FormBuilder />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin-assignments" 
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <AdminAssignments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/super-admin/user-management" 
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminUserManagement />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
