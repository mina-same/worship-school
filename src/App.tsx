
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DynamicForm from '@/pages/DynamicForm';
import FormBuilder from '@/pages/FormBuilder';
import SubmissionDetail from '@/pages/SubmissionDetail';
import AdminAssignments from '@/pages/AdminAssignments';
import AdminUserManagement from '@/pages/AdminUserManagement';
import SuperAdminUserManagement from '@/pages/SuperAdminUserManagement';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import InvitePage from '@/pages/InvitePage';
import SuperAdminForms from '@/pages/SuperAdminForms';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/invite/:inviteCode" element={<InvitePage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/form/:templateId" element={
        <ProtectedRoute>
          <DynamicForm />
        </ProtectedRoute>
      } />
      <Route path="/form/:templateId/:submissionId" element={
        <ProtectedRoute>
          <DynamicForm />
        </ProtectedRoute>
      } />
      <Route path="/form-builder" element={
        <ProtectedRoute>
          <FormBuilder />
        </ProtectedRoute>
      } />
      <Route path="/form-builder/:templateId" element={
        <ProtectedRoute>
          <FormBuilder />
        </ProtectedRoute>
      } />
      <Route path="/admin/submission/:submissionId" element={
        <ProtectedRoute>
          <SubmissionDetail />
        </ProtectedRoute>
      } />
      <Route path="/admin-assignments" element={
        <ProtectedRoute>
          <AdminAssignments />
        </ProtectedRoute>
      } />
      <Route path="/admin/user-management" element={
        <ProtectedRoute>
          <AdminUserManagement />
        </ProtectedRoute>
      } />
      <Route path="/super-admin/user-management" element={
        <ProtectedRoute>
          <SuperAdminUserManagement />
        </ProtectedRoute>
      } />
      <Route path="/super-admin/forms" element={
        <ProtectedRoute>
          <SuperAdminForms />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
