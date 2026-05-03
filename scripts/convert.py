"""
Convert markdown sources in src/ to readable HTML in docs/.

Reads:
  - src/vgc-training-plan.md
  - src/notes-distilled.md
  - src/pages/<slug>.md

Writes:
  - docs/index.html (main landing page)
  - docs/vgc-training-plan.html
  - docs/notes-distilled.html
  - docs/pages/<slug>.html
  - docs/style.css

docs/ is the GitHub Pages publish directory. Self-contained — no external packages required.
"""
import re
import html as htmllib
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT = SCRIPT_DIR.parent
SRC_DIR = REPO_ROOT / "src"
SRC_PAGES_DIR = SRC_DIR / "pages"
DOCS_DIR = REPO_ROOT / "docs"
DOCS_PAGES_DIR = DOCS_DIR / "pages"

CSS = """\
/* ===== Pokémon-cheerful palette ===== */
:root {
  --bg: #FFF9EE;                /* warm cream */
  --bg-elevated: #FFFFFF;       /* card surface */
  --bg-soft: #FFF3D6;           /* soft sunny tint */
  --fg: #2A2D34;                /* warm dark */
  --fg-muted: #6B6F76;          /* muted text */
  --fg-soft: #8E929A;           /* even softer */

  --primary: #DC2626;           /* Pokeball red */
  --primary-hover: #B91C1C;
  --primary-soft: #FEE2E2;

  --accent: #F59E0B;            /* Pikachu amber/gold */
  --accent-soft: #FEF3C7;       /* sticky-note yellow */

  --secondary: #2563EB;         /* sky blue */
  --secondary-soft: #DBEAFE;

  --success: #16A34A;           /* grass green */
  --success-soft: #DCFCE7;

  --border: #F0E2C2;            /* warm border */
  --border-soft: #F8EFD9;

  --shadow-sm: 0 1px 2px rgba(80,40,20,0.06);
  --shadow: 0 2px 8px rgba(80,40,20,0.08), 0 1px 3px rgba(220,38,38,0.04);
  --shadow-lg: 0 8px 24px rgba(80,40,20,0.10), 0 2px 6px rgba(220,38,38,0.06);

  --radius: 10px;
  --radius-sm: 6px;
  --radius-lg: 16px;

  /* Phase accent colors (Pokémon type-inspired) */
  --phase-0: #9CA3AF;   /* normal — gray */
  --phase-1: #3B82F6;   /* water — blue (diving in) */
  --phase-2: #FBBF24;   /* electric — yellow (speed) */
  --phase-3: #C026D3;   /* psychic — magenta (game plan) */
  --phase-4: #6B7280;   /* steel — slate (knowledge) */
  --phase-5: #F97316;   /* fire — orange (building) */
  --phase-6: #16A34A;   /* grass — green (sustainment) */
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: 80px; }

body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 18px;
  line-height: 1.7;
  color: var(--fg);
  background: var(--bg);
  margin: 0;
  padding: 0;
  /* subtle dotted background for warmth */
  background-image: radial-gradient(circle at 1px 1px, rgba(220,38,38,0.04) 1px, transparent 0);
  background-size: 24px 24px;
}

/* ===== Site header ===== */
.site-header {
  background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
  color: white;
  position: sticky;
  top: 0;
  z-index: 50;
  box-shadow: var(--shadow);
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  text-decoration: none;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.01em;
}
.logo:hover { color: var(--accent-soft); }
.logo svg {
  width: 28px;
  height: 28px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
}
.header-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.header-nav a {
  color: rgba(255,255,255,0.92);
  text-decoration: none;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.15s;
  white-space: nowrap;
}
.header-nav a:hover { background: rgba(255,255,255,0.15); color: white; }
.header-nav a.active {
  background: rgba(255,255,255,0.2);
  color: white;
}

/* ===== Layouts ===== */
.container {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 24px 100px;
}

.layout-with-toc {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 48px;
  padding: 0 24px 100px;
}
.layout-with-toc .content {
  min-width: 0;
  max-width: 760px;
}

/* ===== Hero (plan home) ===== */
.hero {
  background: linear-gradient(135deg, #FFF3D6 0%, #FFE7B8 50%, #FFD8A0 100%);
  border-bottom: 3px solid var(--accent);
  padding: 64px 24px 56px;
  margin-bottom: 32px;
  position: relative;
  overflow: hidden;
}
.hero::before {
  /* large pokeball watermark */
  content: "";
  position: absolute;
  right: -80px;
  top: -80px;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(220,38,38,0.08) 0%, rgba(220,38,38,0.04) 50%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}
.hero .badge {
  display: inline-block;
  background: var(--primary);
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 5px 12px;
  border-radius: 999px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-sm);
}
.hero h1 {
  font-size: 2.5em;
  font-weight: 800;
  line-height: 1.15;
  margin: 0 0 16px;
  color: var(--fg);
  letter-spacing: -0.02em;
}
.hero-subtitle {
  font-size: 1.15em;
  line-height: 1.55;
  color: var(--fg);
  max-width: 640px;
  margin: 0 0 24px;
}
.hero-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}
.hero-meta-item {
  background: rgba(255,255,255,0.7);
  border: 1px solid var(--border);
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--fg);
  backdrop-filter: blur(4px);
}
.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  font-size: 15px;
  border: 2px solid transparent;
  transition: transform 0.1s, box-shadow 0.15s;
}
.btn-primary {
  background: var(--primary);
  color: white;
  box-shadow: var(--shadow);
}
.btn-primary:hover {
  background: var(--primary-hover);
  color: white;
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}
.btn-ghost {
  background: rgba(255,255,255,0.7);
  color: var(--fg);
  border-color: var(--border);
}
.btn-ghost:hover {
  background: white;
  color: var(--primary);
  border-color: var(--primary);
}

/* ===== TOC sidebar ===== */
.toc-sidebar {
  position: sticky;
  top: 80px;
  align-self: start;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding-right: 8px;
}
.toc-inner {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 16px;
  box-shadow: var(--shadow-sm);
}
.toc-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
  margin: 0 0 10px;
  padding: 0 6px;
}
.toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13.5px;
  line-height: 1.45;
}
.toc-list li { margin: 0; }
.toc-list a {
  display: block;
  padding: 6px 8px;
  color: var(--fg-muted);
  text-decoration: none;
  border-radius: 5px;
  border-left: 3px solid transparent;
  transition: all 0.1s;
}
.toc-list a:hover {
  background: var(--accent-soft);
  color: var(--fg);
  border-left-color: var(--accent);
}

/* ===== Typography (content) ===== */
h1, h2, h3, h4, h5, h6 {
  line-height: 1.25;
  font-weight: 700;
  color: var(--fg);
  letter-spacing: -0.01em;
}
h1 {
  font-size: 2.0em;
  margin: 0.2em 0 0.6em;
}
h2 {
  font-size: 1.55em;
  margin: 2.2em 0 0.7em;
  padding-bottom: 0.3em;
  border-bottom: 2px solid var(--border);
}
h3 {
  font-size: 1.22em;
  margin: 1.8em 0 0.5em;
  color: var(--primary);
}
h4 {
  font-size: 1.05em;
  margin: 1.5em 0 0.3em;
  color: var(--secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.92em;
}

/* Phase header decoration */
.content h2[id^="phase-"] {
  display: flex;
  align-items: center;
  gap: 14px;
  border: none;
  background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-soft) 100%);
  padding: 18px 22px;
  border-radius: var(--radius);
  border-left: 6px solid var(--phase-0);
  margin-top: 2.5em;
  box-shadow: var(--shadow-sm);
  font-size: 1.35em;
}
.content h2[id^="phase-0"] { border-left-color: var(--phase-0); }
.content h2[id^="phase-1"] { border-left-color: var(--phase-1); }
.content h2[id^="phase-2"] { border-left-color: var(--phase-2); }
.content h2[id^="phase-3"] { border-left-color: var(--phase-3); }
.content h2[id^="phase-4"] { border-left-color: var(--phase-4); }
.content h2[id^="phase-5"] { border-left-color: var(--phase-5); }
.content h2[id^="phase-6"] { border-left-color: var(--phase-6); }

/* TOC active phase color matches */
.toc-list .toc-phase-0 a:hover { border-left-color: var(--phase-0); }
.toc-list .toc-phase-1 a:hover { border-left-color: var(--phase-1); }
.toc-list .toc-phase-2 a:hover { border-left-color: var(--phase-2); }
.toc-list .toc-phase-3 a:hover { border-left-color: var(--phase-3); }
.toc-list .toc-phase-4 a:hover { border-left-color: var(--phase-4); }
.toc-list .toc-phase-5 a:hover { border-left-color: var(--phase-5); }
.toc-list .toc-phase-6 a:hover { border-left-color: var(--phase-6); }

p { margin: 0.9em 0; }

a { color: var(--secondary); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; transition: color 0.1s; }
a:hover { color: var(--primary); }

ul, ol { padding-left: 1.5em; margin: 0.8em 0; }
li { margin: 0.5em 0; }
li > p { margin: 0.4em 0; }

/* Custom checkboxes — visual stand-ins so checklist items feel actionable */
li.checklist-item {
  list-style: none;
  margin-left: -1.5em;
  padding-left: 4px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  line-height: 1.6;
}
.checkbox-empty, .checkbox-filled {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 4px;
}
.checkbox-empty {
  background: var(--bg-elevated);
  border: 2px solid var(--border);
}
.checkbox-empty:hover {
  border-color: var(--success);
  background: var(--success-soft);
}
.checkbox-filled {
  background: var(--success);
  border: 2px solid var(--success);
  color: white;
}

code {
  background: var(--bg-soft);
  border: 1px solid var(--border);
  padding: 0.1em 0.4em;
  border-radius: 4px;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 0.88em;
  color: var(--primary);
}
pre {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  padding: 16px 20px;
  border-radius: var(--radius);
  overflow-x: auto;
  font-size: 0.9em;
  line-height: 1.6;
  box-shadow: var(--shadow-sm);
}
pre code {
  background: none;
  border: none;
  padding: 0;
  color: var(--fg);
}

/* Blockquotes as "Trainer Tip" sticky notes */
blockquote {
  margin: 1.4em 0;
  padding: 14px 18px 14px 50px;
  background: var(--accent-soft);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--fg);
  position: relative;
  box-shadow: var(--shadow-sm);
}
blockquote::before {
  content: "💡";
  position: absolute;
  left: 16px;
  top: 12px;
  font-size: 20px;
}
blockquote p { margin: 0.4em 0; }

hr {
  border: 0;
  height: 24px;
  margin: 2.5em 0;
  background-image: radial-gradient(circle, var(--border) 2px, transparent 2px);
  background-size: 16px 24px;
  background-position: center;
  background-repeat: repeat-x;
}

/* Tables — cheerful */
table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  margin: 1.4em 0;
  font-size: 0.95em;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
thead { background: linear-gradient(135deg, var(--primary) 0%, #EF4444 100%); }
th {
  color: white;
  font-weight: 600;
  text-align: left;
  padding: 12px 16px;
  border: none;
  font-size: 0.92em;
  letter-spacing: 0.01em;
}
td {
  padding: 12px 16px;
  border-top: 1px solid var(--border-soft);
  vertical-align: top;
}
tbody tr:nth-child(even) { background: var(--bg-soft); }
tbody tr:hover { background: var(--accent-soft); }

strong { font-weight: 700; color: var(--fg); }
em { font-style: italic; }

/* ===== Library (article directory) ===== */
.library-intro {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-left: 4px solid var(--secondary);
  padding: 18px 22px;
  border-radius: var(--radius);
  margin: 0 0 32px;
  color: var(--fg);
  box-shadow: var(--shadow-sm);
}
.library-intro strong { color: var(--secondary); }

.cat-section {
  margin: 36px 0;
}
.cat-section h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.4em;
  border: none;
  margin-bottom: 16px;
  color: var(--fg);
}
.cat-badge {
  background: var(--accent-soft);
  color: var(--primary);
  font-size: 0.65em;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--accent);
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.lib-card {
  display: block;
  padding: 14px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--fg);
  transition: transform 0.1s, border-color 0.15s, box-shadow 0.15s;
  box-shadow: var(--shadow-sm);
}
.lib-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  color: var(--fg);
}
.lib-card .title { font-weight: 600; color: var(--primary); margin-bottom: 4px; line-height: 1.35; }
.lib-card .meta { font-size: 0.82em; color: var(--fg-muted); }

/* ===== Article page ===== */
.article-back {
  margin-bottom: 16px;
}

/* ===== Footer ===== */
.site-footer {
  border-top: 1px solid var(--border);
  background: var(--bg-soft);
  padding: 32px 24px;
  margin-top: 48px;
  text-align: center;
  color: var(--fg-muted);
  font-size: 14px;
}
.site-footer a { color: var(--primary); }

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .layout-with-toc {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 0 20px 80px;
  }
  .toc-sidebar {
    position: static;
    max-height: none;
    margin-top: 0;
  }
  .toc-inner {
    background: var(--bg-soft);
  }
  .hero { padding: 40px 20px 36px; }
  .hero h1 { font-size: 2em; }
  .container { padding: 28px 20px 80px; }
  body { font-size: 17px; }
}
@media (max-width: 540px) {
  .hero h1 { font-size: 1.7em; }
  .hero-subtitle { font-size: 1.05em; }
  .header-inner { padding: 12px 16px; }
  .logo { font-size: 15px; }
  .header-nav a { padding: 6px 12px; font-size: 13px; }
}
"""


