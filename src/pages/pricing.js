// src/pages/pricing.js

import { DEFAULT_CONFIG, createState, calculate, formatPrice } from '../utils/pricingCalculator.js'

export function initPricing() {
  const wrapper = document.querySelector('[data-pricing="calculator"]')
  if (!wrapper) return

  injectSpinnerCSS()

  const config = readConfig(wrapper)
  const state = createState(config)
  const dom = queryDOM(wrapper)

  // Read initial active states from DOM
  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    if (dom.cards[key]?.classList.contains('is-active')) {
      state[key].active = true
    }
  })
  const activeTier = wrapper.querySelector('[data-pricing-tier].is-active')
  if (activeTier && state.optimize.active) {
    state.optimize.tier = activeTier.dataset.pricingTier
  }

  initDetails(dom)
  bindEvents(dom, state, config)
  render(dom, state, config)
}

function readConfig(wrapper) {
  const config = structuredClone(DEFAULT_CONFIG)

  const pbCard = wrapper.querySelector('[data-pricing-card="pb"]')
  const bltCard = wrapper.querySelector('[data-pricing-card="blt"]')

  if (pbCard) {
    config.pb.min = Number(pbCard.dataset.min) || config.pb.min
    config.pb.max = Number(pbCard.dataset.max) || config.pb.max
    if (pbCard.dataset.default) config.pb.default = Number(pbCard.dataset.default)
  }
  if (bltCard) {
    config.blt.min = Number(bltCard.dataset.min) || config.blt.min
    config.blt.max = Number(bltCard.dataset.max) || config.blt.max
    if (bltCard.dataset.default) config.blt.default = Number(bltCard.dataset.default)
  }

  const myminfinCard = wrapper.querySelector('[data-pricing-card="myminfin"]')
  if (myminfinCard) {
    config.myminfin.min = Number(myminfinCard.dataset.min) || config.myminfin.min
    config.myminfin.max = Number(myminfinCard.dataset.max) || config.myminfin.max
    if (myminfinCard.dataset.default) config.myminfin.default = Number(myminfinCard.dataset.default)
  }

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
    sliders: {
      pb: q('[data-pricing-card="pb"] [data-pricing-slider]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-slider]'),
    },
    inputs: {
      pb: q('[data-pricing-card="pb"] [data-pricing-input]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-input]'),
      myminfin: q('[data-pricing-card="myminfin"] [data-pricing-input]'),
    },
    prices: {
      optimize: q('[data-pricing-card="optimize"] [data-pricing-price]'),
      optimizeOriginal: q('[data-pricing-card="optimize"] [data-pricing-price-original]'),
    },
    cardTotals: {
      pb: q('[data-pricing-card="pb"] [data-pricing-card-total]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-card-total]'),
    },
    cardQty: {
      pb: q('[data-pricing-card="pb"] [data-pricing-card-qty]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-card-qty]'),
    },
    cardUnit: {
      pb: q('[data-pricing-card="pb"] [data-pricing-card-unit]'),
      blt: q('[data-pricing-card="blt"] [data-pricing-card-unit]'),
    },
    rangeLabels: {
      pb: {
        min: q('[data-pricing-card="pb"] [data-pricing-range-min]'),
        max: q('[data-pricing-card="pb"] [data-pricing-range-max]'),
      },
      blt: {
        min: q('[data-pricing-card="blt"] [data-pricing-range-min]'),
        max: q('[data-pricing-card="blt"] [data-pricing-range-max]'),
      },
    },
    tierButtons: qAll('[data-pricing-tier]'),
    myminfin: {},
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
      qty: {
        pb: q('[data-summary-qty="pb"]'),
        blt: q('[data-summary-qty="blt"]'),
        myminfin: q('[data-summary-qty="myminfin"]'),
      },
      unit: {
        pb: q('[data-summary-unit="pb"]'),
        blt: q('[data-summary-unit="blt"]'),
        optimize: q('[data-summary-unit="optimize"]'),
      },
      total: q('[data-summary-total]'),
      monthly: q('[data-summary-monthly]'),
      earlybird: q('[data-summary-earlybird]'),
      volume: q('[data-summary-volume]'),
      enterprise: q('[data-summary-enterprise]'),
      content: q('[data-pricing="summary"] .calc-overview_content'),
      cta: q('[data-summary-cta]'),
    },
  }
}

function initDetails() {
  // Details expand/collapse handled by CSS via .is-active on the card
}

