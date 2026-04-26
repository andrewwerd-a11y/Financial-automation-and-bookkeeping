import { useEffect, useState } from 'react';
import { getHealth, getSystemStatus, listSettings, upsertSetting } from '../api/client';
import { EmptyState, ErrorState, LoadingState, Section } from '../components/StateBlocks';
import type { AppSetting, SystemStatus } from '../types';

const parseSettingValue = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    // DECISION: preserve non-JSON textarea input as a plain string so the UI can manage legacy/raw values without forcing valid JSON syntax.
    return raw;
  }
};

const formatSettingValue = (valueJson: string) => {
  try {
    return JSON.stringify(JSON.parse(valueJson), null, 2);
  } catch {
    return valueJson;
  }
};

export function SettingsPage({ activeWorkspaceId }: { activeWorkspaceId: string }) {
  const [health, setHealth] = useState<string>('loading');
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [systemLoading, setSystemLoading] = useState(true);
  const [systemError, setSystemError] = useState('');
  const [settingsRows, setSettingsRows] = useState<AppSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [message, setMessage] = useState('');
  const [createForm, setCreateForm] = useState({ key: '', value: '' });
  const [editForm, setEditForm] = useState({ id: '', key: '', value: '' });

  const loadSystem = async () => {
    try {
      setSystemLoading(true);
      setSystemError('');
      const h = await getHealth();
      setHealth(h.ok ? 'ok' : 'down');
      setSystem(await getSystemStatus());
    } catch (err) {
      setSystemError((err as Error).message);
    } finally {
      setSystemLoading(false);
    }
  };

  const loadSettingsSection = async (workspaceId: string) => {
    try {
      setSettingsLoading(true);
      setSettingsError('');
      setSettingsRows(await listSettings(workspaceId));
    } catch (err) {
      setSettingsError((err as Error).message);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => { void loadSystem(); }, []);

  useEffect(() => {
    setEditForm({ id: '', key: '', value: '' });
    setCreateForm({ key: '', value: '' });
    setMessage('');

    if (!activeWorkspaceId) {
      setSettingsRows([]);
      setSettingsLoading(false);
      setSettingsError('');
      return;
    }

    void loadSettingsSection(activeWorkspaceId);
  }, [activeWorkspaceId]);

  const submitCreate = async () => {
    if (!activeWorkspaceId || !createForm.key) return;
    try {
      setSettingsError('');
      setMessage('');
      await upsertSetting({
        workspaceId: activeWorkspaceId,
        key: createForm.key,
        value: parseSettingValue(createForm.value)
      });
      setCreateForm({ key: '', value: '' });
      setMessage('Setting saved.');
      await loadSettingsSection(activeWorkspaceId);
    } catch (err) {
      setSettingsError((err as Error).message);
    }
  };

  const submitEdit = async () => {
    if (!activeWorkspaceId || !editForm.key) return;
    try {
      setSettingsError('');
      setMessage('');
      await upsertSetting({
        workspaceId: activeWorkspaceId,
        key: editForm.key,
        value: parseSettingValue(editForm.value)
      });
      setEditForm({ id: '', key: '', value: '' });
      setMessage('Setting updated.');
      await loadSettingsSection(activeWorkspaceId);
    } catch (err) {
      setSettingsError((err as Error).message);
    }
  };

  return (
    <div>
      <Section title="System / Settings">
        {systemLoading && <LoadingState label="Checking system status..." />}
        {systemError && <ErrorState message={systemError} onRetry={() => void loadSystem()} />}
        {!systemLoading && !systemError && (
          <>
            <p>Backend health: {health}</p>
            <pre>{JSON.stringify(system, null, 2)}</pre>
          </>
        )}
        <button onClick={() => void loadSystem()}>Refresh Status</button>
      </Section>

      <Section title="Workspace Settings">
        {!activeWorkspaceId ? <p>Select a workspace to manage settings.</p> : (
          <>
            <button onClick={() => void loadSettingsSection(activeWorkspaceId)}>Refresh Settings</button>
            {message ? <p>{message}</p> : null}
            {settingsLoading && <LoadingState label="Loading workspace settings..." />}
            {settingsError && <ErrorState message={settingsError} onRetry={() => void loadSettingsSection(activeWorkspaceId)} />}

            {!settingsLoading && !settingsError && settingsRows.length === 0 ? <EmptyState label="No settings for this workspace yet." /> : null}
            {!settingsLoading && !settingsError && settingsRows.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settingsRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.key}</td>
                      <td><pre>{formatSettingValue(row.value_json)}</pre></td>
                      <td>{row.updated_at}</td>
                      <td>
                        <button onClick={() => setEditForm({ id: row.id, key: row.key, value: row.value_json })}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            <div className="panel">
              <h3>Create Setting</h3>
              <input
                placeholder="Setting key"
                value={createForm.key}
                onChange={(event) => setCreateForm((current) => ({ ...current, key: event.target.value }))}
              />
              <textarea
                rows={4}
                placeholder="JSON value or plain text"
                value={createForm.value}
                onChange={(event) => setCreateForm((current) => ({ ...current, value: event.target.value }))}
              />
              <button onClick={() => void submitCreate()} disabled={!createForm.key}>Create Setting</button>
            </div>

            {editForm.id ? (
              <div className="panel">
                <h3>Edit Setting</h3>
                <input value={editForm.key} readOnly />
                <textarea
                  rows={4}
                  value={editForm.value}
                  onChange={(event) => setEditForm((current) => ({ ...current, value: event.target.value }))}
                />
                <button onClick={() => void submitEdit()}>Save Setting</button>
                <button onClick={() => setEditForm({ id: '', key: '', value: '' })}>Cancel</button>
              </div>
            ) : null}
          </>
        )}
      </Section>
    </div>
  );
}
