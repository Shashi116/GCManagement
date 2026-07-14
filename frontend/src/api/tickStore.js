/**
 * tickStore.js
 * Holds remainingSeconds for running sessions outside React state.
 * Only components that subscribe to a specific sessionId re-render on tick.
 */

const store    = new Map();           // sessionId → remainingSeconds
const listeners = new Map();          // sessionId → Set<() => void>

export function setTick(sessionId, remainingSeconds) {
  store.set(sessionId, remainingSeconds);
  listeners.get(sessionId)?.forEach((fn) => fn());
}

export function setTicks(ticks) {
  ticks.forEach(({ sessionId, remainingSeconds }) => setTick(sessionId, remainingSeconds));
}

export function getTick(sessionId) {
  return store.get(sessionId);
}

export function removeTick(sessionId) {
  store.delete(sessionId);
  listeners.delete(sessionId);
}

export function subscribe(sessionId, fn) {
  if (!listeners.has(sessionId)) listeners.set(sessionId, new Set());
  listeners.get(sessionId).add(fn);
  return () => listeners.get(sessionId)?.delete(fn);
}
