import gsap from 'gsap'
import { BREAKPOINTS } from './utils/breakpoints.js'
import { initHome } from './pages/home.js'
import { initContact } from './pages/contact.js'
import { initPricing } from './pages/pricing.js'
import { initProduct } from './pages/product.js'
import { initBeanTV } from './pages/beanTV.js'
import { initGlobal } from './global.js'
;(() => {
  // =============================================
  // GSAP SETUP
  // =============================================
  // Dev fallback: use npm gsap if CDN isn't present (Webflow preview always provides CDN)
  if (!window.gsap) window.gsap = gsap

  // =============================================
  // CONFIG
  // =============================================
  const CONFIG = {
    breakpoints: BREAKPOINTS,
    selectors: {
      pageWrapper: '.page-wrap',
    },
  }

  // =============================================
  // INIT
  // =============================================
  function init() {
    const page = document.querySelector(CONFIG.selectors.pageWrapper)
    if (!page) return

    if (page.classList.contains('is-home')) initHome()
    if (page.classList.contains('is-contact')) initContact()
    if (page.classList.contains('is-pricing') || page.classList.contains('is-product'))
      initPricing()
    if (page.classList.contains('is-product')) initProduct()
    if (page.classList.contains('is-bean-tv')) initBeanTV()

    initGlobal()
  }

  // =============================================
  // START
  // =============================================
  try {
    init()
  } catch (error) {
    console.error('[Main] Failed to initialize:', error)
  }
})()
