import { db } from '../../db/client.js';
import { makeId } from '../../shared/id.js';

export const listUsers = () => db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();

export const createUser = (input: { displayName: string; email?: string; role?: string }) => {
  const id = makeId('usr');
  db.prepare('INSERT INTO users (id, display_name, email, role) VALUES (?, ?, ?, ?)')
    .run(id, input.displayName, input.email ?? null, input.role ?? 'operator');
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
};

export const listWorkspaceMembers = (workspaceId?: string) =>
  workspaceId
    ? db.prepare(`SELECT wm.*, u.display_name, u.email
      FROM workspace_members wm JOIN users u ON u.id = wm.user_id
      WHERE wm.workspace_id = ? ORDER BY wm.created_at DESC`).all(workspaceId)
    : db.prepare(`SELECT wm.*, u.display_name, u.email
      FROM workspace_members wm JOIN users u ON u.id = wm.user_id
      ORDER BY wm.created_at DESC`).all();

export const addWorkspaceMember = (input: { workspaceId: string; userId: string; role?: string }) => {
  const id = makeId('wmb');
  db.prepare('INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)')
    .run(id, input.workspaceId, input.userId, input.role ?? 'admin');
  return db.prepare('SELECT * FROM workspace_members WHERE id = ?').get(id);
};
