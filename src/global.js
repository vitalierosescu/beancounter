import { splitReveal } from './utils/splitReveal.js'

function initTextAnimations() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    const isHero = el.closest('[data-hero]')

    splitReveal(
      el,
      isHero
        ? {}
        : {
            scrollTrigger: {
              trigger: el,
              start: 'clamp(top 90%)',
              once: true,
            },
          }
    )
  })
}

function initScrollBehavior() {
  const nav = document.querySelector('.nav_wrap')
  if (!nav) return

  const offsetY = 60
  const scrollThreshold = offsetY + 500
  let oldScroll = 0

  function update() {
    const scrollY = window.scrollY

    // Add/remove is-active based on scroll position
    nav.classList.toggle('is--scrolled', scrollY > offsetY)

    // Add/remove is-scrolled for hide-on-scroll behavior
    const shouldHide =
      scrollY > scrollThreshold && scrollY > oldScroll && nav.classList.contains('is--scrolled')
    nav.classList.toggle('is--scrolled-full', shouldHide)

    oldScroll = scrollY
  }

  // Initial check
  update()

  // Listen for scroll
  window.addEventListener('scroll', update, { passive: true })
}

function initDrawPathOnScroll() {
  const mm = gsap.matchMedia()
  const wrappers = document.querySelectorAll('[data-draw-scroll-wrap]')

  mm.add(
    {
      isDesktop: '(min-width: 768px)',
      isMobile: '(max-width: 767px)',
    },
    (context) => {
      const { isDesktop, isMobile } = context.conditions

      wrappers.forEach((wrap) => {
        // Kill any previous timeline for this wrapper
        if (wrap._drawTl) {
          if (wrap._drawTl.scrollTrigger) {
            wrap._drawTl.scrollTrigger.kill()
          }
          wrap._drawTl.kill()
          wrap._drawTl = null
        }

        const children = wrap.children
        if (!children.length) return

        const desktopSVG = children[0]
        const mobileSVG = children[1] // optional

        let svgToUse = isMobile && mobileSVG ? mobileSVG : desktopSVG

        const paths = svgToUse.querySelectorAll('path')
        if (!paths.length) return

        const isHero = wrap.closest('[class*="hero"]') !== null

        const tlConfig = {
          defaults: {
            ease: 'power3.inOut',
          },
        }

        if (!isHero) {
          tlConfig.scrollTrigger = {
            trigger: wrap,
            start: 'clamp(top center)',
            end: 'clamp(bottom center)',
            invalidateOnRefresh: true,
          }
        }

        const tl = gsap.timeline(tlConfig)

        tl.fromTo(
          paths,
          { drawSVG: 0 },
          { drawSVG: '100%', duration: 1.6, stagger: paths.length > 1 ? 0.3 : 0 }
        )

        // Keep a reference so we can kill it on breakpoint change
        wrap._drawTl = tl
      })

      // Make sure ScrollTrigger recalculates
      ScrollTrigger.refresh()

      // Cleanup when breakpoint changes
      return () => {
        wrappers.forEach((wrap) => {
          if (wrap._drawTl) {
            if (wrap._drawTl.scrollTrigger) {
              wrap._drawTl.scrollTrigger.kill()
            }
            wrap._drawTl.kill()
            wrap._drawTl = null
          }
        })
      }
    }
  )
}

