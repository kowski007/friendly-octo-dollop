import * as bp from '.botpress'

function baseUrl(override?: string) {
  const raw = (override || process.env.NAIRATAG_API_BASE_URL || 'http://127.0.0.1:3000').trim()
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

async function readJsonSafe(res: Response): Promise<any> {
  try {
    return await res.json()
  } catch {
    return null
  }
}

function extractNtSessionCookie(setCookie: string | null) {
  if (!setCookie) return null
  // Example: "nt_session=abc.def; Path=/; HttpOnly; SameSite=Lax"
  const m = /(?:^|,\s*)nt_session=([^;]+)/.exec(setCookie)
  if (!m?.[1]) return null
  return `nt_session=${m[1]}`
}

const bot = new bp.Bot({
  actions: {
    resolveHandle: async (args: any) => {
      const input = args?.input as { handle: string; apiBaseUrl?: string }
      const api = baseUrl(input.apiBaseUrl)
      const url = `${api}/api/resolve?handle=${encodeURIComponent(input.handle)}`

      try {
        const res = await fetch(url, { method: 'GET', headers: { 'cache-control': 'no-store' } })
        const data = await readJsonSafe(res)
        if (!res.ok) {
          return { ok: false, status: 'error', error: data?.error || data?.reason || `http_${res.status}` }
        }

        return {
          ok: true,
          status: data?.status || 'error',
          handle: data?.handle,
          displayName: data?.displayName,
          bank: data?.bank,
          verification: data?.verification,
          reason: data?.reason,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'network_error'
        return { ok: false, status: 'error', error: msg }
      }
    },

    requestPhoneOtp: async (args: any) => {
      const input = args?.input as { phone: string; apiBaseUrl?: string }
      const api = baseUrl(input.apiBaseUrl)
      const url = `${api}/api/auth/otp/request`

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
          body: JSON.stringify({ phone: input.phone }),
        })
        const data = await readJsonSafe(res)
        if (!res.ok) return { ok: false, error: data?.error || `http_${res.status}` }
        return { ok: true, phone: data?.phone, devOtp: data?.devOtp }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'network_error'
        return { ok: false, error: msg }
      }
    },

    verifyPhoneOtp: async (args: any) => {
      const input = args?.input as { phone: string; code: string; apiBaseUrl?: string }
      const api = baseUrl(input.apiBaseUrl)
      const url = `${api}/api/auth/otp/verify`

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
          body: JSON.stringify({ phone: input.phone, code: input.code }),
        })
        const data = await readJsonSafe(res)
        if (!res.ok) return { ok: false, error: data?.error || `http_${res.status}` }

        const cookie = extractNtSessionCookie(res.headers.get('set-cookie'))
        const userId = data?.user?.id
        const phone = data?.user?.phone

        return { ok: true, userId, phone, sessionCookie: cookie || undefined }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'network_error'
        return { ok: false, error: msg }
      }
    },

    claimHandle: async (args: any) => {
      const input = args?.input as { handle: string; sessionCookie: string; apiBaseUrl?: string }
      const api = baseUrl(input.apiBaseUrl)
      const url = `${api}/api/handles/claim`

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
            cookie: input.sessionCookie,
          },
          body: JSON.stringify({ handle: input.handle }),
        })
        const data = await readJsonSafe(res)
        if (!res.ok) return { ok: false, error: data?.error || `http_${res.status}` }

        const claim = data?.claim
        return {
          ok: true,
          claimId: claim?.id,
          handle: claim?.handle,
          verification: claim?.verification,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'network_error'
        return { ok: false, error: msg }
      }
    },

    linkBvn: async (args: any) => {
      const input = args?.input as {
        bvn: string
        fullName?: string
        sessionCookie: string
        apiBaseUrl?: string
      }
      const api = baseUrl(input.apiBaseUrl)
      const url = `${api}/api/bvn/link`

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
            cookie: input.sessionCookie,
          },
          body: JSON.stringify({ bvn: input.bvn, fullName: input.fullName }),
        })
        const data = await readJsonSafe(res)
        if (!res.ok) return { ok: false, bvnLinked: false, error: data?.error || `http_${res.status}` }

        const claim = data?.claim
        return {
          ok: true,
          bvnLinked: true,
          verification: claim?.verification,
          displayName: claim?.displayName || data?.user?.fullName,
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'network_error'
        return { ok: false, bvnLinked: false, error: msg }
      }
    },
  },
})

export default bot
