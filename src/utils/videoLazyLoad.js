export function initSliderVideoLazyLoad() {
  const videos = document.querySelectorAll('.cascading-slider__video')
  if (!videos.length) return

  videos.forEach((video) => {
    if (video.dataset.videoInit) return
    video.dataset.videoInit = '1'

    const src = video.getAttribute('data-video-src') || ''
    if (!src) return

    const section = video.closest('.section_video-slider') || video.closest('.cascading-slider')

    // Animated WebP can't play in <video> — swap to <img>
    if (/\.webp(\?|$)/i.test(src)) {
      const img = document.createElement('img')
      img.src = src
      img.className = video.className
      img.alt = ''
      img.style.cssText = video.style.cssText || ''
      img.style.opacity = '0'
      img.style.transition = 'opacity 0.3s ease'
      video.parentNode.replaceChild(img, video)

      if (!section) { img.style.opacity = '1'; return }

      ScrollTrigger.create({
        trigger: section,
        start: '0% 100%',
        end: '100% 0%',
        onEnter: () => { img.style.opacity = '1' },
        onEnterBack: () => { img.style.opacity = '1' },
        onLeave: () => { img.style.opacity = '0' },
        onLeaveBack: () => { img.style.opacity = '0' },
      })
      return
    }

    video.style.opacity = '0'
    video.style.transition = 'opacity 0.3s ease'

    if (!section) return

    let loaded = false

    function loadAndPlay() {
      if (loaded) {
        video.play().catch(() => {})
        return
      }
      loaded = true
      video.src = src

      const fadeIn = () => {
        video.style.opacity = '1'
      }

      if (video.readyState >= 3) {
        video.play().catch(() => {})
        fadeIn()
      } else {
        video.addEventListener(
          'canplay',
          () => {
            video.play().catch(() => {})
            fadeIn()
          },
          { once: true }
        )
      }
    }

    ScrollTrigger.create({
      trigger: section,
      start: '0% 100%',
      end: '100% 0%',
      onEnter: loadAndPlay,
      onEnterBack: () => {
        video.play().catch(() => {})
        video.style.opacity = '1'
      },
      onLeave: () => {
        video.style.opacity = '0'
        video.pause()
      },
      onLeaveBack: () => {
        video.style.opacity = '0'
        video.pause()
      },
    })
  })
}
