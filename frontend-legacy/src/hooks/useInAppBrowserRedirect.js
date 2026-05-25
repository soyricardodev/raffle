import { useEffect, useState } from 'react'

const DEFAULT_CONFIG = {
  redirectDelay: 1500,
  androidPackage: 'com.android.chrome',
  useDefaultAndroidBrowser: false,
}

export const useInAppBrowserRedirect = (config = {}) => {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  useEffect(() => {
    // Check if already redirected to prevent loops
    if (hasRedirected()) {
      removeRedirectParam()
      return
    }

    // Detect in-app browser and redirect if needed
    const isInApp = detectInAppBrowser()
    if (isInApp) {
      const phoneType = detectPhoneType()
      if (phoneType && !hasRedirected()) {
        console.log(`Detected in-app browser on ${phoneType}, redirecting...`)
        scheduleRedirect(phoneType, finalConfig)
      }
    }
  }, [])

  const hasRedirected = () => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('redirected') === 'true'
  }

  const removeRedirectParam = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('redirected')
    window.history.replaceState({}, '', url.toString())
  }

  const detectInAppBrowser = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera

    const inAppPatterns = [
      /Instagram/i,
      /LinkedIn/i,
      /FBAN|FBAV/i,
      /Twitter/i,
      /Snapchat/i,
      /TikTok/i,
      /Line/i,
      /KAKAOTALK/i,
      /WhatsApp/i,
      /Telegram/i,
      /Discord/i,
      /Slack/i,
      /WeChat/i,
      /Pinterest/i,
      /Messenger/i,
      /FB_IAB/i,
      /FB4A/i,
      /FBIOS/i,
      /FBSS/i,
    ]

    return inAppPatterns.some(pattern => pattern.test(userAgent))
  }

  const detectPhoneType = () => {
    const userAgent = navigator.userAgent

    if (/android/i.test(userAgent)) {
      return 'android'
    }

    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'ios'
    }

    return null
  }

  const getCurrentDomainUrl = () => {
    const { protocol, hostname, port } = window.location
    const portPart = port && port !== '80' && port !== '443' ? `:${port}` : ''
    return `${protocol}//${hostname}${portPart}`
  }

  const scheduleRedirect = (phoneType, config) => {
    setIsRedirecting(true)

    // Show redirect message
    showRedirectMessage(phoneType, config.redirectDelay)

    setTimeout(() => {
      performRedirect(phoneType, config)
      setIsRedirecting(false)
    }, config.redirectDelay)
  }

  const performRedirect = (phoneType, config) => {
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('redirected', 'true')

    const baseDomain = getCurrentDomainUrl()
    const targetUrl = baseDomain + currentUrl.pathname + currentUrl.search

    let redirectUrl

    if (phoneType === 'android') {
      if (config.useDefaultAndroidBrowser) {
        // Open in default browser
        redirectUrl = `intent://${baseDomain.replace('https://', '')}${currentUrl.pathname}${currentUrl.search}#Intent;scheme=https;end`
      } else {
        // Open in Chrome specifically
        redirectUrl = `intent://${baseDomain.replace('https://', '')}${currentUrl.pathname}${currentUrl.search}#Intent;scheme=https;package=${config.androidPackage};end`
      }
    } else if (phoneType === 'ios') {
      // iOS - try to open in Safari
      redirectUrl = `x-safari-${targetUrl}`
    } else {
      return
    }

    if (redirectUrl) {
      window.location.href = redirectUrl

      // Fallback: if redirect doesn't work, try regular URL after a delay
      setTimeout(() => {
        if (!document.hidden) {
          window.location.href = targetUrl
        }
      }, config.redirectDelay + 1000)
    }
  }

  const showRedirectMessage = (phoneType, delay) => {
    const messageDiv = document.createElement('div')
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      text-align: center;
    `

    const browserName = phoneType === 'android' ? 'Chrome' : 'Safari'
    messageDiv.textContent = `Redirigiendo a ${browserName}...`

    document.body.appendChild(messageDiv)

    // Remove message after redirect delay
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv)
      }
    }, delay)
  }

  return { isRedirecting }
}