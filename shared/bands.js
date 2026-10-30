// The ONLY place rating bands are defined. Pipeline and server both use this.
const EDGES = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400];

export const BANDS = EDGES.map((min, i) => {
  const max = EDGES[i + 1] ?? Infinity; // last band is open-ended: 2400+
  return { key: max === Infinity ? `${min}+` : `${min}-${max}`, min, max };
});

// Band that contains this rating, or null if below the lowest band
export const getBand = (rating) =>
  BANDS.find((b) => rating >= b.min && rating < b.max) ?? null;

// Peer band for a user = the 100-point band just above the user's own band.
// Returns null when nobody is above the user (top band).
export const getPeerBand = (userRating) => {
  const target = Math.floor(userRating / 100) * 100 + 100;
  const band = getBand(target) ?? (target < BANDS[0].min ? BANDS[0] : null);
  return band && band.min > userRating ? band : null;
};
