import { Component, Input, ElementRef, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MenuAction {
  label: string;
  iconPaths: string[];
  color?: 'default' | 'warning' | 'danger' | 'success' | 'info';
  disabled?: boolean;
  action: () => void;
}

@Component({
  selector: 'app-action-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="menu-wrap">
      <button class="menu-trigger" (click)="toggle($event)" [class.open]="isOpen()" title="Thao tác">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5"  r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>

      @if (isOpen()) {
        <div class="dropdown">
          @for (item of actions; track item.label) {
            <button
              class="dropdown-item"
              [class]="'item-' + (item.color ?? 'default')"
              [disabled]="item.disabled"
              (click)="run(item, $event)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                   stroke-width="1.5" stroke="currentColor">
                @for (p of item.iconPaths; track p) {
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="p" />
                }
              </svg>
              {{ item.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .menu-wrap { position: relative; display: inline-block; }

    .menu-trigger {
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: transparent; color: #64748b; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s;
    }
    .menu-trigger svg { width: 18px; height: 18px; }
    .menu-trigger:hover, .menu-trigger.open {
      background: rgba(255,255,255,.08); color: #cbd5e1;
    }

    .dropdown {
      position: absolute; right: 0; top: calc(100% + 4px); z-index: 200;
      background: #1e293b; border: 1px solid rgba(255,255,255,.1);
      border-radius: 12px; padding: 4px;
      min-width: 160px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      animation: pop .12s ease-out;
    }
    @keyframes pop { from { opacity:0; transform:scale(.95) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }

    .dropdown-item {
      width: 100%; display: flex; align-items: center; gap: 8px;
      padding: 7px 10px; border-radius: 8px; border: none;
      background: transparent; cursor: pointer; font-size: .825rem;
      font-family: 'Inter', sans-serif; font-weight: 500;
      text-align: left; transition: background .12s;
      white-space: nowrap;
    }
    .dropdown-item svg { width: 15px; height: 15px; flex-shrink: 0; }
    .dropdown-item:disabled { opacity: .4; cursor: not-allowed; }

    .item-default { color: #cbd5e1; }
    .item-default:hover:not(:disabled) { background: rgba(255,255,255,.07); }

    .item-warning { color: #fbbf24; }
    .item-warning:hover:not(:disabled) { background: rgba(245,158,11,.12); }

    .item-danger  { color: #f87171; }
    .item-danger:hover:not(:disabled)  { background: rgba(239,68,68,.12); }

    .item-success { color: #4ade80; }
    .item-success:hover:not(:disabled) { background: rgba(22,163,74,.12); }

    .item-info    { color: #60a5fa; }
    .item-info:hover:not(:disabled)    { background: rgba(59,130,246,.12); }
  `],
})
export class ActionMenuComponent {
  @Input() actions: MenuAction[] = [];

  isOpen = signal(false);

  constructor(private el: ElementRef) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    if (!this.el.nativeElement.contains(e.target)) {
      this.isOpen.set(false);
    }
  }

  toggle(e: Event): void {
    e.stopPropagation();
    this.isOpen.update(v => !v);
  }

  run(item: MenuAction, e: Event): void {
    e.stopPropagation();
    if (!item.disabled) {
      item.action();
      this.isOpen.set(false);
    }
  }
}
