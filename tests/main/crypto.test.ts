import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, deriveKey, encrypt, decrypt } from '../../src/main/crypto'

describe('hashPassword / verifyPassword', () => {
  it('同じパスワードで検証が成功する', async () => {
    const { hash, salt } = await hashPassword('TestPassword123!')
    const result = await verifyPassword('TestPassword123!', hash, salt)
    expect(result).toBe(true)
  })

  it('異なるパスワードで検証が失敗する', async () => {
    const { hash, salt } = await hashPassword('TestPassword123!')
    const result = await verifyPassword('WrongPassword', hash, salt)
    expect(result).toBe(false)
  })

  it('同じパスワードでも毎回異なるソルトが生成される', async () => {
    const r1 = await hashPassword('password')
    const r2 = await hashPassword('password')
    expect(r1.salt).not.toBe(r2.salt)
    expect(r1.hash).not.toBe(r2.hash)
  })
})

describe('deriveKey', () => {
  it('同じパスワードとソルトから同じキーを導出できる', async () => {
    const { salt } = await hashPassword('password')
    const key1 = await deriveKey('password', salt)
    const key2 = await deriveKey('password', salt)
    expect(key1.toString('hex')).toBe(key2.toString('hex'))
  })

  it('導出キーは32バイト(256bit)である', async () => {
    const { salt } = await hashPassword('password')
    const key = await deriveKey('password', salt)
    expect(key.length).toBe(32)
  })
})

describe('encrypt / decrypt', () => {
  it('暗号化したデータを復号できる', async () => {
    const { salt } = await hashPassword('password')
    const key = await deriveKey('password', salt)
    const plaintext = 'super-secret-password'
    const encrypted = encrypt(plaintext, key)
    const decrypted = decrypt(encrypted, key)
    expect(decrypted).toBe(plaintext)
  })

  it('暗号文は毎回異なる（IVがランダム）', async () => {
    const { salt } = await hashPassword('password')
    const key = await deriveKey('password', salt)
    const enc1 = encrypt('same-text', key)
    const enc2 = encrypt('same-text', key)
    expect(enc1).not.toBe(enc2)
  })

  it('異なるキーでは復号に失敗する', async () => {
    const r1 = await hashPassword('password1')
    const r2 = await hashPassword('password2')
    const key1 = await deriveKey('password1', r1.salt)
    const key2 = await deriveKey('password2', r2.salt)
    const encrypted = encrypt('secret', key1)
    expect(() => decrypt(encrypted, key2)).toThrow()
  })

  it('改ざんされたデータの復号に失敗する', async () => {
    const { salt } = await hashPassword('password')
    const key = await deriveKey('password', salt)
    const encrypted = encrypt('secret', key)
    // 末尾1バイトを改ざん
    const buf = Buffer.from(encrypted, 'base64')
    buf[buf.length - 1] ^= 0xff
    const tampered = buf.toString('base64')
    expect(() => decrypt(tampered, key)).toThrow()
  })
})
