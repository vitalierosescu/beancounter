const MS_PER_DAY = 1000 * 60 * 60 * 24
const COUNT_OFFSET = 100

const CONFIG = {
  rollDuration: 2,
  rollEase: 'power3.out',
  digitStagger: 0.05,
  digitCycles: 2,
  collapseDuration: 0.4,
  collapseEase: 'power2.inOut',
  bannerFadeDuration: 0.7,
  bannerFadeEase: 'power2.out',
  bannerFadeIntoRollOffset: 0.3,
}

export function initBannerCountdown() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  document.querySelectorAll('[data-banner-deadline]').forEach((deadlineEl) => {
    if (deadlineEl.dataset.countdownInit) return

    const deadline = parseDate(deadlineEl.textContent)
    if (!deadline) return

    const daysEl = findCounterpart(deadlineEl, '[data-banner-days]')
    if (!daysEl) return

    deadlineEl.dataset.countdownInit = 'true'

    const today = startOfDay(new Date())
    const targetDays = Math.max(0, Math.ceil((deadline - today) / MS_PER_DAY))
    const banner = daysEl.closest('.nav-banner_item')

    if (prefersReducedMotion) {
      daysEl.textContent = targetDays
      return
    }

    const tl = gsap.timeline()

    const rollOffset = banner ? CONFIG.bannerFadeIntoRollOffset : 0
    buildOdometer(daysEl, targetDays + COUNT_OFFSET, targetDays, tl, rollOffset)
  })
}

function buildOdometer(el, startValue, endValue, tl, offset) {
  const startStr = String(startValue)
  const totalLen = startStr.length
  const endStr = String(endValue).padStart(totalLen, '0')
  const leadingZeroCount = totalLen - String(endValue).length
  const step = getLineHeightRatio(el)

  el.textContent = ''
  Object.assign(el.style, {
    display: 'inline-flex',
    alignItems: 'center',
    fontVariantNumeric: 'tabular-nums',
  })

  const totalCells = 10 * CONFIG.digitCycles
  const rollers = []
  const collapseEls = []

  for (let i = 0; i < totalLen; i++) {
    const startDigit = parseInt(startStr[i], 10)
    const endDigit = parseInt(endStr[i], 10)
    const isLeadingZero = i < leadingZeroCount

    const mask = document.createElement('span')
    mask.setAttribute('data-odometer-part', 'mask')
    Object.assign(mask.style, {
      display: 'inline-block',
      overflow: 'clip',
      padding: '0.05em',
      margin: '-0.05em',
      height: step + 'em',
      lineHeight: step,
    })

    const roller = document.createElement('span')
    roller.setAttribute('data-odometer-part', 'roller')
    Object.assign(roller.style, {
      display: 'block',
      whiteSpace: 'pre',
      textAlign: 'center',
      lineHeight: step,
      willChange: 'transform',
    })

    const digits = []
    for (let d = 0; d < totalCells; d++) digits.push(d % 10)
    roller.textContent = digits.join('\n')
    mask.appendChild(roller)
    el.appendChild(mask)

    gsap.set(roller, { y: -startDigit * step + 'em' })
    const targetPos = endDigit > startDigit ? endDigit : 10 + endDigit
    rollers.push({ roller, targetPos })
    if (isLeadingZero) collapseEls.push(mask)
  }

  rollers.forEach(({ roller, targetPos }, idx) => {
    const reversedIdx = rollers.length - 1 - idx
    tl.to(
      roller,
      {
        y: -targetPos * step + 'em',
        duration: CONFIG.rollDuration,
        ease: CONFIG.rollEase,
        force3D: true,
      },
      offset + reversedIdx * CONFIG.digitStagger
    )
  })

  if (collapseEls.length) {
    const fontSize = parseFloat(getComputedStyle(el).fontSize)
    const rollEndTime = offset + (rollers.length - 1) * CONFIG.digitStagger + CONFIG.rollDuration
    collapseEls.forEach((mask, i) => {
      const widthEm = mask.offsetWidth / fontSize
      gsap.set(mask, { width: widthEm + 'em' })
      tl.to(
        mask,
        {
          width: 0,
          paddingLeft: 0,
          paddingRight: 0,
          marginLeft: 0,
          marginRight: 0,
          opacity: 0,
          duration: CONFIG.collapseDuration,
          ease: CONFIG.collapseEase,
        },
        rollEndTime - 0.1 + i * 0.05
      )
    })
  }
}

function parseDate(str) {
  const parts = str.trim().split(/[\/\-\.]/).map((s) => Number(s.trim()))
  if (parts.length !== 3) return null
  const [d, m, y] = parts
  if (!d || !m || !y) return null
  return new Date(y, m - 1, d)
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function findCounterpart(startEl, selector) {
  let parent = startEl.parentElement
  while (parent) {
    const match = parent.querySelector(selector)
    if (match) return match
    parent = parent.parentElement
  }
  return null
}

function getLineHeightRatio(el) {
  const cs = getComputedStyle(el)
  const lh = cs.lineHeight
  if (lh === 'normal') return 1.2
  return parseFloat(lh) / parseFloat(cs.fontSize)
}