function bindEvents(dom, state, config) {
  const update = () => render(dom, state, config)

  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    const toggle = dom.toggles[key]
    if (!toggle) return

    toggle.addEventListener('click', () => {
      if (key === 'myminfin' && !state.pb.active && !state.blt.active) {
        const comboTag = dom.cards.myminfin?.querySelector('.addon_tag.is-combo')
        if (comboTag) {
          comboTag.classList.add('is-shaking')
          comboTag.addEventListener('animationend', () => comboTag.classList.remove('is-shaking'), {
            once: true,
          })
        }
        return
      }

      state[key].active = !state[key].active

      if ((key === 'pb' || key === 'blt') && !state.pb.active && !state.blt.active) {
        state.myminfin.active = false
      }

      update()
    })
  })
  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    const btn = dom.summary.removeButtons[key]
    if (!btn) return

    btn.addEventListener('click', () => {
      state[key].active = false

      if ((key === 'pb' || key === 'blt') && !state.pb.active && !state.blt.active) {
        state.myminfin.active = false
      }

      update()
    })
  })

  dom.tierButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!state.optimize.active) return
      state.optimize.tier = btn.dataset.pricingTier
      update()
    })
  })
  ;['pb', 'blt'].forEach((key) => {
    const slider = dom.sliders[key]
    const input = dom.inputs[key]
    if (!slider || !input) return

    const step = Number(slider.step) || 50
    const card = dom.cards[key]
    const decBtn = card?.querySelector('[data-pricing-decrement]')
    const incBtn = card?.querySelector('[data-pricing-increment]')

    slider.addEventListener('input', () => {
      const val = clampValue(Number(slider.value), config[key].min, config[key].max)
      state[key].quantity = val
      input.value = val
      update()
    })

    input.addEventListener('input', () => {
      const raw = input.value.replace(/\D/g, '')
      const num = Number(raw)
      if (!num) return
      state[key].quantity = Math.min(num, config[key].max)
      slider.value = state[key].quantity
      update()
    })

    input.addEventListener('blur', () => {
      state[key].quantity = clampValue(state[key].quantity, config[key].min, config[key].max)
      input.value = state[key].quantity
      slider.value = state[key].quantity
      update()
    })

    const stepValue = (direction) => {
      const val = clampValue(
        state[key].quantity + direction * step,
        config[key].min,
        config[key].max
      )
      state[key].quantity = val
      slider.value = val
      input.value = val
      update()
    }

    if (decBtn) decBtn.addEventListener('click', () => stepValue(-1))
    if (incBtn) incBtn.addEventListener('click', () => stepValue(1))
  })

  // MyMinFin input (no slider) - stop propagation so clicks don't trigger the toggle
  const mmInput = dom.inputs.myminfin
  if (mmInput) {
    const mmCard = dom.cards.myminfin
    const mmStep = config.myminfin.step || 100
    const mmDec = mmCard?.querySelector('[data-pricing-decrement]')
    const mmInc = mmCard?.querySelector('[data-pricing-increment]')
    const mmWrap = mmCard?.querySelector('.range-value_wrap')

    if (mmWrap) mmWrap.addEventListener('click', (e) => e.stopPropagation())

    mmInput.addEventListener('input', () => {
      const raw = mmInput.value.replace(/\D/g, '')
      const num = Number(raw)
      if (!num) return
      state.myminfin.quantity = Math.min(num, config.myminfin.max)
      update()
    })

    mmInput.addEventListener('blur', () => {
      state.myminfin.quantity = clampValue(
        state.myminfin.quantity,
        config.myminfin.min,
        config.myminfin.max
      )
      mmInput.value = state.myminfin.quantity
      update()
    })

    const mmStep_ = (direction) => {
      const val = clampValue(
        state.myminfin.quantity + direction * mmStep,
        config.myminfin.min,
        config.myminfin.max
      )
      state.myminfin.quantity = val
      mmInput.value = val
      update()
    }

    if (mmDec) mmDec.addEventListener('click', () => mmStep_(-1))
    if (mmInc) mmInc.addEventListener('click', () => mmStep_(1))
  }
}

function clampValue(val, min, max) {
  return Math.min(max, Math.max(min, val))
}

function updateSliderFill(slider) {
  const min = Number(slider.min)
  const max = Number(slider.max)
  const val = Number(slider.value)
  const percent = ((val - min) / (max - min)) * 100
  slider.style.background = `linear-gradient(to right, #565AF5 ${percent}%, #ccc ${percent}%)`
}

