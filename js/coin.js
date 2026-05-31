// ============================================================
// COIN.JS — coin detail page logic (/coin.html?id=wcmc26)
// Reads the ?id= URL param, loads that coin's config,
// applies its theme, and renders all page sections.
// ============================================================

(function initCoinPage() {

  // onReady fires immediately if DOM is already parsed (scripts at bottom of body).
  onReady(async () => {

    // 1. Read ?id= from URL
    const params = new URLSearchParams(window.location.search);
    const coinId = params.get("id");

    if (!coinId) {
      showError("No coin specified. <a href='/'>Go back home →</a>");
      return;
    }

    // 2. Sync live data from Supabase (updates COINS registry in-place)
    await syncCoinsFromSupabase();

    // 3. Look up the coin
    const coin = getCoin(coinId);
    if (!coin) {
      showError(`Coin "${coinId}" not found. <a href='/'>Go back home →</a>`);
      return;
    }

    // 4. Apply theme to body
    document.body.classList.add(`theme-${coin.theme}`);

    // 5. Update page title & meta
    document.title = `${coin.name} (${coin.ticker}) — ChaosLabsX`;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = `${coin.fullName} — ChaosLabsX`;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = coin.description;
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && coin.media.thumbnail) ogImg.content = coin.media.thumbnail;

    // 6. Render all sections
    renderHero(coin);
    renderAbout(coin);
    renderHowToBuy(coin);
    renderCommunity(coin);
    renderWaitlist(coin);

    // 7. Start live data if coin is live
    if (coin.status === "live" && coin.contractAddress) {
      renderStatsSection(coin);
      renderChart(coin);
      startLiveData(coin);
    }

    // 8. Register all dynamically rendered .fade-in elements with the observer
    observeNewFadeIns(document.querySelector("main"));

  });
})();

// ── HERO ─────────────────────────────────────────────────────
function renderHero(coin) {

  // Background media
  const bg = document.getElementById("coin-hero-bg");
  if (bg && coin.media.heroBanner) {
    const isVideo = /\.(mp4|webm)$/i.test(coin.media.heroBanner);
    if (isVideo) {
      bg.innerHTML = `
        <video class="hero__video" autoplay muted loop playsinline
               poster="${coin.media.thumbnail || ""}" aria-hidden="true">
          <source src="${coin.media.heroBanner}" type="video/mp4">
        </video>
      `;
    } else {
      bg.innerHTML = `
        <img src="${coin.media.heroBanner}" alt="" aria-hidden="true" class="hero__video"
             style="object-fit:cover; width:100%; height:100%;"
             onerror="this.parentElement.classList.add('hero__bg--gradient'); this.remove();">
      `;
    }
  }

  // Logo
  const logoWrap = document.getElementById("coin-logo-wrap");
  if (logoWrap) {
    if (coin.media.logo) {
      // onLogoError is defined in main.js — avoids inline quote-escaping bugs
      logoWrap.innerHTML = `
        <img class="coin-hero__logo"
             src="${coin.media.logo}"
             alt="${coin.name} logo"
             onerror="onLogoError(this, '${coin.ticker}')">
      `;
    } else {
      // No logo path defined — show initials placeholder immediately
      const label = coin.ticker.replace("$", "").slice(0, 5);
      logoWrap.innerHTML = `<div class="coin-hero__logo-placeholder">${label}</div>`;
    }
  }

  // Name, ticker, badge
  const nameEl = document.getElementById("coin-name");
  if (nameEl) nameEl.textContent = coin.fullName;

  const tickerEl = document.getElementById("coin-ticker");
  if (tickerEl) tickerEl.textContent = coin.ticker;

  const badgeEl = document.getElementById("coin-status-badge");
  if (badgeEl) badgeEl.innerHTML = statusBadge(coin.status);

  // Countdown & CTA
  const countdownLabel = document.getElementById("coin-countdown-label");
  const countdownEl = document.getElementById("coin-countdown");
  const ctaEl = document.getElementById("coin-cta");

  if (coin.status === "coming_soon") {
    if (countdownLabel) countdownLabel.textContent = "Launches in";
    if (countdownEl) {
      const timer = new CountdownTimer({
        targetDate: coin.launchDate,
        element: countdownEl,
        completeMessage: coin.launchMessage || "🚀 We are LIVE!"
      });
      timer.start();
    }
    if (ctaEl) {
      ctaEl.innerHTML = `
        <a href="#waitlist" class="btn btn-primary btn-lg">Join the Waitlist 🚀</a>
        <a href="#how-to-buy" class="btn btn-ghost">How to Buy →</a>
      `;
    }

  } else if (coin.status === "live") {
    // Show countdown to end
    if (countdownLabel) countdownLabel.textContent = coin.countdownLabel || "Tournament ends in";
    if (countdownEl) {
      const timer = new CountdownTimer({
        targetDate: coin.endDate,
        element: countdownEl,
        completeMessage: coin.endMessage || "🏆 It's over. Legacy Mode."
      });
      timer.start();
    }

    // Show live price area
    const priceWrap = document.getElementById("live-price-wrap");
    if (priceWrap) priceWrap.style.display = "block";

    // CTA: buy
    if (ctaEl) {
      const buyUrl = coin.pumpfunUrl || "https://pump.fun";
      ctaEl.innerHTML = `
        <a href="${buyUrl}" class="btn btn-primary btn-lg" target="_blank" rel="noopener">
          ${coin.ctaText}
        </a>
        <a href="#chart-section" class="btn btn-ghost">View Chart →</a>
      `;
    }

  } else if (coin.status === "legacy") {
    const statusBlock = document.getElementById("coin-status-block");
    if (statusBlock) {
      statusBlock.innerHTML = `<div class="hero-legacy-msg">${coin.endMessage || "🏆 Legacy Mode."}</div>`;
    }
    if (ctaEl) {
      ctaEl.innerHTML = `
        <a href="#about" class="btn btn-outline">View History →</a>
      `;
    }
  }
}