# ----- Markdown → HTML converter -----

INLINE_LINK_MD = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
INLINE_BOLD = re.compile(r"\*\*([^*]+)\*\*")
INLINE_ITALIC = re.compile(r"(?<![*\w])\*([^*\n]+)\*(?!\*)")
INLINE_CODE = re.compile(r"`([^`]+)`")
INLINE_STRIKE = re.compile(r"~~([^~]+)~~")


def _rewrite_link(target):
    """Rewrite .md links to .html so local navigation works in the html/ folder."""
    if target.startswith(("http://", "https://", "mailto:", "#")):
        return target
    # local file ref — rewrite .md → .html
    if target.endswith(".md"):
        return target[:-3] + ".html"
    return target


def inline_format(text):
    """Apply inline markdown to a text segment that's already escaped."""
    # We do the link replacement on already-escaped text but extract the
    # raw URL/label first, then re-escape only the label portion.
    # Simplest: process inline markdown BEFORE escaping the surrounding text.
    # But our pipeline escapes first, then formats. So work with escaped text.

    def link_repl(m):
        label = m.group(1)
        target = m.group(2)
        target = _rewrite_link(target)
        # un-escape & in the URL since URLs use & literally
        target_attr = htmllib.escape(target, quote=True)
        return f'<a href="{target_attr}">{label}</a>'

    text = INLINE_LINK_MD.sub(link_repl, text)
    text = INLINE_CODE.sub(lambda m: f"<code>{m.group(1)}</code>", text)
    text = INLINE_BOLD.sub(lambda m: f"<strong>{m.group(1)}</strong>", text)
    text = INLINE_ITALIC.sub(lambda m: f"<em>{m.group(1)}</em>", text)
    text = INLINE_STRIKE.sub(lambda m: f"<s>{m.group(1)}</s>", text)
    return text


