const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { ensureUsersTable } = require('./auth');

const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL
  : 'https://dwv-diagnostico-comercial.vercel.app';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensureUsersTable();
    const action = req.query?.action;

    // Reset password with token
    if (action === 'reset') {
      const { token, password } = req.body || {};
      if (!token || !password) return res.status(400).json({ error: 'Token e senha obrigatórios' });
      if (password.length < 4) return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });

      const { rows } = await sql`SELECT id FROM users WHERE reset_token = ${token} AND reset_expires > NOW()`;
      if (rows.length === 0) return res.status(400).json({ error: 'Link expirado ou inválido. Solicite novamente.' });

      const hash = bcrypt.hashSync(password, 10);
      await sql`UPDATE users SET password_hash = ${hash}, reset_token = NULL, reset_expires = NULL WHERE id = ${rows[0].id}`;
      return res.status(200).json({ ok: true });
    }

    // Request password reset
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    const { rows } = await sql`SELECT id, name FROM users WHERE email = ${email.toLowerCase().trim()} AND status = 'ativo'`;
    // Always return success (don't reveal if email exists)
    if (rows.length === 0) return res.status(200).json({ ok: true });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    await sql`UPDATE users SET reset_token = ${token}, reset_expires = ${expires} WHERE id = ${rows[0].id}`;

    // Send email
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const link = BASE_URL + '/?reset=' + token;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'DWV Diagnóstico <onboarding@resend.dev>',
          to: [email],
          subject: 'Recuperação de senha — DWV Diagnóstico',
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
            <h2 style="color:#E8392A">DWV · Diagnóstico Comercial</h2>
            <p>Olá <strong>${rows[0].name}</strong>,</p>
            <p>Você solicitou a recuperação de senha. Clique no botão abaixo para definir uma nova senha:</p>
            <a href="${link}" style="display:inline-block;background:#E8392A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;margin:16px 0">Redefinir Senha</a>
            <p style="color:#888;font-size:13px">Este link expira em 1 hora. Se você não solicitou, ignore este email.</p>
          </div>`
        })
      });
    } else {
      console.warn('RESEND_API_KEY not set. Reset link:', BASE_URL + '/?reset=' + token);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Recover Error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};
