// art.js — original blocky toy-town art as SVG strings (avatar, hats, skins, pets, house, car, Muntje, vehicles).
// Used inline in the DOM (START, HUIS, mentor) and rasterised to images for the canvas town.

const INK = '#1f2937';
const SKIN = '#f9c9a3';
const STROKE = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

export const PAINT = { none: '#fef3c7', 'verf-rood': '#f87171', 'verf-blauw': '#60a5fa', 'verf-geel': '#fde047' };

function hatSVG(hat) {
  switch (hat) {
    case 'pet':
      return `<path d="M22 24 Q50 -8 78 24 Z" fill="#ef4444" ${STROKE}/><rect x="56" y="17" width="40" height="11" rx="5" fill="#ef4444" ${STROKE}/><circle cx="50" cy="4" r="4" fill="#fff" ${STROKE}/>`;
    case 'strohoed':
      return `<ellipse cx="50" cy="22" rx="50" ry="9" fill="#fde68a" ${STROKE}/><path d="M26 22 Q30 -6 50 -6 Q70 -6 74 22 Z" fill="#fde68a" ${STROKE}/><rect x="27" y="10" width="46" height="8" fill="#ef4444"/>`;
    case 'helm':
      return `<path d="M20 26 Q22 -10 50 -10 Q78 -10 80 26 Z" fill="#ef4444" ${STROKE}/><rect x="44" y="-8" width="12" height="32" fill="#fff"/><rect x="14" y="22" width="72" height="8" rx="4" fill="#b91c1c" ${STROKE}/>`;
    case 'hogehoed':
      return `<rect x="30" y="-24" width="40" height="44" rx="4" fill="#111827" ${STROKE}/><rect x="14" y="16" width="72" height="10" rx="5" fill="#111827" ${STROKE}/><rect x="30" y="8" width="40" height="7" fill="#ef4444"/>`;
    case 'feestmuts':
      return `<polygon points="50,-30 24,24 76,24" fill="#f472b6" ${STROKE}/><polygon points="40,-9 34,4 66,4 60,-9" fill="#fde047"/><polygon points="30,12 27,20 73,20 70,12" fill="#38bdf8"/><circle cx="50" cy="-30" r="7" fill="#fde047" ${STROKE}/>`;
    case 'piraat':
      return `<path d="M10 22 Q50 -22 90 22 L82 24 Q50 8 18 24 Z" fill="#111827" ${STROKE}/><path d="M18 24 Q50 4 82 24 L82 30 L18 30 Z" fill="#111827" ${STROKE}/><circle cx="50" cy="10" r="6" fill="#fff"/><circle cx="47.5" cy="9" r="1.5" fill="#111827"/><circle cx="52.5" cy="9" r="1.5" fill="#111827"/>`;
    case 'cowboy':
      return `<ellipse cx="50" cy="22" rx="52" ry="10" fill="#92400e" ${STROKE}/><path d="M30 22 Q30 -8 50 -8 Q70 -8 70 22 Z" fill="#b45309" ${STROKE}/><rect x="31" y="12" width="38" height="7" fill="#111827"/>`;
    case 'tovenaar':
      return `<polygon points="50,-40 20,26 80,26" fill="#3b82f6" ${STROKE}/><ellipse cx="50" cy="26" rx="46" ry="8" fill="#2563eb" ${STROKE}/><polygon points="50,-8 52,-3 57,-3 53,0 55,5 50,2 45,5 47,0 43,-3 48,-3" fill="#fde047"/><circle cx="38" cy="14" r="3" fill="#fde047"/><circle cx="62" cy="12" r="3" fill="#fde047"/>`;
    case 'kroon':
      return `<polygon points="22,24 22,-4 36,10 50,-14 64,10 78,-4 78,24" fill="#fbbf24" ${STROKE}/><circle cx="36" cy="14" r="4" fill="#ef4444"/><circle cx="50" cy="12" r="4" fill="#3b82f6"/><circle cx="64" cy="14" r="4" fill="#22c55e"/>`;
    default:
      return '';
  }
}

