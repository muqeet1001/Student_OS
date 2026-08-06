import React, { useState } from 'react';

/** Deterministic tint per user, so initials avatars stay stable across renders. */
const PALETTE = [
  ['#ffdad2', '#a83206'],
  ['#ffe8b0', '#674c00'],
  ['#e6d8ff', '#544178'],
  ['#d3f0dd', '#12604a'],
  ['#d9e7ff', '#1c4b8f'],
];

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}

function tintFor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({ user, size = 40, className = '' }) {
  const [failed, setFailed] = useState(false);
  const name = user?.name || '';
  const src = user?.avatarUrl;
  const [background, color] = tintFor(user?._id || name);

  const style = { width: size, height: size };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s avatar` : 'Avatar'}
        style={style}
        onError={() => setFailed(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      aria-label={name ? `${name}'s avatar` : 'Avatar'}
      role="img"
      style={{ ...style, background, color, fontSize: Math.max(11, size * 0.36) }}
      className={`rounded-full shrink-0 flex items-center justify-center font-black tracking-tight select-none ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
