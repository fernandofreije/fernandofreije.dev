// Off the Record: what I'm playing, watching and reading right now.
// The source of truth for site/off-the-record.html and the "Lately" line in the
// index footer. scripts/off-the-record.mjs turns this into markup and covers.
//
// Games and films come from Steam and Trakt when both the account and the key are
// in .env (see .env.example). The accounts live there too, not here, so the public
// repo doesn't name them. For each, `hide` drops live entries and `add` fills the
// last slots by hand. An added entry can set `image` (a URL, or a path from the
// repo root, e.g. in art-src/off-the-record/), `href` and a short `note`; without
// an image the card shows its title instead.

// How many of each to show.
export const LIMITS = { games: 3, films: 4, books: 3 };

export const steam = {
  // SteamID64 (17 digits) or the custom name in steamcommunity.com/id/<name>.
  // "Game details" must be public in the profile's privacy settings.
  user: process.env.STEAM_USER ?? '',
};

export const trakt = {
  // The name in trakt.tv/users/<name>. The profile must be public.
  user: process.env.TRAKT_USER ?? '',
};

// `appid` is the number in the game's store URL. An added game with an appid
// gets its Steam cover and link, e.g. { appid: 1086940, name: "Baldur's Gate 3" }.
export const games = {
  hide: [
    1649240, // Returnal
  ],
  add: [
    // Not on Steam.
    { name: 'World of Warcraft: Forever', href: 'https://worldofwarcraft.blizzard.com/', image: 'art-src/off-the-record/wow-forever.png' },
  ],
};

// Hide by Trakt slug (the name in the film's trakt.tv URL) or TMDB id. An added film
// with a `tmdb` id (the number in its themoviedb.org URL) gets its poster,
// e.g. { tmdb: 603, title: 'The Matrix', year: 1999 }.
export const films = {
  hide: [],
  add: [],
};

// Books are always by hand. The cover comes from Open Library by ISBN, so pick an
// edition that has one: https://covers.openlibrary.org/b/isbn/<isbn>-L.jpg?default=false
// or set `image` as for added games.
export const books = [
  { isbn: '9780316129084', title: 'Leviathan Wakes', author: 'James S. A. Corey' },
  { isbn: '9780008764937', title: 'Empire of the Damned', author: 'Jay Kristoff', image: 'art-src/off-the-record/empire-of-the-damned.png' },
  { isbn: '9780765378804', title: 'Hex', author: 'Thomas Olde Heuvelt' },
];
