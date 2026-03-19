import axiosClient from './axiosClient'

/**
 * POST /auth/login
 * @param {string} email
 * @param {string} password
 * @returns {{ access_token: string, token_type: string, user: { id, nombre, rol } }}
 */
export async function loginRequest(email, password) {
  const response = await axiosClient.post('/auth/login', { email, password })
  return response.data
}

/**
 * GET /auth/me
 * Verifica que el token actual sigue siendo válido.
 * @returns {{ id, nombre, email, rol }}
 */
export async function getMeRequest() {
  const response = await axiosClient.get('/auth/me')
  return response.data
}

/**
 * POST /auth/logout
 * Opcional: invalida el token en el servidor si backend lo soporta.
 */
export async function logoutRequest() {
  const response = await axiosClient.post('/auth/logout')
  return response.data
}