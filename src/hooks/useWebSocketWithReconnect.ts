import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Production-grade React Hook for WebSocket management with:
 * - Exponential Backoff retry strategy
 * - Heartbeat (Ping/Pong) detection
 * - Browser online/offline event handling
 * - Automatic cleanup and leak prevention
 */
export function useWebSocketWithReconnect(url: string | null, options: {
  baseDelay?: number;
  maxDelay?: number;
  maxRetries?: number;
  pingInterval?: number;
  pongTimeout?: number;
  onMessage?: (data: any) => void;
  onStatusChange?: (connected: boolean, reconnecting: boolean) => void;
} = {}) {
  const {
    baseDelay = 1000,
    maxDelay = 30000,
    maxRetries = 10,
    pingInterval = 25000,
    pongTimeout = 5000,
    onMessage,
    onStatusChange,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs to maintain state without causing re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);

  // Heartbeat management
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pongReceivedRef = useRef(true);

  // Clean up heartbeat timers
  const stopHeartbeat = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
  }, []);

  // Start heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    pongReceivedRef.current = true;

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send ping
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
        pongReceivedRef.current = false;

        // Wait for pong response
        pongTimeoutRef.current = setTimeout(() => {
          if (!pongReceivedRef.current) {
            console.warn('⚠️ Heartbeat Timeout: No Pong received. Closing socket...');
            if (wsRef.current) wsRef.current.close();
          }
        }, pongTimeout);
      }
    }, pingInterval);
  }, [pingInterval, pongTimeout, stopHeartbeat]);

  // Calculate next delay with exponential backoff + jitter
  const getNextDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      baseDelay * Math.pow(2, attempt),
      maxDelay
    );
    const jitter = exponentialDelay * 0.2 * Math.random();
    return exponentialDelay + jitter;
  }, [baseDelay, maxDelay]);

  // Main connection function
  const connect = useCallback(() => {
    if (!url || isUnmountedRef.current || !navigator.onLine) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isUnmountedRef.current) return;
      console.log('✅ WebSocket Connected');
      setIsConnected(true);
      setIsReconnecting(false);
      retryCountRef.current = 0;
      setRetryCount(0);
      onStatusChange?.(true, false);
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      if (isUnmountedRef.current) return;

      try {
        const data = JSON.parse(event.data);

        // Handle pong response
        if (data.type === 'pong') {
          pongReceivedRef.current = true;
          if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
          return;
        }

        // Pass other messages to consumer
        if (onMessage) onMessage(data);
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = (event) => {
      stopHeartbeat();
      if (isUnmountedRef.current) return;

      setIsConnected(false);

      // Don't reconnect on clean close (code 1000)
      if (event.code === 1000) return;

      scheduleReconnect();
    };

    ws.onerror = (error) => {
      console.error('⚠️ WebSocket Error:', error);
    };
  }, [url, startHeartbeat, stopHeartbeat, onMessage, onStatusChange]);

  // Schedule reconnect with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (retryCountRef.current >= maxRetries) {
      console.error('❌ Max reconnection attempts reached.');
      setIsReconnecting(false);
      onStatusChange?.(false, false);
      return;
    }

    setIsReconnecting(true);
    const delay = getNextDelay(retryCountRef.current);

    console.warn(
      `🔌 Reconnecting in ${(delay / 1000).toFixed(1)}s... (Attempt ${retryCountRef.current + 1}/${maxRetries})`
    );

    timerRef.current = setTimeout(() => {
      retryCountRef.current += 1;
      setRetryCount(retryCountRef.current);
      connect();
    }, delay);
  }, [maxRetries, getNextDelay, connect, onStatusChange]);

  // Manual reconnect button handler
  const manualReconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');
    retryCountRef.current = 0;
    setRetryCount(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsReconnecting(false);
    connect();
  }, [connect]);

  // Handle browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network restored. Forcing immediate reconnect...');
      retryCountRef.current = 0;
      setRetryCount(0);
      if (timerRef.current) clearTimeout(timerRef.current);
      connect();
    };

    const handleOffline = () => {
      console.warn('📡 Network lost. Halting WebSocket operations.');
      setIsConnected(false);
      setIsReconnecting(false);
      stopHeartbeat();
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect, stopHeartbeat]);

  // Lifecycle management
  useEffect(() => {
    isUnmountedRef.current = false;
    if (navigator.onLine) {
      connect();
    }

    return () => {
      isUnmountedRef.current = true;
      stopHeartbeat();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect, stopHeartbeat]);

  return {
    isConnected,
    isReconnecting,
    retryCount,
    manualReconnect,
  };
}
