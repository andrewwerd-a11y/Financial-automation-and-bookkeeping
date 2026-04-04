import { useState } from 'react';
import { upload } from '../api/client';

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ columns: string[]; sampleRows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const doPreview = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const data = await upload<{ columns: string[]; sampleRows: Record<string, string>[] }>('/imports/csv/preview', form);
    setPreview(data);
  };

  const process = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('mapping', JSON.stringify(mapping));
    form.append('mapperPresetName', 'default_phase0');
    const result = await upload('/imports/csv/process', form);
    alert(`Import complete: ${JSON.stringify(result)}`);
  };

  return <div>
    <h2>CSV Import</h2>
    <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
    <button onClick={() => void doPreview()}>Preview</button>
    {preview && <>
      <h3>Column Mapping</h3>
      {['date', 'amount', 'vendor', 'description', 'sourceAccount', 'direction'].map((field) => (
        <div key={field}>
          <label>{field}</label>
          <select onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}>
            <option value="">-- select column --</option>
            {preview.columns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      ))}
      <button onClick={() => void process()}>Process Import</button>
    </>}
  </div>;
}
