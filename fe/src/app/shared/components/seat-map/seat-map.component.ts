import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Seat, SeatType } from '../../../core/models/seat.model';
import { buildSeatLayout } from './seat-layout';

type SeatState = 'available' | 'selected' | 'reserved' | 'booked' | 'unavailable';

const TYPE_LABELS: Record<SeatType, string> = {
  priority: 'Ghế ưu tiên',
  window: 'Cạnh cửa sổ',
  aisle: 'Cạnh lối đi',
  standard: 'Ghế thường',
};

const STATE_LABELS: Record<SeatState, string> = {
  available: 'Trống',
  selected: 'Đang chọn',
  reserved: 'Đang giữ chỗ',
  booked: 'Đã đặt',
  unavailable: 'Không sử dụng',
};

/**
 * Bus seat map: shows every seat of a trip in its real position, coloured by status.
 * Only available seats can be picked; clicking the selected seat again clears it.
 *
 * <app-seat-map [seats]="seats" [selectedId]="seatId" [fare]="150000" (selectedIdChange)="..." />
 */
@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="seat-map">
      <div class="seat-map-head">
        <span class="seat-count">Còn <strong>{{ availableCount() }}</strong>/{{ seats().length }} ghế trống</span>
        <div class="legend">
          <span class="legend-item"><i class="seat-dot seat-available"></i>Trống</span>
          <span class="legend-item"><i class="seat-dot seat-selected"></i>Đang chọn</span>
          <span class="legend-item"><i class="seat-dot seat-reserved"></i>Đang giữ</span>
          <span class="legend-item"><i class="seat-dot seat-booked"></i>Đã đặt</span>
          <span class="legend-item"><i class="seat-dot seat-unavailable"></i>Hỏng</span>
          <span class="legend-item"><span class="star">★</span>Ưu tiên</span>
        </div>
      </div>

      <div class="bus">
        <div class="bus-front">
          <span class="bus-door">Cửa lên xe</span>
          <span class="bus-driver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2" />
              <path stroke-linecap="round" d="M12 14v6.5M10.2 11.2 4 9.5m9.8 1.7L20 9.5" />
            </svg>
            Tài xế
          </span>
        </div>

        <div class="bus-grid" [style.grid-template-columns]="'repeat(' + columns() + ', var(--seat-size))'">
          @for (row of layout(); track $index) {
            @for (n of row; track $index) {
              @if (n === null) {
                <span class="aisle" aria-hidden="true"></span>
              } @else if (seatAt(n); as seat) {
                <button type="button"
                  [class]="'seat seat-' + stateOf(seat)"
                  [class.seat-priority]="seat.type === 'priority'"
                  [disabled]="!isPickable(seat)"
                  [title]="describe(seat)"
                  [attr.aria-label]="describe(seat)"
                  [attr.aria-pressed]="stateOf(seat) === 'selected'"
                  (click)="pick(seat)">
                  {{ seat.seatNumber }}
                </button>
              } @else {
                <span class="aisle" aria-hidden="true"></span>
              }
            }
          }
        </div>
        <div class="bus-back">Đuôi xe</div>
      </div>

      @if (selectedSeat(); as s) {
        <div class="seat-summary">
          <span>
            Ghế <strong>{{ s.seatNumber }}</strong> · {{ typeLabel(s.type) }}
            @if (fare() !== undefined && fare() !== null) { · <strong>{{ fare() | number }} ₫</strong> }
          </span>
          <button type="button" class="seat-clear" (click)="selectedIdChange.emit('')">Bỏ chọn</button>
        </div>
      } @else {
        <p class="seat-hint">Bấm vào một ghế trống để chọn</p>
      }
    </div>
  `,
  styles: [`
    .seat-map { --seat-size: 40px; display:flex; flex-direction:column; gap:.75rem; }

    .seat-map-head { display:flex; flex-direction:column; align-items:center; gap:.4rem; }
    .seat-count { font-size:.8rem; color:#94a3b8; }
    .seat-count strong { color:#4ade80; }
    .legend { display:flex; justify-content:center; gap:.4rem .75rem; flex-wrap:wrap; max-width:100%; }
    .legend-item { display:inline-flex; align-items:center; gap:5px; font-size:.72rem; color:#94a3b8; }
    .seat-dot { display:inline-block; width:14px; height:14px; border-radius:4px; }
    .star { color:#fbbf24; font-size:.8rem; }

    .bus {
      align-self:center; display:flex; flex-direction:column; align-items:center; gap:.6rem;
      padding:.9rem 1rem .7rem; border-radius:28px 28px 14px 14px;
      background:rgba(255,255,255,.025); border:1.5px solid rgba(255,255,255,.1);
    }
    .bus-front {
      display:flex; justify-content:space-between; align-items:center; width:100%; gap:1rem;
      padding-bottom:.6rem; border-bottom:1px dashed rgba(255,255,255,.12);
      font-size:.7rem; color:#64748b; text-transform:uppercase; letter-spacing:.05em;
    }
    .bus-door { padding:2px 8px; border-left:3px solid #4ade80; }
    .bus-driver { display:inline-flex; align-items:center; gap:5px; }
    .bus-driver svg { width:18px; height:18px; }
    .bus-back { font-size:.65rem; color:#475569; text-transform:uppercase; letter-spacing:.08em; }

    .bus-grid { display:grid; gap:7px; }
    .aisle { width:var(--seat-size); height:var(--seat-size); }

    .seat {
      position:relative; width:var(--seat-size); height:var(--seat-size); padding:0;
      border-radius:9px 9px 6px 6px; font-size:.8rem; font-weight:700; font-family:'Inter',sans-serif;
      cursor:pointer; transition:background .12s, border-color .12s, transform .12s;
    }
    .seat:disabled { cursor:not-allowed; }
    .seat:focus-visible { outline:2px solid #60a5fa; outline-offset:2px; }

    .seat-available { background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.22); color:#e2e8f0; }
    .seat-available:hover { border-color:#3b82f6; background:rgba(59,130,246,.15); transform:translateY(-1px); }
    .seat-selected {
      background:#3b82f6; border:1.5px solid #93c5fd; color:#fff;
      box-shadow:0 0 0 3px rgba(59,130,246,.3), 0 4px 14px rgba(59,130,246,.45);
    }
    .seat-reserved {
      background:repeating-linear-gradient(135deg, rgba(245,158,11,.28) 0 4px, rgba(245,158,11,.1) 4px 8px);
      border:1.5px solid rgba(245,158,11,.45); color:#fcd34d;
    }
    .seat-booked { background:rgba(100,116,139,.35); border:1.5px solid rgba(100,116,139,.5); color:#64748b; }
    .seat-unavailable {
      background:rgba(239,68,68,.08); border:1.5px dashed rgba(239,68,68,.5); color:#f87171;
      text-decoration:line-through;
    }
    .seat-priority::after {
      content:'★'; position:absolute; top:-7px; right:-5px; font-size:.7rem; color:#fbbf24;
      text-shadow:0 0 3px #0f172a;
    }

    .seat-summary {
      display:flex; justify-content:space-between; align-items:center; gap:.75rem;
      padding:.6rem .85rem; border-radius:10px; font-size:.85rem; color:#cbd5e1;
      background:rgba(59,130,246,.1); border:1px solid rgba(59,130,246,.3);
    }
    .seat-summary strong { color:#f1f5f9; }
    .seat-clear {
      padding:4px 10px; border-radius:7px; border:1px solid rgba(255,255,255,.15);
      background:transparent; color:#94a3b8; font-size:.75rem; cursor:pointer; font-family:'Inter',sans-serif;
    }
    .seat-clear:hover { color:#f1f5f9; border-color:rgba(255,255,255,.3); }
    .seat-hint { margin:0; text-align:center; font-size:.78rem; color:#64748b; font-style:italic; }
  `],
})
export class SeatMapComponent {
  /** Every seat of the trip, any status */
  seats = input.required<Seat[]>();
  selectedId = input<string>('');
  /** Fare shown in the summary once a seat is picked */
  fare = input<number | undefined>(undefined);
  selectedIdChange = output<string>();

  private seatsByNumber = computed(() => new Map(this.seats().map(s => [s.seatNumber, s])));
  // Seats are initialised 1..vehicle capacity, so the highest number is the capacity
  private capacity = computed(() => this.seats().reduce((max, s) => Math.max(max, s.seatNumber), 0));

  layout = computed(() => buildSeatLayout(this.capacity()));
  columns = computed(() => this.layout()[0]?.length ?? 0);
  availableCount = computed(() => this.seats().filter(s => s.status === 'available').length);
  selectedSeat = computed(() => this.seats().find(s => s._id === this.selectedId()));

  seatAt(n: number | null): Seat | undefined {
    return n === null ? undefined : this.seatsByNumber().get(n);
  }

  stateOf(seat: Seat): SeatState {
    if (seat._id === this.selectedId()) return 'selected';
    return seat.status;
  }

  isPickable(seat: Seat): boolean {
    return seat.status === 'available';
  }

  pick(seat: Seat): void {
    if (!this.isPickable(seat)) return;
    this.selectedIdChange.emit(seat._id === this.selectedId() ? '' : seat._id);
  }

  typeLabel(type: SeatType): string {
    return TYPE_LABELS[type] ?? type;
  }

  describe(seat: Seat): string {
    return `Ghế ${seat.seatNumber} · ${this.typeLabel(seat.type)} · ${STATE_LABELS[this.stateOf(seat)]}`;
  }
}
