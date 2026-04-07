import { useEffect, useMemo, useState } from 'react';
import { createImportTemplate, listImportTemplates, updateImportTemplate } from '../api/client';
import type { ImportTemplate } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

const defaultForm = {
  id: '',
  name: '',
  dateColumn: 'date',
  vendorColumn: 'vendor',
  amountColumn: 'amount',
  descriptionColumn: 'description'
};

export function ImportTemplatesPage() {
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setTemplates(await listImportTemplates());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === form.id), [templates, form.id]);

  const editTemplate = (template: ImportTemplate) => {
    const mapping = JSON.parse(template.mapping_json) as { dateColumn: string; vendorColumn: string; amountColumn: string; descriptionColumn?: string };
    setForm({
      id: template.id,
      name: template.name,
      dateColumn: mapping.dateColumn,
      vendorColumn: mapping.vendorColumn,
      amountColumn: mapping.amountColumn,
      descriptionColumn: mapping.descriptionColumn ?? ''
    });
  };

  const submit = async () => {
    try {
      setError('');
      const payload = {
        name: form.name,
        mapping: {
          dateColumn: form.dateColumn,
          vendorColumn: form.vendorColumn,
          amountColumn: form.amountColumn,
          descriptionColumn: form.descriptionColumn || undefined
        }
      };
      if (form.id) {
        await updateImportTemplate(form.id, payload);
        setMessage('Template updated.');
      } else {
        await createImportTemplate(payload);
        setMessage('Template created.');
      }
      setForm(defaultForm);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Import Templates</h2>
      {loading && <LoadingState label="Loading templates..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {message && <p>{message}</p>}

      <div className="panel">
        <h3>{form.id ? 'Edit Template' : 'Create Template'}</h3>
        <input placeholder="Template name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Date column" value={form.dateColumn} onChange={(e) => setForm({ ...form, dateColumn: e.target.value })} />
        <input placeholder="Vendor column" value={form.vendorColumn} onChange={(e) => setForm({ ...form, vendorColumn: e.target.value })} />
        <input placeholder="Amount column" value={form.amountColumn} onChange={(e) => setForm({ ...form, amountColumn: e.target.value })} />
        <input placeholder="Description column (optional)" value={form.descriptionColumn} onChange={(e) => setForm({ ...form, descriptionColumn: e.target.value })} />
        <button onClick={() => void submit()} disabled={!form.name}>Save Template</button>
        <button onClick={() => setForm(defaultForm)}>Clear</button>
      </div>

      {!loading && !error && templates.length === 0 ? <EmptyState label="No import templates yet." /> : (
        <table>
          <thead><tr><th>Name</th><th>Mapping</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td>{template.name}</td>
                <td><code>{template.mapping_json}</code></td>
                <td>{template.updated_at}</td>
                <td><button onClick={() => editTemplate(template)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedTemplate && <p>Editing: {selectedTemplate.name}</p>}
    </div>
  );
}
