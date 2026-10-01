// Seat layout of a bus, derived from its capacity alone.
// Same rules as the backend — keep in sync with be/src/utils/seatLayout.js
//
// - Up to 16 seats (limousine): 1 seat | aisle | 2 seats per row
// - Larger buses:               2 seats | aisle | 2 seats per row
// - Seats are numbered left to right, front to back
// - A single leftover seat joins the last row, filling the aisle (e.g. 5-seat back row)

export function seatsPerRow(capacity: number): number {
  return capacity <= 16 ? 3 : 4;
}

/** Rows of cells: a seat number, or null for the aisle / an empty spot */
export function buildSeatLayout(capacity: number): (number | null)[][] {
  const perRow = seatsPerRow(capacity);
  const leftCount = perRow === 3 ? 1 : 2;
  const columns = perRow + 1;

  const sizes: number[] = [];
  for (let left = capacity; left > 0; left -= perRow) sizes.push(Math.min(perRow, left));
  if (sizes.length > 1 && sizes[sizes.length - 1] === 1) {
    sizes.pop();
    sizes[sizes.length - 1] += 1;
  }

  let next = 1;
  return sizes.map(size => {
    const row: (number | null)[] = new Array(columns).fill(null);
    if (size === columns) {
      for (let c = 0; c < columns; c++) row[c] = next++;
    } else {
      for (let c = 0, placed = 0; c < columns && placed < size; c++) {
        if (c === leftCount) continue;
        row[c] = next++;
        placed++;
      }
    }
    return row;
  });
}