/**
 * Blocky avatar: cube head, block body, big friendly eyes.
 * @param {{color?: string, hat?: string|null, skin?: string|null, wave?: boolean}} opts
 */
export function avatarSVG({ color = '#3b82f6', hat = null, skin = null, wave = false } = {}) {
  let body = color;
  let head = SKIN;
  let hair = '#5b3a1a';
  let extraBack = '';
  let extraFront = '';
  let eyes = `<circle cx="38" cy="38" r="9" fill="#fff" ${STROKE}/><circle cx="62" cy="38" r="9" fill="#fff" ${STROKE}/><circle cx="40" cy="39" r="4.5" fill="${INK}"/><circle cx="64" cy="39" r="4.5" fill="${INK}"/><circle cx="42" cy="37" r="1.6" fill="#fff"/><circle cx="66" cy="37" r="1.6" fill="#fff"/>`;
  let mouth = `<path d="M40 52 Q50 60 60 52" fill="none" ${STROKE}/>`;
  switch (skin) {
    case 'zombie':
      head = '#86efac'; body = '#4b5563'; hair = '#14532d';
      mouth = `<path d="M40 54 L45 50 L50 55 L55 50 L60 54" fill="none" ${STROKE}/>`;
      extraFront = `<rect x="24" y="70" width="18" height="6" fill="#111827" opacity="0.4"/><rect x="60" y="86" width="14" height="6" fill="#111827" opacity="0.4"/>`;
      break;
    case 'kikker':
      head = '#4ade80'; body = '#22c55e'; hair = '#16a34a';
      eyes = `<circle cx="34" cy="14" r="11" fill="#4ade80" ${STROKE}/><circle cx="66" cy="14" r="11" fill="#4ade80" ${STROKE}/><circle cx="34" cy="14" r="6" fill="#fff"/><circle cx="66" cy="14" r="6" fill="#fff"/><circle cx="35" cy="15" r="3" fill="${INK}"/><circle cx="67" cy="15" r="3" fill="${INK}"/>`;
      mouth = `<path d="M34 50 Q50 62 66 50" fill="none" ${STROKE}/>`;
      break;
    case 'astronaut':
      body = '#f8fafc';
      extraBack = `<rect x="14" y="60" width="72" height="50" rx="10" fill="#cbd5e1" ${STROKE}/>`;
      extraFront = `<circle cx="50" cy="38" r="38" fill="none" stroke="#e2e8f0" stroke-width="7"/><circle cx="50" cy="38" r="38" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="6 6"/><rect x="34" y="72" width="32" height="12" rx="4" fill="#3b82f6" ${STROKE}/>`;
      break;
    case 'ninja':
      body = '#111827';
      extraFront = `<rect x="20" y="10" width="60" height="18" rx="10" fill="#111827"/><rect x="20" y="48" width="60" height="16" rx="8" fill="#111827"/><rect x="72" y="14" width="22" height="7" rx="3" fill="#ef4444" transform="rotate(-20 72 14)"/>`;
      mouth = '';
      break;
    case 'superheld':
      body = '#ef4444';
      extraBack = `<path d="M22 66 L10 118 L50 104 L90 118 L78 66 Z" fill="#facc15" ${STROKE}/>`;
      extraFront = `<rect x="26" y="30" width="48" height="16" rx="6" fill="#2563eb" ${STROKE}/><circle cx="38" cy="38" r="5" fill="#fff"/><circle cx="62" cy="38" r="5" fill="#fff"/><polygon points="50,74 53,82 61,82 55,87 57,95 50,90 43,95 45,87 39,82 47,82" fill="#fde047"/>`;
      eyes = '';
      break;
    default:
      break;
  }
  const armRight = wave
    ? `<rect x="80" y="40" width="14" height="36" rx="7" fill="${head}" ${STROKE} transform="rotate(-40 87 76)"/>`
    : `<rect x="80" y="66" width="14" height="36" rx="7" fill="${head}" ${STROKE}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -44 112 176" overflow="visible">
  ${extraBack}
  <rect x="30" y="100" width="16" height="26" rx="5" fill="#334155" ${STROKE}/>
  <rect x="54" y="100" width="16" height="26" rx="5" fill="#334155" ${STROKE}/>
  <rect x="26" y="122" width="22" height="9" rx="4" fill="${INK}"/>
  <rect x="52" y="122" width="22" height="9" rx="4" fill="${INK}"/>
  <rect x="6" y="66" width="14" height="36" rx="7" fill="${head}" ${STROKE}/>
  ${armRight}
  <rect x="22" y="62" width="56" height="44" rx="9" fill="${body}" ${STROKE}/>
  <rect x="20" y="10" width="60" height="54" rx="11" fill="${head}" ${STROKE}/>
  <path d="M20 22 Q20 8 32 8 L68 8 Q80 8 80 22 L80 26 Q50 16 20 26 Z" fill="${hair}"/>
  ${eyes}
  ${mouth}
  <circle cx="30" cy="48" r="4" fill="#fca5a5" opacity="0.8"/>
  <circle cx="70" cy="48" r="4" fill="#fca5a5" opacity="0.8"/>
  ${extraFront}
  ${hatSVG(hat)}
</svg>`;
}

