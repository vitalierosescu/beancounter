// src/pages/itaa.js
// ITAA congress landing page (/itaa).
// gsap / ScrollTrigger come from the Webflow CDN, same as every other page module.

const reduceMotion =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Blocks that rise in as they enter view. Text handled by [data-split] in
// global.js is deliberately left out — it would animate twice.
const REVEAL_SELECTOR = [
  '.itaa-hero_content',
  '.itaa-hero_card',
  '.itaa-stats_card',
  '.itaa-tools_card',
  '.itaa-stand_content',
  '.itaa-stand_media',
].join(', ')

function initReveals() {
  // Check the plugin BEFORE hiding anything: if ScrollTrigger were missing we
  // would hide the whole page and never reveal it.
  if (typeof ScrollTrigger === 'undefined' || !ScrollTrigger.batch) return

  const targets = [...document.querySelectorAll(REVEAL_SELECTOR)].filter(
    (el) => !el.hasAttribute('data-split')
  )
  if (!targets.length || reduceMotion) return

  gsap.set(targets, { autoAlpha: 0, y: 24 })

  ScrollTrigger.batch(targets, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
        clearProps: 'transform',
      }),
  })
}

// The page shares the is-product page-wrap with the other product pages, so it
// keys off its own markup instead of a page class.
export function initItaa() {
  if (!document.querySelector('.itaa-hero')) return
  initReveals()
}
