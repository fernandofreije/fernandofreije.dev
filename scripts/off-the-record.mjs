// Fills site/off-the-record.html and the "Lately" line in the index footer with
// what I'm playing (Steam), watching (Trakt) and reading (by hand).
//
// For each section we:
//   1. fetch the live list when its account and key are set, drop what the config
//      hides, and fill the last slots with the hand-written entries,
//   2. download each cover and save it as a small WebP in site/assets/off-the-record/,
//   3. write the markup into the `<!-- record:<name> -->` regions of the HTML.
// If a live source fails, the section keeps what it fetched last run (record.json),
// so a flaky API never empties the page.
//
// It runs by hand, never in CI: review the diff, then commit what should ship.
// Accounts and keys come from .env (see .env.example): STEAM_USER, STEAM_API_KEY,
// TRAKT_USER, TRAKT_CLIENT_ID, TMDB_TOKEN.
//
// Usage: npm run record

import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import * as config from './off-the-record.config.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE_DIR = path.join(ROOT, 'site');
const ASSET_DIR = path.join(SITE_DIR, 'assets', 'off-the-record');
const DATA_FILE = path.join(ASSET_DIR, 'record.json');
const COVER = { width: 320, height: 480 }; // 2:3, sharp at 2× for ~10rem cards
const USER_AGENT = 'fernandofreije.dev off-the-record';
const { STEAM_API_KEY, TRAKT_CLIENT_ID, TMDB_TOKEN } = process.env;

const warnings = [];
const warn = (message) => warnings.push(message);

/** GET JSON. Errors name the host only, so keys and account names in URLs stay out of the logs. */
async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT, ...headers }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return res.json();
}

async function steamGames() {
  const api = 'https://api.steampowered.com';
  let steamid = config.steam.user;
  if (!/^\d{17}$/.test(steamid)) {
    const { response } = await getJson(`${api}/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(steamid)}`);
    if (response.success !== 1) throw new Error('no Steam profile matches STEAM_USER');
    steamid = response.steamid;
  }
  const { response } = await getJson(
    `${api}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamid}&include_appinfo=true&include_played_free_games=true`,
  );
  if (!response.games) throw new Error('Steam returned no games; is "Game details" public?');
  return response.games
    .filter((g) => g.rtime_last_played)
    .sort((a, b) => b.rtime_last_played - a.rtime_last_played)
    .map((g) => ({ appid: g.appid, name: g.name }));
}

async function traktFilms() {
  const user = encodeURIComponent(config.trakt.user);
  const history = await getJson(`https://api.trakt.tv/users/${user}/history/movies?limit=${config.LIMITS.films * 3}`, {
    'content-type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': TRAKT_CLIENT_ID,
  });
  const seen = new Map(); // newest first; a rewatch shouldn't take two slots
  for (const { movie } of history) {
    if (!seen.has(movie.ids.trakt)) {
      seen.set(movie.ids.trakt, { tmdb: movie.ids.tmdb, slug: movie.ids.slug, title: movie.title, year: movie.year });
    }
  }
  return [...seen.values()];
}

/**
 * The live list minus hidden items, cut short to leave the last slots for the
 * hand-written entries. If the live source fails, last run's live items stand in.
 */
async function resolve(name, live, previous) {
  const { hide, add } = config[name];
  let fetched = [];
  if (live.enabled) {
    try {
      fetched = await live.fetch();
    } catch (error) {
      fetched = previous?.items.filter((i) => !i.hand) ?? [];
      warn(`${name}: ${error.message}; keeping the last ${fetched.length} from ${live.source}`);
    }
  } else if (live.configured) {
    warn(`${name}: ${live.source} needs both ${live.vars.join(' and ')}; showing only the hand-written entries`);
  }
  const shown = fetched.filter((i) => !live.hides(i, hide)).slice(0, Math.max(0, config.LIMITS[name] - add.length));
  return { items: [...shown, ...add.map((i) => ({ ...i, hand: true }))], source: live.enabled ? live.source : 'hand' };
}