function initTabSystem() {
  const wrappers = document.querySelectorAll('[data-tabs="wrapper"]')

  wrappers.forEach((wrapper) => {
    const contentItems = wrapper.querySelectorAll('[data-tabs="content-item"]')
    const visualItems = wrapper.querySelectorAll('[data-tabs="visual-item"]')

    const autoplay = wrapper.dataset.tabsAutoplay === 'true'
    const autoplayDuration = parseInt(wrapper.dataset.tabsAutoplayDuration) || 5000

    let activeContent = null // keep track of active item/link
    let activeVisual = null
    let isAnimating = false
    let progressBarTween = null // to stop/start the progress bar

    function startProgressBar(index) {
      if (progressBarTween) progressBarTween.kill()
      const bar = contentItems[index].querySelector('[data-tabs="item-progress"]')
      if (!bar) return

      // In this function, you can basically do anything you want, that should happen as a tab is active
      // Maybe you have a circle filling, some other element growing, you name it.
      gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' })
      progressBarTween = gsap.to(bar, {
        scaleX: 1,
        duration: autoplayDuration / 1000,
        ease: 'power1.inOut',
        onComplete: () => {
          if (!isAnimating) {
            const nextIndex = (index + 1) % contentItems.length
            switchTab(nextIndex) // once bar is full, set next to active – this is important
          }
        },
      })
    }

    function switchTab(index) {
      if (isAnimating || contentItems[index] === activeContent) return

      isAnimating = true
      if (progressBarTween) progressBarTween.kill() // Stop any running progress bar here

      const outgoingContent = activeContent
      const outgoingVisual = activeVisual
      const outgoingBar = outgoingContent?.querySelector('[data-tabs="item-progress"]')

      const incomingContent = contentItems[index]
      const incomingVisual = visualItems[index]
      const incomingBar = incomingContent.querySelector('[data-tabs="item-progress"]')

      outgoingContent?.classList.remove('active')
      outgoingVisual?.classList.remove('active')
      incomingContent.classList.add('active')
      incomingVisual.classList.add('active')

      const tl = gsap.timeline({
        defaults: { duration: 0.65, ease: 'power3' },
        onComplete: () => {
          activeContent = incomingContent
          activeVisual = incomingVisual
          isAnimating = false
          if (autoplay) startProgressBar(index) // Start autoplay bar here
        },
      })

      // Wrap 'outgoing' in a check to prevent warnings on first run of the function
      // Of course, during first run (on page load), there's no 'outgoing' tab yet!
      if (outgoingContent) {
        outgoingContent.classList.remove('active')
        outgoingVisual?.classList.remove('active')
        tl.set(outgoingBar, { transformOrigin: 'right center' })
          .to(outgoingBar, { scaleX: 0, duration: 0.3 }, 0)
          .to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
          .to(outgoingContent.querySelector('[data-tabs="item-details"]'), { height: 0 }, 0)
      }

      incomingContent.classList.add('active')
      incomingVisual.classList.add('active')
      tl.fromTo(incomingVisual, { autoAlpha: 0, xPercent: 3 }, { autoAlpha: 1, xPercent: 0 }, 0.3)
        .fromTo(
          incomingContent.querySelector('[data-tabs="item-details"]'),
          { height: 0 },
          { height: 'auto' },
          0
        )
        .set(incomingBar, { scaleX: 0, transformOrigin: 'left center' }, 0)
    }

    // on page load, set first to active
    // idea: you could wrap this in a scrollTrigger
    // so it will only start once a user reaches this section
    switchTab(0)

    // switch tabs on click
    contentItems.forEach((item, i) =>
      item.addEventListener('click', () => {
        if (item === activeContent) return // ignore click if current one is already active
        switchTab(i)
      })
    )
  })
}

const initFaq = () => {
  document.querySelectorAll('.accordion_wrap').forEach((component, listIndex) => {
    if (component.dataset.scriptInitialized) return
    component.dataset.scriptInitialized = 'true'

    const closePrevious = component.getAttribute('data-close-previous') !== 'false'
    const closeOnSecondClick = component.getAttribute('data-close-on-second-click') !== 'false'
    const openOnHover = component.getAttribute('data-open-on-hover') === 'true'
    const openByDefault =
      component.getAttribute('data-open-by-default') !== null &&
      !isNaN(+component.getAttribute('data-open-by-default'))
        ? +component.getAttribute('data-open-by-default')
        : false
    const list = component.querySelector('.accordion_list')
    let previousIndex = null,
      closeFunctions = []

    function removeCMSList(slot) {
      const dynList = Array.from(slot.children).find((child) =>
        child.classList.contains('w-dyn-list')
      )
      if (!dynList) return
      const nestedItems = dynList?.firstElementChild?.children
      if (!nestedItems) return
      const staticWrapper = [...slot.children]
      ;[...nestedItems].forEach(
        (el) => el.firstElementChild && slot.appendChild(el.firstElementChild)
      )
      staticWrapper.forEach((el) => el.remove())
    }
    removeCMSList(list)

    component.querySelectorAll('.accordion_component').forEach((card, cardIndex) => {
      const button = card.querySelector('.accordion_toggle_button')
      const content = card.querySelector('.accordion_content_wrap')
      const icon = card.querySelector('.accordion_toggle_icon')
      const iconSvg = card.querySelector('.accordion_toggle_svg')

      if (!button || !content || !icon) return console.warn('Missing elements:', card)

      button.setAttribute('aria-expanded', 'false')
      button.setAttribute('id', 'accordion_button_' + listIndex + '_' + cardIndex)
      content.setAttribute('id', 'accordion_content_' + listIndex + '_' + cardIndex)
      button.setAttribute('aria-controls', content.id)
      content.setAttribute('aria-labelledby', button.id)
      content.style.display = 'none'

      const refresh = () => {
        tl.invalidate()
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh()
      }
      const tl = gsap.timeline({
        paused: true,
        defaults: { duration: 0.3, ease: 'power1.inOut' },
        onComplete: refresh,
        onReverseComplete: refresh,
      })
      tl.set(content, { display: 'block' })
      tl.fromTo(content, { height: 0 }, { height: 'auto' })
      tl.fromTo(iconSvg, { rotate: 0 }, { rotate: -180 }, '<')

      const closeAccordion = () =>
        card.classList.contains('is-opened') &&
        (card.classList.remove('is-opened'),
        tl.reverse(),
        button.setAttribute('aria-expanded', 'false'))
      closeFunctions[cardIndex] = closeAccordion

      const openAccordion = (instant = false) => {
        if (closePrevious && previousIndex !== null && previousIndex !== cardIndex)
          closeFunctions[previousIndex]?.()
        previousIndex = cardIndex
        button.setAttribute('aria-expanded', 'true')
        card.classList.add('is-opened')
        instant ? tl.progress(1) : tl.play()
      }
      if (openByDefault === cardIndex + 1) openAccordion(true)

      button.addEventListener('click', () =>
        card.classList.contains('is-opened') && closeOnSecondClick
          ? (closeAccordion(), (previousIndex = null))
          : openAccordion()
      )
      if (openOnHover) button.addEventListener('mouseenter', () => openAccordion())
    })
  })
}

