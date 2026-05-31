// ============================================================
// MAIN.JS — global site logic (runs on every page)
// ============================================================

// Scripts are at bottom of <body> so DOM is already parsed.
// Use readyState check so the handler fires whether DOMContentLoaded
// has already fired or not.
function onReady(fn) {
  if (document.readyState !== "loading") { fn(); }
  else { document.addEventListener("DOMContentLoaded", fn); }
}

onReady(async () => {

  // 1. Sync live data from Supabase (overrides local coins.js config)
  await syncCoinsFromSupabase();

  // 2. Scroll-fade animations via Intersection Observer
  initScrollAnimations();

  // 3. Mobile nav toggle
  initMobileNav();

  // 4. Active nav link
  highlightActiveNav();

  // 5. Smooth scroll for anchor links
  initSmoothScroll();

  // 6. Home link → scroll-to-top when already on the home page
  initHomeNavScroll();

  // NOTE: Waitlist form submit handlers are attached by each page's own script
  //       (index.js → buildHero, coin.js → renderWaitlist).
  //       bindWaitlistForms() is NOT called here to avoid double-binding.
});

// ── Scroll fade-in ────────────────────────────────────────────
// Observer is stored globally so index.js / coin.js can register
// dynamically added .fade-in elements after the initial scan.
window._fadeObserver = null;

function initScrollAnimations() {
  window._fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        window._fadeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll(".fade-in").forEach(el => window._fadeObserver.observe(el));
}

// Call this after inserting new .fade-in elements into the DOM.
// Elements already in the viewport will become visible immediately.
function observeNewFadeIns(containerEl) {
  if (!window._fadeObserver) return;
  const els = containerEl
    ? containerEl.querySelectorAll(".fade-in")
    : document.querySelectorAll(".fade-in");
  els.forEach(el => {
    if (!el.classList.contains("visible")) {
      window._fadeObserver.observe(el);
    }
  });
}

// ── Mobile nav ────────────────────────────────────────────────
function initMobileNav() {
  const toggle = document.getElementById("nav-toggle");
  const menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Close when a nav link is clicked
  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

// ── Active nav highlight ──────────────────────────────────────
function highlightActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;
    const isHome = (href === "/" || href === "/index.html") && (path === "/" || path === "/index.html");
    const isCoin = href.includes("coin.html") && path.includes("coin.html");
    if (isHome || isCoin) link.classList.add("active");
  });
}

// ── Smooth scroll ─────────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", e => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// ── Home link: scroll to top when already on the home page ────
function initHomeNavScroll() {
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href !== '/' && href !== '/index.html') return;

    link.addEventListener('click', e => {
      const isHome = ['/', '/index.html'].includes(window.location.pathname);
      if (!isHome) return;

      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Close mobile menu if open
      const menu = document.getElementById('nav-menu');
      const toggle = document.getElementById('nav-toggle');
      if (menu) menu.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// ── Image error handlers ─────────────────────────────────────
// Defined on window so they're callable from onerror="" attributes
// without any inline JS quote-escaping (which is where bugs happen).

// Called on the coin hero logo (coin.html)
window.onLogoError = function(img, ticker) {
  const label = String(ticker || "?").replace("$", "").slice(0, 5);
  const div = document.createElement("div");
  div.className = "coin-hero__logo-placeholder";
  div.textContent = label;
  if (img.parentNode) img.parentNode.replaceChild(div, img);
};

// Called on coin card thumbnails (index.html coins grid)
window.onThumbError = function(img, ticker) {
  const label = String(ticker || "?").replace("$", "").slice(0, 5);
  const wrap = img.closest(".coin-card__thumb");
  if (wrap) {
    img.remove();
    wrap.classList.add("thumb-fallback");
    const span = document.createElement("span");
    span.className = "thumb-fallback__text";
    span.textContent = label;
    wrap.appendChild(span);
  }
};

// ── Utility: status badge HTML ────────────────────────────────
function statusBadge(status) {
  const map = {
    coming_soon: '<span class="badge badge-soon">Coming Soon</span>',
    live: '<span class="badge badge-live"><span class="live-dot"></span>LIVE</span>',
    legacy: '<span class="badge badge-legacy">Legacy 🏆</span>'
  };
  return map[status] || "";
}

// ── Utility: build coin card HTML ─────────────────────────────
function buildCoinCard(coin) {
  const isHighlighted = coin.highlighted;
  const statusHtml = statusBadge(coin.status);
  const priceLine = coin.status === "live"
    ? `<span class="card-price" data-card-price="${coin.id}">--</span>`
    : `<span class="card-launch-date">Launches ${formatLaunchDate(coin.launchDate)}</span>`;

  return `
    <article class="coin-card ${isHighlighted ? "coin-card--highlighted" : ""} fade-in"
             style="${isHighlighted ? `--card-glow: ${coin.colors.primary}` : ""}"
             onclick="window.location.href='/coin.html?id=${coin.id}'"
             role="button" tabindex="0"
             aria-label="View ${coin.fullName}">
      <div class="coin-card__thumb">
        <img src="${coin.media.thumbnail}" alt="${coin.name} — ${coin.ticker} meme coin"
             loading="lazy" width="300" height="180"
             onerror="onThumbError(this, '${coin.ticker}')">
      </div>
      <div class="coin-card__body">
        <div class="coin-card__header">
          <h3 class="coin-card__name">${coin.name}</h3>
          ${statusHtml}
        </div>
        <p class="coin-card__ticker">${coin.ticker}</p>
        <p class="coin-card__desc">${coin.description.substring(0, 100)}…</p>
        <div class="coin-card__footer">
          ${priceLine}
          <span class="coin-card__arrow">→</span>
        </div>
      </div>
    </article>
  `;
}
