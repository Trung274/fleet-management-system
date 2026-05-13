import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="search-wrap">
      <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none"
           viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        [id]="inputId"
        class="search-input"
        type="text"
        [placeholder]="placeholder"
        [value]="value"
        (input)="onInput($event)"
        autocomplete="off"
      />
      @if (value) {
        <button class="clear-btn" type="button" title="Xóa" (click)="clear()">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
               stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    </div>
  `,
  styles: [`
    :host { flex: 1; min-width: 200px; display: block; }

    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-icon {
      position: absolute; left: 12px;
      width: 16px; height: 16px;
      color: #475569; pointer-events: none;
      flex-shrink: 0;
    }

    .search-input {
      width: 100%;
      padding: .5rem .75rem .5rem 36px;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px;
      color: #f1f5f9;
      font-size: .875rem;
      font-family: 'Inter', sans-serif;
      transition: border-color .2s;
    }
    .search-input::placeholder { color: #475569; }
    .search-input:focus { outline: none; border-color: #3b82f6; }

    .clear-btn {
      position: absolute; right: 10px;
      width: 18px; height: 18px;
      border: none; background: transparent;
      color: #64748b; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px; padding: 0;
      transition: color .15s;
    }
    .clear-btn svg { width: 12px; height: 12px; }
    .clear-btn:hover { color: #f1f5f9; }
  `],
})
export class SearchInputComponent {
  @Input() placeholder = 'Tìm kiếm...';
  @Input() value = '';
  @Input() inputId = 'search-input';
  @Output() search = new EventEmitter<string>();

  onInput(e: Event): void {
    this.search.emit((e.target as HTMLInputElement).value);
  }

  clear(): void {
    this.search.emit('');
  }
}
