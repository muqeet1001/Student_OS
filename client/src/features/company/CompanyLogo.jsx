import React from 'react';

/**
 * Renders a monogram in the company's brand colour rather than hotlinking a
 * logo we have no licence to redistribute.
 */
export default function CompanyLogo({ company, size = 44 }) {
  const initial = company.logoText || company.name.charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-xl font-headline font-black shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `${company.brandColor}1a`,
        color: company.brandColor,
        border: `1px solid ${company.brandColor}33`,
      }}
    >
      {initial}
    </span>
  );
}
