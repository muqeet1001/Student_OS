import React, { useRef, useState } from 'react';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StateBlocks.jsx';
import { useApiResource } from '../hooks/useApiResource.js';
import { api } from '../lib/api.js';

const STATUS_TONES = {
  pending: 'bg-secondary-container text-on-secondary-container',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-error-container/25 text-on-error-container',
};

const formatSize = (bytes) =>
  bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function UploadForm({ kinds, onUploaded, onCancel }) {
  const [kind, setKind] = useState(kinds[0]?.key ?? 'other');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function submit(event) {
    event.preventDefault();

    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('kind', kind);
      if (title) body.append('title', title);

      await api.post('/documents', body);
      onUploaded();
    } catch (caught) {
      window.alert(caught.message || 'Could not upload that file.');
    } finally {
      setUploading(false);
    }
  }

  const field =
    'w-full bg-surface-container-low border-2 border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container';
  const label = 'text-xs font-bold uppercase tracking-wider text-outline';

  return (
    <form
      onSubmit={submit}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 space-y-3"
    >
      <h3 className="font-headline text-base font-bold">Upload a document</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="space-y-1">
          <span className={label}>Type</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className={`${field} cursor-pointer`}
          >
            {kinds.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className={label}>Title (optional)</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Taken from the filename"
            className={field}
          />
        </label>

        <label className="space-y-1">
          <span className={label}>File</span>
          <input
            ref={fileRef}
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className={`${field} cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-surface-container file:px-2 file:py-1 file:text-xs file:font-bold`}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={uploading}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg font-bold text-sm text-on-surface-variant hover:bg-surface-container"
        >
          Cancel
        </button>
        <span className="text-[11px] text-outline">PDF or image, up to 10 MB.</span>
      </div>
    </form>
  );
}

/** A student's document vault. */
export default function Documents() {
  const { data, loading, error, refetch } = useApiResource('/documents');
  const [uploading, setUploading] = useState(false);

  if (loading && !data) return <LoadingBlock label="Loading your documents" className="min-h-dvh" />;
  if (error) {
    return (
      <div className="p-6 pt-16 lg:pt-6">
        <ErrorBlock error={error} onRetry={refetch} />
      </div>
    );
  }

  const { documents, kinds, missing } = data;

  /*
   * Fetched rather than linked. Auth is a Bearer token held in memory, and a
   * plain <a href> carries no Authorization header — the link would simply
   * 401. This pulls the bytes with credentials attached and hands the
   * browser a blob to save.
   */
  async function download(entry) {
    try {
      const response = await api.raw(`/documents/${entry._id}/download`);
      const blob = await response.blob();

      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = entry.filename || entry.title;
      window.document.body.append(anchor);
      anchor.click();
      anchor.remove();

      // Released on the next tick, so the click has definitely been handled.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (caught) {
      window.alert(caught.message || 'Could not download that file.');
    }
  }

  async function remove(document) {
    if (!window.confirm(`Delete "${document.title}"?`)) return;
    try {
      await api.delete(`/documents/${document._id}`);
      refetch({ quiet: true });
    } catch (caught) {
      window.alert(caught.message || 'Could not delete that.');
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-dvh">
      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-16 lg:pt-6 pb-10 space-y-4">
        <header>
          <h1 className="font-headline text-xl md:text-2xl font-black tracking-tight">
            Your documents
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Kept for the placement office — ID proof, marksheets, offer letters. Stored in the
            database, so they survive a redeploy.
          </p>
        </header>

        {missing.length > 0 && (
          <p className="bg-secondary-container/40 border border-outline-variant/60 rounded-xl px-4 py-3 text-xs">
            <span className="font-bold">Still needed: </span>
            {missing.map((kind) => kind.label).join(', ')}.
          </p>
        )}

        {uploading ? (
          <UploadForm
            kinds={kinds}
            onUploaded={() => {
              setUploading(false);
              refetch({ quiet: true });
            }}
            onCancel={() => setUploading(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setUploading(true)}
            className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-sm"
          >
            Upload a document
          </button>
        )}

        {documents.length === 0 ? (
          <EmptyBlock
            icon="folder"
            title="Nothing uploaded yet"
            description="Add your ID proof and marksheet — most drives ask for them."
          />
        ) : (
          <ul className="space-y-2">
            {documents.map((document) => (
              <li
                key={document._id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-4 flex items-start gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-sm truncate">{document.title}</h2>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-2xl shrink-0 ${
                        STATUS_TONES[document.status]
                      }`}
                    >
                      {document.status}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {kinds.find((kind) => kind.key === document.kind)?.label ?? document.kind} ·{' '}
                    {formatSize(document.size)} · {shortDate(document.createdAt)}
                  </p>

                  {document.reviewNote && (
                    <p className="text-xs text-on-error-container mt-1">{document.reviewNote}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => download(document)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Download
                  </button>
                  {document.status !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => remove(document)}
                      className="text-xs font-bold text-on-surface-variant hover:text-on-error-container"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
