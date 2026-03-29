# Pricing Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive pricing calculator that lets users select BeanCounter products, configure quantities/tiers, and see live cost totals in a summary panel.

**Architecture:** Central state object with a single `update()` render loop. Pure calculation functions separated from DOM manipulation. Webflow HTML wired via `data-*` attributes; JS handles all interactive behavior and GSAP animations.

**Tech Stack:** Vanilla JS (UMD via Vite), GSAP (from CDN in Webflow, npm fallback for dev), Webflow for HTML/CSS.

**Spec:** `docs/superpowers/specs/2026-03-29-pricing-calculator-design.md`

---

## File Structure

```
src/
  pages/
    pricing.js              -- initPricing() entry, DOM queries, event binding, update loop
  utils/
    pricingCalculator.js    -- config, state, pure calculation functions (no DOM)
  main.js                   -- add pricing page routing (modify)
  global.js                 -- unchanged
```

- `pricingCalculator.js` owns all pricing math. Zero DOM references. Exports pure functions + default config.
- `pricing.js` owns DOM binding, GSAP animations, event listeners, and calls into pricingCalculator for math.

---

### Task 1: Create the pricing calculator engine (pure functions)

**Files:**
- Create: `src/utils/pricingCalculator.js`

This file contains the config, state factory, and all calculation functions. No DOM, no GSAP.

- [ ] **Step 1: Create `src/utils/pricingCalculator.js` with config and state factory**

```js
// src/utils/pricingCalculator.js

export const DEFAULT_CONFIG = {
  pb: { unitPrice: 20, min: 1000, max: 50000 },
  blt: { unitPrice: 30, min: 1000, max: 50000 },
  optimize: {
    tiers: {
      A: { label: '1-5', standard: 5000, combo: 3000 },
      B: { label: '6-25', standard: 7500, combo: 5000 },
      C: { label: '26-100', standard: 15000, combo: 10000 },
      D: { label: '100+', standard: null, combo: null },
    },
  },
  myminfin: { unitPrice: 0.15, freeDossiers: 1000, multiplier: 1.5 },
}

export function createState(config) {
  const defaultQty = Math.round(config.pb.max / 4)
  return {
    pb: { active: false, quantity: defaultQty },
    blt: { active: false, quantity: defaultQty },
    optimize: { active: false, tier: null },
    myminfin: { active: false },
  }
}
```

- [ ] **Step 2: Add the `calculate()` function**

Append to the same file:

```js
export function calculate(state, config) {
  const pbCost = state.pb.active ? state.pb.quantity * config.pb.unitPrice : 0
  const bltCost = state.blt.active ? state.blt.quantity * config.blt.unitPrice : 0
  const isCombo = state.pb.active || state.blt.active

  // Optimize
  let optimizeCost = 0
  let optimizeStandardCost = 0
  let isEnterprise = false
  if (state.optimize.active && state.optimize.tier) {
    const tier = config.optimize.tiers[state.optimize.tier]
    if (tier.standard === null) {
      isEnterprise = true
      optimizeCost = null
      optimizeStandardCost = null
    } else {
      optimizeStandardCost = tier.standard
      optimizeCost = isCombo ? tier.combo : tier.standard
    }
  }

  // MyMinFin
  let myminfinDossiers = 0
  let myminfinBillable = 0
  let myminfinCost = 0
  if (state.myminfin.active && isCombo) {
    const pbQty = state.pb.active ? state.pb.quantity : 0
    const bltQty = state.blt.active ? state.blt.quantity : 0
    myminfinDossiers = Math.ceil(Math.max(pbQty, bltQty) * config.myminfin.multiplier)
    myminfinBillable = Math.max(0, myminfinDossiers - config.myminfin.freeDossiers)
    myminfinCost = myminfinBillable * config.myminfin.unitPrice * 12
  }

  // Volume discount
  const pbQtyForVolume = state.pb.active ? state.pb.quantity : 0
  const bltQtyForVolume = state.blt.active ? state.blt.quantity : 0
  const showVolumeDiscount = pbQtyForVolume > 250 || bltQtyForVolume > 250

  // Total
  const total = isEnterprise ? null : pbCost + bltCost + (optimizeCost ?? 0) + myminfinCost
  const monthly = total !== null ? total / 12 : null

  return {
    pbCost,
    bltCost,
    isCombo,
    optimizeCost,
    optimizeStandardCost,
    isEnterprise,
    myminfinDossiers,
    myminfinBillable,
    myminfinCost,
    showVolumeDiscount,
    total,
    monthly,
  }
}
```

