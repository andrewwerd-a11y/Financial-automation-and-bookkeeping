import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export const listBusinesses = (workspaceId?: string) => workspaceId
  ? db.prepare('SELECT * FROM businesses WHERE workspace_id = ? ORDER BY created_at DESC').all(workspaceId)
  : db.prepare('SELECT * FROM businesses ORDER BY created_at DESC').all();

export const createBusiness = (input: { workspaceId: string; name: string; labelType?: string }) => {
  const id = makeId('biz');
  db.prepare(`INSERT INTO businesses (id, workspace_id, name, label_type)
    VALUES (?, ?, ?, ?)`) 
    .run(id, input.workspaceId, input.name, input.labelType ?? null);
  return db.prepare('SELECT * FROM businesses WHERE id = ?').get(id);
};

export const getBusiness = (id: string) =>
  db.prepare('SELECT * FROM businesses WHERE id = ?').get(id) as Record<string, unknown> | undefined;