function render(dom, state, config) {
  const result = calculate(state, config)
  const isCombo = result.isCombo

  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    const card = dom.cards[key]
    if (!card) return
    card.classList.toggle('is-active', state[key].active)
  })

  if (dom.cards.myminfin) {
    dom.cards.myminfin.classList.toggle('is-disabled', !isCombo)
  }

  ;['pb', 'blt'].forEach((key) => {
    const slider = dom.sliders[key]
    const input = dom.inputs[key]
    if (!slider || !input) return

    slider.min = config[key].min
    slider.max = config[key].max
    slider.value = state[key].quantity
    input.value = state[key].quantity
    updateSliderFill(slider)
  })

  // Card total boxes (purple box next to slider)
  ;['pb', 'blt'].forEach((key) => {
    if (!state[key].active) return

    const cost = key === 'pb' ? result.pbCost : result.bltCost

    if (dom.cardTotals[key]) dom.cardTotals[key].textContent = formatPrice(cost)
    if (dom.cardQty[key]) dom.cardQty[key].textContent = state[key].quantity.toLocaleString('nl-BE')
    if (dom.cardUnit[key]) dom.cardUnit[key].textContent = config[key].unitPrice
  })

  // Range min/max labels
  ;['pb', 'blt'].forEach((key) => {
    const labels = dom.rangeLabels[key]
    if (!labels) return
    if (labels.min) labels.min.textContent = config[key].min.toLocaleString('nl-BE')
    if (labels.max) labels.max.textContent = config[key].max.toLocaleString('nl-BE')
  })

  if (dom.prices.optimize) {
    if (state.optimize.active && state.optimize.tier) {
      dom.prices.optimize.textContent = formatPrice(result.optimizeCost)
      if (dom.prices.optimizeOriginal) {
        const showStrikethrough =
          isCombo && !result.isEnterprise && result.optimizeStandardCost !== result.optimizeCost
        dom.prices.optimizeOriginal.classList.toggle('is-hidden', !showStrikethrough)
        if (showStrikethrough) {
          dom.prices.optimizeOriginal.textContent = formatPrice(result.optimizeStandardCost)
        }
      }
    } else if (state.optimize.active) {
      dom.prices.optimize.textContent = ''
      if (dom.prices.optimizeOriginal) dom.prices.optimizeOriginal.classList.add('is-hidden')
    }
  }

  dom.tierButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.pricingTier === state.optimize.tier)
  })

  // Sync myminfin input value
  if (dom.inputs.myminfin) {
    dom.inputs.myminfin.value = state.myminfin.quantity
  }

  ;['pb', 'blt', 'optimize', 'myminfin'].forEach((key) => {
    const item = dom.summary.items[key]
    if (!item) return
    const isVisible = state[key].active && (key !== 'optimize' || state.optimize.tier !== null)
    item.classList.toggle('is-hidden', !isVisible)
  })

  if (dom.summary.prices.pb) dom.summary.prices.pb.textContent = formatPrice(result.pbCost)
  if (dom.summary.prices.blt)
    dom.summary.prices.blt.textContent = formatPrice(result.bltCost)

    // Summary qty/unit
  ;['pb', 'blt'].forEach((key) => {
    if (dom.summary.qty[key])
      dom.summary.qty[key].textContent = state[key].quantity.toLocaleString('nl-BE')
    if (dom.summary.unit[key]) dom.summary.unit[key].textContent = config[key].unitPrice
  })
  if (dom.summary.qty.myminfin) {
    dom.summary.qty.myminfin.textContent = state.myminfin.quantity.toLocaleString('nl-BE')
  }
  if (dom.summary.prices.optimize)
    dom.summary.prices.optimize.textContent = formatPrice(result.optimizeCost)
  if (dom.summary.unit.optimize && state.optimize.tier) {
    const tierLabel = config.optimize.tiers[state.optimize.tier]?.label || ''
    dom.summary.unit.optimize.textContent = tierLabel
  }
  if (dom.summary.prices.myminfin) {
    if (!state.myminfin.active) {
      dom.summary.prices.myminfin.textContent = ''
    } else if (result.myminfinCost === 0) {
      dom.summary.prices.myminfin.textContent = 'Gratis'
    } else {
      dom.summary.prices.myminfin.textContent = formatPrice(result.myminfinCost) + '/jaar'
    }
  }

  const hasAnyActive = state.pb.active || state.blt.active || state.optimize.active
  if (dom.summary.total) {
    dom.summary.total.classList.toggle('is-hidden', !hasAnyActive || result.isEnterprise)
    dom.summary.total.textContent = formatPrice(result.total)
  }
  if (dom.summary.monthly) {
    dom.summary.monthly.classList.toggle('is-hidden', !hasAnyActive || result.isEnterprise)
    dom.summary.monthly.textContent = result.monthly !== null ? formatPrice(result.monthly) : ''
  }

  if (dom.summary.enterprise) {
    dom.summary.enterprise.classList.toggle('hide', !result.isEnterprise)
  }

  if (dom.summary.content) {
    dom.summary.content.classList.toggle('hide', result.isEnterprise)
  }

  if (dom.summary.volume) {
    dom.summary.volume.classList.toggle('is-hidden', !result.showVolumeDiscount)
  }
}

function injectSpinnerCSS() {
  if (document.getElementById('pricing-spinner-css')) return
  const style = document.createElement('style')
  style.id = 'pricing-spinner-css'
  style.textContent = `
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type="number"] {
      -moz-appearance: textfield;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-4px); }
      40% { transform: translateX(4px); }
      60% { transform: translateX(-3px); }
      80% { transform: translateX(3px); }
    }
    .addon_tag.is-shaking {
      animation: shake 0.4s ease;
    }
  `
  document.head.appendChild(style)
}
