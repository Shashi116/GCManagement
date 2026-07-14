import React from 'react';

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
      <span>⚠ {message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400/60 hover:text-red-400 text-lg leading-none transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
}
