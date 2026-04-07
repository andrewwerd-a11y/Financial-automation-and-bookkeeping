import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export const listWorkspaces = () => db.prepare('SELECT * FROM workspaces ORDER BY created_at DESC').all();

export const createWorkspace = (input: { name: string; slug: string }) => {
  const id = makeId('wsp');
  db.prepare('INSERT INTO workspaces (id, name, slug, status) VALUES (?, ?, ?, ?)')
    .run(id, input.name, input.slug, 'active');
  return db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id);
};

export const getWorkspace = (id: string) =>
  db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as Record<string, unknown> | undefined;
