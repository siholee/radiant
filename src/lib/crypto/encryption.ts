/**
 * API Key Encryption Library
 * 
 * Uses AES-256-GCM with PBKDF2 key derivation.
 * Supports encryption key versioning for secure key rotation.
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const PBKDF2_ITERATIONS = 100000

/**
 * Get encryption key for a specific version
 */
function getEncryptionKey(version?: number): { key: string; version: number } {
  const currentVersion = version || Number(process.env.ENCRYPTION_KEY_VERSION || '1')
  const key = process.env[`ENCRYPTION_KEY_V${currentVersion}`]

  if (!key) {
    throw new Error(`Encryption key version ${currentVersion} not found in environment`)
  }

  if (key.length < 32) {
    throw new Error(`Encryption key version ${currentVersion} must be at least 32 characters`)
  }

  return { key, version: currentVersion }
}

/**
 * Derive a cryptographic key from the master key using PBKDF2
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512')
}

/**
 * Encrypt plaintext data
 * 
 * Output format (base64 encoded):
 * [version: 1 byte][salt: 64 bytes][iv: 16 bytes][authTag: 16 bytes][encrypted data]
 */
export function encrypt(plaintext: string): string {
  const { key: masterKey, version } = getEncryptionKey()
  
  const salt = crypto.randomBytes(SALT_LENGTH)
  const derivedKey = deriveKey(masterKey, salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine: version (1 byte) + salt + iv + authTag + encrypted data
  const combined = Buffer.concat([
    Buffer.from([version]),
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ])

  return combined.toString('base64')
}

/**
 * Decrypt encrypted data
 * 
 * Automatically detects the encryption key version from the ciphertext
 */
export function decrypt(encryptedData: string): string {
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract version (first byte)
  const version = combined[0]

  // Get the correct key for this version
  const { key: masterKey } = getEncryptionKey(version)

  // Extract components
  const salt = combined.subarray(1, 1 + SALT_LENGTH)
  const iv = combined.subarray(1 + SALT_LENGTH, 1 + SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(
    1 + SALT_LENGTH + IV_LENGTH,
    1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  )
  const encrypted = combined.subarray(1 + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  const derivedKey = deriveKey(masterKey, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Encrypt an API key with metadata
 */
export function encryptApiKey(
  apiKey: string,
  metadata?: {
    provider?: string
    userId?: string
  }
): { encryptedKey: string; keyVersion: number } {
  const version = Number(process.env.ENCRYPTION_KEY_VERSION || '1')

  const data = JSON.stringify({
    key: apiKey,
    encryptedAt: new Date().toISOString(),
    ...metadata,
  })

  return {
    encryptedKey: encrypt(data),
    keyVersion: version,
  }
}

/**
 * Decrypt an API key
 */
export function decryptApiKey(encryptedKey: string): string {
  try {
    const decrypted = decrypt(encryptedKey)
    const data = JSON.parse(decrypted)
    return data.key
  } catch (error) {
    throw new Error('Failed to decrypt API key: Invalid or corrupted data')
  }
}

/**
 * Mask an API key for display
 * Shows first 7 and last 4 characters
 * Example: sk-proj-...Xyz4
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 11) {
    return '***'
  }
  return `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`
}

/**
 * Validate API key format for different providers
 */
export function validateApiKeyFormat(apiKey: string, provider: string): boolean {
  const patterns: Record<string, RegExp> = {
    OPENAI: /^sk-[a-zA-Z0-9-_]{32,}$/,
    ANTHROPIC: /^sk-ant-[a-zA-Z0-9-_]{32,}$/,
    GOOGLE: /^[a-zA-Z0-9-_]{39}$/,
    AZURE_OPENAI: /^[a-f0-9]{32}$/,
  }

  const pattern = patterns[provider]
  if (!pattern) {
    // Unknown provider, accept any non-empty string
    return apiKey.length > 0
  }

  return pattern.test(apiKey)
}

/**
 * Re-encrypt data with the current key version
 * Used during key rotation
 */
export function reencrypt(encryptedData: string): string {
  const decrypted = decrypt(encryptedData)
  return encrypt(decrypted)
}

/**
 * Generate a secure encryption key for environment variable
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
