# Pricing Calculator -- Design Spec

**Client:** BeanCounter
**Date:** 2026-03-29
**Status:** Draft

---

## 1. Overview

An interactive pricing calculator for BeanCounter's pricing page. Users select products, configure quantities/tiers, and see a live cost summary. Built as vanilla JS (UMD via Vite), wired to Webflow HTML via `data-*` attributes.

## 2. Products

### 2.1 Personenbelasting (PB)
- Unit price: EUR 20 / aangifte / jaar
- Slider: min 1,000 -- max 50,000 (configurable via `data-min`, `data-max`)
- Default value on first select: ~12,500 (one quarter of max)
- Selecting shows slider + manual number input

### 2.2 Bedrijfsleidertool (BLT)
- Unit price: EUR 30 / dossier / jaar
- Slider: min 1,000 -- max 50,000 (configurable)
- Default value on first select: ~12,500
- Selecting shows slider + manual number input

### 2.3 Optimize
- Priced per kantoor/jaar, tiered by employee count
- Tier picker (radio buttons), no numeric input
- Tiers:

| Code | Medewerkers | Standaard | Combo |
|------|-------------|-----------|-------|
| A    | 1-5         | 5,000     | 3,000 |
| B    | 6-25        | 7,500     | 5,000 |
| C    | 26-100      | 15,000    | 10,000 |
| D    | 100+        | Op aanvraag | Op aanvraag |

- Combo price applies when PB and/or BLT is active
- When combo is active: original price shown crossed out, combo price shown next to it (on card + in summary)
- Tier D: disables total calculation entirely, summary shows "Neem contact op"

### 2.4 MyMinFin Smart Assistant (add-on)
- Only selectable when PB or BLT is active
- When neither is active: visible but disabled (lower opacity, not clickable)
- Unit price: EUR 0.15 / dossier / maand
- Dossier count auto-calculated: `Math.ceil(Math.max(pbQty, bltQty) * 1.5)`
- First 1,000 dossiers free (in combo mode)
- Billable: `Math.max(0, calculatedDossiers - 1000)`
- Yearly cost: `billable * 0.15 * 12`
- User cannot manually adjust dossier count

## 3. Architecture

### 3.1 Central State Object

```js
state = {
  pb:       { active: false, quantity: 12500 },
  blt:      { active: false, quantity: 12500 },
  optimize: { active: false, tier: null },   // 'A' | 'B' | 'C' | 'D' | null
  myminfin: { active: false }
}
```

### 3.2 Config Object (CMS-driven later)

```js
config = {
  pb:  { unitPrice: 20, min: 1000, max: 50000 },
  blt: { unitPrice: 30, min: 1000, max: 50000 },
  optimize: {
    tiers: {
      A: { label: '1-5',    standard: 5000,  combo: 3000  },
      B: { label: '6-25',   standard: 7500,  combo: 5000  },
      C: { label: '26-100', standard: 15000, combo: 10000 },
      D: { label: '100+',   standard: null,  combo: null  }
    }
  },
  myminfin: { unitPrice: 0.15, freeDossiers: 1000, multiplier: 1.5 }
}
```

### 3.3 Derived Calculations (pure functions)

- `pbCost = pb.active ? pb.quantity * config.pb.unitPrice : 0`
- `bltCost = blt.active ? blt.quantity * config.blt.unitPrice : 0`
- `isCombo = pb.active || blt.active`
- `optimizeCost = !optimize.active || !optimize.tier ? 0 : tier === 'D' ? null : isCombo ? tierComboPrice : tierStandardPrice`
- `myminfinDossiers = Math.ceil(Math.max(pb.quantity, blt.quantity) * 1.5)`
- `myminfinBillable = Math.max(0, myminfinDossiers - 1000)`
- `myminfinCost = myminfinBillable * 0.15 * 12`
- `showVolumeDiscount = pb.quantity > 250 || blt.quantity > 250`
- `isEnterprise = optimize.active && optimize.tier === 'D'`
- `total = pbCost + bltCost + (optimizeCost ?? 0) + myminfinCost`

### 3.4 Update Flow

Every user action (toggle, slider, tier pick, remove) mutates state, then calls a single `update()` function:

1. Recalculate all derived values
2. Update card UI (active states, prices, slider positions)
3. Update summary panel (line items, totals, banners)
4. Handle conditional UI (MyMinFin disabled state, enterprise mode, combo strikethrough)

## 4. Webflow Attribute Map

### 4.1 Wrapper
- `[data-pricing="calculator"]` -- outermost section wrapper

