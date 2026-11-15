"use strict";

// All content comes from one JSON file that the profile repository's weekly
// job regenerates. Nothing in it is trusted: every string is inserted with
// textContent, every link is checked against ALLOWED_HOSTS, and every colour
// is checked against a hex pattern. No HTML strings are ever built.

const LIVE_DATA_URL =
  "https://raw.githubusercontent.com/laxmareddyp/laxmareddyp/main/data/profile.json";
// A local preview reads data/profile.json next to the page (not committed).
const IS_LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname);
const DATA_URL = IS_LOCAL ? "data/profile.json" : LIVE_DATA_URL;
const NOTES_URL = "notes.json";
const PROFILE_URL = "https://github.com/laxmareddyp";

const ALLOWED_HOSTS = new Set([
  "github.com",
  "keras.io",
  "huggingface.co",
  "www.kaggle.com",
  "www.linkedin.com",
]);

const KIND_LABELS = {
  multimodal: "Multimodal",
  text: "Text",
  embedding: "Embeddings",
  vision: "Vision",
  tooling: "Tooling",
};

const FALLBACK_COLOUR = "#C9D1E0";

function safeUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const plain = url.username === "" && url.password === "" && url.port === "";
    const allowed = url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
    return plain && allowed ? url.href : null;
  } catch {
    return null;
  }
}

function safeColour(value) {
  const valid = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  return valid ? value : FALLBACK_COLOUR;
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function count(value) {
  return Number.isInteger(value) && value >= 0 ? String(value) : "0";
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function own(object, key) {
  const valid = object !== null && typeof object === "object";
  return valid && Object.hasOwn(object, key) ? object[key] : undefined;
}

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
}

// An <a> when the address is allowed, otherwise a plain <div>.
function linked(href, className) {
  const url = safeUrl(href);
  const node = el(url ? "a" : "div", className);
  if (url) {
    node.setAttribute("href", url);
    node.setAttribute("rel", "noopener");
  }
  return node;
}

function card(tile, colour, note) {
  const node = linked(own(tile, "url"), "card");
  node.style.setProperty("--card", safeColour(colour));
  node.append(
    el("h3", "card-name", text(own(tile, "name"))),
    el("span", "pill", text(own(tile, "tag"))),
  );
  if (note) node.append(el("p", "card-note", note));
  node.append(el("span", "card-footer", text(own(tile, "footer"))));
  return node;
}

function renderStats(data, modelCount) {
  const stats = document.getElementById("stats");
  const rows = [
    [count(own(own(data, "merged"), "total")), "merged pull requests"],
    [count(own(own(data, "reviews"), "total")), "pull requests reviewed"],
    [String(modelCount), "models and converters"],
  ];
  for (const [value, label] of rows) {
    const row = el("div", "stat");
    row.append(el("dt", "", label), el("dd", "", value));
    stats.append(row);
  }
}

function renderFilters(kinds, cards) {
  const filters = document.getElementById("model-filters");
  const buttons = [];
  const choose = (kind, chosen) => {
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button === chosen));
    }
    for (const node of cards) {
      node.hidden = kind !== "all" && node.dataset.kind !== kind;
    }
  };
  const add = (kind, label) => {
    const button = el("button", "chip", label);
    button.setAttribute("type", "button");
    button.setAttribute("aria-pressed", String(kind === "all"));
    button.addEventListener("click", () => choose(kind, button));
    buttons.push(button);
    filters.append(button);
  };
  add("all", "All");
  for (const kind of kinds) {
    add(kind, KIND_LABELS[kind]);
  }
}

