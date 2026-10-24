/**
 * GazBoard - In-App Spaced Repetition (FSRS v5) Review Runner
 * Runs interactive active-recall flashcard review sessions over Study Tape and Answer Covers.
 * Features smooth camera gliding, occlusion toggling, and real-time retention rating.
 */

import { t } from '../i18n.js';
import { boundsOf } from '../core/store.js';
import { Rating, collectStudyCards, repeat, previewNextIntervals } from '../core/fsrs.js';

export class StudyRunner {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.cards = [];
    this.currentIndex = 0;
    this.revealed = false;
    this.container = null;
    this.stats = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };
    this._onKeyDown = this.handleKeyDown.bind(this);
  }

  /** Start a review session */
  start({ onlyDue = false } = {}) {
    if (this.active) this.stop();

    const allCards = collectStudyCards(this.app.store);
    if (!allCards.length) {
      this.app.toast?.(t('No Study Tape or Answer Covers found. Use the Study Tape tool (🩹) to occlude items first.'));
      return false;
    }

    // Filter due cards if requested, else prioritize due cards
    let sessionCards = onlyDue ? allCards.filter((c) => c.isDue) : allCards;
    if (onlyDue && !sessionCards.length) {
      this.app.toast?.(t('All Study Tape cards are currently up-to-date! Starting revision of all cards.'));
      sessionCards = allCards;
    }

    // Sort: due cards first, then by last review
    sessionCards.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      return (a.card.due || 0) - (b.card.due || 0);
    });

    this.cards = sessionCards;
    this.currentIndex = 0;
    this.active = true;
    this.stats = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };

    this.mountUI();
    this.loadCard(this.currentIndex);
    window.addEventListener('keydown', this._onKeyDown, true);
    return true;
  }

  /** Stop and clean up review session */
  stop() {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this._onKeyDown, true);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.app.surface?.invalidate?.();
  }

  /** Mount floating review HUD */
  mountUI() {
    if (this.container) this.container.remove();

    const hud = document.createElement('div');
    hud.className = 'fsrs-study-runner';
    hud.innerHTML = `
      <div class="study-hud-inner">
        <div class="study-hud-top">
          <div class="study-hud-badge">
            <span class="hud-pulse"></span>
            <span class="hud-counter">Card 1 / ${this.cards.length}</span>
          </div>
          <div class="study-hud-title">${t('Study Tape Active Recall')}</div>
          <button class="study-hud-close" title="${t('Exit Review (Esc)')}">✕</button>
        </div>
        <div class="study-hud-progress"><div class="study-hud-bar" style="width: 0%"></div></div>
        <div class="study-hud-body">
          <div class="study-hud-prompt">${t('Test your memory: What is hidden under this occlusion?')}</div>
          <div class="study-hud-actions">
            <!-- Dynamic Buttons injected here -->
          </div>
        </div>
      </div>
    `;

    hud.querySelector('.study-hud-close').addEventListener('click', () => this.stop());
    document.body.appendChild(hud);
    this.container = hud;
  }

  /** Load and focus the specified card */
  loadCard(index) {
    if (index >= this.cards.length) {
      this.finishSession();
      return;
    }

    this.currentIndex = index;
    const item = this.cards[index];
    this.revealed = false;

    // Conceal the card initially so user can test memory
    if (item.object.revealed) {
      item.object.revealed = false;
      this.app.surface?.invalidate?.();
    }

    // Update progress
    const pct = Math.round(((index) / this.cards.length) * 100);
    const counter = this.container?.querySelector('.hud-counter');
    const bar = this.container?.querySelector('.study-hud-bar');
    if (counter) counter.textContent = `${t('Card')} ${index + 1} / ${this.cards.length}`;
    if (bar) bar.style.width = `${pct}%`;

    // Smoothly glide camera to card
    const box = boundsOf(item.object);
    if (box && box.w > 0 && box.h > 0) {
      const vw = this.app.surface.width;
      const vh = this.app.surface.height;
      this.app.surface.cam.glideTo(box, vw, vh, {
        pad: 140,
        duration: 380,
        onStep: () => this.app.surface?.invalidate()
      });
    }

    this.renderActions();
  }

  /** Render HUD action buttons based on revealed state */
  renderActions() {
    const actions = this.container?.querySelector('.study-hud-actions');
    if (!actions) return;
    actions.innerHTML = '';

    const currentItem = this.cards[this.currentIndex];
    if (!this.revealed) {
      const btnReveal = document.createElement('button');
      btnReveal.className = 'study-hud-btn reveal-btn';
      btnReveal.innerHTML = `<span class="btn-icon">👁️</span><span>${t('Reveal Answer')}</span><kbd>Space</kbd>`;
      btnReveal.addEventListener('click', () => this.revealAnswer());
      actions.appendChild(btnReveal);
    } else {
      // Show FSRS 4 rating buttons with live intervals
      const intervals = previewNextIntervals(currentItem.card);
      const rates = [
        { rating: Rating.Again, label: t('Again'), interval: intervals.again, color: '#ef4444', key: '1' },
        { rating: Rating.Hard, label: t('Hard'), interval: intervals.hard, color: '#f97316', key: '2' },
        { rating: Rating.Good, label: t('Good'), interval: intervals.good, color: '#3b82f6', key: '3' },
        { rating: Rating.Easy, label: t('Easy'), interval: intervals.easy, color: '#10b981', key: '4' }
      ];

      rates.forEach((r) => {
        const btn = document.createElement('button');
        btn.className = 'study-hud-btn rate-btn';
        btn.style.setProperty('--rate-color', r.color);
        btn.innerHTML = `
          <span class="rate-label">${r.label}</span>
          <span class="rate-interval">${r.interval}</span>
          <kbd>${r.key}</kbd>
        `;
        btn.addEventListener('click', () => this.rateCard(r.rating));
        actions.appendChild(btn);
      });
    }
  }

  /** Reveal the hidden card answer */
  revealAnswer() {
    if (this.revealed || !this.active) return;
    this.revealed = true;
    const currentItem = this.cards[this.currentIndex];
    currentItem.object.revealed = true;
    this.app.surface?.invalidate?.();
    this.renderActions();
  }

  /** Rate card retention and advance */
  rateCard(rating) {
    if (!this.active || !this.revealed) return;
    const item = this.cards[this.currentIndex];

    // Compute next FSRS state
    const newCard = repeat(item.card, rating);
    item.card = newCard;
    item.object.fsrs = newCard;

    // Track stats
    this.stats.reviewed += 1;
    if (rating === Rating.Again) this.stats.again += 1;
    else if (rating === Rating.Hard) this.stats.hard += 1;
    else if (rating === Rating.Good) this.stats.good += 1;
    else if (rating === Rating.Easy) this.stats.easy += 1;

    // Persist to document store
    this.app.store?.update?.(item.object.id, { fsrs: newCard }, 'rate card fsrs');

    // Advance to next card
    this.loadCard(this.currentIndex + 1);
  }

  /** Handle keyboard navigation */
  handleKeyDown(e) {
    if (!this.active) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.stop();
      return;
    }

    if (!this.revealed) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.revealAnswer();
      }
    } else {
      if (e.key === '1') {
        e.preventDefault();
        e.stopPropagation();
        this.rateCard(Rating.Again);
      } else if (e.key === '2') {
        e.preventDefault();
        e.stopPropagation();
        this.rateCard(Rating.Hard);
      } else if (e.key === '3') {
        e.preventDefault();
        e.stopPropagation();
        this.rateCard(Rating.Good);
      } else if (e.key === '4') {
        e.preventDefault();
        e.stopPropagation();
        this.rateCard(Rating.Easy);
      }
    }
  }

  /** Show session complete summary */
  finishSession() {
    if (!this.container) return;
    const bar = this.container.querySelector('.study-hud-bar');
    if (bar) bar.style.width = '100%';

    const actions = this.container.querySelector('.study-hud-actions');
    const prompt = this.container.querySelector('.study-hud-prompt');
    const counter = this.container.querySelector('.hud-counter');

    if (counter) counter.textContent = t('Session Complete');
    if (prompt) {
      prompt.innerHTML = `<strong>🎉 ${t('Great work!')}</strong><br>${t('Reviewed {count} cards. Retention stability updated via FSRS v5.', { count: this.stats.reviewed })}`;
    }

    if (actions) {
      actions.innerHTML = `
        <button class="study-hud-btn primary" style="min-width: 140px;">${t('Finish & Return')}</button>
      `;
      actions.querySelector('button').addEventListener('click', () => this.stop());
    }
  }
}
