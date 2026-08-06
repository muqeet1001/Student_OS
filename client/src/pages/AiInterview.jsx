import React from 'react';
import { Link } from 'react-router-dom';

const CAPABILITIES = [
  {
    icon: 'forum',
    title: 'Role-specific questions',
    body: 'Pick a target role and the interviewer adapts its questions and follow-ups to it.',
  },
  {
    icon: 'insights',
    title: 'Live feedback',
    body: 'Clarity, confidence and keyword coverage tracked as you answer.',
  },
  {
    icon: 'grading',
    title: 'Scored report',
    body: 'A breakdown across technical depth and communication when the session ends.',
  },
];

/**
 * Placeholder until the interview service lands. It deliberately shows no
 * transcript or score: inventing them would misrepresent the student's
 * readiness, which is the one thing this product must get right.
 */
export default function AiInterview() {
  return (
    <div className="bg-surface text-on-surface min-h-dvh">
      <div className="max-w-4xl mx-auto px-5 md:px-8 pt-20 lg:pt-12 pb-16">
        <div className="rounded-xl bg-inverse-surface text-white p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-tertiary/30 blur-[90px]" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-container">
              <span className="material-symbols-outlined text-base">schedule</span>
              Coming next
            </span>
            <h1 className="font-headline text-3xl md:text-5xl font-black tracking-tight mt-6">
              AI Mock Interview
            </h1>
            <p className="text-inverse-on-surface text-lg leading-8 mt-5">
              Rehearse a full interview round and get scored on the things a real interviewer notices.
              This screen stays empty until the service is connected — a fabricated transcript would
              tell you nothing useful about where you stand.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {CAPABILITIES.map((item) => (
            <div
              key={item.title}
              className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10"
            >
              <div className="w-12 h-12 rounded-2xl bg-tertiary-container/40 text-tertiary flex items-center justify-center mb-5">
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <h2 className="font-headline font-bold text-lg mb-2">{item.title}</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl bg-secondary-container/30 border border-secondary-fixed p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-on-secondary-container font-medium">
            In the meantime, past interview questions are the closest practice available.
          </p>
          <Link
            to="/pyq-library"
            className="px-6 py-3 rounded-full bg-inverse-surface text-white font-bold text-sm shrink-0"
          >
            Browse PYQ library
          </Link>
        </div>
      </div>
    </div>
  );
}