- [ ] **Step 3: Add the `formatPrice()` helper**

Append to the same file:

```js
export function formatPrice(value) {
  if (value === null) return 'Op aanvraag'
  return (
    '\u20AC' +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}
```

- [ ] **Step 4: Verify the file runs without errors**

Run: `cd /Users/vitalierosescu/Documents/Awwwocado/Clients/Active/Beancounter/dev && node -e "const m = require('./src/utils/pricingCalculator.js')" 2>&1 || node --input-type=module -e "import { DEFAULT_CONFIG, createState, calculate, formatPrice } from './src/utils/pricingCalculator.js'; const s = createState(DEFAULT_CONFIG); s.pb.active = true; s.pb.quantity = 105; s.blt.active = true; s.blt.quantity = 8; s.myminfin.active = true; const r = calculate(s, DEFAULT_CONFIG); console.log(JSON.stringify(r, null, 2)); console.log('PB:', formatPrice(r.pbCost), 'BLT:', formatPrice(r.bltCost), 'Total:', formatPrice(r.total))"`

Expected output should show:
- pbCost: 2100 (105 x 20)
- bltCost: 240 (8 x 30)
- myminfinDossiers: 158 (ceil(105 * 1.5))
- myminfinBillable: 0 (158 < 1000)
- myminfinCost: 0
- total: 2340
- Formatted: EUR 2.100, EUR 240, EUR 2.340

- [ ] **Step 5: Commit**

```bash
git add src/utils/pricingCalculator.js
git commit -m "feat(pricing): add pure calculation engine with config, state, and formatPrice"
```

---

### Task 2: Create the pricing page entry point with DOM binding

**Files:**
- Create: `src/pages/pricing.js`

This file queries all DOM elements, binds events, and renders state changes using GSAP.

- [ ] **Step 1: Create `src/pages/pricing.js` with DOM queries and state init**

