import { neon } from '@neondatabase/serverless';
import { authenticateRequest, isAdmin } from '../lib/auth';

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
    const user = await authenticateRequest(req);
    if (!user) return sendError(res, 401, 'Please sign in to use Drieziek Watch.');
    const db = sql();

    if (req.method === 'GET') {
      const rows = await db`
        SELECT id, title, category, urgency, description, location, status,
               reporter_name, photo_url, created_at
        FROM public.incidents
        ORDER BY created_at DESC
        LIMIT 200
      `;
      return res.status(200).json(rows.map((r: any) => ({
        id: String(r.id),
        title: r.title,
        category: r.category,
        urgency: r.urgency,
        description: r.description,
        location: r.location,
        time: new Date(r.created_at).toLocaleString(),
        status: r.status,
        reporter: r.reporter_name,
        photo: r.photo_url || undefined,
      })));
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const title = String(body.title || '').trim();
      const category = String(body.category || 'Other').trim();
      const urgency = body.urgency === 'High' ? 'High' : 'Normal';
      const description = String(body.description || '').trim();
      const location = String(body.location || 'Location not provided').trim();
      const reporter = user.email || 'Community member';

      if (title.length < 3 || title.length > 160) return sendError(res, 400, 'Title must be 3–160 characters.');
      if (!description || description.length > 4000) return sendError(res, 400, 'Description is required and must be under 4,000 characters.');
      if (category.length > 60 || location.length > 300) return sendError(res, 400, 'Category or location is too long.');
      if (body.photo) return sendError(res, 400, 'Photo uploads are not connected yet. Submit the report without a photo for now.');

      const rows = await db`
        INSERT INTO public.incidents (title, category, urgency, description, location, reporter_name)
        VALUES (${title}, ${category}, ${urgency}, ${description}, ${location}, ${reporter})
        RETURNING id, title, category, urgency, description, location, status, reporter_name, created_at
      `;
      const r: any = rows[0];
      return res.status(201).json({
        id: String(r.id), title: r.title, category: r.category, urgency: r.urgency,
        description: r.description, location: r.location, time: new Date(r.created_at).toLocaleString(),
        status: r.status, reporter: r.reporter_name,
      });
    }

    if (req.method === 'PATCH') {
      if (!isAdmin(user)) return sendError(res, 403, 'Only an authorised Drieziek Watch administrator can change incident status.');
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const id = Number(body.id);
      const status = body.status;
      if (!Number.isSafeInteger(id) || id < 1) return sendError(res, 400, 'A valid incident ID is required.');
      if (!['Active', 'Monitoring', 'Resolved'].includes(status)) return sendError(res, 400, 'Invalid incident status.');
      const rows = await db`
        UPDATE public.incidents SET status = ${status}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, status
      `;
      if (!rows.length) return sendError(res, 404, 'Incident not found.');
      return res.status(200).json({ id: String(rows[0].id), status: rows[0].status });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, OPTIONS');
    return sendError(res, 405, 'Method not allowed.');
  } catch (error) {
    console.error('Incidents API error:', error);
    return sendError(res, 500, 'The incidents service could not complete the request.');
  }
}
