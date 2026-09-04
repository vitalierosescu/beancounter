// src/pages/beanie.js
// gsap / ScrollTrigger come from the Webflow CDN, same as every other page module.

const reduceMotion =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function initTabs() {
  const VISUAL_SELECTOR = '.progress-visual_visual' // edit if Webflow renames it
  const DIRECTION_ATTR = 'data-animate-from'
  // Webflow writes this as data-wf--<component-slug>--variant. The section uses the
  // "Tabs / Item" component, so nothing matches today and every tab runs the
  // vertical rail — which is what the section CSS draws. Kept as the hook for a
  // future horizontal variant.
  const VARIANT_ATTR = 'data-wf--tabs-item--variant'
  const DIRECTIONS = {
    top: [0, -1],
    right: [1, 0],
    bottom: [0, 1],
    left: [-1, 0],
    'top-left': [-1, -1],
    'top-right': [1, -1],
    'bottom-left': [-1, 1],
    'bottom-right': [1, 1],
  }
  // Cycled when a visual has no data-animate-from, so the entrances stay varied
  // without needing the attribute hand-set on every item.
  const FALLBACK_DIRECTIONS = ['bottom-right', 'bottom', 'bottom-left']

  const AUTOPLAY_DURATION = 7 // bar fill (s)
  const SWITCH_DURATION = 0.6 // expand/collapse
  const EXPAND_EASE = 'power2.inOut' // collapse + expand
  const CONTENT_FADE = 1 // reveal in
  const CONTENT_OUT = 0.25 // fade out
  const REVEAL_STAGGER = 0.03
  const BAR_START_DELAY = 0.15
  const BAR_MIN = 4 // px resting nub, matches the rail thickness

  // reduced motion keeps the tabs usable but drops the movement and the autoplay
  const D = reduceMotion ? 0 : 1

  document.querySelectorAll('[data-init-progress]').forEach((wrap) => {
    const progressItems = [...wrap.querySelectorAll('.progress_item')]
    const visualItems = [...wrap.querySelectorAll('.progress-visual_item')]

    const count = progressItems.length
    if (!count) return

    const tabs = progressItems.map((item, i) => {
      const visualItem = visualItems[i]
      const direction =
        visualItem?.querySelector(`[${DIRECTION_ATTR}]`)?.getAttribute(DIRECTION_ATTR) ||
        FALLBACK_DIRECTIONS[i % FALLBACK_DIRECTIONS.length]
      const [dx, dy] = DIRECTIONS[direction] || DIRECTIONS.bottom
      // product runs the bar left-to-right along a fixed-width underline;
      // base grows a vertical rail alongside the card as it opens
      const horizontal = item.getAttribute(VARIANT_ATTR) === 'product'
      return {
        item,
        line: item.querySelector('.progress_line'),
        bar: item.querySelector('.progress_line-active'),
        cap: item.querySelector('.progress_line-cap'),
        expand: item.querySelector('.progress_expand-w'),
        reveal: [...item.querySelectorAll('.progress_expand > *')],
        visual: visualItem ? visualItem.querySelector(VISUAL_SELECTOR) : null,
        title: item.querySelector('.progress_title')?.textContent.trim() || `Tab ${i + 1}`,
        dx,
        dy,
        horizontal,
        size: horizontal ? 'width' : 'height',
        scale: horizontal ? 'scaleX' : 'scaleY',
        move: horizontal ? 'x' : 'y',
        edge: horizontal ? 'left' : 'top',
      }
    })

    if (tabs.length > visualItems.length) {
      // half-built section: say so once instead of silently showing an empty stage
      console.warn(
        `[beanie] ${tabs.length} tabs but ${visualItems.length} visuals — the last tab(s) keep the previous visual.`
      )
    }

    // horizontal spans the item's width; vertical spans the card's open height,
    // which an already-open item reports directly
    const barTarget = (tab) => {
      const r = tab.item.getBoundingClientRect()
      if (tab.horizontal) return r.width
      return tab.open ? r.height : r.height + (tab.expand ? tab.expand.scrollHeight : 0)
    }

    tabs.forEach((tab, i) => {
      if (tab.expand) gsap.set(tab.expand, { display: 'block', height: 0 })
      if (tab.reveal.length) gsap.set(tab.reveal, { autoAlpha: 0, y: '1rem' })
      if (tab.bar) gsap.set(tab.bar, { [tab.size]: BAR_MIN, transformOrigin: 'top left' })
      if (tab.line && !tab.horizontal) gsap.set(tab.line, { height: BAR_MIN })
      if (tab.cap) gsap.set(tab.cap, { [tab.edge]: 0, [tab.move]: BAR_MIN })
      // first is visible from load
      if (tab.visual) {
        gsap.set(tab.visual, { autoAlpha: i === 0 ? 1 : 0 })
        tab.visual.decode?.().catch(() => {})
      }
    })

    // Safari: without containment WebKit re-lays-out the visual imgs on every
    // frame of the expand height tween even though they never move — measured
    // 28ms → 16.7ms frames. Containment lets it skip the whole subtree.
    visualItems.forEach((v) => (v.style.contain = 'layout paint'))

    let activeIndex = null
    let currentTl = null
    let barTween = null
    let held = false // pointer or keyboard focus is holding autoplay
    let inView = false

    function startProgressBar(index, target) {
      if (barTween) barTween.kill()
      if (reduceMotion) return
      const tab = tabs[index]
      const { bar, cap } = tab
      if (!bar || !target) return
      // fill via scale, not width/height — a 7s size tween relayouts every
      // frame, which is the main Safari jank source in this section
      tab.barScaleMin = BAR_MIN / target
      gsap.set(bar, { [tab.size]: target, [tab.scale]: tab.barScaleMin })
      if (cap) gsap.set(cap, { [tab.move]: BAR_MIN })
      barTween = gsap.timeline({
        delay: BAR_START_DELAY,
        onComplete: () => switchTab((index + 1) % count),
      })
      barTween.to(
        bar,
        { [tab.scale]: 1, duration: AUTOPLAY_DURATION, ease: 'none', force3D: true },
        0
      )
      if (cap) barTween.to(cap, { [tab.move]: target, duration: AUTOPLAY_DURATION, ease: 'none' }, 0)
      if (held) barTween.pause()
    }

    function switchTab(index, autoplay = true) {
      if (index === activeIndex) return
      const isFirst = activeIndex === null
      activeIndex = index // claim before await
      if (currentTl) currentTl.kill()

      const incoming = tabs[index]
      const incomingVisual = incoming.visual

      // reads before the class toggle dirties layout (avoids a forced reflow)
      const target = barTarget(incoming)

      progressItems.forEach((el, i) => {
        const on = i === index
        el.classList.toggle('is--active', on)
        el.setAttribute('aria-expanded', on ? 'true' : 'false')
      })

      if (autoplay) startProgressBar(index, target)

      // only tabs that are actually open get collapse tweens; `open` clears on
      // the timeline's onComplete, so a killed mid-collapse tab re-collapses on
      // the next switch instead of freezing half-open
      const closing = tabs.filter((tab, i) => i !== index && tab.open)
      incoming.open = true

      const tl = gsap.timeline({
        onComplete: () => {
          closing.forEach((tab) => (tab.open = false))
          if (currentTl === tl) currentTl = null
        },
      })
      currentTl = tl

      // `to` so interrupts collapse in place
      closing.forEach((tab) => {
        if (tab.expand)
          tl.to(tab.expand, { height: 0, duration: SWITCH_DURATION * D, ease: EXPAND_EASE }, 0)
        if (tab.line && !tab.horizontal)
          tl.to(tab.line, { height: BAR_MIN, duration: SWITCH_DURATION * D, ease: EXPAND_EASE }, 0)
        if (tab.bar)
          tl.to(
            tab.bar,
            { [tab.scale]: tab.barScaleMin || 1, duration: 0.3 * D, ease: 'power4.out' },
            0
          )
        if (tab.cap)
          tl.to(tab.cap, { [tab.move]: BAR_MIN, duration: 0.3 * D, ease: 'power4.out' }, 0)
        if (tab.reveal.length)
          tl.to(
            tab.reveal,
            { autoAlpha: 0, y: '-1rem', duration: CONTENT_OUT * D, ease: 'power2.in' },
            0
          )
        // a tab without its own visual keeps the previous one on screen rather
        // than fading to an empty stage
        if (tab.visual && incomingVisual)
          tl.to(
            tab.visual,
            // exits back toward where it entered from
            {
              autoAlpha: 0,
              x: tab.dx * 2 + 'rem',
              y: tab.dy * 2 + 'rem',
              duration: 0.5 * D,
              ease: 'power2.in',
            },
            0
          )
      })

      if (incoming.expand)
        tl.to(
          incoming.expand,
          { height: 'auto', duration: SWITCH_DURATION * D, ease: EXPAND_EASE },
          0
        )
      if (incoming.line && !incoming.horizontal)
        tl.to(incoming.line, { height: target, duration: SWITCH_DURATION * D, ease: EXPAND_EASE }, 0)

      if (incoming.reveal.length) {
        tl.fromTo(
          incoming.reveal,
          { autoAlpha: 0, y: '4rem' },
          {
            autoAlpha: 1,
            y: '0rem',
            duration: CONTENT_FADE * D,
            ease: 'power4.out',
            stagger: REVEAL_STAGGER * D,
          },
          0.2 * D
        )
      }
      if (incomingVisual) {
        // tab 0 already visible
        if (!(isFirst && index === 0)) {
          tl.fromTo(
            incomingVisual,
            { autoAlpha: 0, x: incoming.dx * 4 + 'rem', y: incoming.dy * 4 + 'rem' },
            { autoAlpha: 1, x: '0rem', y: '0rem', duration: 0.8 * D, ease: 'power4.out' },
            SWITCH_DURATION * D
          )
        }
      }
    }

    // ---- accessibility -------------------------------------------------------
    // The markup ships role="button" with an empty aria-label and no tabindex,
    // so today it is mouse-only. Not a tablist: the panel content lives *inside*
    // each item, so this is an accordion — button + aria-expanded is the honest
    // mapping and needs no aria-controls target.
    progressItems.forEach((item, i) => {
      item.setAttribute('role', 'button')
      item.setAttribute('aria-label', tabs[i].title)
      item.setAttribute('aria-expanded', 'false')
      item.tabIndex = 0
    })

    const NEXT_KEYS = ['ArrowDown', 'ArrowRight']
    const PREV_KEYS = ['ArrowUp', 'ArrowLeft']

    progressItems.forEach((item, i) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.button-w')) return // let the CTA through
        switchTab(i)
      })

      item.addEventListener('keydown', (e) => {
        let next = null
        if (NEXT_KEYS.includes(e.key)) next = (i + 1) % count
        else if (PREV_KEYS.includes(e.key)) next = (i - 1 + count) % count
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = count - 1
        else if (e.key === 'Enter' || e.key === ' ') next = i
        if (next === null) return
        e.preventDefault()
        switchTab(next)
        progressItems[next].focus()
      })
    })

    // autoplay should not yank the panel away while someone is reading or tabbing
    const hold = () => {
      held = true
      barTween?.pause()
    }
    const release = () => {
      held = false
      if (inView) barTween?.resume()
    }
    wrap.addEventListener('pointerenter', hold)
    wrap.addEventListener('pointerleave', release)
    wrap.addEventListener('focusin', hold)
    wrap.addEventListener('focusout', release)

    switchTab(0, false)

    // autoplay only while in view
    let started = false
    ScrollTrigger.create({
      trigger: wrap,
      start: 'top 50%',
      end: 'bottom top',
      onToggle: (self) => {
        inView = self.isActive
        if (self.isActive) {
          if (!started) {
            started = true
            // measured now, not at init — a webfont reflow can't leave it stale
            const tab = tabs[activeIndex]
            const target = barTarget(tab)
            if (tab.line && !tab.horizontal) gsap.set(tab.line, { height: target })
            startProgressBar(activeIndex, target)
          } else if (!held) {
            barTween?.resume()
            currentTl?.resume()
          }
        } else if (started) {
          barTween?.pause()
          currentTl?.pause()
        }
      },
    })
  })
}

