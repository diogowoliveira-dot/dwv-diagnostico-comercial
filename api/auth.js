const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const MASTER_HASH = '$2a$10$SrDjRwZk1ZmxGtZdrer.CObDMAl82S2sPQpQP.mWT7Y8Z7uyvw7Ty';

async function ensureUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'ativo',
      invite_token TEXT,
      reset_token TEXT,
      reset_expires TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  // Seed master user if not exists
  const { rows } = await sql`SELECT id FROM users WHERE email = 'diogowoliveira@gmail.com'`;
  if (rows.length === 0) {
    await sql`INSERT INTO users (name, email, password_hash, role) VALUES ('Diogo Westphal', 'diogowoliveira@gmail.com', ${MASTER_HASH}, 'master')`;
  }
}

function parseSession(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/dwv_session=([^;]+)/);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], 'base64').toString();
    const [id, token] = decoded.split(':');
    return { id: parseInt(id), token };
  } catch { return null; }
}

async function getSessionUser(req) {
  const session = parseSession(req.headers.cookie);
  if (!session) return null;
  const { rows } = await sql`SELECT id, name, email, role, status FROM users WHERE id = ${session.id} AND status = 'ativo'`;
  if (rows.length === 0) return null;
  // Verify token matches
  const expected = crypto.createHash('sha256').update(rows[0].id + ':' + rows[0].email).digest('hex').substring(0, 16);
  if (session.token !== expected) return null;
  return rows[0];
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureUsersTable();

    // GET — check session
    if (req.method === 'GET') {
      const user = await getSessionUser(req);
      if (!user) return res.status(401).json({ error: 'Not authenticated' });
      return res.status(200).json(user);
    }

    // POST — login
    if (req.method === 'POST') {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const { rows } = await sql`SELECT id, name, email, password_hash, role, status FROM users WHERE email = ${email.toLowerCase().trim()}`;
      if (rows.length === 0) return res.status(401).json({ error: 'Email ou senha incorretos' });

      const user = rows[0];
      if (user.status !== 'ativo') return res.status(401).json({ error: 'Conta desativada' });
      if (!user.password_hash) return res.status(401).json({ error: 'Convite pendente — verifique seu email para definir sua senha' });

      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Email ou senha incorretos' });

      // Create session token
      const token = crypto.createHash('sha256').update(user.id + ':' + user.email).digest('hex').substring(0, 16);
      const sessionValue = Buffer.from(user.id + ':' + token).toString('base64');

      res.setHeader('Set-Cookie', `dwv_session=${sessionValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
      return res.status(200).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    }

    // DELETE — logout
    if (req.method === 'DELETE') {
      res.setHeader('Set-Cookie', 'dwv_session=; Path=/; HttpOnly; Max-Age=0');
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Auth Error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Export helper for other API routes
module.exports.getSessionUser = getSessionUser;
module.exports.ensureUsersTable = ensureUsersTable;
