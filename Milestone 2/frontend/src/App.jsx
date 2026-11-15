import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import Home from './pages/Home';
import Login from './pages/Login';
import StudentRegister from './pages/StudentRegister';
import TeacherRegister from './pages/TeacherRegister';
import AdminLogin from './pages/AdminLogin';

import StudentDashboard from './pages/StudentDashboard';
import StudentMyTests from './pages/StudentMyTests';
import StudentExamReadiness from './pages/StudentExamReadiness';
import StudentExamAttempt from './pages/StudentExamAttempt';
import StudentMockTest from './pages/StudentMockTest';

import TeacherDashboard from './pages/TeacherDashboard';
import TeacherTests from './pages/TeacherTests';
import TeacherCreateExam from './pages/TeacherCreateExam';
import TeacherStudents from './pages/TeacherStudents';
import TeacherExamResults from './pages/TeacherExamResults';
import TeacherMockTestResult from './pages/TeacherMockTestResult';

import AdminDashboard from './pages/AdminDashboard';

const AppRoutes = () => (
  <Routes>
    
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/student/register" element={<StudentRegister />} />
    <Route path="/teacher/register" element={<TeacherRegister />} />
    <Route path="/admin/login" element={<AdminLogin />} />

    
    <Route
      path="/student/dashboard"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/tests"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentMyTests />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/exams/:examId/readiness"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentExamReadiness />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/exams/:examId/attempt"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentExamAttempt />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/mock-tests"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentMockTest />
        </ProtectedRoute>
      }
    />
    <Route
      path="/student/results"
      element={
        <ProtectedRoute allowedRoles={['student']}>
          <StudentMyTests defaultTab="practice" />
        </ProtectedRoute>
      }
    />

    
    <Route
      path="/teacher/dashboard"
      element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/tests"
      element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherTests />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/exams/create"
      element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherCreateExam />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/exams/:examId/edit"
      element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherCreateExam />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/exams/:examId/results"
      element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherExamResults />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/students"
      element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherStudents />
        </ProtectedRoute>
      }
    />
    <Route
      path="/teacher/mock-tests/:attemptId"
      element={
        <ProtectedRoute allowedRoles={['teacher']}>
          <TeacherMockTestResult />
        </ProtectedRoute>
      }
    />

    
    <Route
      path="/admin/dashboard"
      element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      }
    />

    
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const AppLayout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname, location.search]);

  const publicPaths = ['/', '/login', '/admin/login', '/student/register', '/teacher/register'];
  const isPublicOrAuthPage = publicPaths.includes(location.pathname);

  
  if (!isAuthenticated || isPublicOrAuthPage) {
    return (
      <div className="min-h-screen bg-[#F5F7FC] text-[#202B40] flex flex-col font-sans selection:bg-[#4169C1] selection:text-white">
        <Navbar />
        <main className="flex-1">
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  
  return (
    <div className="min-h-screen bg-[#F5F7FC] text-[#202B40] flex flex-col font-sans selection:bg-[#4169C1] selection:text-white relative">
      
      <Sidebar
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 xl:pl-72">
        <AppHeader
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <main className="flex-1 min-w-0">
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
