// src/main/crypto.ts
import {
  randomBytes,
  pbkdf2,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'

const pbkdf2Async = promisify(pbkdf2)

const PBKDF2_ITERATIONS = 100_000
const PBKDF2_DIGEST = 'sha512'
const SALT_BYTES = 32
// ハッシュ検証用のキー長（SHA-512の出力長と同じ64バイト）
const HASH_KEY_LEN = 64
// 暗号鍵の長さ（AES-256: 32バイト）
const ENC_KEY_LEN = 32
const IV_BYTES = 12
const AUTH_TAG_BYTES = 16

/**
 * マスターパスワードをハッシュ化する（DB保存用）
 * ランダムなソルトを生成してPBKDF2でハッシュ化する
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBuf = randomBytes(SALT_BYTES)
  const salt = saltBuf.toString('hex')
  const hashBuf = await pbkdf2Async(password, saltBuf, PBKDF2_ITERATIONS, HASH_KEY_LEN, PBKDF2_DIGEST)
  const hash = hashBuf.toString('hex')
  return { hash, salt }
}

/**
 * マスターパスワードを検証する（タイミング攻撃防止のためtimingSafeEqualを使用）
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const saltBuf = Buffer.from(salt, 'hex')
  const hashBuf = await pbkdf2Async(password, saltBuf, PBKDF2_ITERATIONS, HASH_KEY_LEN, PBKDF2_DIGEST)
  const storedHash = Buffer.from(hash, 'hex')
  if (hashBuf.length !== storedHash.length) return false
  return timingSafeEqual(hashBuf, storedHash)
}

/**
 * マスターパスワードからデータ暗号化用の256bitキーを導出する
 * 認証完了時のみ呼び出され、メモリのみで保持される
 */
export async function deriveKey(password: string, salt: string): Promise<Buffer> {
  const saltBuf = Buffer.from(salt, 'hex')
  return pbkdf2Async(password, saltBuf, PBKDF2_ITERATIONS, ENC_KEY_LEN, PBKDF2_DIGEST)
}

/**
 * AES-256-GCM で平文を暗号化する
 * フォーマット: [IV(12bytes)][AuthTag(16bytes)][暗号文] → Base64文字列
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * AES-256-GCM で暗号文を復号する
 * 改ざんがあった場合は例外をスローする
 */
export function decrypt(ciphertext: string, key: Buffer): string {
  const data = Buffer.from(ciphertext, 'base64')
  const iv = data.subarray(0, IV_BYTES)
  const authTag = data.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES)
  const encrypted = data.subarray(IV_BYTES + AUTH_TAG_BYTES)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