function initCascadingSlider() {
  const duration = 0.65
  const ease = 'power3.inOut'

  const breakpoints = [
    { maxWidth: 479, activeWidth: 0.78, siblingWidth: 0.08 },
    { maxWidth: 767, activeWidth: 0.7, siblingWidth: 0.1 },
    { maxWidth: 991, activeWidth: 0.6, siblingWidth: 0.1 },
    { maxWidth: Infinity, activeWidth: 0.6, siblingWidth: 0.13 },
  ]

  const wrappers = document.querySelectorAll('[data-cascading-slider-wrap]')
  wrappers.forEach(setupInstance)

  function setupInstance(wrapper) {
    const viewport = wrapper.querySelector('[data-cascading-viewport]')
    const prevButton = wrapper.querySelector('[data-cascading-slider-prev]')
    const nextButton = wrapper.querySelector('[data-cascading-slider-next]')
    const slides = Array.from(viewport.querySelectorAll('[data-cascading-slide]'))
    let totalSlides = slides.length

    if (totalSlides === 0) return

    if (totalSlides < 9) {
      const originalSlides = slides.slice()
      while (slides.length < 9) {
        originalSlides.forEach(function (original) {
          const clone = original.cloneNode(true)
          clone.setAttribute('data-clone', '')
          viewport.appendChild(clone)
          slides.push(clone)
        })
      }
      totalSlides = slides.length
    }

    let activeIndex = 0
    let isAnimating = false
    let slideWidth = 0
    let slotCenters = {}
    let slotWidths = {}

    function readGap() {
      const raw = getComputedStyle(viewport).getPropertyValue('--gap').trim()
      if (!raw) return 0
      const temp = document.createElement('div')
      temp.style.width = raw
      temp.style.position = 'absolute'
      temp.style.visibility = 'hidden'
      viewport.appendChild(temp)
      const px = temp.offsetWidth
      viewport.removeChild(temp)
      return px
    }

    function getSettings() {
      const windowWidth = window.innerWidth
      for (let i = 0; i < breakpoints.length; i++) {
        if (windowWidth <= breakpoints[i].maxWidth) return breakpoints[i]
      }
      return breakpoints[breakpoints.length - 1]
    }

    function getOffset(slideIndex, fromIndex) {
      if (fromIndex === undefined) fromIndex = activeIndex
      let distance = slideIndex - fromIndex
      const half = totalSlides / 2
      if (distance > half) distance -= totalSlides
      if (distance < -half) distance += totalSlides
      return distance
    }

    function measure() {
      const settings = getSettings()
      const viewportWidth = viewport.offsetWidth
      const gap = readGap()

      const activeSlideWidth = viewportWidth * settings.activeWidth
      const siblingSlideWidth = viewportWidth * settings.siblingWidth
      const farSlideWidth = Math.max(
        0,
        (viewportWidth - activeSlideWidth - 2 * siblingSlideWidth - 4 * gap) / 2
      )

      slideWidth = activeSlideWidth

      const visibleSlots = [
        { slot: -2, width: farSlideWidth },
        { slot: -1, width: siblingSlideWidth },
        { slot: 0, width: activeSlideWidth },
        { slot: 1, width: siblingSlideWidth },
        { slot: 2, width: farSlideWidth },
      ]

      let x = 0
      visibleSlots.forEach(function (def, i) {
        slotCenters[String(def.slot)] = x + def.width / 2
        slotWidths[String(def.slot)] = def.width
        if (i < visibleSlots.length - 1) x += def.width + gap
      })

      slotCenters['-3'] = slotCenters['-2'] - farSlideWidth / 2 - gap - farSlideWidth / 2
      slotWidths['-3'] = farSlideWidth
      slotCenters['3'] = slotCenters['2'] + farSlideWidth / 2 + gap + farSlideWidth / 2
      slotWidths['3'] = farSlideWidth

      slides.forEach(function (slide) {
        slide.style.width = slideWidth + 'px'
      })
    }

    function getSlideProps(offset) {
      const clamped = Math.max(-3, Math.min(3, offset))
      const slotWidth = slotWidths[String(clamped)]
      const clipAmount = Math.max(0, (slideWidth - slotWidth) / 2)
      const translateX = slotCenters[String(clamped)] - slideWidth / 2

      return {
        x: translateX,
        '--clip': clipAmount,
        zIndex: 10 - Math.abs(clamped),
      }
    }

    function layout(animate, previousIndex) {
      slides.forEach(function (slide, index) {
        const offset = getOffset(index)

        if (offset < -3 || offset > 3) {
          if (animate && previousIndex !== undefined) {
            const previousOffset = getOffset(index, previousIndex)
            if (previousOffset >= -2 && previousOffset <= 2) {
              const exitSlot = previousOffset < 0 ? -3 : 3
              gsap.to(
                slide,
                Object.assign({}, getSlideProps(exitSlot), {
                  duration: duration,
                  ease: ease,
                  overwrite: true,
                })
              )
              return
            }
          }

          const parkSlot = offset < 0 ? -3 : 3
          gsap.set(slide, getSlideProps(parkSlot))
          return
        }

        const props = getSlideProps(offset)
        slide.setAttribute('data-status', offset === 0 ? 'active' : 'inactive')

        if (animate) {
          gsap.to(
            slide,
            Object.assign({}, props, {
              duration: duration,
              ease: ease,
              overwrite: true,
            })
          )
        } else {
          gsap.set(slide, props)
        }
      })
    }

    function goTo(targetIndex) {
      const normalizedTarget = ((targetIndex % totalSlides) + totalSlides) % totalSlides
      if (isAnimating || normalizedTarget === activeIndex) return
      isAnimating = true

      const previousIndex = activeIndex
      const travelDirection = getOffset(normalizedTarget, previousIndex) > 0 ? 1 : -1

      slides.forEach(function (slide, index) {
        const currentOffset = getOffset(index, previousIndex)
        const nextOffset = getOffset(index, normalizedTarget)
        const wasInRange = currentOffset >= -3 && currentOffset <= 3
        const willBeVisible = nextOffset >= -2 && nextOffset <= 2

        if (!wasInRange && willBeVisible) {
          const entrySlot = travelDirection > 0 ? 3 : -3
          gsap.set(slide, getSlideProps(entrySlot))
        }

        const wasInvisible = Math.abs(currentOffset) >= 3
        const willBeStaging = Math.abs(nextOffset) === 3
        const crossesSides = currentOffset * nextOffset < 0
        if (wasInvisible && willBeStaging && crossesSides) {
          gsap.set(slide, getSlideProps(nextOffset > 0 ? 3 : -3))
        }
      })

      activeIndex = normalizedTarget
      layout(true, previousIndex)
      gsap.delayedCall(duration + 0.05, function () {
        isAnimating = false
      })
    }

    if (prevButton)
      prevButton.addEventListener('click', function () {
        goTo(activeIndex - 1)
      })
    if (nextButton)
      nextButton.addEventListener('click', function () {
        goTo(activeIndex + 1)
      })

    slides.forEach(function (slide, index) {
      slide.addEventListener('click', function () {
        if (index !== activeIndex) goTo(index)
      })
    })

    document.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') goTo(activeIndex - 1)
      if (event.key === 'ArrowRight') goTo(activeIndex + 1)
    })

    let resizeTimer
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(function () {
        measure()
        layout(false)
      }, 100)
    })

    measure()
    layout(false)
  }
}

export function initGlobal() {
  initTextAnimations()
  initScrollBehavior()
  initDrawPathOnScroll()
  initTabSystem()
  initFaq()
  initCascadingSlider()
}