```js
// src/pages/pricing.js

import { DEFAULT_CONFIG, createState, calculate, formatPrice } from '../utils/pricingCalculator.js'

export function initPricing() {
  const wrapper = document.querySelector('[data-pricing="calculator"]')
  if (!wrapper) return

  // Read config from DOM attributes (with fallback to defaults)
  const config = readConfig(wrapper)
  const state = createState(config)

  // Cache DOM references
  const dom = queryDOM(wrapper)

  // Bind events
  bindEvents(dom, state, config)

  // Initial render
  render(dom, state, config)
}

function readConfig(wrapper) {
  const config = structuredClone(DEFAULT_CONFIG)

  // Read slider config from card attributes
  const pbCard = wrapper.querySelector('[data-pricing-card="pb"]')
  const bltCard = wrapper.querySelector('[data-pricing-card="blt"]')

  if (pbCard) {
    config.pb.min = Number(pbCard.dataset.min) || config.pb.min
    config.pb.max = Number(pbCard.dataset.max) || config.pb.max
  }
  if (bltCard) {
    config.blt.min = Number(bltCard.dataset.min) || config.blt.min
    config.blt.max = Number(bltCard.dataset.max) || config.blt.max
  }

  // Read Optimize tier prices from tier buttons
  const tierButtons = wrapper.querySelectorAll('[data-pricing-tier]')
  tierButtons.forEach((btn) => {
    const tierId = btn.dataset.pricingTier
    if (config.optimize.tiers[tierId]) {
      const standard = btn.dataset.standard
      const combo = btn.dataset.combo
      if (standard !== undefined) {
        config.optimize.tiers[tierId].standard = standard === '' ? null : Number(standard)
      }
      if (combo !== undefined) {
        config.optimize.tiers[tierId].combo = combo === '' ? null : Number(combo)
      }
    }
  })

  return config
}

function queryDOM(wrapper) {
  const q = (sel, ctx = wrapper) => ctx.querySelector(sel)
  const qAll = (sel, ctx = wrapper) => [...ctx.querySelectorAll(sel)]

  return {
    wrapper,
    cards: {
      pb: q('[data-pricing-card="pb"]'),
      blt: q('[data-pricing-card="blt"]'),
      optimize: q('[data-pricing-card="optimize"]'),
      myminfin: q('[data-pricing-card="myminfin"]'),
    },
    toggles: {
      pb: q('[data-pricing-card="pb"] [data-pricing-toggle]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-toggle]'),
      optimize: q('[data-pricing-card="optimize"] [data-pricing-toggle]'),
      myminfin: q('[data-pricing-card="myminfin"] [data-pricing-toggle]'),
    },
    details: {
      pb: q('[data-pricing-card="pb"] [data-pricing-details]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-details]'),
      optimize: q('[data-pricing-card="optimize"] [data-pricing-details]'),
    },
    sliders: {
      pb: q('[data-pricing-card="pb"] [data-pricing-slider]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-slider]'),
    },
    inputs: {
      pb: q('[data-pricing-card="pb"] [data-pricing-input]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-input]'),
    },
    prices: {
      pb: q('[data-pricing-card="pb"] [data-pricing-price]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-price]'),
      optimize: q('[data-pricing-card="optimize"] [data-pricing-price]'),
      optimizeOriginal: q('[data-pricing-card="optimize"] [data-pricing-price-original]'),
    },
    tierButtons: qAll('[data-pricing-tier]'),
    myminfin: {
      dossiers: q('[data-pricing-dossiers]'),
      cost: q('[data-pricing-myminfin-cost]'),
    },
    summary: {
      panel: q('[data-pricing="summary"]'),
      items: {
        pb: q('[data-summary-item="pb"]'),
        blt: q('[data-summary-item="blt"]'),
        optimize: q('[data-summary-item="optimize"]'),
        myminfin: q('[data-summary-item="myminfin"]'),
      },
      prices: {
        pb: q('[data-summary-price="pb"]'),
        blt: q('[data-summary-price="blt"]'),
        optimize: q('[data-summary-price="optimize"]'),
        myminfin: q('[data-summary-price="myminfin"]'),
      },
      removeButtons: {
        pb: q('[data-summary-remove="pb"]'),
        blt: q('[data-summary-remove="blt"]'),
        optimize: q('[data-summary-remove="optimize"]'),
        myminfin: q('[data-summary-remove="myminfin"]'),
      },
      total: q('[data-summary-total]'),
      monthly: q('[data-summary-monthly]'),
      earlybird: q('[data-summary-earlybird]'),
      volume: q('[data-summary-volume]'),
      enterprise: q('[data-summary-enterprise]'),
      cta: q('[data-summary-cta]'),
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/pricing.js
git commit -m "feat(pricing): add pricing page entry with DOM query and config reader"
```

---

### Task 3: Add event binding

**Files:**
- Modify: `src/pages/pricing.js`

- [ ] **Step 1: Add `bindEvents()` function to `pricing.js`**

Append after `queryDOM`:

```js
function bindEvents(dom, state, config) {
  const update = () => render(dom, state, config)

  // Card toggles
  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    const toggle = dom.toggles[key]
    if (!toggle) return

    toggle.addEventListener('click', () => {
      // MyMinFin: block if disabled
      if (key === 'myminfin' && !state.pb.active && !state.blt.active) return

      state[key].active = !state[key].active

      // If deselecting last PB/BLT, auto-deselect MyMinFin
      if ((key === 'pb' || key === 'blt') && !state.pb.active && !state.blt.active) {
        state.myminfin.active = false
      }

      // If deselecting Optimize, clear tier
      if (key === 'optimize' && !state.optimize.active) {
        state.optimize.tier = null
      }

      update()
    })
  })

  // Summary remove buttons
  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    const btn = dom.summary.removeButtons[key]
    if (!btn) return

    btn.addEventListener('click', () => {
      state[key].active = false

      if (key === 'optimize') state.optimize.tier = null

      // If removing last PB/BLT, auto-deselect MyMinFin
      if ((key === 'pb' || key === 'blt') && !state.pb.active && !state.blt.active) {
        state.myminfin.active = false
      }

      update()
    })
  })

  // Optimize tier buttons
  dom.tierButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!state.optimize.active) return
      state.optimize.tier = btn.dataset.pricingTier
      update()
    })
  })

  // Sliders
  ;['pb', 'blt'].forEach((key) => {
    const slider = dom.sliders[key]
    const input = dom.inputs[key]
    if (!slider || !input) return

    slider.addEventListener('input', () => {
      const val = clampValue(Number(slider.value), config[key].min, config[key].max)
      state[key].quantity = val
      input.value = val
      update()
    })

    input.addEventListener('input', () => {
      const raw = input.value.replace(/\D/g, '')
      const val = clampValue(Number(raw) || config[key].min, config[key].min, config[key].max)
      state[key].quantity = val
      slider.value = val
      update()
    })

    // On blur, snap to clamped value
    input.addEventListener('blur', () => {
      input.value = state[key].quantity
    })
  })
}

function clampValue(val, min, max) {
  return Math.min(max, Math.max(min, val))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/pricing.js
git commit -m "feat(pricing): add event binding for toggles, sliders, tier picker, and summary remove"
```

