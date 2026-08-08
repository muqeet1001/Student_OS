import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Achievements from './pages/Achievements.jsx';
import Calendar from './pages/Calendar.jsx';
import Settings from './pages/Settings.jsx';
import CheckIn from './pages/CheckIn.jsx';
import Documents from './pages/Documents.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CodingPractice from './pages/CodingPractice.jsx';
import CompanyHub from './pages/CompanyHub.jsx';
import CompanyPrep from './pages/CompanyPrep.jsx';
import Dashboard from './pages/Dashboard.jsx';
import JobDetail from './pages/JobDetail.jsx';
import Jobs from './pages/Jobs.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import Roadmap from './pages/Roadmap.jsx';
import PyqLibrary from './pages/PyqLibrary.jsx';
import Register from './pages/Register.jsx';
import ResumeBuilder from './pages/ResumeBuilder.jsx';
import SkillAttempt from './pages/SkillAttempt.jsx';
import SkillTest from './pages/SkillTest.jsx';
import Skills from './pages/Skills.jsx';
import TestReview from './pages/TestReview.jsx';
import Tracker from './pages/Tracker.jsx';
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
            <Route path="/skills" element={<Skills />} />
            <Route path="/skill-test" element={<SkillTest />} />
            <Route path="/skill-test/review/:attemptId" element={<TestReview />} />
            <Route path="/coding-practice" element={<CodingPractice />} />
            <Route path="/coding-practice/:slug" element={<ProblemWorkspace />} />
            <Route path="/pyq-library" element={<PyqLibrary />} />
            <Route path="/resume-builder" element={<ResumeBuilder />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:jobId" element={<JobDetail />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/company-prep" element={<CompanyPrep />} />
            <Route path="/company-prep/:slug" element={<CompanyHub />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/ai-interview" element={<AiInterview />} />
            <Route path="/ai-interview/report/:sessionId" element={<InterviewReport />} />
          </Route>

          {/* Like the test runner, the live interview is full screen so there
              is no navigation to drift into mid-answer. */}
          <Route path="/ai-interview/session/:sessionId" element={<InterviewSession />} />

          {/* The test runner is deliberately full screen: no navigation to
              wander off into while the clock is running. */}
          <Route path="/skill-test/:slug" element={<TestRunner />} />
          <Route path="/skills/attempt/:attemptId" element={<SkillAttempt />} />

          {/* Scanned from a projector, so it is full screen: the student
              is standing in a doorway holding a phone. */}
          <Route path="/check-in/:kind/:id" element={<CheckIn />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
