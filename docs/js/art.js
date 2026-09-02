// art.js — the few pieces of SVG art that live in the DOM: Muntje (the mentor coin) and the app icon helpers.
// The town, avatar, buildings, props and pets are blocky canvas art: see art/*.js and iso.js.

const INK = '#1b1f3b';
const STROKE = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

/** Muntje, the mentor: a fat gold coin with a friendly face and a glossy highlight. */
export function muntjeSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <ellipse cx="50" cy="94" rx="34" ry="5" fill="rgba(10,20,60,0.25)"/>
  <circle cx="50" cy="54" r="45" fill="#c97a00" ${STROKE}/>
  <circle cx="50" cy="48" r="45" fill="#ffd93d" ${STROKE}/>
  <circle cx="50" cy="48" r="34" fill="none" stroke="#e59b13" stroke-width="5"/>
  <path d="M28 26 Q40 12 58 14" fill="none" stroke="#fff7d6" stroke-width="7" stroke-linecap="round" opacity="0.85"/>
  <circle cx="37" cy="44" r="8.5" fill="#fff" ${STROKE} stroke-width="3"/>
  <circle cx="63" cy="44" r="8.5" fill="#fff" ${STROKE} stroke-width="3"/>
  <circle cx="39" cy="45" r="4.2" fill="${INK}"/>
  <circle cx="65" cy="45" r="4.2" fill="${INK}"/>
  <circle cx="40.5" cy="43.5" r="1.5" fill="#fff"/>
  <circle cx="66.5" cy="43.5" r="1.5" fill="#fff"/>
  <path d="M36 60 Q50 74 64 60" fill="#fff" ${STROKE} stroke-width="3"/>
  <circle cx="28" cy="58" r="5" fill="#ff8fb1" opacity="0.8"/>
  <circle cx="72" cy="58" r="5" fill="#ff8fb1" opacity="0.8"/>
</svg>`;
}

/** SVG string → data URL. */
export function svgToDataURL(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
