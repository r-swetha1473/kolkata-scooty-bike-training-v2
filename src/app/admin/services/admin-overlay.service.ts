import { Injectable, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdminOverlayService implements OnDestroy {
  private openCount = 0;
  private escHandlers: Array<() => void> = [];
  private keyListenerAttached = false;

  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.escHandlers.length) return;
    event.preventDefault();
    this.escHandlers[this.escHandlers.length - 1]();
  };

  lockScroll(onEscape?: () => void) {
    this.openCount += 1;
    if (onEscape) this.escHandlers.push(onEscape);
    if (this.openCount === 1) {
      document.body.classList.add('admin-overlay-open');
      if (!this.keyListenerAttached) {
        document.addEventListener('keydown', this.handleKeydown);
        this.keyListenerAttached = true;
      }
    }
  }

  unlockScroll(onEscape?: () => void) {
    if (onEscape) {
      const idx = this.escHandlers.lastIndexOf(onEscape);
      if (idx >= 0) this.escHandlers.splice(idx, 1);
    } else if (this.escHandlers.length) {
      this.escHandlers.pop();
    }
    this.openCount = Math.max(0, this.openCount - 1);
    if (this.openCount === 0) {
      document.body.classList.remove('admin-overlay-open');
      this.escHandlers = [];
      if (this.keyListenerAttached) {
        document.removeEventListener('keydown', this.handleKeydown);
        this.keyListenerAttached = false;
      }
    }
  }

  ngOnDestroy() {
    this.openCount = 0;
    this.escHandlers = [];
    document.body.classList.remove('admin-overlay-open');
    if (this.keyListenerAttached) {
      document.removeEventListener('keydown', this.handleKeydown);
      this.keyListenerAttached = false;
    }
  }
}
