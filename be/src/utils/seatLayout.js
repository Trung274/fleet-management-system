// Seat layout of a bus, derived from its capacity alone.
// The frontend draws the same layout — keep in sync with
// fe/src/app/shared/components/seat-map/seat-layout.ts
//
// - Up to 16 seats (limousine): 1 seat | aisle | 2 seats per row
// - Larger buses:               2 seats | aisle | 2 seats per row
// - Seats are numbered left to right, front to back
// - A single leftover seat joins the last row, filling the aisle (e.g. 5-seat back row)

const seatsPerRow = (capacity) => (capacity <= 16 ? 3 : 4);

/**
 * Rows of cells; each cell is a seat number or null for the aisle / an empty spot.
 * Every row has the same number of columns (seats per row + 1 aisle column).
 */
const buildSeatLayout = (capacity) => {
  const perRow = seatsPerRow(capacity);
  const leftCount = perRow === 3 ? 1 : 2;
  const columns = perRow + 1;

  // Row sizes: full rows, a lone leftover seat is merged into the last row
  const sizes = [];
  for (let left = capacity; left > 0; left -= perRow) sizes.push(Math.min(perRow, left));
  if (sizes.length > 1 && sizes[sizes.length - 1] === 1) {
    sizes.pop();
    sizes[sizes.length - 1] += 1;
  }

  let next = 1;
  return sizes.map((size) => {
    const row = new Array(columns).fill(null);
    if (size === columns) {
      // Back row spans the aisle
      for (let c = 0; c < columns; c++) row[c] = next++;
    } else {
      // Fill seat columns left to right, skipping the aisle column
      for (let c = 0, placed = 0; c < columns && placed < size; c++) {
        if (c === leftCount) continue;
        row[c] = next++;
        placed++;
      }
    }
    return row;
  });
};

/**
 * Seat type from position: front row is priority, outer columns are window,
 * seats next to the aisle are aisle, the back-row middle seat is standard.
 * Returns an array indexed by seatNumber - 1.
 */
const seatTypesForCapacity = (capacity) => {
  const layout = buildSeatLayout(capacity);
  const perRow = seatsPerRow(capacity);
  const leftCount = perRow === 3 ? 1 : 2;
  const lastCol = perRow; // index of the right-most column
  const types = new Array(capacity).fill('standard');

  layout.forEach((row, r) => {
    row.forEach((seatNumber, c) => {
      if (seatNumber === null) return;
      let type = 'standard';
      if (r === 0) type = 'priority';
      else if (c === 0 || c === lastCol) type = 'window';
      else if (c === leftCount - 1 || c === leftCount + 1) type = 'aisle';
      types[seatNumber - 1] = type;
    });
  });
  return types;
};

module.exports = { seatsPerRow, buildSeatLayout, seatTypesForCapacity };
