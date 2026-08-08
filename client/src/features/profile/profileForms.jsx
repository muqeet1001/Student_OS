import React, { useState } from 'react';
import { ApiError } from '../../lib/api.js';
import { Checkbox, Input, Select, SubmitRow, TagInput, Textarea } from '../../components/fields.jsx';

/**
 * Shared submit plumbing for the profile dialogs: runs the request, maps
 * server field errors back onto inputs and keeps the busy state.
 */
export function useFormSubmit(onSubmit, onDone) {
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event, payload) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError('');

    try {
      await onSubmit(payload);
      onDone?.();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Unable to reach the server. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return { errors, formError, submitting, handleSubmit };
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 p-3 rounded-lg bg-error-container/15 border border-error/20">
      <span className="material-symbols-outlined text-error text-lg">error</span>
      <p className="text-sm font-bold text-on-error-container">{message}</p>
    </div>
  );
}

export function DetailsForm({ profile, user, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    headline: profile?.headline ?? '',
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    phone: profile?.phone ?? '',
    branch: profile?.branch ?? '',
    graduationYear: profile?.graduationYear ?? '',
    track: profile?.track ?? 'undecided',
    targetRoles: profile?.targetRoles ?? [],
    links: {
      github: profile?.links?.github ?? '',
      linkedin: profile?.links?.linkedin ?? '',
      portfolio: profile?.links?.portfolio ?? '',
      leetcode: profile?.links?.leetcode ?? '',
    },
  });

  const { errors, formError, submitting, handleSubmit } = useFormSubmit(onSubmit, onCancel);
  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));
  const setLink = (field) => (event) =>
    setForm((c) => ({ ...c, links: { ...c.links, [field]: event.target.value } }));

  return (
    <form
      className="space-y-3"
      onSubmit={(event) =>
        handleSubmit(event, {
          ...form,
          graduationYear: form.graduationYear === '' ? undefined : Number(form.graduationYear),
        })
      }
    >
      <FormError message={formError} />

      <Input label="Full name" value={form.name} onChange={set('name')} error={errors.name} required />
      <Input
        label="Headline"
        value={form.headline}
        onChange={set('headline')}
        error={errors.headline}
        placeholder="Computer Science & Engineering • Class of 2025"
      />
      <Textarea
        label="About you"
        value={form.bio}
        onChange={set('bio')}
        error={errors.bio}
        rows={4}
        placeholder="A short summary recruiters will read first."
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Branch" value={form.branch} onChange={set('branch')} error={errors.branch} />
        <Input
          label="Graduation year"
          type="number"
          min="1950"
          max="2100"
          value={form.graduationYear}
          onChange={set('graduationYear')}
          error={errors.graduationYear}
        />
        <Input label="Location" value={form.location} onChange={set('location')} error={errors.location} />
        <Input label="Phone" value={form.phone} onChange={set('phone')} error={errors.phone} />
      </div>

      <Select
        label="Track"
        value={form.track}
        onChange={set('track')}
        options={[
          { value: 'technical', label: 'Technical' },
          { value: 'management', label: 'Management' },
          { value: 'design', label: 'Design' },
          { value: 'undecided', label: 'Undecided' },
        ]}
      />

      <TagInput
        label="Target roles"
        value={form.targetRoles}
        onChange={(targetRoles) => setForm((c) => ({ ...c, targetRoles }))}
        placeholder="Frontend Engineer, then press Enter"
        max={10}
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="GitHub" value={form.links.github} onChange={setLink('github')} error={errors['links.github']} placeholder="https://github.com/…" />
        <Input label="LinkedIn" value={form.links.linkedin} onChange={setLink('linkedin')} error={errors['links.linkedin']} placeholder="https://linkedin.com/in/…" />
        <Input label="Portfolio" value={form.links.portfolio} onChange={setLink('portfolio')} error={errors['links.portfolio']} placeholder="https://…" />
        <Input label="LeetCode" value={form.links.leetcode} onChange={setLink('leetcode')} error={errors['links.leetcode']} placeholder="https://leetcode.com/u/…" />
      </div>

      <SubmitRow onCancel={onCancel} submitting={submitting} />
    </form>
  );
}