/** Pets: dog, cat, dino. Blocky, friendly. */
export function petSVG(id) {
  switch (id) {
    case 'hond':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 84"><rect x="12" y="34" width="62" height="32" rx="10" fill="#b45309" ${STROKE}/><rect x="14" y="60" width="12" height="18" rx="4" fill="#92400e" ${STROKE}/><rect x="30" y="60" width="12" height="18" rx="4" fill="#92400e" ${STROKE}/><rect x="46" y="60" width="12" height="18" rx="4" fill="#92400e" ${STROKE}/><rect x="60" y="60" width="12" height="18" rx="4" fill="#92400e" ${STROKE}/><path d="M12 40 Q-4 30 6 20" fill="none" ${STROKE} stroke="#92400e" stroke-width="7"/><rect x="58" y="12" width="40" height="36" rx="9" fill="#d97706" ${STROKE}/><rect x="52" y="14" width="12" height="28" rx="6" fill="#92400e" ${STROKE}/><circle cx="82" cy="26" r="5" fill="#fff" ${STROKE}/><circle cx="83" cy="27" r="2.5" fill="${INK}"/><rect x="88" y="34" width="12" height="9" rx="4" fill="${INK}"/><path d="M78 42 Q84 48 90 42" fill="none" ${STROKE}/><rect x="60" y="44" width="34" height="6" rx="3" fill="#ef4444"/></svg>`;
    case 'kat':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 84"><rect x="12" y="36" width="58" height="30" rx="12" fill="#9ca3af" ${STROKE}/><rect x="16" y="60" width="12" height="18" rx="4" fill="#6b7280" ${STROKE}/><rect x="52" y="60" width="12" height="18" rx="4" fill="#6b7280" ${STROKE}/><path d="M12 44 Q-8 40 4 18" fill="none" stroke="#6b7280" stroke-width="7" stroke-linecap="round"/><rect x="58" y="16" width="40" height="34" rx="10" fill="#d1d5db" ${STROKE}/><polygon points="62,18 66,2 76,18" fill="#d1d5db" ${STROKE}/><polygon points="82,18 90,2 96,18" fill="#d1d5db" ${STROKE}/><circle cx="72" cy="30" r="4" fill="#22c55e" ${STROKE}/><circle cx="88" cy="30" r="4" fill="#22c55e" ${STROKE}/><circle cx="73" cy="31" r="1.8" fill="${INK}"/><circle cx="89" cy="31" r="1.8" fill="${INK}"/><polygon points="77,38 83,38 80,42" fill="#f472b6"/><path d="M62 40 L50 38 M62 44 L50 46 M98 40 L110 38 M98 44 L110 46" ${STROKE} stroke-width="2.5"/></svg>`;
    case 'dino':
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 84"><polygon points="20,34 28,18 36,34 44,18 52,34 60,18 68,34" fill="#15803d" ${STROKE}/><path d="M12 62 Q-6 58 2 40 L14 46 Z" fill="#22c55e" ${STROKE}/><rect x="10" y="34" width="62" height="34" rx="14" fill="#22c55e" ${STROKE}/><rect x="16" y="62" width="14" height="18" rx="5" fill="#16a34a" ${STROKE}/><rect x="46" y="62" width="14" height="18" rx="5" fill="#16a34a" ${STROKE}/><rect x="60" y="10" width="42" height="36" rx="12" fill="#4ade80" ${STROKE}/><rect x="56" y="36" width="12" height="10" rx="4" fill="#4ade80" ${STROKE}/><circle cx="84" cy="24" r="7" fill="#fff" ${STROKE}/><circle cx="86" cy="25" r="3.5" fill="${INK}"/><path d="M74 38 L80 44 L86 38 L92 44 L98 38" fill="#fff" ${STROKE} stroke-width="2.5"/><circle cx="70" cy="44" r="4" fill="#fca5a5"/></svg>`;
    default:
      return '';
  }
}

