# laxmareddyp.github.io

Personal site of Laxma Reddy Patlolla, served by GitHub Pages at
https://laxmareddyp.github.io.

It is plain HTML, CSS and JavaScript with no build step.

- `index.html`, `styles.css`, `app.js`: the page.
- `notes.json`: the short note on each model card. Edit this to change or
  expand a note; the key is the tile's slug.
- Everything else on the page (tiles, counts, pull request lists) is loaded
  in the browser from `data/profile.json` in the
  [profile repository](https://github.com/laxmareddyp/laxmareddyp), which a
  weekly job there regenerates. To add a model, add it there.

To preview locally, first save the live data file as `data/profile.json`
(the folder is git-ignored). It is at
https://raw.githubusercontent.com/laxmareddyp/laxmareddyp/main/data/profile.json.
Then run:

    python3 -m http.server 8000 --bind 127.0.0.1

and open http://127.0.0.1:8000.