// Where each cover comes from. Steam's portrait library art exists for most games;
// older ones only have the landscape header, which `attention` cropping handles.
const coverSources = {
  async games(game) {
    if (!game.appid) return null;
    const library = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appid}/library_600x900.jpg`;
    const head = await fetch(library, { method: 'HEAD', signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (head?.ok) return library;
    const details = await getJson(`https://store.steampowered.com/api/appdetails?appids=${game.appid}&filters=basic`);
    return details[game.appid]?.data?.header_image ?? null;
  },
  async films(film) {
    if (!film.tmdb || !TMDB_TOKEN) return null;
    const movie = await getJson(`https://api.themoviedb.org/3/movie/${film.tmdb}`, { authorization: `Bearer ${TMDB_TOKEN}` });
    return movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null;
  },
  async books(book) {
    return `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;
  },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const itemId = {
  games: (g) => g.appid ?? slug(g.name),
  films: (f) => f.tmdb ?? f.slug ?? slug(f.title),
  books: (b) => b.isbn,
};

/** Reads an image from a URL, or from a path relative to the repo root. */
async function readImage(source) {
  if (!/^https?:/.test(source)) return readFile(path.join(ROOT, source));
  const res = await fetch(source, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Saves the cover as WebP and returns its site-relative URL, or null if there is none.
 * A hand-written entry's own `image` wins. If the download fails, the last good cover stays.
 */
async function saveCover(name, item) {
  const url = `assets/off-the-record/${name}/${itemId[name](item)}.webp`;
  const file = path.join(SITE_DIR, url);
  try {
    const source = item.image ?? (await coverSources[name](item));
    if (!source) return null;
    await mkdir(path.dirname(file), { recursive: true });
    await sharp(await readImage(source))
      .resize({ ...COVER, fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 78, effort: 6 })
      .toFile(file);
    return url;
  } catch (error) {
    const kept = await access(file).then(() => true, () => false);
    warn(`${name}: ${kept ? 'kept the old' : 'no'} cover for "${item.name ?? item.title}" (${error.message})`);
    return kept ? url : null;
  }
}

// ---- Markup ----

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' }[c]};`);
const day = (iso) =>
  `<time datetime="${iso}">${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time>`;

const cards = {
  games: (g) => ({
    title: g.name,
    href: g.href ?? (g.appid && `https://store.steampowered.com/app/${g.appid}/`),
    meta: g.note ? escape(g.note) : '',
  }),
  films: (f) => ({
    title: f.title,
    href: f.href ?? (f.slug ? `https://trakt.tv/movies/${f.slug}` : f.tmdb && `https://www.themoviedb.org/movie/${f.tmdb}`),
    meta: [f.year, f.note && escape(f.note)].filter(Boolean).join(' · '),
  }),
  books: (b) => ({
    title: b.title,
    href: `https://openlibrary.org/isbn/${b.isbn}`,
    meta: b.author ? escape(b.author) : '',
  }),
};

const link = (href, text) => (href ? `<a href="${escape(href)}">${text}</a>` : text);

function cardTag(name, item, i) {
  const { title, href, meta } = cards[name](item);
  // Covers are decorative: the title right below names the same thing.
  const cover = item.cover
    ? `<img class="record__cover" src="${item.cover}" width="${COVER.width}" height="${COVER.height}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" />`
    : `<span class="record__cover record__cover--blank" aria-hidden="true">${escape(title)}</span>`;
  return [
    '<li class="record">',
    `  ${cover}`,
    // Titles like V/H/S/MIXTAPE may wrap at a slash rather than mid-word.
    `  <h3 class="record__title">${link(href, escape(title).replaceAll('/', '/<wbr>'))}</h3>`,
    meta && `  <p class="record__meta">${meta}</p>`,
    '</li>',
  ].filter(Boolean);
}

function sectionMarkup(name, { items }) {
  if (!items.length) return ['<p class="records__empty">Nothing on record just now.</p>'];
  return ['<ul class="records">', ...items.flatMap((item, i) => cardTag(name, item, i).map((l) => `  ${l}`)), '</ul>'];
}

