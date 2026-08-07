import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import CodingPractice from './pages/CodingPractice.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import PyqLibrary from './pages/PyqLibrary.jsx';
import Register from './pages/Register.jsx';
import ResumeBuilder from './pages/ResumeBuilder.jsx';
import SkillTest from './pages/SkillTest.jsx';
import TestReview from './pages/TestReview.jsx';
import TestRunner from './pages/TestRunner.jsx';
import AiInterview from './pages/AiInterview.jsx';
import InterviewReport from './pages/InterviewReport.jsx';
import InterviewSession from './pages/InterviewSession.jsx';

import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx';
import FullPageLoader from './components/FullPageLoader.jsx';

// The editor pulls in CodeMirror, which is larger than the rest of the app
// combined. Loading it on demand keeps the initial bundle small.
const ProblemWorkspace = lazy(() => import('./pages/ProblemWorkspace.jsx'));

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader label="Loading workspace" />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          {/* Screens that share the navigation chrome. */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/skill-test" element={<SkillTest />} />
            <Route path="/skill-test/review/:attemptId" element={<TestReview />} />
            <Route path="/coding-practice" element={<CodingPractice />} />
            <Route path="/coding-practice/:slug" element={<ProblemWorkspace />} />
            <Route path="/pyq-library" element={<PyqLibrary />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
            <Route path="/ai-interview" element={<AiInterview />} />
            <Route path="/ai-interview/report/:sessionId" element={<InterviewReport />} />
          </Route>

          {/* Like the test runner, the live interview is full screen so there
              is no navigation to drift into mid-answer. */}
          <Route path="/ai-interview/session/:sessionId" element={<InterviewSession />} />

          {/* The test runner is deliberately full screen: no navigation to
              wander off into while the clock is running. */}
          <Route path="/skill-test/:slug" element={<TestRunner />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
