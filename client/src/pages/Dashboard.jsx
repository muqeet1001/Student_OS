import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiResource } from '../hooks/useApiResource.js';
import { ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import ReadinessCard from '../features/dashboard/ReadinessCard.jsx';
import TodayPlan from '../features/dashboard/TodayPlan.jsx';
import TargetRole from '../features/dashboard/TargetRole.jsx';
import NotificationList from '../features/dashboard/NotificationList.jsx';
import JobsForYou from '../features/dashboard/JobsForYou.jsx';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Panel({ title, action, children, className = '' }) {
  return (
    <section
      className={`bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-5 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ value, label, tone = '' }) {
  return (
    <div>
      <p className={`text-xl font-black font-headline tabular-nums leading-none ${tone}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mt-1">
        {label}
      </p>
    </div>
  );
}

function DifficultyBar({ label, solved, total }) {
  const pct = total ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 font-bold capitalize text-on-surface-variant">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
        <div className="h-full bg-on-surface/30 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right tabular-nums font-bold">
        {solved}/{total}
      </span>
    </div>
  );
}

/**
 * The dashboard answers three questions in order: where am I, what am I
 * missing, and what should I do next. Everything below the first row exists
 * to support one of those.
 */
export default function Dashboard() {
  const { data, loading, error, refetch } = useApiResource('/dashboard');
  const [roleOverride, setRoleOverride] = useState(undefined);

  if (loading && !data) return <LoadingBlock label="Loading your dashboard" className="min-h-dvh" />;
  if (error && !data) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const { readiness, coding, interviews, resume, skills, plan, recommendations } = data;
  const targetRole = roleOverride === undefined ? data.targetRole : roleOverride;
  const firstName = (data.student?.name ?? 'there').split(' ')[0];

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            You're <span className="font-bold text-on-surface">{readiness.score}%</span> placement
            ready.{' '}
            {readiness.score >= 80
              ? 'Start applying.'
              : `Your weakest area is ${readiness.components
                  .find((c) => c.key === readiness.weakest)
                  ?.label.toLowerCase()}.`}
          </p>
        </header>

        {/* Where am I · what next · what am I aiming at */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ReadinessCard readiness={readiness} />
          <TodayPlan plan={plan} />
          <TargetRole
            targetRole={targetRole}
            availableRoles={data.availableRoles}
            onChange={setRoleOverride}
          />
        </div>

        {recommendations.length > 0 && (
          <Panel title="Recommended for you">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {recommendations.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-container-low"
                >
                  <span className="material-symbols-outlined text-base text-primary shrink-0 mt-0.5">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed">{item.text}</p>
                    <Link
                      to={item.action.to}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-1.5 hover:underline"
                    >
                      {item.action.label}
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel
            title="Coding"
            action={
              <Link to="/coding-practice" className="text-xs font-bold text-primary hover:underline">
                Continue
              </Link>
            }
          >
            <div className="flex items-baseline gap-5 mb-4">
              <Stat value={coding.totalSolved} label="solved" />
              <Stat value={coding.streak.current} label="day streak" />
              <Stat value={coding.streak.longest} label="best" />
            </div>
            <div className="space-y-1.5">
              <DifficultyBar label="Easy" solved={coding.solved.easy} total={coding.available.easy} />
              <DifficultyBar
                label="Medium"
                solved={coding.solved.medium}
                total={coding.available.medium}
              />
              <DifficultyBar label="Hard" solved={coding.solved.hard} total={coding.available.hard} />
            </div>
          </Panel>

          <Panel
            title="Resume"
            action={
              <Link to="/resume-builder" className="text-xs font-bold text-primary hover:underline">
                Improve
              </Link>
            }
          >
            <div className="flex items-baseline gap-5 mb-3">
              <Stat value={resume.atsScore} label="ATS score" />
              <Stat
                value={resume.checks.filter((c) => c.passed).length}
                label={`of ${resume.checks.length} checks`}
              />
            </div>
            <ul className="space-y-1">
              {resume.checks
                .filter((check) => !check.passed)
                .slice(0, 3)
                .map((check) => (
                  <li key={check.label} className="flex items-start gap-1.5 text-xs">
                    <span className="material-symbols-outlined text-sm text-outline-variant shrink-0 mt-0.5">
                      radio_button_unchecked
                    </span>
                    <span className="text-on-surface-variant">{check.label}</span>
                  </li>
                ))}
              {resume.checks.every((c) => c.passed) && (
                <li className="text-xs text-green-700 font-bold">Every check passed.</li>
              )}
            </ul>
          </Panel>

          <Panel
            title="Mock interview"
            action={
              <Link to="/ai-interview" className="text-xs font-bold text-primary hover:underline">
                Practise
              </Link>
            }
          >
            {interviews.completed === 0 ? (
              <p className="text-sm text-on-surface-variant">
                You haven't tried one yet. A behavioural round takes about ten minutes.
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-5 mb-3">
                  <Stat value={`${interviews.average}%`} label="average" />
                  <Stat value={interviews.completed} label="completed" />
                </div>
                {interviews.latest?.dimensions && (
                  <ul className="space-y-1.5">
                    {Object.entries(interviews.latest.dimensions).map(([key, value]) => (
                      <li key={key} className="flex items-center gap-2 text-xs">
                        <span className="w-20 font-bold capitalize text-on-surface-variant">
                          {key}
                        </span>
                        <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className="h-full bg-on-surface/30 rounded-full"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                        <span className="w-8 text-right tabular-nums font-bold">{value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Panel>
        </div>

        <Panel
          title="Your skills"
          action={
            <Link to="/profile" className="text-xs font-bold text-primary hover:underline">
              Manage
            </Link>
          }
        >
          {skills.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              No skills yet —{' '}
              <Link to="/profile" className="text-primary font-bold underline">
                add your first
              </Link>
              , then verify it with a test.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div
                  key={skill._id}
                  className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/60"
                >
                  <span
                    className={`material-symbols-outlined text-base ${
                      skill.verified ? 'text-green-600' : 'text-outline-variant'
                    }`}
                    style={skill.verified ? { fontVariationSettings: '"FILL" 1' } : undefined}
                  >
                    {skill.verified ? 'verified' : 'radio_button_unchecked'}
                  </span>
                  <div>
                    <p className="text-xs font-bold leading-none">{skill.name}</p>
                    <p className="text-[10px] text-on-surface-variant capitalize mt-0.5">
                      {skill.verified ? skill.level : 'unverified'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <JobsForYou />

        <Panel title="Needs your attention">
          <NotificationList notifications={data.notifications} />
        </Panel>
      </div>
    </div>
  );
}
