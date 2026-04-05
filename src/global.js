import { splitReveal } from './utils/splitReveal.js'
import { initSliderVideoLazyLoad } from './utils/videoLazyLoad.js'
import { initBunnyLightboxPlayer } from './utils/bunnyLightboxPlayer.js'

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

        const svgToUse = isMobile && mobileSVG ? mobileSVG : desktopSVG

        const paths = svgToUse.querySelectorAll('path')
        if (!paths.length) return

        const isHero = wrap.closest('[class*="hero"]') !== null
        const isHomeHero = wrap.closest('[data-hero="home"]') !== null

        const tlConfig = {
          defaults: {
            ease: 'power3.out',
          },
        }

        if (isHomeHero) {
          tlConfig.scrollTrigger = {
            trigger: wrap,
            start: 'top 40%',
            end: 'bottom 30%',
            scrub: true,
          }
        } else if (!isHero) {
          tlConfig.scrollTrigger = {
            trigger: wrap,
            start: 'clamp(top 90%)',
            invalidateOnRefresh: true,
          }
        }

        const tl = gsap.timeline(tlConfig)

        tl.fromTo(
          paths,
          { drawSVG: 0 },
          { drawSVG: '100%', duration: 2.4, stagger: paths.length > 1 ? 0.3 : 0 }
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

gsap.registerPlugin(DrawSVGPlugin)

function initDrawRandomUnderline() {
  const svgVariants = [
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 20.9999C26.7762 16.2245 49.5532 11.5572 71.7979 14.6666C84.9553 16.5057 97.0392 21.8432 109.987 24.3888C116.413 25.6523 123.012 25.5143 129.042 22.6388C135.981 19.3303 142.586 15.1422 150.092 13.3333C156.799 11.7168 161.702 14.6225 167.887 16.8333C181.562 21.7212 194.975 22.6234 209.252 21.3888C224.678 20.0548 239.912 17.991 255.42 18.3055C272.027 18.6422 288.409 18.867 305 17.9999" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 24.2592C26.233 20.2879 47.7083 16.9968 69.135 13.8421C98.0469 9.5853 128.407 4.02322 158.059 5.14674C172.583 5.69708 187.686 8.66104 201.598 11.9696C207.232 13.3093 215.437 14.9471 220.137 18.3619C224.401 21.4596 220.737 25.6575 217.184 27.6168C208.309 32.5097 197.199 34.281 186.698 34.8486C183.159 35.0399 147.197 36.2657 155.105 26.5837C158.11 22.9053 162.993 20.6229 167.764 18.7924C178.386 14.7164 190.115 12.1115 201.624 10.3984C218.367 7.90626 235.528 7.06127 252.521 7.49276C258.455 7.64343 264.389 7.92791 270.295 8.41825C280.321 9.25056 296 10.8932 305 13.0242" stroke="#E55050" stroke-width="10" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 29.5014C9.61174 24.4515 12.9521 17.9873 20.9532 17.5292C23.7742 17.3676 27.0987 17.7897 29.6575 19.0014C33.2644 20.7093 35.6481 24.0004 39.4178 25.5014C48.3911 29.0744 55.7503 25.7731 63.3048 21.0292C67.9902 18.0869 73.7668 16.1366 79.3721 17.8903C85.1682 19.7036 88.2173 26.2464 94.4121 27.2514C102.584 28.5771 107.023 25.5064 113.276 20.6125C119.927 15.4067 128.83 12.3333 137.249 15.0014C141.418 16.3225 143.116 18.7528 146.581 21.0014C149.621 22.9736 152.78 23.6197 156.284 24.2514C165.142 25.8479 172.315 17.5185 179.144 13.5014C184.459 10.3746 191.785 8.74853 195.868 14.5292C199.252 19.3205 205.597 22.9057 211.621 22.5014C215.553 22.2374 220.183 17.8356 222.979 15.5569C225.4 13.5845 227.457 11.1105 230.742 10.5292C232.718 10.1794 234.784 12.9691 236.164 14.0014C238.543 15.7801 240.717 18.4775 243.356 19.8903C249.488 23.1729 255.706 21.2551 261.079 18.0014C266.571 14.6754 270.439 11.5202 277.146 13.6125C280.725 14.7289 283.221 17.209 286.393 19.0014C292.321 22.3517 298.255 22.5014 305 22.5014" stroke="#E55050" stroke-width="10" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.0039 32.6826C32.2307 32.8412 47.4552 32.8277 62.676 32.8118C67.3044 32.807 96.546 33.0555 104.728 32.0775C113.615 31.0152 104.516 28.3028 102.022 27.2826C89.9573 22.3465 77.3751 19.0254 65.0451 15.0552C57.8987 12.7542 37.2813 8.49399 44.2314 6.10216C50.9667 3.78422 64.2873 5.81914 70.4249 5.96641C105.866 6.81677 141.306 7.58809 176.75 8.59886C217.874 9.77162 258.906 11.0553 300 14.4892" stroke="#E55050" stroke-width="10" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.99805 20.9998C65.6267 17.4649 126.268 13.845 187.208 12.8887C226.483 12.2723 265.751 13.2796 304.998 13.9998" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>`,
    `<svg width="310" height="40" viewBox="0 0 310 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 29.8857C52.3147 26.9322 99.4329 21.6611 146.503 17.1765C151.753 16.6763 157.115 15.9505 162.415 15.6551C163.28 15.6069 165.074 15.4123 164.383 16.4275C161.704 20.3627 157.134 23.7551 153.95 27.4983C153.209 28.3702 148.194 33.4751 150.669 34.6605C153.638 36.0819 163.621 32.6063 165.039 32.2029C178.55 28.3608 191.49 23.5968 204.869 19.5404C231.903 11.3436 259.347 5.83254 288.793 5.12258C294.094 4.99476 299.722 4.82265 305 5.45025" stroke="#E55050" stroke-width="10" stroke-linecap="round"/></svg>`,
  ]

  // Add attributes to <svg> elements
  function decorateSVG(svgEl) {
    svgEl.setAttribute('preserveAspectRatio', 'none')
    svgEl.querySelectorAll('path').forEach((path) => {
      path.setAttribute('stroke', 'currentColor')
    })
  }

  let nextIndex = null

  document.querySelectorAll('[data-draw-line]').forEach((container) => {
    const box = container.querySelector('[data-draw-line-box]')
    if (!box) return

    let enterTween = null
    let leaveTween = null

    container.addEventListener('mouseenter', () => {
      // Don't restart if still playing
      if (enterTween && enterTween.isActive()) return
      if (leaveTween && leaveTween.isActive()) leaveTween.kill()

      // Random Start
      if (nextIndex === null) {
        nextIndex = Math.floor(Math.random() * svgVariants.length)
      }

      // Animate Draw
      box.innerHTML = svgVariants[nextIndex]
      const svg = box.querySelector('svg')
      if (svg) {
        decorateSVG(svg)
        const path = svg.querySelector('path')
        if (path) {
          gsap.set(path, { drawSVG: '0%' })
          enterTween = gsap.to(path, {
            duration: 0.5,
            drawSVG: '100%',
            ease: 'power2.inOut',
            onComplete: () => {
              enterTween = null
            },
          })
        }
      }

      // Advance for next hover across all items
      nextIndex = (nextIndex + 1) % svgVariants.length
    })

    container.addEventListener('mouseleave', () => {
      const path = box.querySelector('path')
      if (!path) return

      const playOut = () => {
        // Don't restart if still drawing out
        if (leaveTween && leaveTween.isActive()) return
        leaveTween = gsap.to(path, {
          duration: 0.5,
          drawSVG: '100% 100%',
          ease: 'power2.inOut',
          onComplete: () => {
            leaveTween = null
            box.innerHTML = '' // remove SVG when done
          },
        })
      }

      if (enterTween && enterTween.isActive()) {
        // Wait until draw-in finishes
        enterTween.eventCallback('onComplete', playOut)
      } else {
        playOut()
      }
    })
  })
}

function initCascadingSlider() {
  const duration = 0.65
  const ease = 'power3.inOut'

  const breakpoints = [
    { maxWidth: 479, activeWidth: 0.78, siblingWidth: 0.08, maxVisible: 1 },
    { maxWidth: 767, activeWidth: 0.7, siblingWidth: 0.1, maxVisible: 1 },
    { maxWidth: 991, activeWidth: 0.6, siblingWidth: 0.1 },
    { maxWidth: Infinity, activeWidth: 0.6, siblingWidth: 0.13 },
  ]

  const wrappers = document.querySelectorAll('[data-cascading-slider-wrap]')
  wrappers.forEach(setupInstance)

  let resizeTimer
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(function () {
      wrappers.forEach(setupInstance)
    }, 150)
  })

  window.addEventListener('load', function () {
    wrappers.forEach(setupInstance)
  })

  function setupInstance(wrapper) {
    if (wrapper._csController) wrapper._csController.abort()
    const controller = new AbortController()
    const { signal } = controller
    wrapper._csController = controller

    const viewport = wrapper.querySelector('[data-cascading-viewport]')
    if (!viewport) return
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
          clone.querySelectorAll('[data-video-init]').forEach(function (el) {
            delete el.dataset.videoInit
          })
          viewport.appendChild(clone)
          slides.push(clone)
        })
      }
      totalSlides = slides.length
    }

    let activeIndex = 0
    let isAnimating = false
    let slideWidth = 0
    let maxVisible = 2
    const slotCenters = {}
    const slotWidths = {}

    function readGap() {
      const slideParent = slides[0] ? slides[0].parentElement : viewport
      const raw = getComputedStyle(slideParent).getPropertyValue('--gap').trim()
        || getComputedStyle(viewport).getPropertyValue('--gap').trim()
      if (!raw) return 0
      const temp = document.createElement('div')
      temp.style.width = raw
      temp.style.position = 'absolute'
      temp.style.visibility = 'hidden'
      slideParent.appendChild(temp)
      const px = temp.offsetWidth
      slideParent.removeChild(temp)
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
      maxVisible = settings.maxVisible ?? 2
      const slideParent = slides[0] ? slides[0].parentElement : viewport
      const viewportWidth = slideParent.offsetWidth
      const gap = readGap()

      const activeSlideWidth = viewportWidth * settings.activeWidth
      const siblingSlideWidth = viewportWidth * settings.siblingWidth
      const farSlideWidth = maxVisible >= 2
        ? Math.max(0, (viewportWidth - activeSlideWidth - 2 * siblingSlideWidth - 4 * gap) / 2)
        : 0

      slideWidth = activeSlideWidth

      const visibleSlots = maxVisible >= 2
        ? [
            { slot: -2, width: farSlideWidth },
            { slot: -1, width: siblingSlideWidth },
            { slot: 0, width: activeSlideWidth },
            { slot: 1, width: siblingSlideWidth },
            { slot: 2, width: farSlideWidth },
          ]
        : [
            { slot: -1, width: siblingSlideWidth },
            { slot: 0, width: activeSlideWidth },
            { slot: 1, width: siblingSlideWidth },
          ]

      const totalVisible = visibleSlots.reduce(function (sum, def, i) {
        return sum + def.width + (i < visibleSlots.length - 1 ? gap : 0)
      }, 0)
      const startOffset = (viewportWidth - totalVisible) / 2

      let x = startOffset
      visibleSlots.forEach(function (def, i) {
        slotCenters[String(def.slot)] = x + def.width / 2
        slotWidths[String(def.slot)] = def.width
        if (i < visibleSlots.length - 1) x += def.width + gap
      })

      const outerSlot = maxVisible + 1

      if (maxVisible >= 2) {
        slotCenters['-3'] = slotCenters['-2'] - farSlideWidth / 2 - gap - farSlideWidth / 2
        slotWidths['-3'] = farSlideWidth
        slotCenters['3'] = slotCenters['2'] + farSlideWidth / 2 + gap + farSlideWidth / 2
        slotWidths['3'] = farSlideWidth
      } else {
        // 3-slot mode: park fully off-screen so they don't peek in
        slotCenters[String(-outerSlot)] = -slideWidth / 2
        slotWidths[String(-outerSlot)] = slideWidth
        slotCenters[String(outerSlot)] = viewportWidth + slideWidth / 2
        slotWidths[String(outerSlot)] = slideWidth
      }

      slides.forEach(function (slide) {
        slide.style.width = slideWidth + 'px'
      })
    }

    function getSlideProps(offset) {
      const park = maxVisible + 1
      const clamped = Math.max(-park, Math.min(park, offset))
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

        const park = maxVisible + 1
        if (offset < -park || offset > park) {
          if (animate && previousIndex !== undefined) {
            const previousOffset = getOffset(index, previousIndex)
            if (previousOffset >= -maxVisible && previousOffset <= maxVisible) {
              const exitSlot = previousOffset < 0 ? -park : park
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

          const parkSlot = offset < 0 ? -park : park
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
        const park = maxVisible + 1
        const wasInRange = currentOffset >= -park && currentOffset <= park
        const willBeVisible = nextOffset >= -maxVisible && nextOffset <= maxVisible

        if (!wasInRange && willBeVisible) {
          const entrySlot = travelDirection > 0 ? park : -park
          gsap.set(slide, getSlideProps(entrySlot))
        }

        const wasInvisible = Math.abs(currentOffset) >= park
        const willBeStaging = Math.abs(nextOffset) === park
        const crossesSides = currentOffset * nextOffset < 0
        if (wasInvisible && willBeStaging && crossesSides) {
          gsap.set(slide, getSlideProps(nextOffset > 0 ? park : -park))
        }
      })

      activeIndex = normalizedTarget
      layout(true, previousIndex)
      gsap.delayedCall(duration + 0.05, function () {
        isAnimating = false
      })
    }

    if (prevButton)
      prevButton.addEventListener('click', function () { goTo(activeIndex - 1) }, { signal })
    if (nextButton)
      nextButton.addEventListener('click', function () { goTo(activeIndex + 1) }, { signal })

    slides.forEach(function (slide, index) {
      slide.addEventListener('click', function () {
        if (index !== activeIndex) goTo(index)
      }, { signal })
    })

    document.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') goTo(activeIndex - 1)
      if (event.key === 'ArrowRight') goTo(activeIndex + 1)
    }, { signal })

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
  initSliderVideoLazyLoad()
  initCascadingSlider()
  initSliderVideoLazyLoad()
  initBunnyLightboxPlayer()

  //initDrawRandomUnderline()
}
