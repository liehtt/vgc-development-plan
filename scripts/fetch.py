"""
Fetch full raw HTML from vgcguide.com pages, extract article body, save as text.
"""
import urllib.request
import re
import os
import sys
import time
from html.parser import HTMLParser
from html import unescape

URLS = [
    # Intro
    "https://www.vgcguide.com/preface",
    "https://www.vgcguide.com/introduction-to-competitive-pokemon",
    "https://www.vgcguide.com/coming-from-breeding-or-shiny-hunting",
    "https://www.vgcguide.com/coming-from-single-battles",
    "https://www.vgcguide.com/the-basics-of-watching-a-pokemon-match",
    "https://www.vgcguide.com/what-are-the-rules-of-a-vgc-battle",
    "https://www.vgcguide.com/base-stats",
    "https://www.vgcguide.com/what-is-pokemon-showdown",
    "https://www.vgcguide.com/everyone-is-learning-all-the-time",
    "https://www.vgcguide.com/subjectivity",
    "https://www.vgcguide.com/context-pt1",
    "https://www.vgcguide.com/context-pt2",

    # Teambuilding
    "https://www.vgcguide.com/teambuilding-introduction",
    "https://www.vgcguide.com/intent",
    "https://www.vgcguide.com/brainstorming-ideas-to-start-teams",
    "https://www.vgcguide.com/you-dont-need-to-teambuild-to-play-pokemon",
    "https://www.vgcguide.com/how-to-use-someone-elses-team",
    "https://www.vgcguide.com/typing",
    "https://www.vgcguide.com/utility-moves",
    "https://www.vgcguide.com/speed-control",
    "https://www.vgcguide.com/items",
    "https://www.vgcguide.com/protect",
    "https://www.vgcguide.com/trick-room",
    "https://www.vgcguide.com/what-makes-a-pokemon-good",
    "https://www.vgcguide.com/synergy",
    "https://www.vgcguide.com/cores-and-modes",
    "https://www.vgcguide.com/archetypes",
    "https://www.vgcguide.com/consistency",
    "https://www.vgcguide.com/your-team-determines-your-luck",
    "https://www.vgcguide.com/accuracy-vs-power",
    "https://www.vgcguide.com/surprise-factor",
    "https://www.vgcguide.com/metagame",
    "https://www.vgcguide.com/team-playstyle-and-pace",
    "https://www.vgcguide.com/how-to-pull-it-all-together",
    "https://www.vgcguide.com/how-to-win-sometimes-with-your-favorites",
    "https://www.vgcguide.com/6th-pokemon-syndrome",
    "https://www.vgcguide.com/how-to-beat-a-pokemon",
    "https://www.vgcguide.com/island-pokemon",
    "https://www.vgcguide.com/when-do-you-move-on-from-a-team",
    "https://www.vgcguide.com/why-you-should-keep-an-open-mind",
    "https://www.vgcguide.com/bo1-vs-bo3",
    "https://www.vgcguide.com/how-do-you-know-if-a-team-youve-made-is-good",
    "https://www.vgcguide.com/how-do-you-know-which-team-to-take-to-a-tournament",
    "https://www.vgcguide.com/what-to-do-when-time-is-running-out",

    # Battling
    "https://www.vgcguide.com/competitive-pokemon-is-less-luck-than-you-think",
    "https://www.vgcguide.com/building-up-a-knowledge-base",
    "https://www.vgcguide.com/approaching-best-of-1-vs-best-of-3",
    "https://www.vgcguide.com/analyzing-your-opponents-teams",
    "https://www.vgcguide.com/team-preview",
    "https://www.vgcguide.com/what-is-a-game-plan",
    "https://www.vgcguide.com/what-is-pressure",
    "https://www.vgcguide.com/predictions",
    "https://www.vgcguide.com/protect-in-battle",
    "https://www.vgcguide.com/switching",
    "https://www.vgcguide.com/battling-against-trick-room",
    "https://www.vgcguide.com/1-hp-is-infinitely-more-than-0-hp",
    "https://www.vgcguide.com/how-to-analyze-a-battle",
    "https://www.vgcguide.com/battling-example-will-tansley-vs-nils-dunlop-worlds-2017",
    "https://www.vgcguide.com/battling-examples-diana-bros-vs-paul-chua-naic-2019",
    "https://www.vgcguide.com/battling-example-alister-sandover-vs-edoardo-giunipero-ferraris",
    "https://www.vgcguide.com/what-is-a-good-ladder-rating",
]

