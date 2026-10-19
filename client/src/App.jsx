import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx';
import FullPageLoader from './components/FullPageLoader.jsx';

// Pages are route chunks: students should not download the placement-office,
// proctoring, interview and editor code just to see the dashboard.
const Achievements = lazy(() => import('./pages/Achievements.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const CheckIn = lazy(() => import('./pages/CheckIn.jsx'));
const Documents = lazy(() => import('./pages/Documents.jsx'));
const Inbox = lazy(() => import('./pages/Inbox.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const CodingPractice = lazy(() => import('./pages/CodingPractice.jsx'));
const CompanyHub = lazy(() => import('./pages/CompanyHub.jsx'));
const CompanyPrep = lazy(() => import('./pages/CompanyPrep.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const JobDetail = lazy(() => import('./pages/JobDetail.jsx'));
const Jobs = lazy(() => import('./pages/Jobs.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const SetPassword = lazy(() => import('./pages/SetPassword.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Roadmap = lazy(() => import('./pages/Roadmap.jsx'));
const PyqLibrary = lazy(() => import('./pages/PyqLibrary.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ResumeBuilder = lazy(() => import('./pages/ResumeBuilder.jsx'));
const SkillAttempt = lazy(() => import('./pages/SkillAttempt.jsx'));
const SkillTest = lazy(() => import('./pages/SkillTest.jsx'));
const Skills = lazy(() => import('./pages/Skills.jsx'));
const TestReview = lazy(() => import('./pages/TestReview.jsx'));
const Tracker = lazy(() => import('./pages/Tracker.jsx'));
const TestRunner = lazy(() => import('./pages/TestRunner.jsx'));
const AiInterview = lazy(() => import('./pages/AiInterview.jsx'));
const InterviewReport = lazy(() => import('./pages/InterviewReport.jsx'));
const InterviewSession = lazy(() => import('./pages/InterviewSession.jsx'));
const MyPlan = lazy(() => import('./pages/MyPlan.jsx'));
const Readiness = lazy(() => import('./pages/Readiness.jsx'));
const Practice = lazy(() => import('./pages/Practice.jsx'));
const CareerProfile = lazy(() => import('./pages/CareerProfile.jsx'));
const Updates = lazy(() => import('./pages/Updates.jsx'));
const CareerLab = lazy(() => import('./pages/CareerLab.jsx'));
const PublicProfile = lazy(() => import('./pages/PublicProfile.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const RecruiterFeedback = lazy(() => import('./pages/RecruiterFeedback.jsx'));
const ProblemWorkspace = lazy(() => import('./pages/ProblemWorkspace.jsx'));

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader label="Loading workspace" />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/*
          Recovery deliberately sits outside the public-only group. A student
          who is already signed in — on this device or another one — must still
          be able to open a reset link, and PublicOnlyRoute would bounce them
          away from it.
        */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Public for the same reason: a confirmation link is opened on whatever
            device the mail was read on, which is often not a signed-in one.
            The token is spent by the page's POST, not by loading it, so a mail
            scanner fetching the link does not burn it. */}
        <Route path="/verify-email" element={<VerifyEmail />} />

        <Route path="/public/:userId" element={<PublicProfile />} />
        <Route path="/recruiter-feedback/:token" element={<RecruiterFeedback />} />

        <Route element={<ProtectedRoute />}>
          {/*
            Outside the role groups and outside the app chrome. While a
            temporary password is outstanding this is the only screen that
            works, and a navigation bar of links that all bounce back here
            would be noise rather than choice.
          */}
          <Route path="/set-password" element={<SetPassword />} />

          {/* Screens that share the navigation chrome. */}
          <Route element={<ProtectedRoute roles={['student']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/readiness" element={<Readiness />} />
              <Route path="/my-plan" element={<MyPlan />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/opportunities" element={<Jobs />} />
              <Route path="/career-profile" element={<CareerProfile />} />
              <Route path="/updates" element={<Updates />} />
              <Route path="/career-lab" element={<CareerLab />} />
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
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/jobs" element={<Navigate to="/opportunities" replace />} />
              <Route path="/jobs/:jobId" element={<JobDetail />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/company-prep" element={<CompanyPrep />} />
              <Route path="/company-prep/:slug" element={<CompanyHub />} />
              <Route path="/ai-interview" element={<AiInterview />} />
              <Route path="/ai-interview/report/:sessionId" element={<InterviewReport />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
              <Route path="/admin/:section" element={<AdminDashboard />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={['student']} />}>
            {/* Like the test runner, the live interview is full screen so there
                is no navigation to drift into mid-answer. */}
            <Route path="/ai-interview/session/:sessionId" element={<InterviewSession />} />

            {/* The test runner is deliberately full screen: no navigation to
                wander off into while the clock is running. */}
            <Route path="/skill-test/:slug" element={<TestRunner />} />
            <Route path="/skills/attempt/:attemptId" element={<SkillAttempt />} />
            <Route path="/get-started" element={<Onboarding />} />

            {/* Scanned from a projector, so it is full screen: the student
                is standing in a doorway holding a phone. */}
            <Route path="/check-in/:kind/:id" element={<CheckIn />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
