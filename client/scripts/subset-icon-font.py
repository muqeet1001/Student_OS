"""
Subsets Material Symbols to the icons this app uses, and rebuilds the
ligature table so `<span class="material-symbols-outlined">home</span>` keeps
working unchanged.

WHY THE LIGATURE TABLE IS REBUILT RATHER THAN SUBSET
----------------------------------------------------
Material Symbols does not encode icon names as plain ligatures. It uses a
chained-contextual substitution (`rclt`/`rlig`, wrapped in an extension
lookup) covering every icon in the font. Subsetting that table has two
outcomes and no third:

  * Keep layout closure, and the closure walks the context rules and drags in
    all 6,593 glyphs. The "subset" comes out at 3.5 MB — a 9% saving.
  * Disable layout closure, and the substitution rules are pruned away
    entirely. The font is 40 KB and every icon renders as its own name in
    plain letters.

So the table is discarded and a minimal one is generated: one ligature rule
per icon, mapping the letters of its name to its glyph. Same markup, same
rendering, 0.4% of the bytes.

The `.fill` glyph variants are dropped. FILL is a real variable axis with
gvar deltas on the base glyph, so `font-variation-settings: 'FILL' 1`
interpolates without them.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.ttLib import TTFont


def build(source: Path, icons: list[str], out: Path) -> dict:
    font = TTFont(source)
    glyph_order = set(font.getGlyphOrder())

    missing = [icon for icon in icons if icon not in glyph_order]
    known = [icon for icon in icons if icon in glyph_order]

    if not known:
        raise SystemExit("None of the requested icons exist in the font.")

    # Letters the ligature rules consume. Taken from the icon names
    # themselves so the set is exactly what is needed and nothing more.
    letters = sorted({character for icon in known for character in icon})
    cmap = font.getBestCmap()
    letter_glyphs = {character: cmap[ord(character)] for character in letters if ord(character) in cmap}

    unmapped = [character for character in letters if character not in letter_glyphs]
    if unmapped:
        raise SystemExit(f"Font has no glyph for {unmapped!r}, so those names cannot ligate.")

    with tempfile.TemporaryDirectory() as tmp:
        stripped = Path(tmp) / "stripped.ttf"

        # Layout tables are dropped here, not subset. See the module docstring.
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(source),
                "--glyphs=" + ",".join(known + list(letter_glyphs.values())),
                "--layout-features=",
                "--drop-tables+=GSUB,GPOS",
                "--notdef-outline",
                # Without this the subsetter writes a version 3.0 post table
                # to save a few hundred bytes, discarding every glyph name —
                # and the ligature rules below are written in terms of those
                # names, so the feature compiler has nothing to bind to.
                "--glyph-names",
                "--output-file=" + str(stripped),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )

        subset = TTFont(stripped)

        # One rule per icon: the letters of the name substituted by its glyph.
        # `liga` and `rlig` are both on by default in browsers; emitting both
        # means the icons render whether or not a stylesheet has fiddled with
        # font-feature-settings.
        rules = "\n".join(
            f"    sub {' '.join(letter_glyphs[character] for character in icon)} by {icon};"
            for icon in sorted(known, key=len, reverse=True)  # longest first: 'home_work' before 'home'
        )

        addOpenTypeFeaturesFromString(
            subset,
            f"feature liga {{\n{rules}\n}} liga;\n\nfeature rlig {{\n{rules}\n}} rlig;\n",
        )

        out.parent.mkdir(parents=True, exist_ok=True)
        subset.flavor = "woff2"
        subset.save(out)

    return {
        "icons": sorted(known),
        "missing": sorted(missing),
        "sourceBytes": source.stat().st_size,
        "outputBytes": out.stat().st_size,
    }


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    result = build(Path(payload["source"]), payload["icons"], Path(payload["output"]))
    print(json.dumps(result))