def escape_text(text):
    return htmllib.escape(text, quote=False)


def parse_table(rows):
    """Parse a markdown table from a list of raw lines (without trailing newlines)."""
    # rows[0] = header, rows[1] = separator, rows[2:] = body
    def split_row(line):
        line = line.strip()
        if line.startswith("|"):
            line = line[1:]
        if line.endswith("|"):
            line = line[:-1]
        return [c.strip() for c in line.split("|")]

    header = split_row(rows[0])
    body = [split_row(r) for r in rows[2:]]
    out = ["<table>", "<thead><tr>"]
    for cell in header:
        out.append(f"<th>{inline_format(escape_text(cell))}</th>")
    out.append("</tr></thead>")
    out.append("<tbody>")
    for row in body:
        out.append("<tr>")
        for cell in row:
            out.append(f"<td>{inline_format(escape_text(cell))}</td>")
        out.append("</tr>")
    out.append("</tbody></table>")
    return "\n".join(out)


def md_to_html(md_text):
    """Convert markdown text to HTML. Handles headings, lists, tables, code, blockquote, hr, links, inline formatting."""
    lines = md_text.splitlines()
    out = []
    i = 0
    n = len(lines)

    def flush_paragraph(buf):
        if buf:
            joined = " ".join(buf).strip()
            if joined:
                out.append(f"<p>{inline_format(escape_text(joined))}</p>")
            buf.clear()

    para_buf = []

    while i < n:
        line = lines[i]
        stripped = line.rstrip()

        # blank line → flush paragraph
        if not stripped.strip():
            flush_paragraph(para_buf)
            i += 1
            continue

        # Code fence
        if stripped.startswith("```"):
            flush_paragraph(para_buf)
            i += 1
            code_lines = []
            while i < n and not lines[i].rstrip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            code_html = "\n".join(escape_text(l) for l in code_lines)
            out.append(f"<pre><code>{code_html}</code></pre>")
            continue

        # Heading
        m = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if m:
            flush_paragraph(para_buf)
            level = len(m.group(1))
            text = m.group(2).strip()
            out.append(f"<h{level}>{inline_format(escape_text(text))}</h{level}>")
            i += 1
            continue

        # Horizontal rule
        if re.match(r"^-{3,}\s*$", stripped) or re.match(r"^\*{3,}\s*$", stripped):
            flush_paragraph(para_buf)
            out.append("<hr>")
            i += 1
            continue

        # Blockquote
        if stripped.lstrip().startswith(">"):
            flush_paragraph(para_buf)
            quote_lines = []
            while i < n and lines[i].lstrip().startswith(">"):
                quote_lines.append(lines[i].lstrip()[1:].lstrip())
                i += 1
            quote_text = " ".join(quote_lines)
            out.append(f"<blockquote>{inline_format(escape_text(quote_text))}</blockquote>")
            continue

        # Table — header row then separator row
        if "|" in stripped and (i + 1 < n) and re.match(r"^\s*\|?\s*[:\-\| ]+\s*$", lines[i + 1]) and "-" in lines[i + 1]:
            flush_paragraph(para_buf)
            tbl_rows = [stripped, lines[i + 1].rstrip()]
            j = i + 2
            while j < n and lines[j].strip().startswith("|"):
                tbl_rows.append(lines[j].rstrip())
                j += 1
            out.append(parse_table(tbl_rows))
            i = j
            continue

        # Unordered list
        if re.match(r"^\s*[-*]\s+", stripped):
            flush_paragraph(para_buf)
            out.append("<ul>")
            while i < n:
                cur = lines[i].rstrip()
                m_li = re.match(r"^(\s*)[-*]\s+(.*)$", cur)
                if not m_li:
                    if cur.strip() == "":
                        # blank line — could be end of list or continuation
                        # peek ahead
                        if i + 1 < n and re.match(r"^\s*[-*]\s+", lines[i + 1]):
                            i += 1
                            continue
                        else:
                            break
                    else:
                        # continuation of previous li (indented)
                        if cur.startswith("  ") or cur.startswith("\t"):
                            # append to last <li>
                            if out and out[-1].startswith("<li>"):
                                out[-1] = out[-1][:-5] + " " + inline_format(escape_text(cur.strip())) + "</li>"
                            i += 1
                            continue
                        else:
                            break
                content = m_li.group(2)
                # Check for checkbox
                cb = re.match(r"^\[([ xX])\]\s+(.*)$", content)
                if cb:
                    checked = cb.group(1).lower() == "x"
                    cb_text = cb.group(2)
                    klass = "checkbox-filled" if checked else "checkbox-empty"
                    mark = "✓" if checked else ""
                    out.append(
                        f'<li class="checklist-item">'
                        f'<span class="{klass}">{mark}</span>'
                        f'{inline_format(escape_text(cb_text))}</li>'
                    )
                else:
                    out.append(f"<li>{inline_format(escape_text(content))}</li>")
                i += 1
            out.append("</ul>")
            continue

        # Ordered list
        if re.match(r"^\s*\d+\.\s+", stripped):
            flush_paragraph(para_buf)
            out.append("<ol>")
            while i < n:
                cur = lines[i].rstrip()
                m_li = re.match(r"^(\s*)\d+\.\s+(.*)$", cur)
                if not m_li:
                    if cur.strip() == "":
                        if i + 1 < n and re.match(r"^\s*\d+\.\s+", lines[i + 1]):
                            i += 1
                            continue
                        else:
                            break
                    else:
                        if cur.startswith("  ") or cur.startswith("\t"):
                            # continuation: append to previous <li>
                            if out and out[-1].startswith("<li>"):
                                # inline continuation
                                continuation = cur.strip()
                                # Sub-list detection: if it starts with `- ` make it nested
                                m_sub = re.match(r"^[-*]\s+(.*)$", continuation)
                                if m_sub:
                                    # Convert previous <li>...</li> to keep open and start a sublist
                                    last = out[-1]
                                    if last.endswith("</li>"):
                                        out[-1] = last[:-5]
                                        out.append("<ul>")
                                        # gather all sub-list items
                                        while i < n:
                                            sub_line = lines[i].rstrip()
                                            ms = re.match(r"^\s*[-*]\s+(.*)$", sub_line)
                                            if not ms:
                                                break
                                            out.append(f"<li>{inline_format(escape_text(ms.group(1)))}</li>")
                                            i += 1
                                        out.append("</ul></li>")
                                        continue
                                else:
                                    out[-1] = out[-1][:-5] + " " + inline_format(escape_text(continuation)) + "</li>"
                                    i += 1
                                    continue
                            i += 1
                            continue
                        else:
                            break
                content = m_li.group(2)
                out.append(f"<li>{inline_format(escape_text(content))}</li>")
                i += 1
            out.append("</ol>")
            continue

        # Default: paragraph text
        para_buf.append(stripped)
        i += 1

    flush_paragraph(para_buf)
    return "\n".join(out)


