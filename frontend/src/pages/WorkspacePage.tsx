import { useEffect, useState } from 'react';
import { addWorkspaceMember, createUser, createWorkspace, listUsers, listWorkspaceMembers, listWorkspaces } from '../api/client';
import type { User, Workspace } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function WorkspacePage({ activeWorkspaceId, onSelectWorkspace }: { activeWorkspaceId: string; onSelectWorkspace: (id: string) => void }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [workspaceForm, setWorkspaceForm] = useState({ name: '', slug: '' });
  const [userForm, setUserForm] = useState({ displayName: '', email: '' });
  const [memberForm, setMemberForm] = useState({ userId: '', role: 'admin' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [ws, us] = await Promise.all([listWorkspaces(), listUsers()]);
      setWorkspaces(ws);
      setUsers(us);
      const selected = activeWorkspaceId || ws[0]?.id || '';
      if (!activeWorkspaceId && selected) onSelectWorkspace(selected);
      if (selected) setMembers(await listWorkspaceMembers(selected));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [activeWorkspaceId]);

  const submitWorkspace = async () => {
    if (!workspaceForm.name || !workspaceForm.slug) return;
    await createWorkspace(workspaceForm);
    setWorkspaceForm({ name: '', slug: '' });
    await load();
  };

  const submitUser = async () => {
    if (!userForm.displayName) return;
    await createUser({ displayName: userForm.displayName, email: userForm.email || undefined });
    setUserForm({ displayName: '', email: '' });
    await load();
  };

  const addMember = async () => {
    if (!activeWorkspaceId || !memberForm.userId) return;
    await addWorkspaceMember({ workspaceId: activeWorkspaceId, userId: memberForm.userId, role: memberForm.role });
    await load();
  };

  return (
    <div>
      <h2>Workspace / Operators</h2>
      {loading && <LoadingState label="Loading workspace data..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="panel">
        <h3>Create Workspace</h3>
        <input placeholder="Workspace name" value={workspaceForm.name} onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })} />
        <input placeholder="Workspace slug" value={workspaceForm.slug} onChange={(e) => setWorkspaceForm({ ...workspaceForm, slug: e.target.value })} />
        <button onClick={() => void submitWorkspace()}>Create Workspace</button>
      </div>

      <div className="panel">
        <h3>Create Operator</h3>
        <input placeholder="Display name" value={userForm.displayName} onChange={(e) => setUserForm({ ...userForm, displayName: e.target.value })} />
        <input placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
        <button onClick={() => void submitUser()}>Create User</button>
      </div>

      <h3>Workspaces</h3>
      {!loading && !error && workspaces.length === 0 ? <EmptyState label="No workspaces yet." /> : (
        <table>
          <thead><tr><th>Name</th><th>Slug</th><th>Status</th><th>Active</th></tr></thead>
          <tbody>
            {workspaces.map((ws) => (
              <tr key={ws.id}>
                <td>{ws.name}</td><td>{ws.slug}</td><td>{ws.status}</td>
                <td><button onClick={() => onSelectWorkspace(ws.id)}>{activeWorkspaceId === ws.id ? 'Selected' : 'Select'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Workspace Members</h3>
      <select value={memberForm.userId} onChange={(e) => setMemberForm({ ...memberForm, userId: e.target.value })}>
        <option value="">Select user</option>
        {users.map((user) => <option key={user.id} value={user.id}>{user.display_name}</option>)}
      </select>
      <input value={memberForm.role} onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })} placeholder="Role" />
      <button onClick={() => void addMember()} disabled={!activeWorkspaceId}>Add Member</button>
      {members.length === 0 ? <EmptyState label="No members for selected workspace." /> : (
        <ul>
          {members.map((member) => <li key={member.id}>{member.display_name} ({member.role})</li>)}
        </ul>
      )}
    </div>
  );
}
