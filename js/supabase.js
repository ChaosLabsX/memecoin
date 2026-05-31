// ============================================================
// SUPABASE CLIENT & QUERIES
// ============================================================
// FILL IN YOUR CREDENTIALS BELOW before deploying:
//   SUPABASE_URL      → Settings → API → Project URL
//   SUPABASE_ANON_KEY → Settings → API → anon public key
// ============================================================

const SUPABASE_URL = "https://jraxygkylcjqghthuvem.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyYXh5Z2t5bGNqcWdodGh1dmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMzMyNTAsImV4cCI6MjA5NTcwOTI1MH0.Ak2fpOAYpXk8O2HulSEuaXKjW7NSGyBGrVgc7XWtMUA";

// Supabase client is loaded via CDN in HTML.
// This variable is set after DOMContentLoaded to ensure the CDN script is ready.
let supabaseClient = null;

function initSupabase() {
  if (typeof supabase === "undefined") {
    console.warn("Supabase CDN not loaded yet.");
    return false;
  }
  if (!supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return true;
}

// ── COINS TABLE ─────────────────────────────────────────────
// Fetches all coins from Supabase and merges live data into the
// local COINS registry. Supabase is the source of truth for:
//   contract_address, status, highlighted, launch_date, end_date
async function syncCoinsFromSupabase() {
  if (SUPABASE_URL === "YOUR_SUPABASE_URL_HERE") return; // skip until credentials are filled in
  if (!initSupabase()) return;

  try {
    const { data, error } = await supabaseClient
      .from("coins")
      .select("id, contract_address, status, highlighted, launch_date, end_date");

    if (error) {
      console.error("Supabase coins fetch error:", error.message);
      return;
    }

    if (!data || data.length === 0) return;

    data.forEach(row => {
      if (COINS[row.id]) {
        // Override local config with live Supabase data
        if (row.contract_address) COINS[row.id].contractAddress = row.contract_address;
        if (row.status) COINS[row.id].status = row.status;
        if (row.highlighted !== null) COINS[row.id].highlighted = row.highlighted;
        if (row.launch_date) COINS[row.id].launchDate = row.launch_date;
        if (row.end_date) COINS[row.id].endDate = row.end_date;

        // Rebuild pumpfunUrl if we now have a contract address
        if (row.contract_address && !COINS[row.id].pumpfunUrl) {
          COINS[row.id].pumpfunUrl = `https://pump.fun/coin/${row.contract_address}`;
        }
      }
    });
  } catch (err) {
    console.error("Supabase sync failed:", err);
  }
}

// ── WAITLIST TABLE ───────────────────────────────────────────
// Inserts a new email signup into the waitlist table.
// Returns { success: true } or { success: false, error: "..." }
async function joinWaitlist(email, coinId) {
  if (SUPABASE_URL === "YOUR_SUPABASE_URL_HERE") {
    console.warn("Supabase not configured. Waitlist submission skipped.");
    return { success: true, demo: true };
  }
  if (!initSupabase()) return { success: false, error: "Supabase not initialized." };

  if (!email || !/^[^\s@]+@gmail\.com$/i.test(email)) {
    return { success: false, error: "Only Gmail addresses are accepted (e.g. you@gmail.com)." };
  }

  try {
    const { error } = await supabaseClient
      .from("waitlist")
      .insert([{ email: email.trim().toLowerCase(), coin_id: coinId }]);

    if (error) {
      // Handle duplicate email gracefully
      if (error.code === "23505") {
        return { success: false, error: "You're already on the waitlist!" };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ── WAITLIST FORM HANDLER ────────────────────────────────────
// Attaches submit logic to any waitlist form on the page.
// The form must have:
//   data-coin-id="wcmc26"
//   an <input type="email"> inside it
//   a <button type="submit"> inside it
//   a <div class="waitlist-message"> for feedback
function bindWaitlistForms() {
  const forms = document.querySelectorAll(".waitlist-form");
  forms.forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const coinId = form.dataset.coinId;
      const emailInput = form.querySelector("input[type=email]");
      const msgEl = form.querySelector(".waitlist-message");
      const btn = form.querySelector("button[type=submit]");

      if (!emailInput || !coinId) return;

      const email = emailInput.value.trim();
      btn.disabled = true;
      btn.textContent = "Joining...";

      const result = await joinWaitlist(email, coinId);

      if (result.success) {
        form.style.display = "none";
        if (msgEl) {
          msgEl.textContent = result.demo
            ? "Thanks! (Demo mode — Supabase not yet configured)"
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
  });
}