# ----- Page templates -----

POKEBALL_SVG = '''<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="16" cy="16" r="15" fill="white" stroke="#1a1a1a" stroke-width="2"/>
  <path d="M1 16 A15 15 0 0 1 31 16 Z" fill="#DC2626" stroke="#1a1a1a" stroke-width="2"/>
  <line x1="1" y1="16" x2="31" y2="16" stroke="#1a1a1a" stroke-width="2"/>
  <circle cx="16" cy="16" r="4.5" fill="white" stroke="#1a1a1a" stroke-width="2"/>
  <circle cx="16" cy="16" r="2" fill="white" stroke="#1a1a1a" stroke-width="1.5"/>
</svg>'''


def header_html(css_path_prefix, active=None):
    """Render the global site header. active in {'home','library',None}."""
    home_class = ' class="active"' if active == "home" else ""
    library_class = ' class="active"' if active == "library" else ""
    return f'''<header class="site-header">
  <div class="header-inner">
    <a class="logo" href="{css_path_prefix}index.html">
      {POKEBALL_SVG}
      <span>VGC Training</span>
    </a>
    <nav class="header-nav">
      <a href="{css_path_prefix}index.html"{home_class}>🏠 Training plan</a>
      <a href="{css_path_prefix}library.html"{library_class}>📚 Article library</a>
      <a href="{css_path_prefix}notes-distilled.html">📝 Quick notes</a>
    </nav>
  </div>
</header>'''


