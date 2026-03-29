function initHero3DAnimation() {
  const section = document.querySelector('.section_hero')
  if (!section) return

  const introWrapper = document.querySelector('._3d-intro-wrapper')
  const stageInner = document.querySelector('._3d-stage-inner')
  const stageWrapper = document.querySelector('._3d-stage-wrapper')
  const widget1 = document.querySelector('._3d_widget.is-1')
  const widget2 = document.querySelector('._3d_widget.is-2')

  // Set initial states at scroll position 0
  gsap.set(stageInner, { scale: 1.4, rotateX: 55 })
  gsap.set(stageWrapper, { y: '-20vh' })
  if (widget1) gsap.set(widget1, { opacity: 0, scale: 0.2 })
  if (widget2) gsap.set(widget2, { opacity: 0, scale: 0.2 })

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  })

  // Extend timeline to 100 units (1 unit = 1% of scroll)
  tl.call(() => {}, [], 100)

  // 20% → 35%: intro fades out, features fade out, stage moves into view
  if (introWrapper) tl.to(introWrapper, { opacity: 0, duration: 15, ease: 'none' }, 0)
  if (stageWrapper) tl.to(stageWrapper, { y: 0, duration: 15, ease: 'none' }, 0)

  // 20% → 70%: stage rotates flat and scales down
  if (stageInner) tl.to(stageInner, { scale: 1, rotateX: 0, duration: 50, ease: 'none' }, 0)

  // 50% → 60%: widget 1 appears
  if (widget1) tl.to(widget1, { opacity: 1, scale: 1, duration: 15, ease: 'none' }, 20)

  // 65% → 70%: widget 2 appears
  if (widget2) tl.to(widget2, { opacity: 1, scale: 1, duration: 22, ease: 'none' }, 25)
}

export function initHome() {
  initHero3DAnimation()
}
