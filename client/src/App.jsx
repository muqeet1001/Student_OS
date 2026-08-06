import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import AiInterview from './pages/AiInterview.jsx';
import CodingPractice from './pages/CodingPractice.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import PyqLibrary from './pages/PyqLibrary.jsx';
import Register from './pages/Register.jsx';
import ResumeBuilder from './pages/ResumeBuilder.jsx';
import SkillTest from './pages/SkillTest.jsx';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx';
import MobileRouteNav from './components/MobileRouteNav.jsx';
import { useAuth } from './context/AuthContext.jsx';

const pagesWithGeneratedMobileNav = new Set([
  '/dashboard',
  '/profile',
  '/coding-practice',
  '/pyq-library',
  '/resume-builder',
  '/ai-interview',
  '/skill-test',
]);

export default function App() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const showMobileNav = isAuthenticated && pagesWithGeneratedMobileNav.has(location.pathname);

  return (
    <>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/skill-test" element={<SkillTest />} />
          <Route path="/coding-practice" element={<CodingPractice />} />
          <Route path="/pyq-library" element={<PyqLibrary />} />
          <Route path="/resume-builder" element={<ResumeBuilder />} />
          <Route path="/ai-interview" element={<AiInterview />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {showMobileNav ? <MobileRouteNav /> : null}
    </>
  );
}