---

### Task 4: Add the render function

**Files:**
- Modify: `src/pages/pricing.js`

- [ ] **Step 1: Add `render()` function to `pricing.js`**

Append after `clampValue`:

```js
function render(dom, state, config) {
  const result = calculate(state, config)
  const isCombo = result.isCombo

  // --- Card active states ---
  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    const card = dom.cards[key]
    if (!card) return
    card.classList.toggle('is-active', state[key].active)
  })

  // --- MyMinFin disabled state ---
  if (dom.cards.myminfin) {
    dom.cards.myminfin.classList.toggle('is-disabled', !isCombo)
  }

  // --- Expand/collapse details ---
  ;['pb', 'blt', 'optimize'].forEach((key) => {
    const details = dom.details[key]
    if (!details) return

    if (state[key].active) {
      gsap.set(details, { display: 'block' })
      gsap.to(details, { height: 'auto', duration: 0.35, ease: 'power2.inOut' })
    } else {
      gsap.to(details, {
        height: 0,
        duration: 0.35,
        ease: 'power2.inOut',
        onComplete: () => gsap.set(details, { display: 'none' }),
      })
    }
  })

  // --- Slider sync ---
  ;['pb', 'blt'].forEach((key) => {
    const slider = dom.sliders[key]
    const input = dom.inputs[key]
    if (!slider || !input) return

    slider.min = config[key].min
    slider.max = config[key].max
    slider.value = state[key].quantity
    input.value = state[key].quantity
  })

  // --- Card prices ---
  if (dom.prices.pb) dom.prices.pb.textContent = formatPrice(result.pbCost)
  if (dom.prices.blt) dom.prices.blt.textContent = formatPrice(result.bltCost)

  // Optimize price with combo strikethrough
  if (dom.prices.optimize) {
    if (state.optimize.active && state.optimize.tier) {
      dom.prices.optimize.textContent = formatPrice(result.optimizeCost)
      if (dom.prices.optimizeOriginal) {
        const showStrikethrough = isCombo && !result.isEnterprise && result.optimizeStandardCost !== result.optimizeCost
        dom.prices.optimizeOriginal.classList.toggle('is-hidden', !showStrikethrough)
        if (showStrikethrough) {
          dom.prices.optimizeOriginal.textContent = formatPrice(result.optimizeStandardCost)
        }
      }
    } else {
      dom.prices.optimize.textContent = ''
      if (dom.prices.optimizeOriginal) dom.prices.optimizeOriginal.classList.add('is-hidden')
    }
  }

  // --- Optimize tier active states ---
  dom.tierButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.pricingTier === state.optimize.tier)
  })

  // --- MyMinFin display ---
  if (dom.myminfin.dossiers) {
    dom.myminfin.dossiers.textContent = state.myminfin.active
      ? result.myminfinDossiers.toLocaleString('nl-BE')
      : ''
  }
  if (dom.myminfin.cost) {
    dom.myminfin.cost.textContent = state.myminfin.active
      ? formatPrice(result.myminfinBillable * config.myminfin.unitPrice) + '/maand'
      : ''
  }

  // --- Summary panel ---
  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    const item = dom.summary.items[key]
    if (!item) return
    const isVisible = state[key].active && (key !== 'optimize' || state.optimize.tier !== null)
    item.classList.toggle('is-hidden', !isVisible)
  })

  // Summary prices
  if (dom.summary.prices.pb) dom.summary.prices.pb.textContent = formatPrice(result.pbCost)
  if (dom.summary.prices.blt) dom.summary.prices.blt.textContent = formatPrice(result.bltCost)
  if (dom.summary.prices.optimize) dom.summary.prices.optimize.textContent = formatPrice(result.optimizeCost)
  if (dom.summary.prices.myminfin) {
    dom.summary.prices.myminfin.textContent = state.myminfin.active
      ? formatPrice(result.myminfinCost) + '/jaar'
      : ''
  }

  // Total and monthly
  const hasAnyActive = state.pb.active || state.blt.active || state.optimize.active
  if (dom.summary.total) {
    dom.summary.total.classList.toggle('is-hidden', !hasAnyActive || result.isEnterprise)
    dom.summary.total.textContent = formatPrice(result.total)
  }
  if (dom.summary.monthly) {
    dom.summary.monthly.classList.toggle('is-hidden', !hasAnyActive || result.isEnterprise)
    dom.summary.monthly.textContent = result.monthly !== null
      ? formatPrice(result.monthly) + '/maand'
      : ''
  }

  // Enterprise mode
  if (dom.summary.enterprise) {
    dom.summary.enterprise.classList.toggle('is-hidden', !result.isEnterprise)
  }

  // Volume discount banner
  if (dom.summary.volume) {
    dom.summary.volume.classList.toggle('is-hidden', !result.showVolumeDiscount)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/pricing.js
git commit -m "feat(pricing): add render function for cards, sliders, summary, and conditional UI"
```

