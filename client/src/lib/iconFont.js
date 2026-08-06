const ICON_FONT = '24px "Material Symbols Outlined"';

/**
 * Reveals icon glyphs only once the Material Symbols font is actually
 * available. Without this the ligature text renders as words, so a blocked
 * or slow font CDN would fill the interface with stray labels.
 *
 * If the font never arrives the class is never set and icons stay blank —
 * every icon-only control carries an aria-label, so the UI remains usable.
 */
export function revealIconsWhenFontReady() {
  const root = document.documentElement;
  const reveal = () => root.classList.add('fonts-ready');

  if (!document.fonts?.load) {
    // No Font Loading API — assume the stylesheet worked rather than hiding
    // every icon permanently.
    reveal();
    return;
  }

  document.fonts
    .load(ICON_FONT)
    .then((faces) => {
      if (faces.length > 0) reveal();
    })
    .catch(() => {
      /* Font unavailable: icons stay blank, labels carry the meaning. */
    });
}