/** The child's house on HUIS. paint is a fun item id (verf-*) or 'none'. */
export function houseSVG(paint = 'none') {
  const wall = PAINT[paint] || PAINT.none;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 270"><rect x="40" y="120" width="240" height="140" rx="8" fill="${wall}" ${STROKE} stroke-width="5"/><polygon points="20,124 160,22 300,124" fill="#dc2626" ${STROKE} stroke-width="5"/><rect x="220" y="44" width="30" height="50" fill="#9ca3af" ${STROKE} stroke-width="5"/><rect x="214" y="38" width="42" height="12" rx="3" fill="#6b7280" ${STROKE} stroke-width="5"/><rect x="134" y="176" width="52" height="84" rx="8" fill="#92400e" ${STROKE} stroke-width="5"/><circle cx="176" cy="220" r="5" fill="#fde047"/><rect x="60" y="146" width="56" height="52" rx="6" fill="#bae6fd" ${STROKE} stroke-width="5"/><path d="M88 146 V198 M60 172 H116" ${STROKE} stroke-width="4"/><rect x="204" y="146" width="56" height="52" rx="6" fill="#bae6fd" ${STROKE} stroke-width="5"/><path d="M232 146 V198 M204 172 H260" ${STROKE} stroke-width="4"/><rect x="52" y="200" width="72" height="12" rx="4" fill="#78350f" ${STROKE} stroke-width="4"/><rect x="196" y="200" width="72" height="12" rx="4" fill="#78350f" ${STROKE} stroke-width="4"/><circle cx="72" cy="206" r="0"/><rect x="128" y="122" width="64" height="40" rx="6" fill="#fef3c7" ${STROKE} stroke-width="5"/><circle cx="160" cy="142" r="12" fill="#bae6fd" ${STROKE} stroke-width="4"/></svg>`;
}

/** Car for the WERK mini-game (viewBox 0 0 560 280). */
export function carSVG(color = '#ef4444') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 280"><rect x="40" y="120" width="480" height="104" rx="26" fill="${color}" ${STROKE} stroke-width="6"/><path d="M150 124 L190 52 Q200 40 216 40 L360 40 Q376 40 386 52 L426 124 Z" fill="${color}" ${STROKE} stroke-width="6"/><path d="M198 116 L222 60 L276 60 L276 116 Z" fill="#bae6fd" ${STROKE} stroke-width="5"/><path d="M296 116 L296 60 L352 60 L378 116 Z" fill="#bae6fd" ${STROKE} stroke-width="5"/><rect x="60" y="160" width="60" height="30" rx="10" fill="#fde047" ${STROKE} stroke-width="5"/><rect x="440" y="160" width="60" height="30" rx="10" fill="#fca5a5" ${STROKE} stroke-width="5"/><rect x="30" y="196" width="500" height="22" rx="10" fill="#374151" ${STROKE} stroke-width="5"/><circle cx="150" cy="218" r="44" fill="${INK}"/><circle cx="150" cy="218" r="22" fill="#9ca3af" ${STROKE} stroke-width="5"/><circle cx="410" cy="218" r="44" fill="${INK}"/><circle cx="410" cy="218" r="22" fill="#9ca3af" ${STROKE} stroke-width="5"/><rect x="236" y="150" width="90" height="16" rx="6" fill="#fff" ${STROKE} stroke-width="4"/></svg>`;
}

