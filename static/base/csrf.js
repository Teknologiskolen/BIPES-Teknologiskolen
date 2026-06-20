"use strict";

// Attach the signed double-submit token to every same-origin unsafe fetch.
// The server issues the readable cookie on HTML responses.
(function installCSRFFetchProtection () {
  const cookieName = 'bipes_csrf'
  const headerName = 'X-CSRF-Token'
  const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
  const nativeFetch = window.fetch.bind(window)

  function cookieValue (name) {
    const prefix = `${encodeURIComponent(name)}=`
    for (const part of document.cookie.split(';')) {
      const value = part.trim()
      if (value.startsWith(prefix))
        return decodeURIComponent(value.slice(prefix.length))
    }
    return ''
  }

  // Global session-expiry handler. When a same-origin API call comes back 401 the
  // server session has lapsed; instead of leaving the user on a dead page whose calls
  // silently fail, tell them and send them to login (preserving theme/lang). One-shot
  // so concurrent 401s don't stack notifications or redirect twice — the same guard is
  // shared with the device page's own handler.
  //
  // Gated on #user-info, the same signal the app uses for guest mode: an unauthenticated
  // (guest) user legitimately receives 401s on server features and must NOT be bounced to
  // login. Pages without #user-info (guest IDE, the login/landing pages) are left alone.
  function onUnauthorized (pathname) {
    if (window.__bipesSessionExpiredHandled)
      return
    if (!document.getElementById('user-info'))
      return
    // A 401 from a credential-submission endpoint is just a wrong password, shown inline.
    if (/\/(login|register)(\/|$)/.test(pathname))
      return

    window.__bipesSessionExpiredHandled = true
    try { window.dispatchEvent(new CustomEvent('sessionexpired')) } catch (e) {}

    const text = (typeof Msg !== 'undefined' && Msg && Msg['SessionExpired']) ||
      'Your session expired — please log in again.'
    try {
      if (window.bipes && window.bipes.page && window.bipes.page.notification)
        window.bipes.page.notification.send(text)
    } catch (e) {}

    const p = new URLSearchParams(window.location.search)
    const theme = p.get('theme') || 'light'
    const lang = p.get('lang') || 'en'
    setTimeout(function () {
      window.location.href = `/login?theme=${encodeURIComponent(theme)}&lang=${encodeURIComponent(lang)}`
    }, 1500)
  }

  window.fetch = function csrfFetch (input, init) {
    const options = init ? {...init} : {}
    const request = input instanceof Request ? input : null
    const method = String(options.method || (request && request.method) || 'GET').toUpperCase()
    const url = new URL(request ? request.url : String(input), window.location.href)
    const sameOrigin = url.origin === window.location.origin

    if (sameOrigin && unsafeMethods.has(method)) {
      const token = cookieValue(cookieName)
      if (token) {
        const headers = new Headers(options.headers || (request && request.headers) || undefined)
        headers.set(headerName, token)
        options.headers = headers
      }
    }

    return nativeFetch(input, options).then(function (response) {
      if (sameOrigin && response && response.status === 401)
        try { onUnauthorized(url.pathname) } catch (e) {}
      return response
    })
  }
})()
