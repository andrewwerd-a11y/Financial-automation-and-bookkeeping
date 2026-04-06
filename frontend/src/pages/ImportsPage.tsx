import { useEffect, useState } from 'react';
import { listImportTemplates, listImports, uploadCsv, uploadCsvBulk } from '../api/client';
import type { ImportTemplate, SourceFile } from '../types';
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks';

export function ImportsPage() {
  const [rows, setRows] = useState<SourceFile[]>([]);
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [importsRows, templateRows] = await Promise.all([listImports(), listImportTemplates()]);
      setRows(importsRows);
      setTemplates(templateRows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const submitSingle = async () => {
    if (!file) return;
    try {
      setError('');
      const result = await uploadCsv(file, { templateId: templateId || undefined, saveTemplateName: saveTemplateName || undefined });
      setMessage(`Imported ${result.importedCount} rows, skipped ${result.skippedCount}. Job: ${result.jobId}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const submitBulk = async () => {
    if (!bulkFiles.length) return;
    try {
      setError('');
      const result = await uploadCsvBulk(bulkFiles, templateId || undefined);
      setMessage(`Bulk import finished: ${result.completed}/${result.totalFiles} files completed (${result.failed} failed).`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <h2>Imports (CSV)</h2>

      <h3>Single File Import</h3>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        <option value="">No template</option>
        {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
      </select>
      <input placeholder="Save inferred template as (optional)" value={saveTemplateName} onChange={(e) => setSaveTemplateName(e.target.value)} />
      <button onClick={() => void submitSingle()} disabled={!file}>Upload CSV</button>

      <h3>Bulk File Import</h3>
      <input type="file" accept=".csv" multiple onChange={(e) => setBulkFiles(Array.from(e.target.files ?? []))} />
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        <option value="">No template</option>
        {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
      </select>
      <button onClick={() => void submitBulk()} disabled={!bulkFiles.length}>Upload Bulk CSVs</button>
      <p>Selected files: {bulkFiles.length}</p>

      <button onClick={() => void load()}>Refresh</button>
      {loading && <LoadingState label="Loading imports..." />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {message && <p>{message}</p>}
      {!loading && !error && rows.length === 0 ? <EmptyState label="No CSV imports yet." /> : (
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Uploaded</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><td>{row.original_name}</td><td>{row.mime_type}</td><td>{row.size_bytes}</td><td>{row.uploaded_at}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
