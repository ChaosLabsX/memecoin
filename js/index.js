// ============================================================
// INDEX.JS — homepage logic
// Runs after main.js and all modules are loaded.
// ============================================================

// onReady is defined in main.js (loaded before this file).
// It fires immediately if DOM is already parsed, or waits for DOMContentLoaded.
(async function initHomepage() {

  onReady(async () => {

    // Sync live data from Supabase (no-op if credentials not filled in)
    await syncCoinsFromSupabase();

    const highlighted = getHighlightedCoin();

    // Apply the highlighted coin's theme to the body
    if (highlighted) {
      document.body.classList.add(`theme-${highlighted.theme}`);
    }

    buildHero(highlighted);
    buildCoinsGrid();
    buildFooterCoinList();
    buildTicker();

  });
})();

// ── HERO SECTION ─────────────────────────────────────────────
function buildHero(coin) {
  if (!coin) return;

  // Eyebrow
  const eyebrow = document.getElementById("hero-eyebrow");
  if (eyebrow) eyebrow.textContent = coin.ticker;

  // Title
  const title = document.getElementById("hero-title");
  if (title) {
    if (coin.id === "wcmc26") {
      title.innerHTML = `The World Cup<br>has a <em>coin</em>`;
    } else {
      title.textContent = coin.fullName;
    }
  }

  // Subtitle
  const sub = document.getElementById("hero-subtitle");
  if (sub) {
    if (coin.id === "wcmc26") {
      sub.textContent = `Ride ${coin.ticker} from Opening Day to the Final Whistle`;
    } else {
      sub.textContent = coin.description;
    }
  }

  // Background video or image
  const bgEl = document.getElementById("hero-bg");
  if (bgEl && coin.media.heroBanner) {
    const isVideo = coin.media.heroBanner.endsWith(".mp4") || coin.media.heroBanner.endsWith(".webm");
    if (isVideo) {
      bgEl.innerHTML = `
        <video class="hero__video" autoplay muted loop playsinline
               poster="${coin.media.thumbnail || ""}"
               aria-hidden="true">
          <source src="${coin.media.heroBanner}" type="video/mp4">
        </video>
      `;
    } else {
      bgEl.innerHTML = `
        <img src="${coin.media.heroBanner}" alt="" aria-hidden="true"
             class="hero__video" style="object-fit:cover; width:100%; height:100%;"
             onerror="this.parentElement.classList.add('hero__bg--gradient'); this.remove();">
      `;
    }
  }

  // Status-dependent content
  const ctaEl = document.getElementById("hero-cta");
  const countdownLabel = document.getElementById("countdown-label");
  const countdownEl = document.getElementById("hero-countdown");
  const waitlistEl = document.getElementById("hero-waitlist");
  const waitlistSub = document.getElementById("hero-waitlist-sub");
  const waitlistForm = document.getElementById("hero-waitlist-form");

  if (coin.status === "coming_soon") {
    // Countdown to launch date — use "Launches in", not the coin's countdownLabel
    // (countdownLabel is used on the coin page when status is "live")
    if (countdownLabel) countdownLabel.textContent = "Launches in";
    if (countdownEl) {
      const timer = new CountdownTimer({
        targetDate: coin.launchDate,
        element: countdownEl,
        completeMessage: coin.launchMessage || "🚀 We are LIVE!"
      });
      timer.start();
    }

    // Waitlist form
    if (waitlistEl) waitlistEl.style.display = "block";
    if (waitlistSub) {
      waitlistSub.textContent = `Be first to know when ${coin.ticker} goes live.`;
    }
    if (waitlistForm) {
      waitlistForm.dataset.coinId = coin.id;
      // Attach this form to the supabase handler
      waitlistForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const emailInput = waitlistForm.querySelector("input[type=email]");
        const btn = waitlistForm.querySelector("button[type=submit]");
        const msgEl = document.getElementById("hero-waitlist-msg");
        btn.disabled = true;
        btn.textContent = "Joining…";
        const result = await joinWaitlist(emailInput.value, coin.id);
        if (result.success) {
          waitlistForm.style.display = "none";
          if (msgEl) {
            msgEl.textContent = result.demo
              ? "Thanks! (Demo mode — configure Supabase to save signups)"
              : "You're on the list! We'll notify you the moment we go live. 🚀";
            msgEl.className = "waitlist-message waitlist-success";
            msgEl.style.display = "block";
          }
        } else {
          if (msgEl) {
            msgEl.textContent = result.error;
            msgEl.className = "waitlist-message waitlist-error";
            msgEl.style.display = "block";
          }
          btn.disabled = false;
          btn.textContent = "Notify Me";
        }
      });
    }

    // CTA: link to coin page
    if (ctaEl) {
      ctaEl.innerHTML = `
        <a href="/coin.html?id=${coin.id}" class="btn btn-outline">Learn More →</a>
      `;
    }

  } else if (coin.status === "live") {
    // Countdown to end date
    if (countdownLabel) countdownLabel.textContent = coin.countdownLabel || "Tournament ends in";
    if (countdownEl) {
      const timer = new CountdownTimer({
        targetDate: coin.endDate,
        element: countdownEl,
        completeMessage: coin.endMessage || "🏆 It's over. Legacy Mode."
      });
      timer.start();
    }

    // CTA: buy button
    if (ctaEl) {
      const buyUrl = coin.pumpfunUrl || "https://pump.fun";
      ctaEl.innerHTML = `
        <a href="${buyUrl}" class="btn btn-primary btn-lg" target="_blank" rel="noopener">
          ${coin.ctaText}
        </a>
        <a href="/coin.html?id=${coin.id}" class="btn btn-ghost">View Stats →</a>
      `;
    }

    // Fetch and show live price in hero
    if (coin.contractAddress) {
      startHeroLivePriceIndex(coin);
    }

  } else if (coin.status === "legacy") {
    // Legacy mode
    const statusBlock = document.getElementById("hero-status-block");
    if (statusBlock) {
      statusBlock.innerHTML = `<div class="hero-legacy-msg">${coin.endMessage || "🏆 Tournament Over. Legacy Mode."}</div>`;
    }
    if (ctaEl) {
      ctaEl.innerHTML = `
        <a href="/coin.html?id=${coin.id}" class="btn btn-outline">View History →</a>
      `;
    }
  }
}

