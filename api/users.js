const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getSessionUser, ensureUsersTable } = require('./auth');

const BASE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL
  : 'https://dwv-diagnostico-comercial.vercel.app';

async function sendInviteEmail(email, name, token) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — invite email not sent. Link:', BASE_URL + '/?invite=' + token);
    return false;
  }
  const link = BASE_URL + '/?invite=' + token;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'DWV Diagnóstico <onboarding@resend.dev>',
      to: [email],
      subject: 'Convite — DWV Diagnóstico Comercial',
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <h2 style="color:#E8392A">DWV · Diagnóstico Comercial</h2>
        <p>Olá <strong>${name}</strong>,</p>
        <p>Você foi convidado para acessar o DWV Diagnóstico Comercial.</p>
        <p>Clique no botão abaixo para definir sua senha e acessar o sistema:</p>
        <a href="${link}" style="display:inline-block;background:#E8392A;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;margin:16px 0">Aceitar Convite</a>
        <p style="color:#888;font-size:13px">Se você não esperava este convite, ignore este email.</p>
      </div>`
    })
  });
  return res.ok;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureUsersTable();

    // Accept invite — no auth needed
    const action = req.query?.action;
    if (action === 'accept-invite' && req.method === 'POST') {
      const { token, password } = req.body || {};
      if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
      if (password.length < 4) return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });

      const { rows } = await sql`SELECT id, name, email FROM users WHERE invite_token = ${token}`;
      if (rows.length === 0) return res.status(400).json({ error: 'Convite inválido ou já utilizado' });

      const hash = bcrypt.hashSync(password, 10);
      await sql`UPDATE users SET password_hash = ${hash}, invite_token = NULL WHERE id = ${rows[0].id}`;
      return res.status(200).json({ ok: true, name: rows[0].name });
    }

    // All other routes require master auth
    const user = await getSessionUser(req);
    if (!user || user.role !== 'master') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    // GET — list users
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT id, name, email, role, status, invite_token, created_at FROM users ORDER BY created_at ASC`;
      const users = rows.map(r => ({
        id: r.id, name: r.name, email: r.email, role: r.role,
        status: r.invite_token ? 'pendente' : r.status,
        createdAt: r.created_at
      }));
      return res.status(200).json(users);
    }

    // POST — create user + send invite
    if (req.method === 'POST') {
      const { name, email, role } = req.body || {};
      if (!name || !email) return res.status(400).json({ error: 'Nome e email obrigatórios' });

      const userRole = (role === 'master') ? 'master' : 'user';
      const inviteToken = crypto.randomBytes(32).toString('hex');

      const { rows: existing } = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
      if (existing.length > 0) return res.status(400).json({ error: 'Email já cadastrado' });

      await sql`INSERT INTO users (name, email, role, invite_token) VALUES (${name}, ${email.toLowerCase().trim()}, ${userRole}, ${inviteToken})`;

      const emailSent = await sendInviteEmail(email, name, inviteToken);
      return res.status(201).json({ ok: true, emailSent, inviteLink: !emailSent ? (BASE_URL + '/?invite=' + inviteToken) : undefined });
    }

    // PUT — update user
    if (req.method === 'PUT') {
      const { id, name, email, role, status, password } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID obrigatório' });

      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${parseInt(id)}`;
      }
      if (name) await sql`UPDATE users SET name = ${name} WHERE id = ${parseInt(id)}`;
      if (email) await sql`UPDATE users SET email = ${email.toLowerCase().trim()} WHERE id = ${parseInt(id)}`;
      if (role) await sql`UPDATE users SET role = ${role} WHERE id = ${parseInt(id)}`;
      if (status) await sql`UPDATE users SET status = ${status} WHERE id = ${parseInt(id)}`;

      return res.status(200).json({ ok: true });
    }

    // DELETE — delete user
    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ error: 'ID obrigatório' });
      if (parseInt(id) === user.id) return res.status(400).json({ error: 'Não pode deletar a si mesmo' });
      await sql`DELETE FROM users WHERE id = ${parseInt(id)}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Users Error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};
