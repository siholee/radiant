import { Resend } from 'resend'

// Lazy initialization to prevent build-time errors
let resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yurasis.com'
const APP_NAME = 'Radiant'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yurasis.com'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const resendClient = getResend()
    if (!resendClient) {
      console.warn('RESEND_API_KEY not set, skipping email')
      return { success: true } // Return success in development
    }
    
    await resendClient.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    
    return { success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>이메일 인증</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">${APP_NAME}에 오신 것을 환영합니다!</h1>
      <p style="color: #666; font-size: 16px;">안녕하세요, ${name}님!</p>
      <p style="color: #666; font-size: 16px;">아래 버튼을 클릭하여 이메일 주소를 인증해주세요:</p>
      <div style="margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">이메일 인증하기</a>
      </div>
      <p style="color: #999; font-size: 14px;">버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
      <p style="color: #999; font-size: 14px; word-break: break-all;">${verifyUrl}</p>
      <p style="color: #999; font-size: 14px;">이 링크는 24시간 동안 유효합니다.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다.</p>
    </body>
    </html>
  `
  
  return sendEmail({
    to: email,
    subject: `[${APP_NAME}] 이메일 인증`,
    html,
  })
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${APP_URL}/ko/reset-password?token=${token}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>비밀번호 재설정</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">비밀번호 재설정</h1>
      <p style="color: #666; font-size: 16px;">비밀번호 재설정을 요청하셨습니다.</p>
      <p style="color: #666; font-size: 16px;">아래 버튼을 클릭하여 새 비밀번호를 설정해주세요:</p>
      <div style="margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">비밀번호 재설정</a>
      </div>
      <p style="color: #999; font-size: 14px;">버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
      <p style="color: #999; font-size: 14px; word-break: break-all;">${resetUrl}</p>
      <p style="color: #999; font-size: 14px;">이 링크는 1시간 동안 유효합니다.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">본인이 요청하지 않은 경우, 이 이메일을 무시하셔도 됩니다. 비밀번호는 변경되지 않습니다.</p>
    </body>
    </html>
  `
  
  return sendEmail({
    to: email,
    subject: `[${APP_NAME}] 비밀번호 재설정`,
    html,
  })
}

/**
 * Send account locked notification email
 */
export async function sendAccountLockedEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>계정 보안 알림</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">계정 보안 알림</h1>
      <p style="color: #666; font-size: 16px;">여러 번의 로그인 시도 실패로 인해 계정이 일시적으로 잠겼습니다.</p>
      <p style="color: #666; font-size: 16px;">30분 후에 다시 시도하시거나, 비밀번호를 재설정해주세요.</p>
      <div style="margin: 30px 0;">
        <a href="${APP_URL}/ko/forgot-password" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">비밀번호 재설정</a>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">본인이 시도한 것이 아닌 경우, 즉시 비밀번호를 변경해주세요.</p>
    </body>
    </html>
  `
  
  return sendEmail({
    to: email,
    subject: `[${APP_NAME}] 계정 보안 알림`,
    html,
  })
}

/**
 * Send user invite email (admin invited a new user)
 */
export async function sendUserInviteEmail(
  email: string,
  token: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const inviteUrl = `${APP_URL}/ko/reset-password?token=${token}&invite=true`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${APP_NAME} 초대</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">${APP_NAME}에 초대되었습니다!</h1>
      <p style="color: #666; font-size: 16px;">안녕하세요, ${name}님!</p>
      <p style="color: #666; font-size: 16px;">관리자가 ${APP_NAME} 서비스에 초대했습니다. 아래 버튼을 클릭하여 계정을 활성화하고 비밀번호를 설정해주세요:</p>
      <div style="margin: 30px 0;">
        <a href="${inviteUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">계정 활성화</a>
      </div>
      <p style="color: #999; font-size: 14px;">버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
      <p style="color: #999; font-size: 14px; word-break: break-all;">${inviteUrl}</p>
      <p style="color: #999; font-size: 14px;">이 링크는 7일 동안 유효합니다.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">질문이 있으시면 관리자에게 문의해주세요.</p>
    </body>
    </html>
  `
  
  return sendEmail({
    to: email,
    subject: `[${APP_NAME}] 서비스 초대`,
    html,
  })
}

/**
 * Send admin-initiated password reset email
 */
export async function sendAdminPasswordResetEmail(
  email: string,
  token: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${APP_URL}/ko/reset-password?token=${token}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>비밀번호 재설정</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">비밀번호 재설정 안내</h1>
      <p style="color: #666; font-size: 16px;">안녕하세요, ${name}님!</p>
      <p style="color: #666; font-size: 16px;">관리자가 비밀번호 재설정을 요청했습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요:</p>
      <div style="margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">비밀번호 재설정</a>
      </div>
      <p style="color: #999; font-size: 14px;">버튼이 작동하지 않는 경우, 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
      <p style="color: #999; font-size: 14px; word-break: break-all;">${resetUrl}</p>
      <p style="color: #999; font-size: 14px;">이 링크는 24시간 동안 유효합니다.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">본인이 요청하지 않은 경우, 관리자에게 문의해주세요.</p>
    </body>
    </html>
  `
  
  return sendEmail({
    to: email,
    subject: `[${APP_NAME}] 비밀번호 재설정 안내`,
    html,
  })
}
