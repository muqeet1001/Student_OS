import React from 'react';
import { Link } from 'react-router-dom';
import { useApiResource } from '../../hooks/useApiResource.js';
import MatchBadge from '../jobs/MatchBadge.jsx';

/**
 * Loaded separately from the dashboard payload: it needs every open job
 * scored against the student, which is heavier than the rest of the page and
 * should not delay the readiness number rendering.
 */
export default function JobsForYou() {
  const { data, loading } = useApiResource('/jobs/top-matches');
  const jobs = data?.jobs ?? [];

  if (loading || jobs.length === 0) return null;

  return (
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {jobs.map((job) => (
          <li key={job._id}>
            <Link
              to={`/jobs/${job._id}`}
              className="flex flex-col h-full p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-bold leading-snug truncate">{job.title}</span>
                {job.match && <MatchBadge score={job.match.score} />}
              </div>
              <span className="text-xs text-on-surface-variant truncate">{job.company}</span>

              {job.match?.missing?.length > 0 && (
                <span className="text-[10px] text-on-surface-variant mt-2 truncate">
                  Missing {job.match.missing.slice(0, 2).map((s) => s.name).join(', ')}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
  );
}