BLOCK_TAGS = {"p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "br", "div", "blockquote", "tr"}
SKIP_TAGS = {"script", "style", "noscript", "svg", "nav", "header", "footer", "form", "input", "button"}


class ArticleExtractor(HTMLParser):
    """Extract text content from the article body, preserving paragraph breaks."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_article = False
        self.article_depth = 0
        self.skip_depth = 0
        self.in_heading = None  # h1, h2, h3, ...
        self.in_li = False
        self.parts = []
        self.current_text = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "article" and attrs_dict.get("class", "").startswith("sections"):
            self.in_article = True
            self.article_depth = 1
            return
        if not self.in_article:
            return
        if tag == "article":
            self.article_depth += 1
        if tag in SKIP_TAGS:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._flush()
            self.in_heading = tag
        elif tag == "li":
            self._flush()
            self.in_li = True
        elif tag in BLOCK_TAGS:
            self._flush()

    def handle_endtag(self, tag):
        if not self.in_article:
            return
        if tag in SKIP_TAGS and self.skip_depth:
            self.skip_depth -= 1
            return
        if self.skip_depth:
            return
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._flush()
            self.in_heading = None
        elif tag == "li":
            self._flush()
            self.in_li = False
        elif tag in BLOCK_TAGS:
            self._flush()
        if tag == "article":
            self.article_depth -= 1
            if self.article_depth <= 0:
                self.in_article = False

    def handle_data(self, data):
        if not self.in_article or self.skip_depth:
            return
        self.current_text.append(data)

    def _flush(self):
        text = "".join(self.current_text).strip()
        text = re.sub(r"\s+", " ", text)
        if text:
            if self.in_heading:
                level = int(self.in_heading[1])
                prefix = "#" * level
                self.parts.append(f"\n{prefix} {text}\n")
            elif self.in_li:
                self.parts.append(f"- {text}")
            else:
                self.parts.append(text)
        self.current_text = []

    def get_text(self):
        self._flush()
        out = "\n\n".join(p for p in self.parts if p.strip())
        # collapse 3+ blank lines
        out = re.sub(r"\n{3,}", "\n\n", out)
        return out.strip()


def slug_from_url(url):
    return url.rstrip("/").rsplit("/", 1)[-1]


def fetch(url, retries=2):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; vgc-archive-script)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    last_err = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            last_err = e
            time.sleep(1 + attempt)
    raise last_err


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)
    raw_dir = os.path.join(repo_root, "raw-html")
    pages_dir = os.path.join(repo_root, "src", "pages")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(pages_dir, exist_ok=True)

    failures = []
    summaries = []

    for i, url in enumerate(URLS, 1):
        slug = slug_from_url(url)
        raw_path = os.path.join(raw_dir, f"{slug}.html")
        text_path = os.path.join(pages_dir, f"{slug}.md")

        if os.path.exists(text_path) and os.path.getsize(text_path) > 200:
            print(f"[{i}/{len(URLS)}] skip (cached): {slug}")
            with open(text_path, "r", encoding="utf-8") as f:
                txt = f.read()
            summaries.append((slug, len(txt.split())))
            continue

        try:
            print(f"[{i}/{len(URLS)}] fetching: {slug}")
            html = fetch(url)
            with open(raw_path, "w", encoding="utf-8") as f:
                f.write(html)
            parser = ArticleExtractor()
            parser.feed(html)
            text = parser.get_text()
            title_match = re.search(r"<title>([^<]+)</title>", html)
            title = title_match.group(1).replace("&mdash;", "—").strip() if title_match else slug
            with open(text_path, "w", encoding="utf-8") as f:
                f.write(f"# {title}\n\nSource: {url}\n\n---\n\n{text}\n")
            wc = len(text.split())
            print(f"     ok ({wc} words)")
            summaries.append((slug, wc))
            time.sleep(0.4)  # be polite
        except Exception as e:
            print(f"     FAIL: {e}")
            failures.append((url, str(e)))

    print(f"\nDone. {len(summaries)} succeeded, {len(failures)} failed.")
    if failures:
        print("Failures:")
        for url, err in failures:
            print(f"  {url}: {err}")
    print("Next: run scripts/convert.py to regenerate HTML.")


if __name__ == "__main__":
    main()