// ── LIVE STATS + CHART ────────────────────────────────────────
function renderStatsSection(coin) {
  const section = document.getElementById("stats-section");
  if (section) section.style.display = "block";
}

function renderChart(coin) {
  const section = document.getElementById("chart-section");
  const iframe = document.getElementById("dex-chart-iframe");
  if (!section || !iframe || !coin.contractAddress) return;
  section.style.display = "block";
  iframe.src = DexScreener.chartUrl(coin.contractAddress);
}

function startLiveData(coin) {
  const dex = new DexScreener(coin.contractAddress);

  dex.onChange((data) => {
    renderStatCards(data);

    // Also update the hero large price
    const heroPrice = document.querySelector(".live-price-display[data-stat='price']");
    if (heroPrice) heroPrice.textContent = DexScreener.formatPrice(data?.price);

    const heroChange = document.getElementById("hero-change");
    if (heroChange) {
      heroChange.textContent = DexScreener.formatChange(data?.priceChange24h);
      heroChange.className = "live-price-change " + DexScreener.changeClass(data?.priceChange24h);
    }
  });

  dex.start();
}

// ── ABOUT ─────────────────────────────────────────────────────
function renderAbout(coin) {
  const desc = document.getElementById("coin-description");
  if (desc) desc.textContent = coin.description;

  const platform = document.getElementById("fact-platform");
  if (platform) platform.textContent = coin.launchPlatform || "Pump.fun";

  const launch = document.getElementById("fact-launch");
  if (launch) launch.textContent = formatDateLong(coin.launchDate);

  const end = document.getElementById("fact-end");
  if (end) end.textContent = formatDateLong(coin.endDate);

  const status = document.getElementById("fact-status");
  if (status) {
    const labels = { coming_soon: "Coming Soon", live: "Live", legacy: "Legacy" };
    status.textContent = labels[coin.status] || coin.status;
  }

  if (coin.contractAddress) {
    const contractWrap = document.getElementById("fact-contract-wrap");
    const contractEl = document.getElementById("fact-contract");
    if (contractWrap) contractWrap.style.display = "block";
    if (contractEl) contractEl.textContent = coin.contractAddress;
  }

  // Timeline active state
  const tlMap = { coming_soon: "tl-soon", live: "tl-live", legacy: "tl-legacy" };
  // Mark all steps up to and including current as active
  const order = ["tl-soon", "tl-live", "tl-legacy"];
  const activeIndex = order.indexOf(tlMap[coin.status]);
  order.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && i <= activeIndex) el.classList.add("active");
  });
}

