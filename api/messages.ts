import { neon } from '@neondatabase/serverless';

const sql = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  return neon(process.env.DATABASE_URL);
};

function sendError(res: any, status: number, message: string) {
  return res.status(status).json({ error: message });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const db = sql();

    if (req.method === 'GET') {
      const rows = await db`
        SELECT id, text, author_name, location, created_at
        FROM public.community_messages
        ORDER BY created_at DESC
        LIMIT 200
      `;
      return res.status(200).json(rows.map((r: any) => ({
        id: String(r.id), text: r.text, time: new Date(r.created_at).toLocaleString(),
        author: r.author_name, location: r.location || undefined,
      })));
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const message = String(body.text || '').trim();
      const author = String(body.author || 'Community member').trim().slice(0, 80) || 'Community member';
      const location = String(body.location || '').trim().slice(0, 300) || null;

      if (!message || message.length > 2000) return sendError(res, 400, 'Message must be between 1 and 2,000 characters.');
      const rows = await db`
        INSERT INTO public.community_messages (text, author_name, location)
        VALUES (${message}, ${author}, ${location})
        RETURNING id, text, author_name, location, created_at
      `;
      const r: any = rows[0];
      return res.status(201).json({
        id: String(r.id), text: r.text, time: new Date(r.created_at).toLocaleString(),
        author: r.author_name, location: r.location || undefined,
      });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return sendError(res, 405, 'Method not allowed.');
  } catch (error) {
    console.error('Messages API error:', error);
    return sendError(res, 500, 'The community messages service could not complete the request.');
  }
}
