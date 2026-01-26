/**
 * Blog Creator Error Classes
 * 
 * Custom error types for the blog generation system.
 */

/**
 * Base error class for Blog Creator
 */
export class BlogCreatorError extends Error {
  code: string
  statusCode: number
  details?: Record<string, unknown>

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'BlogCreatorError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    }
  }
}

/**
 * API Key decryption failed
 */
export class ApiKeyDecryptionError extends BlogCreatorError {
  constructor(message: string = 'Failed to decrypt API key') {
    super(message, 'API_KEY_DECRYPTION_FAILED', 500)
    this.name = 'ApiKeyDecryptionError'
  }
}

/**
 * API Key is invalid or expired
 */
export class ApiKeyInvalidError extends BlogCreatorError {
  provider: string

  constructor(provider: string, message?: string) {
    super(
      message || `${provider} API key is invalid or expired`,
      'API_KEY_INVALID',
      401,
      { provider }
    )
    this.name = 'ApiKeyInvalidError'
    this.provider = provider
  }
}

/**
 * No API key found for the provider
 */
export class ApiKeyNotFoundError extends BlogCreatorError {
  provider: string

  constructor(provider: string) {
    super(
      `No active ${provider} API key found. Please add one in your settings.`,
      'API_KEY_NOT_FOUND',
      400,
      { provider }
    )
    this.name = 'ApiKeyNotFoundError'
    this.provider = provider
  }
}

/**
 * Web scraping was blocked
 */
export class ScrapingBlockedError extends BlogCreatorError {
  domain: string

  constructor(domain: string, reason?: string) {
    super(
      `Scraping blocked by ${domain}${reason ? `: ${reason}` : ''}`,
      'SCRAPING_BLOCKED',
      400,
      { domain, reason }
    )
    this.name = 'ScrapingBlockedError'
    this.domain = domain
  }
}

/**
 * Scraping failed for other reasons
 */
export class ScrapingFailedError extends BlogCreatorError {
  url: string

  constructor(url: string, reason: string) {
    super(
      `Failed to scrape ${url}: ${reason}`,
      'SCRAPING_FAILED',
      400,
      { url, reason }
    )
    this.name = 'ScrapingFailedError'
    this.url = url
  }
}

/**
 * Blog generation job timed out
 */
export class JobTimeoutError extends BlogCreatorError {
  jobId: string
  timeoutSeconds: number

  constructor(jobId: string, timeoutSeconds: number = 300) {
    super(
      `Blog generation job ${jobId} timed out after ${timeoutSeconds} seconds`,
      'JOB_TIMEOUT',
      504,
      { jobId, timeoutSeconds }
    )
    this.name = 'JobTimeoutError'
    this.jobId = jobId
    this.timeoutSeconds = timeoutSeconds
  }
}

/**
 * Job was cancelled
 */
export class JobCancelledError extends BlogCreatorError {
  jobId: string

  constructor(jobId: string) {
    super(
      `Blog generation job ${jobId} was cancelled`,
      'JOB_CANCELLED',
      400,
      { jobId }
    )
    this.name = 'JobCancelledError'
    this.jobId = jobId
  }
}

/**
 * Vector search failed
 */
export class VectorSearchError extends BlogCreatorError {
  constructor(message: string = 'Vector similarity search failed') {
    super(message, 'VECTOR_SEARCH_FAILED', 500)
    this.name = 'VectorSearchError'
  }
}

/**
 * Embedding generation failed
 */
export class EmbeddingError extends BlogCreatorError {
  constructor(message: string = 'Failed to generate embeddings') {
    super(message, 'EMBEDDING_FAILED', 500)
    this.name = 'EmbeddingError'
  }
}

/**
 * Python script execution failed
 */
export class PythonExecutionError extends BlogCreatorError {
  stderr: string
  exitCode?: number

  constructor(stderr: string, exitCode?: number) {
    super(
      `Python script execution failed${exitCode ? ` (exit code: ${exitCode})` : ''}`,
      'PYTHON_EXECUTION_FAILED',
      500,
      { stderr, exitCode }
    )
    this.name = 'PythonExecutionError'
    this.stderr = stderr
    this.exitCode = exitCode
  }
}

/**
 * Writing profile not found
 */
export class ProfileNotFoundError extends BlogCreatorError {
  profileId: string

  constructor(profileId: string) {
    super(
      `Writing style profile ${profileId} not found`,
      'PROFILE_NOT_FOUND',
      404,
      { profileId }
    )
    this.name = 'ProfileNotFoundError'
    this.profileId = profileId
  }
}

/**
 * Insufficient permissions
 */
export class InsufficientPermissionsError extends BlogCreatorError {
  requiredRole: string
  currentRole: string

  constructor(requiredRole: string, currentRole: string) {
    super(
      `This action requires ${requiredRole} role, but you have ${currentRole}`,
      'INSUFFICIENT_PERMISSIONS',
      403,
      { requiredRole, currentRole }
    )
    this.name = 'InsufficientPermissionsError'
    this.requiredRole = requiredRole
    this.currentRole = currentRole
  }
}

/**
 * Rate limit exceeded
 */
export class RateLimitExceededError extends BlogCreatorError {
  retryAfter: number

  constructor(retryAfter: number, message?: string) {
    super(
      message || `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      429,
      { retryAfter }
    )
    this.name = 'RateLimitExceededError'
    this.retryAfter = retryAfter
  }
}

/**
 * Content too short
 */
export class ContentTooShortError extends BlogCreatorError {
  minLength: number
  actualLength: number

  constructor(minLength: number, actualLength: number) {
    super(
      `Content is too short. Minimum ${minLength} characters required, got ${actualLength}.`,
      'CONTENT_TOO_SHORT',
      400,
      { minLength, actualLength }
    )
    this.name = 'ContentTooShortError'
    this.minLength = minLength
    this.actualLength = actualLength
  }
}

/**
 * Invalid URL format
 */
export class InvalidUrlError extends BlogCreatorError {
  url: string
  reason: string

  constructor(url: string, reason: string) {
    super(
      `Invalid URL: ${reason}`,
      'INVALID_URL',
      400,
      { url, reason }
    )
    this.name = 'InvalidUrlError'
    this.url = url
    this.reason = reason
  }
}

/**
 * Check if an error is a BlogCreatorError
 */
export function isBlogCreatorError(error: unknown): error is BlogCreatorError {
  return error instanceof BlogCreatorError
}

/**
 * Convert any error to a standardized error response
 */
export function toErrorResponse(error: unknown): {
  error: string
  code: string
  statusCode: number
  details?: Record<string, unknown>
} {
  if (isBlogCreatorError(error)) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    }
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    }
  }

  return {
    error: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  }
}