// ── HOW TO BUY ────────────────────────────────────────────────
function renderHowToBuy(coin) {
  const step4Title = document.getElementById("htb-step4-title");
  const step4Body = document.getElementById("htb-step4-body");

  if (step4Title) step4Title.textContent = `Search ${coin.ticker} & Swap`;
  if (step4Body) {
    if (coin.contractAddress) {
      step4Body.innerHTML = `Search for <strong style="color:var(--color-primary);">${coin.ticker}</strong> or paste the contract address, then swap your SOL for ${coin.ticker}.`;
    } else {
      step4Body.innerHTML = `Search for <strong style="color:var(--color-primary);">${coin.ticker}</strong> once we go live, then swap your SOL.`;
    }
  }

  // Hide this section for legacy coins (no need to instruct buying)
  if (coin.status === "legacy") {
    const section = document.getElementById("how-to-buy");
    if (section) section.style.display = "none";
  }
}

// ── COMMUNITY ─────────────────────────────────────────────────
function renderCommunity(coin) {
  const links = document.getElementById("social-links");
  if (!links) return;

  const xIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;

  links.innerHTML = `
    <a href="https://x.com/ChaosLabsX" class="btn btn-outline" target="_blank" rel="noopener">
      ${xIcon} Follow @ChaosLabsX on X
    </a>
    ${coin.pumpfunUrl ? `
      <a href="${coin.pumpfunUrl}" class="btn btn-primary" target="_blank" rel="noopener">
        Trade on Pump.fun →
      </a>
    ` : ""}
  `;
}

// ── WAITLIST ──────────────────────────────────────────────────
function renderWaitlist(coin) {
  if (coin.status !== "coming_soon") return;

  const section = document.getElementById("waitlist-section");
  if (section) {
    section.style.display = "block";
    section.id = "waitlist"; // make anchor link work
  }

  const sub = document.getElementById("waitlist-coin-sub");
  if (sub) {
    sub.textContent = `Be the first to know the moment ${coin.ticker} launches on ${coin.launchPlatform}. Early buyers get the best price.`;
  }

  const form = document.getElementById("coin-waitlist-form");
  if (form) {
    form.dataset.coinId = coin.id;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector("input[type=email]");
      const btn = form.querySelector("button[type=submit]");
      const msgEl = document.getElementById("coin-waitlist-msg");
      btn.disabled = true;
      btn.textContent = "Joining…";
      const result = await joinWaitlist(emailInput.value, coin.id);
      if (result.success) {
        form.style.display = "none";
        if (msgEl) {
          msgEl.textContent = result.demo
            ? "Thanks! (Demo mode — configure Supabase to save signups)"
            : "You're on the list! 🚀 We'll ping you the moment we go live.";
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
        btn.textContent = "Notify Me 🚀";
      }
    });
  }
}

// ── UTILITIES ─────────────────────────────────────────────────
function formatDateLong(isoString) {
  if (!isoString) return "--";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function showError(html) {
  document.body.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;
                min-height:100vh; font-family:sans-serif; color:#fff; background:#0d0d0d;
                text-align:center; padding:24px; gap:16px;">
      <div style="font-size:3rem;">🪙</div>
      <h1 style="font-size:1.5rem;">Coin not found</h1>
      <p style="color:rgba(255,255,255,0.6);">${html}</p>
    </div>
  `;
}
