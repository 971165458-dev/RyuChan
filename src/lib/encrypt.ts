import crypto from 'crypto';

export async function encryptWithWebCrypto(text: string, password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return `${salt.toString('base64')}:${iv.toString('base64')}:${encrypted}`;
}
