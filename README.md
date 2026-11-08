# Lera Adele — portfolio

Static site: plain HTML, CSS and JS, no build step. Ready for GitHub Pages.

```
index.html              home: the TV (inline SVG from Figma), project list, About
404.html                "page not found" — self-contained on purpose (GitHub serves it for any missing URL)
cases/*.html            one page per case study, all on the same template
css/style.css           home page
css/case.css            case-study pages (shared)
js/main.js              home: channels, Play / Pause / Stop, knobs, About, mobile scroll
js/music.js             easter-egg music (starts on the first turn of the Volume knob)
js/case.js              case pages: lazy videos, "to top" button
assets/previews/        project previews shown on the TV screen
assets/cases/<case>/    case-study images and videos (1200 × 800)
assets/img/             about photo, avatar, favicon, static TV picture
```

## Common edits

- **Time per project in Play mode** — `CYCLE_MS` in `js/main.js`.
- **Real music instead of the generated loop** — put the file in `assets/audio/` and set `TRACK_SRC` in `js/music.js`.
- **Text of a case** — edit `cases/<case>.html` directly.
- **A new image in a case** — export the 600 × 400 frame at 2x, put it in `assets/cases/<case>/`, add a `<figure class="case-media">` where it belongs.
- **A video** — `<video data-src="…mp4" poster="…jpg" muted loop playsinline preload="none">` inside a `.case-media`; it loads only when the reader scrolls near it.
- **After changing CSS/JS** — bump the `?v=` number where the file is linked, so browsers don't keep the old copy.

## Publishing on GitHub Pages

1. Create a public repository on github.com, e.g. `portfolio`.
2. Upload the contents of this folder (Add file → Upload files), or push it with git.
3. Repository → Settings → Pages → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`.
4. The site appears at `https://<username>.github.io/portfolio/` in a minute or two.

A repository named `<username>.github.io` is served at the root address instead.

After publishing, check: a missing URL shows the 404 page, and its "Go home" link opens the home page.
