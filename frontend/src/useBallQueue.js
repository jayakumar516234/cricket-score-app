import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { applyQueueToView } from './engine/scoring.js';

export function useBallQueue({ matchId, view, setData, setActError, act }) {
  const [queue, setQueue] = useState(() => {
    try {
      const stored = localStorage.getItem(`cricket_ball_queue_${matchId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline' | 'error'

  const queueRef = useRef(queue);
  queueRef.current = queue;

  const serverViewRef = useRef(view);
  // Keep serverViewRef updated with incoming server view when queue is empty
  useEffect(() => {
    if (view && queueRef.current.length === 0) {
      serverViewRef.current = view;
    }
  }, [view]);

  const isProcessingRef = useRef(false);

  const saveQueue = (q) => {
    queueRef.current = q;
    setQueue(q);
    try {
      if (q.length === 0) {
        localStorage.removeItem(`cricket_ball_queue_${matchId}`);
      } else {
        localStorage.setItem(`cricket_ball_queue_${matchId}`, JSON.stringify(q));
      }
    } catch (e) {
      console.warn('Could not persist ball queue to localStorage:', e);
    }
  };

  const processQueue = async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;
    isProcessingRef.current = true;
    setSyncStatus('syncing');

    while (queueRef.current.length > 0) {
      const item = queueRef.current[0];
      try {
        const res = await api(`/matches/${matchId}/balls`, {
          method: 'POST',
          body: item.candidate,
        });

        // Ball successfully written on server!
        serverViewRef.current = res;
        const remaining = queueRef.current.slice(1);
        saveQueue(remaining);

        if (remaining.length === 0) {
          setData(res);
          setSyncStatus('synced');
          if (setActError) setActError('');
        } else {
          // Re-apply remaining pending balls on top of new confirmed baseline
          const optimisticView = applyQueueToView(res, remaining);
          setData(optimisticView);
        }
      } catch (err) {
        console.error('Ball queue sync error:', err);

        // If client is offline or fetch failed (network down)
        const isNetwork = !navigator.onLine || err.message?.includes('network') || err.message?.includes('Failed to fetch');
        if (isNetwork) {
          setSyncStatus('offline');
          // Wait 4 seconds before next retry
          await new Promise((r) => setTimeout(r, 4000));
        } else if (err.status >= 400 && err.status < 500) {
          // Validation conflict (e.g. state was already modified on another device)
          if (setActError) setActError(`Scoring error: ${err.message}`);
          setSyncStatus('error');
          // Remove the invalid item so it does not block subsequent balls
          const remaining = queueRef.current.slice(1);
          saveQueue(remaining);
        } else {
          setSyncStatus('error');
          if (setActError) setActError(`Sync issue: ${err.message}. Retrying in background...`);
          await new Promise((r) => setTimeout(r, 3000));
        }
        break;
      }
    }

    isProcessingRef.current = false;
    if (queueRef.current.length === 0) {
      setSyncStatus('synced');
    }
  };

  // Listen to browser coming online to resume queue sync
  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process any pending balls from previous session upon load
  useEffect(() => {
    if (queueRef.current.length > 0 && view) {
      // Re-apply any stored balls optimistically to current view
      const optimisticView = applyQueueToView(view, queueRef.current);
      setData(optimisticView);
      processQueue();
    }
  }, [view?.match?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // User submits a ball
  const sendBall = (candidate) => {
    const newQueue = [...queueRef.current, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, candidate }];
    saveQueue(newQueue);

    // Optimistically calculate and render new score immediately!
    const optimisticView = applyQueueToView(serverViewRef.current || view, newQueue);
    setData(optimisticView);

    // Kick off queue processing in background
    processQueue();
    return true;
  };

  // User clicks undo
  const undoBall = async () => {
    if (queueRef.current.length > 0) {
      // Cancel the most recently queued ball locally
      const remaining = queueRef.current.slice(0, -1);
      saveQueue(remaining);
      const optimisticView = applyQueueToView(serverViewRef.current || view, remaining);
      setData(optimisticView);
      return { ok: true };
    }

    // Queue is empty, call server undo
    return act(async () => {
      const res = await api(`/matches/${matchId}/balls/last`, { method: 'DELETE' });
      serverViewRef.current = res;
      return res;
    });
  };

  return {
    queue,
    syncStatus,
    sendBall,
    undoBall,
  };
}
