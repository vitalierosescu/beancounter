function initProductHeroAnimation() {
  const imgParent = document.querySelector('.product-hero_img-parent')
  if (!imgParent) return

  gsap.set(imgParent, { transformPerspective: 800 })
  gsap.from(imgParent, {
    scale: 1.4,
    rotateX: 55,
    duration: 3,
    ease: 'power3.inOut',
  })
}

export function initProduct() {
  initProductHeroAnimation()
}
