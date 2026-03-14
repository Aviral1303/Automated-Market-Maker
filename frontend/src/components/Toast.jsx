import { XMarkIcon } from '@heroicons/react/24/outline';

export function Toast({ message, type, onDismiss }) {
  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-xl ${
        isError ? 'bg-danger/20 border-danger/50' : 'bg-success/20 border-success/50'
      }`}
      role="alert"
    >
      <span className="text-lg">{isError ? '✕' : '✓'}</span>
      <p className={isError ? 'text-red-200' : 'text-green-200'}>{message}</p>
      <button onClick={onDismiss} className="p-1 rounded hover:bg-white/10 transition-colors" aria-label="Dismiss">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