/** Vehicles for the town (viewBox 0 0 160 100). */
export function vehicleSVG(kind, color = '#3b82f6') {
  if (kind === 'scooter') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect x="30" y="56" width="90" height="16" rx="8" fill="${color}" ${STROKE}/><path d="M112 60 L128 20 L142 20" fill="none" ${STROKE} stroke-width="6"/><rect x="118" y="12" width="30" height="10" rx="5" fill="${INK}"/><circle cx="40" cy="78" r="16" fill="${INK}"/><circle cx="40" cy="78" r="7" fill="#9ca3af"/><circle cx="124" cy="78" r="16" fill="${INK}"/><circle cx="124" cy="78" r="7" fill="#9ca3af"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect x="10" y="40" width="140" height="40" rx="12" fill="${color}" ${STROKE}/><path d="M40 42 L56 14 L110 14 L126 42 Z" fill="${color}" ${STROKE}/><rect x="60" y="20" width="44" height="20" rx="4" fill="#bae6fd" ${STROKE} stroke-width="3"/><rect x="14" y="52" width="18" height="10" rx="4" fill="#fde047" ${STROKE} stroke-width="3"/><circle cx="44" cy="80" r="15" fill="${INK}"/><circle cx="44" cy="80" r="6" fill="#9ca3af"/><circle cx="116" cy="80" r="15" fill="${INK}"/><circle cx="116" cy="80" r="6" fill="#9ca3af"/></svg>`;
}

/** Muntje, the mentor: a friendly coin with a face. */
export function muntjeSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#f59e0b" ${STROKE}/><circle cx="50" cy="50" r="36" fill="#fbbf24" ${STROKE} stroke-width="3"/><path d="M50 12 L52 18 L58 18 L53 22 L55 28 L50 24 L45 28 L47 22 L42 18 L48 18 Z" fill="#fff7d6"/><circle cx="37" cy="44" r="8" fill="#fff" ${STROKE} stroke-width="3"/><circle cx="63" cy="44" r="8" fill="#fff" ${STROKE} stroke-width="3"/><circle cx="39" cy="45" r="4" fill="${INK}"/><circle cx="65" cy="45" r="4" fill="${INK}"/><circle cx="40.5" cy="43.5" r="1.4" fill="#fff"/><circle cx="66.5" cy="43.5" r="1.4" fill="#fff"/><path d="M36 60 Q50 74 64 60" fill="#fff" ${STROKE} stroke-width="3"/><circle cx="28" cy="58" r="5" fill="#fca5a5" opacity="0.8"/><circle cx="72" cy="58" r="5" fill="#fca5a5" opacity="0.8"/></svg>`;
}

/** Trampoline for HUIS (viewBox 0 0 200 70). */
export function trampolineSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 70"><rect x="30" y="40" width="10" height="28" fill="#6b7280" ${STROKE} stroke-width="3"/><rect x="160" y="40" width="10" height="28" fill="#6b7280" ${STROKE} stroke-width="3"/><ellipse cx="100" cy="36" rx="92" ry="18" fill="#3b82f6" ${STROKE}/><ellipse cx="100" cy="34" rx="72" ry="11" fill="#1e3a8a" ${STROKE} stroke-width="3"/></svg>`;
}

/** SVG string → data URL for canvas images. */
export function svgToDataURL(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
