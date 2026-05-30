// ============================================================
// EDIT THIS FILE to add new coins or change the highlighted coin
// ============================================================
// HOW TO ADD A NEW COIN:
//   1. Copy the wcmc26 block below
//   2. Change the key (e.g. "mycoin") and all values inside
//   3. Set HIGHLIGHTED_COIN = "mycoin" to feature it on the homepage
//   4. Create /assets/mycoin/ folder and drop your media files there
//   5. Add a new theme block in /css/themes.css
// ============================================================

const COINS = {
  wcmc26: {
    id: "wcmc26",
    name: "WCMC26",
    fullName: "World Cup Meme Coin 2026",
    ticker: "$WCMC26",

    // STATUS OPTIONS: "coming_soon" | "live" | "legacy"
    // coming_soon = show waitlist form, no buy button
    // live        = show price + buy button + DexScreener chart
    // legacy      = show "tournament over" + historical stats
    status: "coming_soon",

    // Set to true to make this coin take over the homepage hero section
    highlighted: true,

    // FILL THESE IN ON LAUNCH DAY:
    contractAddress: null,   // e.g. "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    pumpfunUrl: null,        // e.g. "https://pump.fun/coin/EPjFWdd..."

    // ISO 8601 format: "YYYY-MM-DDTHH:MM:SSZ"
    launchDate: "2026-06-11T00:00:00Z",
    endDate: "2026-07-19T18:00:00Z",

    // Maps to CSS class body.theme-wcmc26 in /css/themes.css
    theme: "wcmc26",

    // Social links
    xAccount: "https://x.com/WCMC26",

    description: "The official meme coin of the 2026 World Cup. Ride the tournament from opening whistle to the final. $WCMC26 lives and dies with the beautiful game.",

    // DROP YOUR FILES in /assets/wcmc26/ — these are the expected filenames:
    media: {
      logo: "/assets/wcmc26/logo.webp",
      heroBanner: "/assets/wcmc26/hero-1920x1080.mp4",   // video preferred, falls back to image
      squareBanner: "/assets/wcmc26/banner-1080x1080.mp4",
      thumbnail: "/assets/wcmc26/thumb.webp"
    },

    // Color palette — matches the theme block in /css/themes.css
    colors: {
      primary: "#F5C518",    // Trophy Gold
      secondary: "#00A86B",  // Pitch Green
      dark: "#0A1628",       // Midnight Navy
      accent: "#E63946"      // Red Card
    },

    // Text used in the countdown widget above the timer
    countdownLabel: "World Cup Final in",

    // Text on the primary call-to-action button (when live)
    ctaText: "Buy $WCMC26 Now",

    // Where the coin will be launched
    launchPlatform: "Pump.fun",

    // Messages shown when countdown hits zero
    launchMessage: "🚀 We are LIVE! Buy $WCMC26 now!",
    endMessage: "🏆 The Champion has been crowned. Legacy Mode."
  }

  // ── ADD NEW COINS BELOW ──────────────────────────────────
  // Example structure (copy, uncomment, and fill in):
  //
  // mynewcoin: {
  //   id: "mynewcoin",
  //   name: "MyNewCoin",
  //   fullName: "My New Event Coin",
  //   ticker: "$MNC",
  //   status: "coming_soon",
  //   highlighted: false,
  //   contractAddress: null,
  //   pumpfunUrl: null,
  //   launchDate: "2026-12-01T00:00:00Z",
  //   endDate: "2026-12-31T23:59:59Z",
  //   theme: "mynewcoin",
  //   xAccount: "https://x.com/MyNewCoin",
  //   description: "Description of your coin here.",
  //   media: {
  //     logo: "/assets/mynewcoin/logo.webp",
  //     heroBanner: "/assets/mynewcoin/hero-1920x1080.mp4",
  //     squareBanner: "/assets/mynewcoin/banner-1080x1080.mp4",
  //     thumbnail: "/assets/mynewcoin/thumb.webp"
  //   },
  //   colors: {
  //     primary: "#FF6B00",
  //     secondary: "#1A1A2E",
  //     dark: "#0D0D0D",
  //     accent: "#FFD700"
  //   },
  //   countdownLabel: "Event starts in",
  //   ctaText: "Buy $MNC Now",
  //   launchPlatform: "Pump.fun",
  //   launchMessage: "🚀 We are LIVE!",
  //   endMessage: "Event Over. Legacy Mode."
  // }
};

// ============================================================
// CHANGE THIS to feature a different coin on the homepage hero
// ============================================================
const HIGHLIGHTED_COIN = "wcmc26";

// ── Internal helpers — no need to edit below this line ──────

function getCoin(id) {
  return COINS[id] || null;
}

function getAllCoins() {
  return Object.values(COINS);
}

function getLiveCoins() {
  return getAllCoins().filter(c => c.status === "live");
}

function getComingSoonCoins() {
  return getAllCoins().filter(c => c.status === "coming_soon");
}

function getHighlightedCoin() {
  return COINS[HIGHLIGHTED_COIN] || getAllCoins()[0] || null;
}

function formatLaunchDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
