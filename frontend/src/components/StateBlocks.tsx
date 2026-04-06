import type { ReactNode } from 'react';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <p>{label}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div>
      <p>Error: {message}</p>
      {onRetry ? <button onClick={onRetry}>Retry</button> : null}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p>{label}</p>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