function startHeroLivePriceIndex(coin) {
  const dex = new DexScreener(coin.contractAddress);
  dex.onChange((data) => {
    // Update any hero price elements if present
    const priceEls = document.querySelectorAll(".hero-live-price");
    priceEls.forEach(el => {
      el.textContent = DexScreener.formatPrice(data?.price);
    });
  });
  dex.start();
}

// ── COINS GRID ────────────────────────────────────────────────
function buildCoinsGrid() {
  const grid = document.getElementById("coins-grid");
  if (!grid) return;

  const coins = getAllCoins();
  if (coins.length === 0) {
    grid.innerHTML = `<p style="color:var(--color-text-muted); text-align:center; grid-column:1/-1;">No coins yet. Check back soon.</p>`;
    return;
  }

  // Highlighted coin first
  const sorted = [...coins].sort((a, b) => {
    if (a.highlighted && !b.highlighted) return -1;
    if (!a.highlighted && b.highlighted) return 1;
    return 0;
  });

  grid.innerHTML = sorted.map(coin => buildCoinCard(coin)).join("");

  // Keyboard accessibility for cards
  grid.querySelectorAll(".coin-card").forEach(card => {
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });
}

// ── FOOTER COIN LIST ──────────────────────────────────────────
function buildFooterCoinList() {
  const list = document.getElementById("footer-coins-list");
  if (!list) return;
  list.innerHTML = getAllCoins()
    .map(c => `<li><a href="/coin.html?id=${c.id}">${c.ticker} — ${c.fullName}</a></li>`)
    .join("");
}

// ── TICKER BAR ───────────────────────────────────────────────
function buildTicker() {
  const liveCoins = getLiveCoins();

  if (liveCoins.length === 0) {
    // No live coins — show coming soon info
    const track = document.getElementById("ticker-track");
    if (track) {
      const items = getAllCoins().map(c => `
        <span class="ticker-item">
          <a href="/coin.html?id=${c.id}" class="ticker-link">
            <strong>${c.ticker}</strong>
            <span class="ticker-soon">Launching ${formatLaunchDate(c.launchDate)}</span>
          </a>
        </span>
        <span class="ticker-divider">•</span>
      `).join("");
      // Repeat 12 times per copy → 24 total; translateX(-50%) scrolls through 12 copies.
      // Ensures no gap even on very wide screens with few items.
      const INNER_REPEATS = 12;
      const oneCopy = Array(INNER_REPEATS).fill(items).join("");
      track.innerHTML = oneCopy + oneCopy;
      setTimeout(() => {
        const totalWidth = track.scrollWidth;
        if (totalWidth > 0) {
          const oneCopyWidth = totalWidth / 2;
          track.style.animationDuration = Math.max(10, Math.round(oneCopyWidth / 60)) + "s";
        }
      }, 100);
    }
    return;
  }

  // For live coins, set up DexScreener polling
  const dexMap = {};
  const dexInstances = {};

  liveCoins.forEach(coin => {
    if (!coin.contractAddress) return;
    const dex = new DexScreener(coin.contractAddress);
    dexInstances[coin.id] = dex;
    dex.onChange(data => {
      dexMap[coin.id] = data;
      buildTickerContent(getAllCoins(), dexMap);
    });
    dex.start();
  });

  // Initial render with "--" placeholders
  buildTickerContent(getAllCoins(), dexMap);
}
