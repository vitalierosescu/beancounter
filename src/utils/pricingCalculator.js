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

export function formatPrice(value) {
  if (value === null) return 'Op aanvraag'
  return (
    '\u20AC' +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}