// Blocks that rise in as they enter view. Text handled by [data-split] in
// global.js is deliberately not in here — it would animate twice.
const REVEAL_SELECTOR = [
  '.beanie-feature_visual',
  '.beanie-feature_content',
  '.beanie-feature_center',
  '.beanie-feature_wide',
  '.beanie-cmp_head',
  '.beanie-cmp_row',
  '.beanie-cmp_actions',
  '.beanie-plat_head',
  '.beanie-plat_card',
  '.beanie-steps_head',
  '.beanie-steps_item',
  '.beanie-proof_container',
  '.beanie-proof_logos',
  '.beanie-sec_col',
  '.beanie-sec_visual',
].join(', ')

function initReveals() {
  // Check the plugin BEFORE hiding anything: if ScrollTrigger were missing we
  // would hide half the page and never reveal it.
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
        // the steps header is position:sticky — leave no transform behind or it
        // sticks at the wrong offset
        clearProps: 'transform',
      }),
  })
}

const TYPE_SPEED = 0.022 // seconds per character

// Types the element's own text back into it and returns how long that takes.
// Source of truth stays in Webflow — nothing is hardcoded here, so the FR
// translation types out just as well.
function addTypeOut(tl, el, position) {
  const full = el.textContent
  if (!full.trim()) return 0
  const state = { i: 0, last: -1 }
  const duration = full.length * TYPE_SPEED
  el.textContent = ''
  tl.to(
    state,
    {
      i: full.length,
      duration,
      ease: 'none',
      onUpdate: () => {
        const n = Math.round(state.i)
        if (n === state.last) return // only touch the DOM when a character lands
        state.last = n
        el.textContent = full.slice(0, n)
      },
      onComplete: () => {
        el.textContent = full
      },
    },
    position
  )
  return duration
}