def footer_html(css_path_prefix):
    return f'''<footer class="site-footer">
  <p>Synthesized from <a href="https://www.vgcguide.com" target="_blank" rel="noopener">vgcguide.com</a> · Source by Wolfe Glick, Aaron "Cybertron" Zheng, and Aaron Traylor</p>
  <p><a href="{css_path_prefix}library.html">Browse all 61 articles</a> · <a href="{css_path_prefix}notes-distilled.html">Quick-reference notes</a></p>
</footer>'''


def slugify_anchor(text):
    """Make an HTML id slug from heading text (already-escaped HTML)."""
    # strip any tags
    text = re.sub(r"<[^>]+>", "", text)
    # decode entities
    text = htmllib.unescape(text)
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text).strip("-")
    return text or "section"


def add_h2_anchors_and_extract_toc(html):
    """Find every <h2>...</h2>, add id attributes, return (annotated_html, toc_items).
    toc_items is a list of (slug, label) tuples."""
    items = []
    seen = set()

    def repl(m):
        text = m.group(1)
        base_slug = slugify_anchor(text)
        slug = base_slug
        n = 2
        while slug in seen:
            slug = f"{base_slug}-{n}"
            n += 1
        seen.add(slug)
        # Strip markdown remnants from label for TOC
        label = re.sub(r"<[^>]+>", "", text)
        label = htmllib.unescape(label)
        items.append((slug, label))
        return f'<h2 id="{slug}">{text}</h2>'

    annotated = re.sub(r"<h2>(.*?)</h2>", repl, html, flags=re.DOTALL)
    return annotated, items


