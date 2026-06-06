// ============================================================
// COUNTDOWN TIMER MODULE
// ============================================================
// Usage:
//   const timer = new CountdownTimer({
//     targetDate: "2026-07-19T18:00:00Z",
//     element: document.getElementById("my-timer"),
//     onComplete: () => { console.log("Done!"); },
//     completeMessage: "🏆 Event Over!"
//   });
//   timer.start();
//   timer.stop(); // call to clean up
// ============================================================

class CountdownTimer {
  constructor({ targetDate, element, onComplete, completeMessage }) {
    this.targetDate = new Date(targetDate).getTime();
    this.element = element;
    this.onComplete = onComplete || null;
    this.completeMessage = completeMessage || "Time's up!";
    this.intervalId = null;
    this.completed = false;
  }

  start() {
    this._tick();
    this.intervalId = setInterval(() => this._tick(), 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  _tick() {
    const now = Date.now();
    const diff = this.targetDate - now;

    if (diff <= 0) {
      this._renderComplete();
      this.stop();
      if (!this.completed && this.onComplete) {
        this.completed = true;
        this.onComplete();
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Hours / minutes / seconds stay on the raw diff so the sub-day
    // units always count down accurately to the exact target moment.
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    this._render(days, hours, minutes, seconds);
  }

  _pad(n) {
    return String(n).padStart(2, "0");
  }

  _render(days, hours, minutes, seconds) {
    if (!this.element) return;
    this.element.innerHTML = `
      <div class="countdown-units">
        <div class="countdown-unit">
          <span class="countdown-value">${days}</span>
          <span class="countdown-label">days</span>
        </div>
        <div class="countdown-sep">:</div>
        <div class="countdown-unit">
          <span class="countdown-value">${this._pad(hours)}</span>
          <span class="countdown-label">hrs</span>
        </div>
        <div class="countdown-sep">:</div>
        <div class="countdown-unit">
          <span class="countdown-value">${this._pad(minutes)}</span>
          <span class="countdown-label">min</span>
        </div>
        <div class="countdown-sep">:</div>
        <div class="countdown-unit">
          <span class="countdown-value">${this._pad(seconds)}</span>
          <span class="countdown-label">sec</span>
        </div>
      </div>
    `;
  }

  _renderComplete() {
    if (!this.element) return;
    this.element.innerHTML = `<div class="countdown-complete">${this.completeMessage}</div>`;
  }
}