export function SkillForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    category: initial?.category ?? 'programming',
    level: initial?.level ?? 'intermediate',
  });
  const { errors, formError, submitting, handleSubmit } = useFormSubmit(onSubmit, onCancel);
  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));

  return (
    <form className="space-y-3" onSubmit={(event) => handleSubmit(event, form)}>
      <FormError message={formError} />
      <Input label="Skill" value={form.name} onChange={set('name')} error={errors.name} required placeholder="React.js" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Select
          label="Category"
          value={form.category}
          onChange={set('category')}
          options={[
            { value: 'programming', label: 'Programming' },
            { value: 'frontend', label: 'Frontend & UI' },
            { value: 'backend', label: 'Backend' },
            { value: 'database', label: 'Database' },
            { value: 'cloud', label: 'Cloud & DevOps' },
            { value: 'soft', label: 'Soft skills' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Select
          label="Level"
          value={form.level}
          onChange={set('level')}
          options={[
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' },
          ]}
        />
      </div>
      <SubmitRow onCancel={onCancel} submitting={submitting} />
    </form>
  );
}

export function ProjectForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    techStack: initial?.techStack ?? [],
    repoUrl: initial?.repoUrl ?? '',
    liveUrl: initial?.liveUrl ?? '',
    featured: initial?.featured ?? false,
  });
  const { errors, formError, submitting, handleSubmit } = useFormSubmit(onSubmit, onCancel);
  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));

  return (
    <form className="space-y-3" onSubmit={(event) => handleSubmit(event, form)}>
      <FormError message={formError} />
      <Input label="Title" value={form.title} onChange={set('title')} error={errors.title} required />
      <Textarea label="Description" value={form.description} onChange={set('description')} error={errors.description} rows={3} />
      <TagInput
        label="Tech stack"
        value={form.techStack}
        onChange={(techStack) => setForm((c) => ({ ...c, techStack }))}
        placeholder="React, then press Enter"
        max={15}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Repository URL" value={form.repoUrl} onChange={set('repoUrl')} error={errors.repoUrl} placeholder="https://github.com/…" />
        <Input label="Live URL" value={form.liveUrl} onChange={set('liveUrl')} error={errors.liveUrl} placeholder="https://…" />
      </div>
      <Checkbox
        label="Feature this project on my profile"
        checked={form.featured}
        onChange={(event) => setForm((c) => ({ ...c, featured: event.target.checked }))}
      />
      <SubmitRow onCancel={onCancel} submitting={submitting} />
    </form>
  );
}

export function CertificationForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    issuer: initial?.issuer ?? '',
    credentialId: initial?.credentialId ?? '',
    credentialUrl: initial?.credentialUrl ?? '',
    issuedAt: initial?.issuedAt ? initial.issuedAt.slice(0, 10) : '',
  });
  const { errors, formError, submitting, handleSubmit } = useFormSubmit(onSubmit, onCancel);
  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => handleSubmit(event, { ...form, issuedAt: form.issuedAt || undefined })}
    >
      <FormError message={formError} />
      <Input label="Certification" value={form.title} onChange={set('title')} error={errors.title} required placeholder="AWS Cloud Practitioner" />
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Issuer" value={form.issuer} onChange={set('issuer')} error={errors.issuer} placeholder="Amazon Web Services" />
        <Input label="Issued on" type="date" value={form.issuedAt} onChange={set('issuedAt')} error={errors.issuedAt} />
        <Input label="Credential ID" value={form.credentialId} onChange={set('credentialId')} error={errors.credentialId} />
        <Input label="Credential URL" value={form.credentialUrl} onChange={set('credentialUrl')} error={errors.credentialUrl} placeholder="https://…" />
      </div>
      <SubmitRow onCancel={onCancel} submitting={submitting} />
    </form>
  );
}

export function EducationForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    institution: initial?.institution ?? '',
    degree: initial?.degree ?? '',
    fieldOfStudy: initial?.fieldOfStudy ?? '',
    startYear: initial?.startYear ?? '',
    endYear: initial?.endYear ?? '',
    grade: initial?.grade ?? '',
  });
  const { errors, formError, submitting, handleSubmit } = useFormSubmit(onSubmit, onCancel);
  const set = (field) => (event) => setForm((c) => ({ ...c, [field]: event.target.value }));

  return (
    <form
      className="space-y-3"
      onSubmit={(event) =>
        handleSubmit(event, {
          ...form,
          startYear: form.startYear === '' ? undefined : Number(form.startYear),
          endYear: form.endYear === '' ? undefined : Number(form.endYear),
        })
      }
    >
      <FormError message={formError} />
      <Input label="Institution" value={form.institution} onChange={set('institution')} error={errors.institution} required />
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Degree" value={form.degree} onChange={set('degree')} error={errors.degree} placeholder="B.Tech" />
        <Input label="Field of study" value={form.fieldOfStudy} onChange={set('fieldOfStudy')} error={errors.fieldOfStudy} placeholder="Computer Science" />
        <Input label="Start year" type="number" min="1950" max="2100" value={form.startYear} onChange={set('startYear')} error={errors.startYear} />
        <Input label="End year" type="number" min="1950" max="2100" value={form.endYear} onChange={set('endYear')} error={errors.endYear} />
      </div>
      <Input label="Grade / CGPA" value={form.grade} onChange={set('grade')} error={errors.grade} placeholder="8.7 CGPA" />
      <SubmitRow onCancel={onCancel} submitting={submitting} />
    </form>
  );
}
