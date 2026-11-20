import { describe, expect, it } from 'vitest'
import {
  createSessionToken,
  expiredSessionCookie,
  getRequestIp,
  getSessionToken,
  hashIp,
  isAllowedOrigin,
  parseCookies,
  safeEqual,
  sessionCookie,
  verifyPassword,
  verifySessionToken
} from '../auth'

describe('blog auth', () => {
  it('compara contraseñas y valores en tiempo constante', () => {
    expect(verifyPassword('secreto', 'secreto')).toBe(true)
    expect(verifyPassword('otro', 'secreto')).toBe(false)
    expect(verifyPassword('', undefined)).toBe(false)
    expect(safeEqual('abc', 'abc')).toBe(true)
  })

  it('firma, verifica y expira sesiones', () => {
    const token = createSessionToken('secreto', 1_700_000_000_000)
    expect(verifySessionToken(token, 'secreto', 1_700_000_001_000)).toBe(true)
    expect(verifySessionToken(`${token}x`, 'secreto', 1_700_000_001_000)).toBe(false)
    expect(verifySessionToken(token, 'otro', 1_700_000_001_000)).toBe(false)
    expect(verifySessionToken(token, 'secreto', 1_700_030_000_000)).toBe(false)
  })

  it('lee cookies y detecta el token de sesión', () => {
    const request = new Request('https://sitio.test/admin', {
      headers: { cookie: 'a=1; oc_admin_session=token%20seguro' }
    })
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' })
    expect(getSessionToken(request)).toBe('token seguro')
  })

  it('genera cookies HttpOnly y Secure según el protocolo', () => {
    const https = new Request('https://sitio.test/admin')
    const http = new Request('http://localhost:8888/admin')
    expect(sessionCookie(https, 'token')).toContain('HttpOnly')
    expect(sessionCookie(https, 'token')).toContain('Secure')
    expect(sessionCookie(http, 'token')).not.toContain('Secure')
    expect(expiredSessionCookie(https)).toContain('Max-Age=0')
  })

  it('valida el origen y obtiene la IP', () => {
    expect(
      isAllowedOrigin(
        new Request('https://sitio.test/api', { headers: { origin: 'https://sitio.test' } })
      )
    ).toBe(true)
    expect(
      isAllowedOrigin(
        new Request('https://sitio.test/api', { headers: { origin: 'https://otro.test' } })
      )
    ).toBe(false)
    expect(
      getRequestIp(
        new Request('https://sitio.test/api', {
          headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
        })
      )
    ).toBe('1.2.3.4')
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'))
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('5.6.7.8'))
  })
})
