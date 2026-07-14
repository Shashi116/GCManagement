import React from 'react';

export default function Spinner({ size = 'md', className = '' }) {
  const sz = size === 'sm' ? 'w-4 h-4 border-2' : size === 'lg' ? 'w-10 h-10 border-4' : 'w-6 h-6 border-2';
  return (
    <div
      className={`${sz} rounded-full border-white/20 border-t-indigo-400 animate-spin ${className}`}
    />
  );
}