function latelyMarkup(data) {
  const parts = [
    data.games.items[0] && `playing <cite>${escape(data.games.items[0].name)}</cite>`,
    data.films.items[0] && `watching <cite>${escape(data.films.items[0].title)}</cite>`,
    data.books.items[0] && `reading <cite>${escape(data.books.items[0].title)}</cite>`,
  ].filter(Boolean);
  if (!parts.length) return []; // nothing to tease, so the page stays unlinked
  return [`<p class="site-footer__lately">Lately: ${parts.join(', ')}. <a href="off-the-record.html">More, off the record</a></p>`];
}

/** Replaces each `<!-- record:<name> -->…<!-- /record -->` region, keeping its indentation. */
async function writeRegions(file, regions) {
  let html = await readFile(file, 'utf8');
  for (const [name, lines] of Object.entries(regions)) {
    const region = new RegExp(`([ \\t]*)<!-- record:${name} -->[\\s\\S]*?<!-- /record -->`);
    const match = html.match(region);
    if (!match) throw new Error(`${path.basename(file)} has no <!-- record:${name} --> region`);
    const indent = match[1];
    const body = lines.map((l) => `${indent}${l}\n`).join('');
    html = html.replace(region, () => `${indent}<!-- record:${name} -->\n${body}${indent}<!-- /record -->`);
  }
  await writeFile(file, html);
}

/** Deletes covers that no section points at any more. */
async function pruneCovers(data) {
  const used = new Set(Object.values(data).flatMap((s) => s.items.map((i) => i.cover)).filter(Boolean));
  for (const name of Object.keys(coverSources)) {
    const dir = path.join(ASSET_DIR, name);
    for (const file of await readdir(dir).catch(() => [])) {
      if (!used.has(`assets/off-the-record/${name}/${file}`)) await rm(path.join(dir, file));
    }
  }
}

// ---- Run ----

const previous = JSON.parse(await readFile(DATA_FILE, 'utf8').catch(() => 'null'));
const data = {
  games: await resolve('games', {
    source: 'steam', vars: ['STEAM_USER', 'STEAM_API_KEY'], configured: Boolean(config.steam.user || STEAM_API_KEY),
    enabled: Boolean(config.steam.user && STEAM_API_KEY), fetch: steamGames,
    hides: (g, hide) => hide.includes(g.appid),
  }, previous?.games),
  films: await resolve('films', {
    source: 'trakt', vars: ['TRAKT_USER', 'TRAKT_CLIENT_ID'], configured: Boolean(config.trakt.user || TRAKT_CLIENT_ID),
    enabled: Boolean(config.trakt.user && TRAKT_CLIENT_ID), fetch: traktFilms,
    hides: (f, hide) => hide.includes(f.tmdb) || hide.includes(f.slug),
  }, previous?.films),
  books: { items: config.books.slice(0, config.LIMITS.books).map((b) => ({ ...b, hand: true })), source: 'hand' },
};

for (const [name, section] of Object.entries(data)) {
  for (const item of section.items) item.cover = await saveCover(name, item);
}

const updated = new Date().toISOString().slice(0, 10);
await mkdir(ASSET_DIR, { recursive: true });
await writeFile(DATA_FILE, `${JSON.stringify({ updated, ...data }, null, 2)}\n`);
await writeRegions(path.join(SITE_DIR, 'off-the-record.html'), {
  updated: [`<p class="appendix__updated">Updated ${day(updated)}</p>`],
  games: sectionMarkup('games', data.games),
  films: sectionMarkup('films', data.films),
  books: sectionMarkup('books', data.books),
});
await writeRegions(path.join(SITE_DIR, 'index.html'), { lately: latelyMarkup(data) });
await pruneCovers(data);

for (const [name, { items, source }] of Object.entries(data)) {
  console.log(name.padEnd(6), `${items.length} from ${source}`.padEnd(16), items.map((i) => i.name ?? i.title).join(', '));
}
for (const w of warnings) console.log(`  ! ${w}`);
