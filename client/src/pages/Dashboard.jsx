import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import NotificationList from '../features/dashboard/NotificationList.jsx';

function ReadinessRing({ value }) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative mb-6">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 192 192" role="img" aria-label={`${value}% ready`}>
        <circle
          className="text-surface-container"
          cx="96"
          cy="96"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="12"
        />
        <circle
          className="text-primary transition-all duration-700"
          cx="96"
          cy="96"
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black font-headline text-on-surface">{value}%</span>
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">
          Readiness
        </span>
      </div>
    </div>
  );
}

function DifficultyBar({ label, solved, total, color }) {
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-3 min-h-0">
      {/* Grows to fill the card so the chart never leaves a dead gap under
          the heading, whatever height the row settles at. */}
      <div className="relative flex-1 min-h-[5rem] bg-neutral-800 rounded-2xl overflow-hidden">
        <div
          className={`absolute bottom-0 w-full ${color} transition-all duration-700`}
          style={{ height: `${pct}%` }}
        />
      </div>
      <div className="text-center">
        <p className="font-bold capitalize">{label}</p>
        <p className="text-xs text-neutral-500">
          {solved}/{total}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  // One aggregated call: readiness is weighted on the server so notifications
  // and the dashboard can never disagree about the same number.
  const { data, loading, error, refetch } = useApiResource('/dashboard');

  const readiness = data?.readiness;
  const coding = data?.coding;
  const tests = data?.tests;
  const interviews = data?.interviews;
  const skills = data?.skills ?? [];

  const firstName = (user?.name ?? 'there').split(' ')[0];

  if (loading && !data) return <LoadingBlock label="Loading your dashboard" className="min-h-dvh" />;
  if (error && !data) {
    return (
      <div className="p-6 pt-20 lg:pt-8">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const weakest = readiness.components.find((part) => part.key === readiness.weakest);

  return (
    <div className="bg-background font-body text-on-surface">
      <div className="p-5 pt-20 lg:pt-8 md:p-6 max-w-7xl mx-auto">
        <section className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold font-headline tracking-tight text-on-surface">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-on-surface-variant max-w-2xl font-medium">
              {weakest && weakest.value < 100 ? (
                <>
                  Your weakest area right now is{' '}
                  <span className="text-primary font-bold">{weakest.label.toLowerCase()}</span>. Closing
                  that gap moves your readiness the most.
                </>
              ) : (
                'Everything is looking strong. Keep the streak going.'
              )}
            </p>
          </div>

          {coding.streak.current > 0 && (
            <div className="flex items-center gap-2 bg-secondary-container px-6 py-3 rounded-full text-on-secondary-container font-bold text-sm shadow-sm shrink-0 self-start lg:self-auto">
              <span className="material-symbols-outlined">local_fire_department</span>
              {coding.streak.current} day streak
            </div>
          )}
        </section>

        <div className="grid grid-cols-12 gap-4">
          {/* Readiness */}
          <div className="col-span-12 md:col-span-5 lg:col-span-4 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col items-center justify-center text-center">
            <ReadinessRing value={readiness.score} />

            <h3 className="text-lg font-bold font-headline mb-4">
              {readiness.score >= 75
                ? 'Ready to apply'
                : readiness.score >= 40
                  ? 'Getting there'
                  : 'Just getting started'}
            </h3>

            <dl className="w-full space-y-3 text-left">
              {readiness.components.map((part) => (
                <div key={part.label}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <dt className="text-on-surface-variant">{part.label}</dt>
                    <dd>{part.value}%</dd>
                  </div>
                  <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${part.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>

            <Link
              to="/profile"
              className="mt-8 w-full py-4 bg-primary text-on-primary rounded-full font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20"
            >
              Improve your profile
            </Link>
          </div>

          {/* Coding proficiency */}
          <div className="col-span-12 md:col-span-7 lg:col-span-8 bg-inverse-surface text-white p-6 rounded-xl shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-bold font-headline mb-1">Coding Proficiency</h3>
                  <p className="text-neutral-400">
                    {coding.streak.activeDays} active days
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-4xl font-black font-headline text-primary-fixed">
                    {coding.totalSolved}
                  </p>
                  <p className="text-xs uppercase font-bold tracking-widest text-neutral-500">Solved</p>
                </div>
              </div>

              <div className="flex-1 min-h-0 mt-6 grid grid-cols-3 gap-4 md:gap-6 items-stretch">
                <DifficultyBar
                  label="easy"
                  solved={coding.solved.easy}
                  total={coding.available.easy}
                  color="bg-secondary-fixed"
                />
                <DifficultyBar
                  label="medium"
                  solved={coding.solved.medium}
                  total={coding.available.medium}
                  color="bg-tertiary-fixed"
                />
                <DifficultyBar
                  label="hard"
                  solved={coding.solved.hard}
                  total={coding.available.hard}
                  color="bg-primary-fixed"
                />
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
          </div>

          {/* Verified skills */}
          <div className="col-span-12 bg-surface-container-low p-6 rounded-xl">
            <div className="flex justify-between items-center mb-6 gap-4">
              <h3 className="text-base font-bold font-headline">Your Skillset</h3>
              <Link
                to="/profile"
                className="text-primary font-bold text-sm flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                Manage skills
                <span className="material-symbols-outlined text-sm shrink-0">chevron_right</span>
              </Link>
            </div>

            {skills.length ? (
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                {skills.map((skill) => (
                  <div
                    key={skill._id}
                    className="flex-shrink-0 bg-surface-container-lowest p-2 pr-6 rounded-full flex items-center gap-3 shadow-sm border border-outline-variant/10"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-lg">
                        {skill.verified ? 'verified' : 'code'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold whitespace-nowrap">{skill.name}</p>
                      <p className="text-[10px] uppercase font-black text-primary tracking-tighter">
                        {skill.level}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-on-surface-variant text-sm">
                No skills yet —{' '}
                <Link to="/profile" className="text-primary font-bold underline">
                  add your first one
                </Link>
                .
              </p>
            )}
          </div>

          {/* Tests */}
          <div className="col-span-12 lg:col-span-6 bg-secondary-container/30 p-6 rounded-xl border border-secondary-fixed flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-secondary-fixed rounded-2xl text-on-secondary-fixed">
                  <span className="material-symbols-outlined">quiz</span>
                </div>
                <div>
                  <h4 className="text-base font-bold font-headline">Skill Tests</h4>
                  <p className="text-sm text-on-secondary-fixed-variant">
                    {tests.taken ? `${tests.taken} taken` : "None taken yet"}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-on-secondary-container">
                  {tests.average}%
                </span>
                <span className="text-sm font-bold text-on-secondary-fixed-variant">average</span>
              </div>
            </div>
            <Link
              to="/skill-test"
              className="px-8 py-3 bg-secondary-container text-on-secondary-container rounded-full font-bold hover:opacity-90 transition-opacity border border-on-secondary-container/10"
            >
              {tests.taken ? 'Take another' : 'Start a test'}
            </Link>
          </div>

          {/* Next steps */}
          {/* Needs attention */}
          <div className="col-span-12 lg:col-span-5">
            <h3 className="text-lg font-bold font-headline mb-3">Needs your attention</h3>
            <NotificationList notifications={data.notifications} />
          </div>

          {/* Interview */}
          <div className="col-span-12 lg:col-span-7 bg-tertiary-container/25 p-6 rounded-xl border border-tertiary-container/40 flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-tertiary-fixed rounded-2xl text-on-tertiary-fixed">
                  <span className="material-symbols-outlined">record_voice_over</span>
                </div>
                <div>
                  <h4 className="text-base font-bold font-headline">Mock Interviews</h4>
                  <p className="text-sm text-on-tertiary-fixed-variant">
                    {interviews.completed ? `${interviews.completed} completed` : 'None yet'}
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-on-tertiary-container">
                  {interviews.average}%
                </span>
                <span className="text-sm font-bold text-on-tertiary-fixed-variant">average</span>
              </div>
            </div>
            <Link
              to={
                interviews.activeSessionId
                  ? `/ai-interview/session/${interviews.activeSessionId}`
                  : '/ai-interview'
              }
              className="px-6 py-3 bg-inverse-surface text-white rounded-full font-bold text-sm shadow-lg"
            >
              {interviews.activeSessionId
                ? 'Resume interview'
                : interviews.completed
                  ? 'Practise again'
                  : 'Start a round'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
