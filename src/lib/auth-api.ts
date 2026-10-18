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
  const data = (await response.json()) as AuthResponse
  return { ...data, status: response.status }
}

export const authApi = {
  me: () => request('/api/auth/me'),
  updateProfile: (payload: { name: string; email: string; phone: string }) =>
    request('/api/auth/profile', payload, 'PUT'),
  login: (email: string, password: string) => request('/api/auth/login', { email, password }),
  register: (payload: { name: string; email: string; phone: string; password: string; confirmPassword: string }) =>
    request('/api/auth/register', payload),
  logout: () => request('/api/auth/logout', {}),
  forgot: (email: string) => request('/api/auth/forgot', { email }),
  resend: (email: string) => request('/api/auth/resend-verification', { email }),
  verify: (token: string) => request('/api/auth/verify', { token }),
  verifyOtp: (email: string, otp: string) => request('/api/auth/verify-otp', { email, otp }),
  reset: (token: string, password: string, confirmPassword: string) =>
    request('/api/auth/reset', { token, password, confirmPassword }),
}
