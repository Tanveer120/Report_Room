import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './pages/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/reports/DashboardPage';
import ReportsPage from './pages/reports/ReportsPage';
import ReportDetailPage from './pages/reports/ReportDetailPage';
import ManageReportsPage from './pages/reports/ManageReportsPage';
import ReportEditorPage from './pages/reports/ReportEditorPage';
import ManageRolesPage from './pages/admin/ManageRolesPage';
import ManageCategoriesPage from './pages/admin/ManageCategoriesPage';
import CategoryEditorPage from './pages/admin/CategoryEditorPage';
import RoleEditorPage from './pages/admin/RoleEditorPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import UserEditorPage from './pages/admin/UserEditorPage';
import ManageConnectionsPage from './pages/admin/ManageConnectionsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="reports/:id" element={<ReportDetailPage />} />

              <Route
                path="admin/reports"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/reports/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <ReportEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/reports/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <ReportEditorPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin/roles"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageRolesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/roles/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <RoleEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/roles/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <RoleEditorPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin/categories"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageCategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/categories/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <CategoryEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/categories/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <CategoryEditorPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <UserEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <UserEditorPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="admin/connections"
                element={
                  <ProtectedRoute requireAdmin>
                    <ManageConnectionsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
