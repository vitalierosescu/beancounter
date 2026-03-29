export function initSliderVideoLazyLoad() {
  const videos = document.querySelectorAll('.cascading-slider__video')
  if (!videos.length) return

  videos.forEach((video) => {
    const src = video.getAttribute('data-video-src') || ''
    if (!src) return

    video.style.opacity = '0'
    video.style.transition = 'opacity 0.3s ease'

    const section = video.closest('.section_video-slider') || video.closest('.cascading-slider')
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
