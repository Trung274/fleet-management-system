import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="confirm-backdrop" (click)="onCancel()">
        <div class="confirm-dialog" (click)="$event.stopPropagation()">
          <div class="confirm-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <h3 class="confirm-title">{{ title }}</h3>

          <p class="confirm-message" [innerHTML]="message"></p>

          <div class="confirm-actions">
            <button class="btn-cancel" (click)="onCancel()" [disabled]="isLoading">
              {{ cancelLabel }}
            </button>
            <button class="btn-confirm" (click)="onConfirm()" [disabled]="isLoading">
              @if (isLoading) {
                <span class="spinner"></span>
              }
              {{ isLoading ? 'Đang xử lý...' : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .confirm-backdrop {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .confirm-dialog {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      animation: slideUp 0.2s ease-out;
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

    .confirm-icon {
      width: 56px; height: 56px; border-radius: 16px;
      margin: 0 auto 1.25rem;
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.3);
      display: flex; align-items: center; justify-content: center;
    }
    .confirm-icon svg { width: 28px; height: 28px; color: #f87171; }

    .confirm-title {
      font-size: 1.125rem; font-weight: 700;
      color: #f1f5f9; margin: 0 0 0.625rem;
    }

    .confirm-message {
      font-size: 0.875rem; color: #94a3b8;
      line-height: 1.65; margin: 0 0 1.75rem;
    }
    .confirm-message :global(strong) { color: #f1f5f9; }

    .confirm-actions {
      display: flex; gap: 0.75rem; justify-content: center;
    }

    button {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0.5rem 1.25rem; border-radius: 10px;
      font-size: 0.875rem; font-weight: 600; border: none;
      cursor: pointer; transition: all 0.2s;
      font-family: 'Inter', sans-serif;
    }
    button:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-cancel {
      background: rgba(255,255,255,0.06);
      color: #cbd5e1;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-cancel:hover:not(:disabled) { background: rgba(255,255,255,0.1); }

    .btn-confirm {
      background: rgba(239,68,68,0.15);
      color: #f87171;
      border: 1px solid rgba(239,68,68,0.3);
    }
    .btn-confirm:hover:not(:disabled) { background: rgba(239,68,68,0.25); }

    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(248,113,113,0.3);
      border-top-color: #f87171;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ConfirmDialogComponent {
  /** Whether the dialog is shown */
  @Input() isOpen = false;

  /** Dialog heading */
  @Input() title = 'Xác nhận xóa';

  /**
   * Body message — supports basic HTML (e.g. <strong>name</strong>).
   * Always sanitise before passing if content comes from user input.
   */
  @Input() message = 'Bạn có chắc muốn thực hiện hành động này?';

  /** Label for the confirm (danger) button */
  @Input() confirmLabel = 'Xóa';

  /** Label for the cancel button */
  @Input() cancelLabel = 'Hủy';

  /** Show spinner and disable buttons while async action is running */
  @Input() isLoading = false;

  /** Emitted when user clicks the confirm button */
  @Output() confirmed = new EventEmitter<void>();

  /** Emitted when user cancels (button or backdrop click) */
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    if (!this.isLoading) {
      this.cancelled.emit();
    }
  }
}
