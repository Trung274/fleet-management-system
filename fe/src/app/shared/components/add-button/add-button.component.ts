import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-add-button',
  standalone: true,
  template: `
    <button
      [id]="buttonId"
      class="add-btn"
      type="button"
      (click)="clicked.emit()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
           stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      {{ label }}
    </button>
  `,
  styles: [`
    .add-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: .5rem 1.125rem;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-size: .875rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      color: #fff;
      transition: opacity .2s, transform .2s;
      white-space: nowrap;
    }
    .add-btn svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
    .add-btn:hover { opacity: .9; transform: translateY(-1px); }
    .add-btn:active { transform: translateY(0); }
  `],
})
export class AddButtonComponent {
  /** Text hiển thị trong button */
  @Input() label = 'Thêm mới';
  /** id attribute cho automation/test targeting */
  @Input() buttonId = 'add-btn';
  /** Emit khi button được click */
  @Output() clicked = new EventEmitter<void>();
}
