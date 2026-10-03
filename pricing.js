/* ================================================================
   NJORD — price list for the mascot's instant estimate
   Every price the mascot can quote lives here, so changing a price
   never means touching the conversation code (mascot-convo.js).

   Each item has two tiers, exactly as in the studio's price sheet:
     starter:    [low, high]
     mainstream: [low, high]
   `plus: true` marks prices that are open-ended upwards ("€390+").

   The visitor sees ONE range: the lowest starter price to the highest
   mainstream price for everything they picked. Both tiers are sent in
   the inquiry email so the studio sees the full breakdown.
   ================================================================ */

export const PRICES = {
  // Branding
  logo:              { starter: [150, 220],   mainstream: [250, 280] },
  logoIdentity:      { starter: [250, 340],   mainstream: [375, 415] },
  fullIdentity:      { starter: [400, 540],   mainstream: [600, 660] },
  brandGuidelines:   { starter: [150, 220],   mainstream: [250, 295] },

  // Frontend
  landingPage:       { starter: [300, 405],   mainstream: [450, 495] },
  site3to5:          { starter: [500, 640],   mainstream: [700, 760] },
  site6to10:         { starter: [700, 875],   mainstream: [950, 1055] },
  animations:        { starter: [150, 255],   mainstream: [300, 390], plus: true },
  responsive:        { starter: [100, 170],   mainstream: [200, 230] },

  // Backend
  contactForm:       { starter: [50, 85],     mainstream: [100, 115] },
  cms:               { starter: [150, 220],   mainstream: [250, 280] },
  database:          { starter: [200, 305],   mainstream: [350, 395] },
  userAccounts:      { starter: [300, 405],   mainstream: [450, 495] },
  booking:           { starter: [400, 540],   mainstream: [600, 660] },
  clientDashboard:   { starter: [600, 810],   mainstream: [900, 990] },
  adminDashboard:    { starter: [600, 880],   mainstream: [1000, 1150], plus: true },

  // E-commerce
  store:             { starter: [500, 675],   mainstream: [750, 825], plus: true },
  payments:          { starter: [200, 305],   mainstream: [350, 395] },
  customCheckout:    { starter: [300, 440],   mainstream: [500, 590] },
  customerAccounts:  { starter: [250, 355],   mainstream: [400, 460] },

  // Integrations
  apiIntegration:    { starter: [150, 290],   mainstream: [350, 425] },
  crmIntegration:    { starter: [200, 340],   mainstream: [400, 490] },
  newsletter:        { starter: [75, 128],    mainstream: [150, 180] },
  analytics:         { starter: [50, 85],     mainstream: [100, 130] },

  // Advanced
  webApp:            { starter: [1500, 2025], mainstream: [2250, 2475], plus: true },
  platform:          { starter: [3000, 5100], mainstream: [6000, 7200], plus: true },
};

/* Items added automatically to every website quote. Responsive /
   mobile optimization is on the price sheet as its own line, but the
   site promises responsive layouts as part of every build — add
   'responsive' here if it should be charged on top. */
export const ALWAYS_WITH_WEBSITE = [];

/* Sum a list of item keys into { starter:[lo,hi], mainstream:[lo,hi], plus }. */
export function sumItems(keys){
  const total = { starter: [0, 0], mainstream: [0, 0], plus: false };
  keys.forEach((k) => {
    const p = PRICES[k];
    if(!p) return;
    total.starter[0] += p.starter[0]; total.starter[1] += p.starter[1];
    total.mainstream[0] += p.mainstream[0]; total.mainstream[1] += p.mainstream[1];
    if(p.plus) total.plus = true;
  });
  return total;
}

/* What the visitor sees: lowest starter → highest mainstream, rounded
   outward to the nearest €10 so it reads as an estimate, not an invoice. */
export function visitorRange(total){
  const lo = Math.floor(total.starter[0] / 10) * 10;
  const hi = Math.ceil(total.mainstream[1] / 10) * 10;
  return { lo, hi, plus: total.plus };
}

export function formatEuro(n, lang){
  // Albanian uses a dot as the thousands separator (1.250), English a comma
  const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'sq' ? '.' : ',');
  return `€${s}`;
}
