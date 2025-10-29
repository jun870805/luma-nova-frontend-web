// src/utils/setupViewport.ts
export function setupViewportUnit() {
  const set = () => {
    const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }
  set()
  window.visualViewport?.addEventListener('resize', set)
  window.addEventListener('orientationchange', set)
}
