import sgMail from '@sendgrid/mail';
import { config } from '../config.js';
import { logger } from '../logger.js';

let initialized = false;

function ensureClient(): boolean {
  if (!config.email.sendgrid.enabled) {
    logger.warn('SendGrid is disabled; email will not be sent');
    return false;
  }

  if (!initialized) {
    const apiKey = config.email.sendgrid.apiKey;
    if (!apiKey) {
      logger.error('SendGrid API key not configured');
      return false;
    }
    sgMail.setApiKey(apiKey);
    initialized = true;
  }

  return true;
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  if (!ensureClient()) {
    return;
  }

  const fromEmail = config.email.sendgrid.fromEmail;
  if (!fromEmail) {
    logger.error('SendGrid from email not configured');
    return;
  }

  const msg = {
    to,
    from: {
      email: fromEmail,
      name: 'Gecko Advisor',
    },
    subject: 'Reset your Gecko Advisor password',
    text: [
      'You requested a password reset for your Gecko Advisor account.',
      '',
      'Click the link below to choose a new password:',
      resetLink,
      '',
      'If you did not request this change, you can safely ignore this email.',
      '',
      'For security, this link will expire in 60 minutes.',
    ].join('\n'),
    html: `
      <p>Hi there,</p>
      <p>You requested a password reset for your Gecko Advisor account.</p>
      <p><a href="${resetLink}" style="display:inline-block;background-color:#2563eb;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>This link will expire in 60 minutes. If you did not request this change, you can safely ignore this email.</p>
      <p>— The Gecko Advisor team</p>
    `,
  };

  try {
    await sgMail.send(msg);
    logger.info({ to }, 'Password reset email sent');
  } catch (error) {
    logger.error({ error, to }, 'Failed to send password reset email');
  }
}
