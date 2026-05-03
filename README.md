# VGC Training Archive

A personalized VGC (Pokémon Video Game Championship) training plan, plus a local archive of all 61 articles from [vgcguide.com](https://www.vgcguide.com), rendered as a clean static site.

**Live site:** [enable GitHub Pages and link here]

---

## Repo layout

```
.
├── docs/            ← GitHub Pages publish dir (built HTML, committed)
│   ├── index.html
│   ├── vgc-training-plan.html
│   ├── notes-distilled.html
│   ├── style.css
│   └── pages/*.html
├── src/             ← Markdown sources (edit these)
│   ├── vgc-training-plan.md
│   ├── notes-distilled.md
│   └── pages/*.md
├── scripts/
│   ├── fetch.py     ← scrape vgcguide.com → src/pages/
│   └── convert.py   ← src/*.md → docs/*.html
├── raw-html/        ← gitignored cache of raw scraped HTML
├── .gitignore
└── README.md
```

The site is built from `src/` and emitted to `docs/`. Both are committed; `docs/` is what GitHub Pages serves.

## Deploying to GitHub Pages

One-time setup after pushing:

1. Push the repo to GitHub (`git push -u origin main`).
2. On GitHub: **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**.
4. Set **Branch** to `main` and **Folder** to `/docs`. Save.
5. Wait ~1 minute. GitHub will publish at `https://<your-username>.github.io/<repo-name>/`.

That's it. After the initial setup, every push to `main` re-deploys automatically.

## Editing the plan or notes

1. Edit the markdown in `src/` (e.g. `src/vgc-training-plan.md`).
2. Run `python scripts/convert.py` to rebuild HTML in `docs/`.
3. Commit both the changed `.md` and the regenerated `.html` files.
4. Push. GitHub Pages picks up the change.

## Re-scraping vgcguide.com (rare)

If vgcguide.com adds new articles or you want to refresh:

1. Edit the `URLS` list in `scripts/fetch.py` if needed.
2. Run `python scripts/fetch.py` (skips cached pages; takes ~1 minute for new pages).
3. Run `python scripts/convert.py` to rebuild HTML.
4. Commit and push.

## Requirements

- Python 3.8+ (uses only stdlib — no `pip install` needed).

## Attribution

All article content under `src/pages/` and `docs/pages/` is reproduced from [vgcguide.com](https://www.vgcguide.com) by Wolfe Glick, Aaron "Cybertron" Zheng, and Aaron Traylor. Each rendered page links back to the original. The training plan in `src/vgc-training-plan.md` is original synthesis.
