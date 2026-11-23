export type AuthUser = {
  id: string
  name: string
  email: string
  phone: string
  emailVerified: boolean
}

export type AuthResponse = {
  user?: AuthUser | null
  error?: string
  message?: string
  needsVerification?: boolean
  devActionUrl?: string
  welcomeCoupon?: { code: string; description: string; value: number; type: string }
}

export type PersonalCouponsResponse = {
  coupons: Array<{
    id: string
    code: string
    description: string
    type: string
    value: number
    minOrderValue: number
    redeemed: boolean
    redeemedAt?: string | null
    source?: string
  }>
}

async function request(
  path: string,
  body?: Record<string, string>,
  method?: string,
): Promise<AuthResponse & { status: number }> {
  const response = await fetch(path, {
    method: method || (body ? 'POST' : 'GET'),
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await response.text()
  let data = {} as AuthResponse
  if (raw) {
    try {
      data = JSON.parse(raw) as AuthResponse
    } catch {
      return { error: raw.trim() || `Request failed (${response.status})`, status: response.status }
    }
  }
  return { ...data, status: response.status, error: data.error || (response.ok ? undefined : `Request failed (${response.status})`) }
}

export const authApi = {
  me: () => request('/api/auth/me'),
  updateProfile: (payload: { name: string; email: string; phone: string }) =>
    request('/api/auth/profile', payload, 'PUT'),
  login: (email: string, password: string) => request('/api/auth/login', { email, password }),
  demoLogin: () => request('/api/auth/demo-login'),
  register: (payload: { name: string; email: string; phone: string; password: string; confirmPassword: string }) =>
    request('/api/auth/register', payload),
  logout: () => request('/api/auth/logout', {}),
  forgot: (email: string) => request('/api/auth/forgot', { email }),
  resend: (email: string) => request('/api/auth/resend-verification', { email }),
  verify: (token: string) => request('/api/auth/verify', { token }),
  verifyOtp: (email: string, otp: string) => request('/api/auth/verify-otp', { email, otp }),
  reset: (token: string, password: string, confirmPassword: string) =>
    request('/api/auth/reset', { token, password, confirmPassword }),
  personalCoupons: () => request('/api/account/coupons') as Promise<PersonalCouponsResponse & { status: number; error?: string }>,
}
