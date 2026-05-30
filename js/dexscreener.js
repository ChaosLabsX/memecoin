// ============================================================
// DEXSCREENER API MODULE
// ============================================================
// Fetches live token data from DexScreener and renders it
// into stat cards + a live ticker bar.
//
// Auto-refreshes every 30 seconds when a contract address is set.
// Shows "--" gracefully when data is unavailable.
// ============================================================

const DEXSCREENER_REFRESH_MS = 30000; // 30 seconds

class DexScreener {
  constructor(contractAddress) {
    this.contractAddress = contractAddress || null;
    this.data = null;
    this.intervalId = null;
    this.listeners = [];
  }

  // ── Public API ────────────────────────────────────────────

  // Fetch once and start auto-refresh
  async start() {
    if (!this.contractAddress) return;
    await this.fetch();
    this.intervalId = setInterval(() => this.fetch(), DEXSCREENER_REFRESH_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Register a callback that fires every time new data arrives
  // cb receives the parsed data object (or null on failure)
  onChange(cb) {
    this.listeners.push(cb);
  }

  // ── Fetching ─────────────────────────────────────────────

  async fetch() {
    if (!this.contractAddress) return;
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${this.contractAddress}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.data = this._parse(json);
    } catch (err) {
      console.warn("DexScreener fetch failed:", err.message);
      this.data = null;
    }
    this._notify();
  }

  _parse(json) {
    const pairs = json?.pairs;
    if (!pairs || pairs.length === 0) return null;

    // Use the first pair (highest liquidity is usually first)
    const p = pairs[0];
    return {
      price: p.priceUsd ? parseFloat(p.priceUsd) : null,
      priceChange24h: p.priceChange?.h24 ?? null,
      marketCap: p.marketCap ?? null,
      volume24h: p.volume?.h24 ?? null,
      liquidity: p.liquidity?.usd ?? null,
      pairAddress: p.pairAddress ?? null,
      chain: p.chainId ?? "solana",
      dexId: p.dexId ?? null
    };
  }

  _notify() {
    this.listeners.forEach(cb => {
      try { cb(this.data); } catch (e) { console.error(e); }
    });
  }

  // ── Formatting helpers ────────────────────────────────────

  static formatPrice(val) {
    if (val === null || val === undefined) return "--";
    if (val < 0.000001) return `$${val.toExponential(2)}`;
    if (val < 0.01) return `$${val.toFixed(6)}`;
    if (val < 1) return `$${val.toFixed(4)}`;
    return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  static formatChange(val) {
    if (val === null || val === undefined) return "--";
    const sign = val >= 0 ? "+" : "";
    return `${sign}${parseFloat(val).toFixed(2)}%`;
  }

  static formatLargeNumber(val) {
    if (val === null || val === undefined) return "--";
    if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
    return `$${val.toFixed(2)}`;
  }

  static changeClass(val) {
    if (val === null || val === undefined) return "";
    return parseFloat(val) >= 0 ? "positive" : "negative";
  }

  // Returns the iframe src for embedding the DexScreener chart
  static chartUrl(contractAddress, chain = "solana") {
    return `https://dexscreener.com/${chain}/${contractAddress}?embed=1&theme=dark&trades=0&info=0`;
  }
}

// ── Stat card renderer ────────────────────────────────────────
// Renders data into elements with data-stat="price" etc.
// Place these attributes on your HTML stat card value elements.
function renderStatCards(data) {
  const set = (attr, html, cls) => {
    document.querySelectorAll(`[data-stat="${attr}"]`).forEach(el => {
      el.innerHTML = html;
      if (cls) el.className = el.className.replace(/positive|negative/g, "") + " " + cls;
    });
  };

  if (!data) {
    set("price", "--");
    set("change24h", "--");
    set("marketcap", "--");
    set("volume24h", "--");
    set("liquidity", "--");
    return;
  }

  set("price", DexScreener.formatPrice(data.price));
  set("change24h",
    DexScreener.formatChange(data.priceChange24h),
    DexScreener.changeClass(data.priceChange24h)
  );
  set("marketcap", DexScreener.formatLargeNumber(data.marketCap));
  set("volume24h", DexScreener.formatLargeNumber(data.volume24h));
  set("liquidity", DexScreener.formatLargeNumber(data.liquidity));

  // Remove skeleton loaders
  document.querySelectorAll(".stat-skeleton").forEach(el => el.classList.remove("stat-skeleton"));
}

// ── Live ticker bar renderer ──────────────────────────────────
// Builds the scrolling ticker content from all coins.
// Call this once after coins are loaded, then update live coins every 30s.
function buildTickerContent(coinsArray, dexDataMap) {
  const ticker = document.getElementById("ticker-track");
  if (!ticker) return;

  const items = coinsArray.map(coin => {
    if (coin.status === "live" && dexDataMap[coin.id]) {
      const d = dexDataMap[coin.id];
      const changeClass = DexScreener.changeClass(d.priceChange24h);
      const change = DexScreener.formatChange(d.priceChange24h);
      const price = DexScreener.formatPrice(d.price);
      return `
        <span class="ticker-item">
          <a href="/coin.html?id=${coin.id}" class="ticker-link">
            <strong>${coin.ticker}</strong>
            <span class="ticker-price">${price}</span>
            <span class="ticker-change ${changeClass}">${change}</span>
          </a>
        </span>
        <span class="ticker-divider">•</span>
      `;
    } else if (coin.status === "coming_soon") {
      return `
        <span class="ticker-item">
          <a href="/coin.html?id=${coin.id}" class="ticker-link">
            <strong>${coin.ticker}</strong>
            <span class="ticker-soon">Launching ${formatLaunchDate(coin.launchDate)}</span>
          </a>
        </span>
        <span class="ticker-divider">•</span>
      `;
    }
    return "";
  }).join("");

  // Repeat the item set many times so one "copy" is always wider than the viewport.
  // We then double that to get 2 copies for the seamless translateX(-50%) loop.
  const INNER_REPEATS = 12;
  const oneCopy = Array(INNER_REPEATS).fill(items).join("");
  ticker.innerHTML = oneCopy + oneCopy;

  // Set animation duration so scroll speed stays ~60px/s regardless of content width.
  // setTimeout(100) ensures layout is complete before measuring scrollWidth.
  setTimeout(() => {
    const totalWidth = ticker.scrollWidth;
    if (totalWidth > 0) {
      const oneCopyWidth = totalWidth / 2;       // translateX(-50%) scrolls one copy
      const SPEED = 60;                           // px per second
      const duration = Math.max(10, Math.round(oneCopyWidth / SPEED));
      ticker.style.animationDuration = duration + "s";
    }
  }, 100);
}

function formatLaunchDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
