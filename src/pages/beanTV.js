const MODAL_ID = 'beantv-modal'
const PLYR_TARGET_ID = 'beantv-plyr-target'

const MODAL_STYLES = `
#${MODAL_ID} {
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  inset: 0;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}
#${MODAL_ID}[aria-hidden="false"] {
  opacity: 1;
  pointer-events: auto;
}
.beantv-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
}
.beantv-modal__container {
  position: relative;
  width: 90vw;
  max-width: 960px;
}
.beantv-modal__close {
  position: absolute;
  top: -2.5rem;
  right: 0;
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  opacity: 0.75;
  transition: opacity 0.15s ease;
  z-index: 1;
}
.beantv-modal__close:hover {
  opacity: 1;
}
.beantv-modal__player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
}
#${PLYR_TARGET_ID} {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
`

function injectStyles() {
  if (document.getElementById('beantv-styles')) return
  const style = document.createElement('style')
  style.id = 'beantv-styles'
  style.textContent = MODAL_STYLES
  document.head.appendChild(style)
}

function buildModal() {
  if (document.getElementById(MODAL_ID)) return

  const modal = document.createElement('div')
  modal.id = MODAL_ID
  modal.setAttribute('role', 'dialog')
  modal.setAttribute('aria-modal', 'true')
  modal.setAttribute('aria-hidden', 'true')
  modal.innerHTML = `
    <div class="beantv-modal__backdrop"></div>
    <div class="beantv-modal__container">
      <button class="beantv-modal__close" aria-label="Close video">&#x2715;</button>
      <div class="beantv-modal__player"></div>
    </div>
  `
  document.body.appendChild(modal)
}

function initFeaturedPlayer() {
  const iframe = document.querySelector('.blog_featured-img iframe')
  if (!iframe || !window.Plyr) return

  const player = new window.Plyr(iframe, {
    youtube: { noCookie: true, rel: 0 },
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
  })

  const overlayBtn = document.querySelector('.blog_play-btn')
  const watchBtn = document.querySelector('.blog_featured-item-content .button')

  function startFeatured() {
    if (overlayBtn) overlayBtn.style.display = 'none'
    player.play()
  }

  if (overlayBtn) overlayBtn.addEventListener('click', startFeatured)
  if (watchBtn) watchBtn.addEventListener('click', startFeatured)
}

function initListModal() {
  const Plyr = window.Plyr
  if (!Plyr) return

  const modalEl = document.getElementById(MODAL_ID)
  if (!modalEl) return

  const closeBtn = modalEl.querySelector('.beantv-modal__close')
  const backdrop = modalEl.querySelector('.beantv-modal__backdrop')
  const playerWrap = modalEl.querySelector('.beantv-modal__player')

  let player = null

  function openModal(videoId) {
    if (player) {
      player.destroy()
      player = null
    }

    playerWrap.innerHTML = `
      <div class="plyr__video-embed" id="${PLYR_TARGET_ID}">
        <iframe
          src="https://www.youtube-nocookie.com/embed/${videoId}?iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1"
          allowfullscreen
          allow="autoplay; encrypted-media"
        ></iframe>
      </div>
    `

    player = new Plyr(`#${PLYR_TARGET_ID} iframe`, {
      youtube: { noCookie: true, rel: 0 },
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
    })

    player.on('ready', () => player.play())

    modalEl.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    closeBtn.focus()
  }

  function closeModal() {
    if (player) player.pause()
    modalEl.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }

  closeBtn.addEventListener('click', closeModal)
  backdrop.addEventListener('click', closeModal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEl.getAttribute('aria-hidden') === 'false') closeModal()
  })

  document.querySelectorAll('[data-beantv-video-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const videoId = btn.dataset.beantvVideoId
      if (videoId) openModal(videoId)
    })
  })
}

function whenPlyrReady(cb, attempts = 30) {
  if (window.Plyr) return cb()
  if (attempts <= 0) {
    console.warn('[BeanTV] Plyr not found after 3s — ensure the CDN script is loaded.')
    return
  }
  setTimeout(() => whenPlyrReady(cb, attempts - 1), 100)
}

export function initBeanTV() {
  whenPlyrReady(() => {
    injectStyles()
    buildModal()
    initFeaturedPlayer()
    initListModal()
  })
}