### 4.2 Product Cards
- `[data-pricing-card="pb"]` / `[data-pricing-card="blt"]` / `[data-pricing-card="optimize"]` / `[data-pricing-card="myminfin"]`
- `[data-pricing-toggle]` -- clickable header area (toggle on/off)
- `[data-pricing-details]` -- expandable content (slider, tier picker)
- `[data-pricing-price]` -- price display on card
- `[data-pricing-price-original]` -- crossed-out original price (Optimize combo only)

### 4.3 Slider (PB & BLT)
- `[data-pricing-slider]` -- the `<input type="range">`
- `[data-pricing-input]` -- the `<input type="number">` (manual entry)
- `data-min`, `data-max`, `data-default` -- config attributes on the card

### 4.4 Optimize Tier Picker
- `[data-pricing-tier="A"]` / `B` / `C` / `D` -- tier buttons
- `data-standard`, `data-combo` -- price config per tier button

### 4.5 MyMinFin
- `[data-pricing-dossiers]` -- displays auto-calculated dossier count
- `[data-pricing-myminfin-cost]` -- displays monthly cost

### 4.6 Summary Panel
- `[data-pricing="summary"]` -- wrapper
- `[data-summary-item="pb"]` / `blt` / `optimize` / `myminfin` -- line items
- `[data-summary-price="pb"]` / etc. -- price per line
- `[data-summary-remove="pb"]` / etc. -- X button to deselect from summary
- `[data-summary-total]` -- yearly total
- `[data-summary-monthly]` -- total / 12
- `[data-summary-earlybird]` -- early bird info banner
- `[data-summary-volume]` -- volume discount banner (PB > 250 or BLT > 250)
- `[data-summary-enterprise]` -- "Neem contact op" (replaces total when tier D)
- `[data-summary-cta]` -- "Boek een demo" button

### 4.7 CSS Classes (toggled by JS)
- `.is-active` -- selected card
- `.is-disabled` -- MyMinFin when no PB/BLT active
- `.is-hidden` -- general visibility
- `.is-enterprise` -- summary in enterprise mode

## 5. Interaction Flow

### 5.1 Initial State (page load)
- All cards collapsed, none active
- MyMinFin visible but `.is-disabled`
- Summary panel shows CTA only, no line items or total

### 5.2 Selecting a Product
- Click `[data-pricing-toggle]` on a card
- Card gets `.is-active`
- `[data-pricing-details]` expands (GSAP height: 0 to auto)
- Line item appears in summary
- If PB or BLT: MyMinFin becomes enabled
- If Optimize already active: recalculate combo pricing

### 5.3 Deselecting a Product
Two ways: click card toggle again, or click X in summary panel (`[data-summary-remove]`)

- Card loses `.is-active`, details collapse
- Line item removed from summary
- Slider values persist in state (restored if re-selected)
- If last PB/BLT deselected:
  - MyMinFin auto-deselected and disabled
  - Optimize reverts to standard pricing
- Total recalculates

### 5.4 Slider Interaction
- Dragging slider updates number input in real-time
- Typing in input updates slider position
- Both clamped to min/max
- Summary updates instantly (no animation on price changes)

### 5.5 Optimize Tier Selection
- Must pick a tier after selecting Optimize (no default)
- Tier D: summary enters enterprise mode, total hidden, "Neem contact op" shown
- Switching tiers updates price immediately
- Combo pricing shown with strikethrough on original price

### 5.6 MyMinFin Auto-calculation
- Dossier count = `ceil(max(pbQty, bltQty) * 1.5)`
- Shows "Eerste 1.000 dossiers gratis" badge
- Recalculates whenever PB or BLT quantity changes

### 5.7 Volume Discount Banner
- Appears in summary when PB qty > 250 or BLT qty > 250
- Informational only, with link to more info

### 5.8 Early Bird Banner
- Always visible in summary (informational)
- Not calculated into total

## 6. File Structure

```
src/
  pages/
    pricing.js          -- initPricing() entry point
  utils/
    pricingCalculator.js -- state, config, pure calculation functions
  main.js               -- add pricing page routing
  global.js             -- unchanged
```

## 7. Number Formatting

All prices formatted as European style: `EUR 5.000` (dot as thousands separator). Monthly prices: `EUR 421/maand`.

## 8. Edge Cases

- Optimize selected without a tier: no price shown, no line item in summary until tier picked
- Tier D + other products: total section hidden, but other line items still visible for reference
- PB and BLT both at 0: not possible (min is 1,000)
- MyMinFin with both PB and BLT active: uses MAX of the two quantities
- All products deselected: summary returns to empty initial state