function initHeroIntro() {
  const prompt = document.querySelector('.beanie-prompt')
  const question = document.querySelector('.beanie-prompt_q')
  const caret = document.querySelector('.beanie-prompt_caret')
  const answer = document.querySelector('.beanie-answer')
  const clippy = document.querySelector('.beanie-clippy')
  if (!prompt && !answer && !clippy) return
  if (reduceMotion) return

  // `from` tweens throughout, so the hero stays visible if this never runs
  const tl = gsap.timeline({ delay: 0.25 })

  if (prompt) tl.from(prompt, { autoAlpha: 0, y: 28, duration: 0.9, ease: 'power3.out' }, 0)

  // the question types itself while the bar is still settling
  const TYPE_START = 0.45
  const typed = question ? addTypeOut(tl, question, TYPE_START) : 0
  const typeEnd = typed ? TYPE_START + typed : 0.9

  // caret is solid while typing, then blinks like a real input. The blink is
  // started from a callback rather than added to the timeline — an infinite
  // repeat inside a timeline makes its duration infinite and every later
  // position parameter resolves past the end.
  if (caret) {
    tl.set(caret, { autoAlpha: 1 }, 0)
    tl.call(
      () => {
        gsap.to(caret, {
          autoAlpha: 0,
          duration: 0.5,
          ease: 'steps(1)',
          repeat: -1,
          yoyo: true,
        })
      },
      null,
      typeEnd
    )
  }

  // the answer lands once the question is finished, not alongside it
  if (answer)
    tl.from(answer, { autoAlpha: 0, y: 28, duration: 0.8, ease: 'power3.out' }, typeEnd + 0.25)

  // and the assistant last, like it noticed you
  if (clippy)
    tl.from(
      clippy,
      {
        autoAlpha: 0,
        y: 16,
        scale: 0.96,
        transformOrigin: 'bottom right',
        duration: 0.7,
        ease: 'back.out(1.6)',
      },
      typeEnd + 0.7
    )
}

export function initBeanie() {
  initHeroIntro()
  initTabs()
  initReveals()
}
