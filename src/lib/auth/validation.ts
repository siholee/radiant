import { z } from 'zod'
import zxcvbn from 'zxcvbn'

// Email validation
export const emailSchema = z
  .string()
  .email('유효한 이메일 주소를 입력해주세요')
  .min(1, '이메일은 필수입니다')
  .max(255, '이메일은 255자를 초과할 수 없습니다')
  .toLowerCase()
  .trim()

// Password validation with strength check
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .max(128, '비밀번호는 128자를 초과할 수 없습니다')
  .refine(
    (password) => /[a-z]/.test(password),
    '소문자를 포함해야 합니다'
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    '대문자를 포함해야 합니다'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    '숫자를 포함해야 합니다'
  )
  .refine(
    (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
    '특수문자를 포함해야 합니다'
  )

// Name validation
export const nameSchema = z
  .string()
  .min(2, '이름은 최소 2자 이상이어야 합니다')
  .max(100, '이름은 100자를 초과할 수 없습니다')
  .trim()

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  returnToken: z.boolean().optional().default(false),
})

// Register schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  // Note: role is intentionally NOT included here for security
  // Only admins can assign roles through a separate admin API
})

// Password reset request schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

// Password reset schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '토큰이 필요합니다'),
  password: passwordSchema,
})

// Email verification schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, '인증 토큰이 필요합니다'),
})

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number
  feedback: string[]
  isStrong: boolean
} {
  const result = zxcvbn(password)
  
  const feedbackMessages: string[] = []
  
  if (result.feedback.warning) {
    feedbackMessages.push(result.feedback.warning)
  }
  
  if (result.feedback.suggestions) {
    feedbackMessages.push(...result.feedback.suggestions)
  }
  
  return {
    score: result.score, // 0-4
    feedback: feedbackMessages,
    isStrong: result.score >= 3, // Score of 3 or higher is considered strong
  }
}

// Types
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
