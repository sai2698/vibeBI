import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage from './features/auth/LoginPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import UserManagementPage from './features/admin/UserManagementPage';
import GroupManagementPage from './features/admin/GroupManagementPage';
import RoleManagementPage from './features/admin/RoleManagementPage';
import LOBManagementPage from './features/admin/LOBManagementPage';
import LOBHomePage from './features/lob/LOBHomePage';
import DatasourceListPage from './features/data/DatasourceListPage';
import DatasetListPage from './features/data/DatasetListPage';
import SQLLabPage from './features/sqllab/SQLLabPage';
import ChartBuilderPage from './features/charts/ChartBuilderPage';
import ChartListPage from './features/charts/ChartListPage';
import CodePlaygroundPage from './features/charts/CodePlaygroundPage';
import DashboardListPage from './features/dashboards/DashboardListPage';
import DashboardViewPage from './features/dashboards/DashboardViewPage';
import ThemePickerPage from './features/settings/ThemePickerPage';
import LDAPSettingsPage from './features/settings/LDAPSettingsPage';
import RLSManagementPage from './features/settings/RLSManagementPage';
import AuditLogPage from './features/audit/AuditLogPage';
import SchedulerPage from './features/scheduler/SchedulerPage';
import AIWorkspacePage from './features/ai/AIWorkspacePage';
import SemanticLayerPage from './features/data/SemanticLayerPage';
import DataflowBuilder from './features/datasets/DataflowBuilder';
import MailerPage from './features/mailer/MailerPage';
import SelfServiceHub from './features/selfservice/SelfServiceHub';
import DataMartExplorer from './features/selfservice/DataMartExplorer';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboards" replace />} />
                  <Route path="/self-service" element={<ProtectedRoute requiredPermission="menu:dashboards"><SelfServiceHub /></ProtectedRoute>} />
                  <Route path="/self-service/:id" element={<ProtectedRoute requiredPermission="menu:dashboards"><DataMartExplorer /></ProtectedRoute>} />
                  <Route path="/dashboards" element={<DashboardListPage />} />
                  <Route path="/dashboards/:id" element={<DashboardViewPage />} />
                  <Route path="/lob/:id" element={<LOBHomePage />} />
                  <Route path="/lobs/:id" element={<LOBHomePage />} />
                  <Route path="/data/datasources" element={<ProtectedRoute requiredPermission="menu:data_management"><DatasourceListPage /></ProtectedRoute>} />
                  <Route path="/data/datasets" element={<ProtectedRoute requiredPermission="menu:data_management"><DatasetListPage /></ProtectedRoute>} />
                  <Route path="/data/dataflow" element={<ProtectedRoute requiredPermission="menu:data_management"><DataflowBuilder /></ProtectedRoute>} />
                  <Route path="/data/semantic" element={<ProtectedRoute requiredPermission="menu:data_management"><SemanticLayerPage /></ProtectedRoute>} />
                  <Route path="/sqllab" element={<ProtectedRoute requiredPermission="menu:sqllab"><SQLLabPage /></ProtectedRoute>} />
                  <Route path="/charts" element={<ProtectedRoute requiredPermission="menu:chart_builder"><ChartListPage /></ProtectedRoute>} />
                  <Route path="/charts/playground" element={<ProtectedRoute requiredPermission="menu:chart_builder"><CodePlaygroundPage /></ProtectedRoute>} />
                  <Route path="/charts/:id" element={<ProtectedRoute requiredPermission="menu:chart_builder"><ChartBuilderPage /></ProtectedRoute>} />
                  <Route path="/charts/builder" element={<ProtectedRoute requiredPermission="menu:chart_builder"><ChartBuilderPage /></ProtectedRoute>} />
                  <Route path="/admin/users" element={<ProtectedRoute requiredPermission="admin:all"><UserManagementPage /></ProtectedRoute>} />
                  <Route path="/admin/groups" element={<ProtectedRoute requiredPermission="admin:all"><GroupManagementPage /></ProtectedRoute>} />
                  <Route path="/admin/roles" element={<ProtectedRoute requiredPermission="admin:all"><RoleManagementPage /></ProtectedRoute>} />
                  <Route path="/admin/lob" element={<ProtectedRoute requiredPermission="admin:all"><LOBManagementPage /></ProtectedRoute>} />
                  <Route path="/admin/themes" element={<ProtectedRoute requiredPermission="admin:all"><ThemePickerPage /></ProtectedRoute>} />
                  <Route path="/admin/ldap" element={<ProtectedRoute requiredPermission="admin:all"><LDAPSettingsPage /></ProtectedRoute>} />
                  <Route path="/admin/audit" element={<ProtectedRoute requiredPermission="admin:all"><AuditLogPage /></ProtectedRoute>} />
                  <Route path="/settings/rls" element={<ProtectedRoute requiredPermission="admin:all"><RLSManagementPage /></ProtectedRoute>} />
                  <Route path="/scheduler" element={<ProtectedRoute requiredPermission="menu:dashboards"><SchedulerPage /></ProtectedRoute>} />
                  <Route path="/mailer" element={<ProtectedRoute requiredPermission="menu:dashboards"><MailerPage /></ProtectedRoute>} />
                  <Route path="/ai" element={<ProtectedRoute requiredPermission="menu:ai_workspace"><AIWorkspacePage /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
