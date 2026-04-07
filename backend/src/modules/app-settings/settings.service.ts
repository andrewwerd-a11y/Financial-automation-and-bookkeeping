import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export const listSettings = (workspaceId: string) =>
  db.prepare('SELECT * FROM app_settings WHERE workspace_id = ? ORDER BY updated_at DESC').all(workspaceId);

export const upsertSetting = (workspaceId: string, key: string, value: unknown) => {
  const existing = db.prepare('SELECT id FROM app_settings WHERE workspace_id = ? AND key = ? LIMIT 1').get(workspaceId, key) as { id: string } | undefined;

  if (existing) {
    db.prepare('UPDATE app_settings SET value_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(value), existing.id);
    return db.prepare('SELECT * FROM app_settings WHERE id = ?').get(existing.id);
  }

  const id = makeId('cfg');
  db.prepare('INSERT INTO app_settings (id, workspace_id, key, value_json) VALUES (?, ?, ?, ?)')
    .run(id, workspaceId, key, JSON.stringify(value));
  return db.prepare('SELECT * FROM app_settings WHERE id = ?').get(id);
};
