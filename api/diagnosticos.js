const { sql } = require('@vercel/postgres');

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS diagnosticos (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL,
      location TEXT,
      consultant_name TEXT,
      is_sim BOOLEAN DEFAULT FALSE,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensureTable();

    if (req.method === 'GET') {
      const { rows } = await sql`SELECT id, company_name, location, consultant_name, is_sim, data, created_at FROM diagnosticos ORDER BY created_at DESC`;
      const records = rows.map(r => ({
        ...r.data,
        id: r.id,
        companyName: r.company_name,
        location: r.location,
        consultantName: r.consultant_name,
        isSim: r.is_sim,
        date: r.created_at
      }));
      return res.status(200).json(records);
    }

    if (req.method === 'POST') {
      const record = req.body;
      if (!record || !record.companyName) {
        return res.status(400).json({ error: 'companyName is required' });
      }
      const { rows } = await sql`
        INSERT INTO diagnosticos (company_name, location, consultant_name, is_sim, data)
        VALUES (${record.companyName}, ${record.location || ''}, ${record.consultantName || ''}, ${!!record.isSim}, ${JSON.stringify(record)})
        RETURNING id, created_at
      `;
      return res.status(201).json({ id: rows[0].id, date: rows[0].created_at });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      if (id) {
        await sql`DELETE FROM diagnosticos WHERE id = ${parseInt(id)}`;
        return res.status(200).json({ deleted: parseInt(id) });
      } else {
        await sql`DELETE FROM diagnosticos`;
        return res.status(200).json({ deleted: 'all' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('DB Error:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
};
