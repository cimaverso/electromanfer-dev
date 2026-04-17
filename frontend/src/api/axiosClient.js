import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// ─── Refresh token ────────────────────────────────────────────────────────────
async function refreshToken() {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
    )
    const newToken = response.data.access_token
    localStorage.setItem('access_token', newToken)
    return newToken
  } catch {
    return null
  }
}

// ─── Interceptor de REQUEST ───────────────────────────────────────────────────
axiosClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const faltan = payload.exp * 1000 - Date.now()

        if (faltan < 5 * 60 * 1000 && faltan > 0) {
          const newToken = await refreshToken()
          if (newToken) {
            config.headers.Authorization = `Bearer ${newToken}`
            return config
          }
        }
      } catch {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ─── Interceptor de RESPONSE ──────────────────────────────────────────────────
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default axiosClient