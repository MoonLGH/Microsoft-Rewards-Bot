export interface CorePromoBannerConfig {
    dashboardHost: string
    dashboardPath: string
    imageUrl: string
    imageAlt: string
    sourcePatterns: string[]
}

export const CORE_PROMO_BANNER_IMAGE_URL =
    'https://raw.githubusercontent.com/QuestPilot/Microsoft-Rewards-Bot/main/assets/banner-core.png'

export const CORE_PROMO_BANNER_RUNTIME_CONFIG: CorePromoBannerConfig = {
    dashboardHost: 'rewards.bing.com',
    dashboardPath: '/dashboard',
    imageUrl: CORE_PROMO_BANNER_IMAGE_URL,
    imageAlt: 'QuestPilot Core plugin banner',
    sourcePatterns: ['EdgeSearch_Dashboard', '/membercenter/missions/Animated-Banners/', 'search bar']
}

export function installCorePromoBanner(config: CorePromoBannerConfig): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    if (window.location.hostname !== config.dashboardHost || window.location.pathname !== config.dashboardPath) return

    const matchesPromoTarget = (image: HTMLImageElement): boolean => {
        const haystack = [
            image.currentSrc,
            image.src,
            image.getAttribute('src') ?? '',
            image.getAttribute('srcset') ?? '',
            image.getAttribute('alt') ?? '',
            image.closest('div')?.textContent ?? ''
        ]
            .join(' ')
            .toLowerCase()

        return config.sourcePatterns.some(pattern => haystack.includes(pattern.toLowerCase()))
    }

    const applyBanner = (): void => {
        for (const image of Array.from(document.querySelectorAll<HTMLImageElement>('img'))) {
            if (!matchesPromoTarget(image)) continue
            if (image.src !== config.imageUrl) image.src = config.imageUrl
            if (image.getAttribute('srcset')) image.removeAttribute('srcset')
            image.alt = config.imageAlt
            image.loading = 'eager'
            image.decoding = 'async'
            image.dataset.questpilotCoreBanner = 'true'
            return
        }
    }

    const scheduleApply = (): void => {
        window.requestAnimationFrame(applyBanner)
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleApply, { once: true })
    } else {
        scheduleApply()
    }

    const root = document.documentElement
    if (!root) return

    const observer = new MutationObserver(scheduleApply)
    observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['src', 'srcset', 'alt']
    })
}