---

### Task 5: Wire up in main.js

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add pricing import and routing**

Add the import at the top of `main.js` alongside existing imports:

```js
import { initPricing } from './pages/pricing.js'
```

Add the routing line inside the `init()` function, after the existing `if` blocks:

```js
if (page.classList.contains('is-pricing')) initPricing()
```

- [ ] **Step 2: Verify the build runs**

Run: `cd /Users/vitalierosescu/Documents/Awwwocado/Clients/Active/Beancounter/dev && yarn build`

Expected: Build completes without errors. `main.js` output includes the pricing code.

- [ ] **Step 3: Commit**

```bash
git add src/main.js
git commit -m "feat(pricing): wire pricing page into main entry point"
```

---

### Task 6: Add initial CSS state for hidden details

**Files:**
- Modify: `src/pages/pricing.js`

The details areas need to start hidden. Add an `initDetails()` call inside `initPricing()`.

- [ ] **Step 1: Add `initDetails()` and call it in `initPricing()`**

Add this function before the `initPricing` export:

```js
function initDetails(dom) {
  ;['pb', 'blt', 'optimize'].forEach((key) => {
    const details = dom.details[key]
    if (!details) return
    gsap.set(details, { height: 0, display: 'none', overflow: 'hidden' })
  })
}
```

Update `initPricing()` to call it after `queryDOM` and before `bindEvents`:

```js
export function initPricing() {
  const wrapper = document.querySelector('[data-pricing="calculator"]')
  if (!wrapper) return

  const config = readConfig(wrapper)
  const state = createState(config)
  const dom = queryDOM(wrapper)

  initDetails(dom)
  bindEvents(dom, state, config)
  render(dom, state, config)
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/vitalierosescu/Documents/Awwwocado/Clients/Active/Beancounter/dev && yarn build`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/pricing.js
git commit -m "feat(pricing): set initial hidden state for details panels via GSAP"
```

---

### Task 7: Export pricingCalculator from utils index

**Files:**
- Modify: `src/utils/index.js`

- [ ] **Step 1: Add export**

Add this line to `src/utils/index.js`:

```js
export { DEFAULT_CONFIG, createState, calculate, formatPrice } from './pricingCalculator.js'
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/index.js
git commit -m "feat(pricing): export calculator utils from index"
```

---

### Task 8: Final build and lint check

**Files:** None (verification only)

- [ ] **Step 1: Run lint**

Run: `cd /Users/vitalierosescu/Documents/Awwwocado/Clients/Active/Beancounter/dev && yarn lint`

Expected: No errors. Fix any that appear.

- [ ] **Step 2: Run build**

Run: `cd /Users/vitalierosescu/Documents/Awwwocado/Clients/Active/Beancounter/dev && yarn build`

Expected: Clean build, `main.js` output in dist folder.

- [ ] **Step 3: Final commit if any lint fixes were needed**

```bash
git add -A
git commit -m "chore: fix lint issues in pricing calculator"
```