def render_toc(items):
    """Render the sticky TOC sidebar from a list of (slug, label) tuples.
    Phase headings get a class for color coding."""
    if not items:
        return ""
    lines = ['<aside class="toc-sidebar"><div class="toc-inner">',
             '<p class="toc-title">Plan contents</p>',
             '<ul class="toc-list">']
    for slug, label in items:
        # phase color class (e.g., toc-phase-3 if slug starts with phase-3)
        phase_class = ""
        m = re.match(r"phase-(\d)", slug)
        if m:
            phase_class = f' class="toc-phase-{m.group(1)}"'
        # shorten phase labels for sidebar
        short = label
        if short.startswith("Phase "):
            # "Phase 2 — Information compression: speed, damage, positioning (4–6 weeks)"
            short = re.sub(r"\s*\([^)]*\)\s*$", "", short)  # trim parenthetical
        lines.append(f'<li{phase_class}><a href="#{slug}">{htmllib.escape(short)}</a></li>')
    lines.append("</ul></div></aside>")
    return "\n".join(lines)


def render_plan_home(title, body_md):
    """Render the training plan as the homepage with hero + TOC + content."""
    body_html = md_to_html(body_md)
    annotated, toc_items = add_h2_anchors_and_extract_toc(body_html)

    # Strip the leading H1 (and the immediately-following emphasized intro paragraphs)
    # since the hero replaces them.
    annotated = re.sub(r"^\s*<h1>[^<]*</h1>\s*", "", annotated, count=1)

    # Pull the first H2 anchor for the "Start at..." button to scroll to
    first_phase_slug = None
    for slug, _ in toc_items:
        if slug.startswith("phase-0"):
            first_phase_slug = slug
            break
    start_target = f"#{first_phase_slug}" if first_phase_slug else "#how-to-use-this-document"

    hero = f'''<section class="hero">
  <div class="hero-inner">
    <span class="badge">Personalized training plan</span>
    <h1>From Pokémon noob to ladder competent</h1>
    <p class="hero-subtitle">A 6-phase plan synthesized from vgcguide.com — paced for hobbyists, with diagnostic checkpoints and burnout protocols. Built around your starting profile (singles experience, no doubles fundamentals yet).</p>
    <div class="hero-meta">
      <span class="hero-meta-item">🎯 Goal: 1400–1600 ELO</span>
      <span class="hero-meta-item">⏱️ ~3–5 hrs/week</span>
      <span class="hero-meta-item">🧠 5 dimensions tested</span>
      <span class="hero-meta-item">🔥 Burnout-aware</span>
    </div>
    <div class="hero-actions">
      <a href="{start_target}" class="btn btn-primary">Start with Phase 0 →</a>
      <a href="library.html" class="btn btn-ghost">📚 Browse 61 source articles</a>
    </div>
  </div>
</section>'''

    toc = render_toc(toc_items)

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{htmllib.escape(title)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
{header_html("", active="home")}
{hero}
<div class="layout-with-toc">
{toc}
<main class="content">
{annotated}
</main>
</div>
{footer_html("")}
</body>
</html>
'''


def render_library(title, body_html_inner):
    """Render the library directory page."""
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{htmllib.escape(title)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
{header_html("", active="library")}
<main class="container">
{body_html_inner}
</main>
{footer_html("")}
</body>
</html>
'''


def render_article(title, body_md, source_slug):
    """Render an individual article page (in pages/ subdir)."""
    body_html = md_to_html(body_md)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{htmllib.escape(title)}</title>
<link rel="stylesheet" href="../style.css">
</head>
<body>
{header_html("../")}
<main class="container">
<p class="article-back"><a href="../library.html">← All articles</a></p>
{body_html}
</main>
{footer_html("../")}
</body>
</html>
'''


def render_notes(title, body_md):
    """Render the distilled-notes page (top level, no hero)."""
    body_html = md_to_html(body_md)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{htmllib.escape(title)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
{header_html("")}
<main class="container">
{body_html}
</main>
{footer_html("")}
</body>
</html>
'''


# ----- Index page builder -----

CATEGORIES = {
    "Foundations": [
        "preface",
        "introduction-to-competitive-pokemon",
        "coming-from-breeding-or-shiny-hunting",
        "coming-from-single-battles",
        "the-basics-of-watching-a-pokemon-match",
        "what-are-the-rules-of-a-vgc-battle",
        "base-stats",
        "what-is-pokemon-showdown",
        "everyone-is-learning-all-the-time",
        "subjectivity",
        "context-pt1",
        "context-pt2",
    ],
    "Teambuilding": [
        "teambuilding-introduction",
        "intent",
        "brainstorming-ideas-to-start-teams",
        "you-dont-need-to-teambuild-to-play-pokemon",
        "how-to-use-someone-elses-team",
        "typing",
        "utility-moves",
        "speed-control",
        "items",
        "protect",
        "trick-room",
        "what-makes-a-pokemon-good",
        "synergy",
        "cores-and-modes",
        "archetypes",
        "consistency",
        "your-team-determines-your-luck",
        "accuracy-vs-power",
        "surprise-factor",
        "metagame",
        "team-playstyle-and-pace",
        "how-to-pull-it-all-together",
        "how-to-win-sometimes-with-your-favorites",
        "6th-pokemon-syndrome",
        "how-to-beat-a-pokemon",
        "island-pokemon",
        "when-do-you-move-on-from-a-team",
        "why-you-should-keep-an-open-mind",
        "bo1-vs-bo3",
        "how-do-you-know-if-a-team-youve-made-is-good",
        "how-do-you-know-which-team-to-take-to-a-tournament",
        "what-to-do-when-time-is-running-out",
    ],
    "Battling": [
        "competitive-pokemon-is-less-luck-than-you-think",
        "building-up-a-knowledge-base",
        "approaching-best-of-1-vs-best-of-3",
        "analyzing-your-opponents-teams",
        "team-preview",
        "what-is-a-game-plan",
        "what-is-pressure",
        "predictions",
        "protect-in-battle",
        "switching",
        "battling-against-trick-room",
        "1-hp-is-infinitely-more-than-0-hp",
        "how-to-analyze-a-battle",
        "battling-example-will-tansley-vs-nils-dunlop-worlds-2017",
        "battling-examples-diana-bros-vs-paul-chua-naic-2019",
        "battling-example-alister-sandover-vs-edoardo-giunipero-ferraris",
        "what-is-a-good-ladder-rating",
    ],
}


SLUG_TITLE_OVERRIDES = {
    "6th-pokemon-syndrome": "6th Pokémon Syndrome",
    "1-hp-is-infinitely-more-than-0-hp": "1 HP Is Infinitely More Than 0 HP",
    "bo1-vs-bo3": "Bo1 vs Bo3",
    "approaching-best-of-1-vs-best-of-3": "Approaching Best of 1 vs Best of 3",
    "you-dont-need-to-teambuild-to-play-pokemon": "You Don't Need to Teambuild to Play Pokémon",
    "how-to-use-someone-elses-team": "How to Use Someone Else's Team",
    "everyone-is-learning-all-the-time": "Everyone Is Learning All the Time",
    "the-basics-of-watching-a-pokemon-match": "The Basics of Watching a Pokémon Match",
    "what-are-the-rules-of-a-vgc-battle": "What Are the Rules of a VGC Battle",
    "what-is-pokemon-showdown": "What Is Pokémon Showdown",
    "what-is-a-good-ladder-rating": "What Is a Good Ladder Rating",
    "what-is-a-game-plan": "What Is a Game Plan",
    "what-is-pressure": "What Is Pressure",
    "what-makes-a-pokemon-good": "What Makes a Pokémon Good",
    "what-to-do-when-time-is-running-out": "What to Do When Time Is Running Out",
    "introduction-to-competitive-pokemon": "Introduction to Competitive Pokémon",
    "coming-from-breeding-or-shiny-hunting": "Coming from Breeding or Shiny Hunting",
    "coming-from-single-battles": "Coming from Single Battles",
    "context-pt1": "Context — Part 1",
    "context-pt2": "Context — Part 2",
    "brainstorming-ideas-to-start-teams": "Brainstorming Ideas to Start Teams",
    "how-to-pull-it-all-together": "How to Pull It All Together",
    "how-to-win-sometimes-with-your-favorites": "How to Win (Sometimes) with Your Favorites",
    "how-to-beat-a-pokemon": "How to Beat a Pokémon",
    "when-do-you-move-on-from-a-team": "When Do You Move On from a Team",
    "why-you-should-keep-an-open-mind": "Why You Should Keep an Open Mind",
    "how-do-you-know-if-a-team-youve-made-is-good": "How Do You Know If a Team You've Made Is Good",
    "how-do-you-know-which-team-to-take-to-a-tournament": "How Do You Know Which Team to Take to a Tournament",
    "battling-example-will-tansley-vs-nils-dunlop-worlds-2017": "Battling Example: Will Tansley vs Nils Dunlop (Worlds 2017)",
    "battling-examples-diana-bros-vs-paul-chua-naic-2019": "Battling Example: Diana Bros vs Paul Chua (NAIC 2019)",
    "battling-example-alister-sandover-vs-edoardo-giunipero-ferraris": "Battling Example: Alister Sandover vs Edoardo Giunipero-Ferraris",
    "competitive-pokemon-is-less-luck-than-you-think": "Competitive Pokémon Is Less Luck Than You Think",
    "your-team-determines-your-luck": "Your Team Determines Your Luck",
    "analyzing-your-opponents-teams": "Analyzing Your Opponent's Teams",
    "battling-against-trick-room": "Battling Against Trick Room",
    "building-up-a-knowledge-base": "Building Up a Knowledge Base",
    "cores-and-modes": "Cores and Modes",
    "team-playstyle-and-pace": "Team Playstyle and Pace",
    "accuracy-vs-power": "Accuracy vs Power",
    "protect-in-battle": "Protect in Battle",
}


def slug_title(slug):
    if slug in SLUG_TITLE_OVERRIDES:
        return SLUG_TITLE_OVERRIDES[slug]
    title = slug.replace("-", " ").title()
    title = title.replace("Vgc", "VGC").replace("Pokemon", "Pokémon")
    return title


def page_word_count(slug):
    p = SRC_PAGES_DIR / f"{slug}.md"
    if not p.exists():
        return 0
    text = p.read_text(encoding="utf-8")
    return len(text.split())


CATEGORY_ICONS = {
    "Foundations": "🌱",
    "Teambuilding": "🛠️",
    "Battling": "⚔️",
}


def build_library():
    """Render the article-directory page (was index.html)."""
    intro = '''<div class="library-intro">
<strong>📚 Article library.</strong> The full text of all 61 articles from <a href="https://www.vgcguide.com" target="_blank" rel="noopener">vgcguide.com</a>, organized by category. The training plan tells you which articles to read at each phase — these are here for re-reads and deep-dives.
</div>'''

    sections = ['<h1>Article library</h1>', intro]

    for category, slugs in CATEGORIES.items():
        icon = CATEGORY_ICONS.get(category, "📄")
        cards = []
        for slug in slugs:
            wc = page_word_count(slug)
            if wc == 0:
                continue
            title = slug_title(slug)
            cards.append(
                f'<a class="lib-card" href="pages/{slug}.html">'
                f'<div class="title">{htmllib.escape(title)}</div>'
                f'<div class="meta">{wc:,} words</div>'
                f'</a>'
            )
        sections.append(
            f'<div class="cat-section">'
            f'<h2>{icon} {category} <span class="cat-badge">{len(cards)} articles</span></h2>'
            f'<div class="card-grid">{"".join(cards)}</div>'
            f'</div>'
        )

    return render_library("Article library — VGC Training", "\n".join(sections))


# ----- Main -----

def main():
    DOCS_DIR.mkdir(exist_ok=True)
    DOCS_PAGES_DIR.mkdir(exist_ok=True)

    # Write CSS
    (DOCS_DIR / "style.css").write_text(CSS, encoding="utf-8")

    # 1. Plan = homepage (index.html) — hero + TOC + content
    plan_src = SRC_DIR / "vgc-training-plan.md"
    if plan_src.exists():
        plan_md = plan_src.read_text(encoding="utf-8")
        plan_html = render_plan_home("VGC Training Plan — Noob to Ladder Competent", plan_md)
        (DOCS_DIR / "index.html").write_text(plan_html, encoding="utf-8")
        print("wrote: docs/index.html  (training plan = home)")
    else:
        print("skipping (missing): src/vgc-training-plan.md")

    # 2. Notes = top-level page
    notes_src = SRC_DIR / "notes-distilled.md"
    if notes_src.exists():
        notes_md = notes_src.read_text(encoding="utf-8")
        notes_html = render_notes("Quick-reference notes — VGC Training", notes_md)
        (DOCS_DIR / "notes-distilled.html").write_text(notes_html, encoding="utf-8")
        print("wrote: docs/notes-distilled.html")

    # 3. Article pages (in pages/ subdir)
    page_count = 0
    for md_file in sorted(SRC_PAGES_DIR.glob("*.md")):
        slug = md_file.stem
        md = md_file.read_text(encoding="utf-8")
        title = slug_title(slug)
        html_doc = render_article(f"{title} — VGC Training", md, slug)
        (DOCS_PAGES_DIR / f"{slug}.html").write_text(html_doc, encoding="utf-8")
        page_count += 1
    print(f"wrote: docs/pages/ ({page_count} files)")

    # 4. Library = the article directory
    lib_html = build_library()
    (DOCS_DIR / "library.html").write_text(lib_html, encoding="utf-8")
    print("wrote: docs/library.html")

    print(f"\nDone. Open docs/index.html in a browser.")
    print("On GitHub Pages: Settings → Pages → Source: Deploy from branch → Folder: /docs")


if __name__ == "__main__":
    main()