function renderTiles(data, notes) {
  const colours = own(data, "kind_colours");
  const grids = {
    models: document.getElementById("model-grid"),
    automation: document.getElementById("automation-grid"),
    guides: document.getElementById("guide-grid"),
    links: document.getElementById("link-grid"),
  };
  const modelCards = [];
  const kinds = [];
  for (const tile of list(own(data, "tiles"))) {
    const grid = own(grids, text(own(tile, "section")));
    if (!grid) continue;
    const kind = text(own(tile, "kind"));
    const note = text(own(notes, text(own(tile, "slug"))));
    const node = card(tile, own(colours, kind), note);
    if (grid === grids.models) {
      node.dataset.kind = kind;
      modelCards.push(node);
      if (Object.hasOwn(KIND_LABELS, kind) && !kinds.includes(kind)) {
        kinds.push(kind);
      }
    }
    grid.append(node);
  }

  const reviews = own(data, "reviews");
  const reviewTile = {
    name: "Code reviews",
    tag: `${count(own(reviews, "total"))} PRs reviewed`,
    footer: "keras-team · TensorFlow",
    url: own(reviews, "url"),
  };
  grids.automation.append(card(reviewTile, own(reviews, "colour"), ""));

  renderFilters(kinds, modelCards);
  return modelCards.length;
}

// One collapsed list under a coloured bar. The list is built on first open.
function bar(name, colour, prs) {
  const details = el("details", "bar");
  details.style.setProperty("--card", safeColour(colour));
  const summary = el("summary");
  summary.append(
    el("span", "bar-name", name),
    el("span", "bar-count", `${prs.length} PRs`),
  );
  const items = el("ul", "pr-list");
  details.append(summary, items);
  details.addEventListener(
    "toggle",
    () => {
      for (const pr of prs) {
        const item = el("li");
        const title = linked(own(pr, "url"), "pr-title");
        title.textContent = text(own(pr, "title"));
        item.append(title, el("span", "pr-label", text(own(pr, "label"))));
        items.append(item);
      }
    },
    { once: true },
  );
  return details;
}

function renderContributions(data) {
  const merged = own(data, "merged");
  const reviews = own(data, "reviews");
  document.getElementById("contributions-lede").textContent =
    `${count(own(merged, "total"))} merged pull requests across ` +
    `${count(own(merged, "repositories"))} repositories in keras-team and ` +
    `TensorFlow, and reviews on ${count(own(reviews, "total"))} pull ` +
    "requests by other authors. Open a bar to see every one.";

  const bars = document.getElementById("contribution-bars");
  for (const category of list(own(merged, "categories"))) {
    const prs = list(own(category, "prs"));
    bars.append(bar(text(own(category, "name")), own(category, "colour"), prs));
  }
  const reviewed = list(own(reviews, "prs"));
  bars.append(bar("Code reviews", own(reviews, "colour"), reviewed));
}

function renderToolbox(data) {
  const toolbox = document.getElementById("toolbox");
  for (const tool of list(own(data, "toolbox"))) {
    toolbox.append(el("li", "tool", text(tool)));
  }
}

function showFailure(status) {
  const profile = el("a", "", "GitHub profile");
  profile.setAttribute("href", PROFILE_URL);
  status.replaceChildren(
    "Could not load the latest data. Everything here is also on the ",
    profile,
    ".",
  );
}

async function load(url) {
  const response = await fetch(url, {
    credentials: "omit",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("request failed");
  return response.json();
}

// Data with the wrong shape is treated like a failed request.
function usable(data) {
  const merged = own(data, "merged");
  const hasMerged = merged !== null && typeof merged === "object";
  return hasMerged && list(own(data, "tiles")).length > 0;
}

async function main() {
  const status = document.getElementById("status");
  status.textContent = "Loading the latest data…";
  status.hidden = false;
  try {
    const [data, notes] = await Promise.all([
      load(DATA_URL),
      load(NOTES_URL).catch(() => ({})),
    ]);
    if (!usable(data)) throw new Error("unexpected data");
    renderStats(data, renderTiles(data, notes));
    renderContributions(data);
    renderToolbox(data);
    status.hidden = true;
  } catch {
    showFailure(status);
  }
}

main();
