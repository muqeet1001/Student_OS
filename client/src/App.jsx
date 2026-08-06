import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AiInterview from './pages/AiInterview.jsx';
import CodingPractice from './pages/CodingPractice.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import PyqLibrary from './pages/PyqLibrary.jsx';
import ResumeBuilder from './pages/ResumeBuilder.jsx';
import SkillTest from './pages/SkillTest.jsx';
import MobileRouteNav from './components/MobileRouteNav.jsx';

const pagesWithGeneratedMobileNav = new Set([
  '/dashboard',
  '/coding-practice',
  '/resume-builder',
  '/ai-interview',
  '/skill-test',
]);

export default function App() {
  const location = useLocation();
  const showMobileNav = pagesWithGeneratedMobileNav.has(location.pathname);

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/skill-test" element={<SkillTest />} />
        <Route path="/coding-practice" element={<CodingPractice />} />
        <Route path="/pyq-library" element={<PyqLibrary />} />
        <Route path="/resume-builder" element={<ResumeBuilder />} />
        <Route path="/ai-interview" element={<AiInterview />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showMobileNav ? <MobileRouteNav /> : null}
    </>
  );
}
