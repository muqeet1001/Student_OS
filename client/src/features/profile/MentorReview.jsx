import React, { useState } from 'react';
import { api } from '../../lib/api.js';
import { useApiResource } from '../../hooks/useApiResource.js';

const LABELS = { profile: 'Career profile', resume: 'Latest resume', interview: 'Interview answer', project: 'Project description', readiness: 'Readiness evidence' };

export default function MentorReview() {
  const { data, refetch } = useApiResource('/reviews/mine');
  const [busy, setBusy] = useState('');
  async function request(kind) {
    const note = window.prompt('What would you like the reviewer to focus on?', 'Please tell me the one change that would improve this most.');
    if (note === null) return;
    setBusy(kind);
    try { await api.post('/reviews', { kind, note }); await refetch({ quiet: true }); }
    catch (error) { window.alert(error.message || 'Could not request a review.'); }
    finally { setBusy(''); }
  }
  async function reply(review) {
    const body = window.prompt('Reply to the reviewer:');
    if (!body?.trim()) return;
    try { await api.post(`/reviews/${review._id}/messages`, { body: body.trim() }); await refetch({ quiet: true }); }
    catch (error) { window.alert(error.message || 'Could not send your reply.'); }
  }
  const reviews = data?.reviews ?? [];
  return <section className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Human feedback</p><h2 className="font-headline text-lg font-black mt-1">Ask a mentor or placement officer</h2><p className="text-sm text-on-surface-variant mt-1">Request one focused review instead of another automatic score.</p></div><div className="flex flex-wrap gap-2 mt-4">{['profile', 'resume', 'project'].map((kind) => <button key={kind} type="button" disabled={Boolean(busy) || reviews.some((review) => review.kind === kind && review.status === 'requested')} onClick={() => request(kind)} className="px-4 py-2 rounded-full bg-surface-container text-sm font-bold disabled:opacity-50">{reviews.some((review) => review.kind === kind && review.status === 'requested') ? `${LABELS[kind]} pending` : `Review ${LABELS[kind].toLowerCase()}`}</button>)}</div>{reviews.filter((review) => review.status === 'reviewed').slice(0, 3).map((review) => <div key={review._id} className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4"><p className="text-xs font-black uppercase tracking-wider text-green-700">{LABELS[review.kind]} feedback</p><p className="text-sm mt-2 leading-relaxed">{review.feedback}</p><p className="text-[10px] text-green-800/70 mt-2">Reviewed by {review.reviewer?.name ?? 'placement staff'}</p>{(review.messages ?? []).map((message) => <p key={message._id} className="mt-2 rounded-lg bg-white/70 p-2 text-xs"><strong>{message.author?.name}:</strong> {message.body}</p>)}<button type="button" onClick={() => reply(review)} className="mt-3 text-xs font-bold text-green-800 underline">Reply</button></div>)}</section>;
}
