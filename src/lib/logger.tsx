'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Terminal } from 'lucide-react';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

// Global log store
const logs: LogEntry[] = [];
const listeners: Set<() => void> = new Set();

const addLog = (level: LogLevel, message: string, data?: any) => {
  const entry: LogEntry = {
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toLocaleTimeString(),
    level,
    message,
    data: data ? JSON.parse(JSON.stringify(data, getCircularReplacer())) : undefined,
  };
  logs.unshift(entry);
  if (logs.length > 50) logs.pop(); // Keep last 50 logs
  listeners.forEach(l => l());
  
  // Also log to real console
  if (level === 'error') console.error(message, data);
  else if (level === 'warn') console.warn(message, data);
  else console.log(message, data);
};

// Handle circular references in JSON
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
};

export const logger = {
  info: (msg: string, data?: any) => addLog('info', msg, data),
  warn: (msg: string, data?: any) => addLog('warn', msg, data),
  error: (msg: string, data?: any) => addLog('error', msg, data),
};

export const DebugConsole = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    const update = () => setEntries([...logs]);
    listeners.add(update);
    
    // Auto-open on error? Maybe annoying. Let's keep it manual.
    // Except if we detect "Failed to fetch" which is critical
    const criticalErrorListener = () => {
        if (logs[0]?.message.includes('Failed to fetch')) {
            setIsOpen(true);
        }
    };
    listeners.add(criticalErrorListener);

    // Global trigger: 5 clicks on document body top left (hidden trigger)
    // Or just expose window.toggleDebug()
    (window as any).toggleDebug = () => setIsOpen(prev => !prev);

    return () => {
        listeners.delete(update);
        listeners.delete(criticalErrorListener);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex flex-col font-mono text-xs">
      <div className="flex items-center justify-between bg-gray-900 p-2 border-b border-gray-700 text-white">
        <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="font-bold">Debug Console</span>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => {
                    const text = entries.map(e => `[${e.timestamp}] ${e.level.toUpperCase()}: ${e.message} ${e.data ? JSON.stringify(e.data) : ''}`).join('\n');
                    navigator.clipboard.writeText(text);
                    alert('Logs copied!');
                }}
                className="p-1 hover:bg-gray-700 rounded"
            >
                <Copy className="w-4 h-4" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-700 rounded text-red-400">
                <X className="w-4 h-4" />
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {entries.map(entry => (
          <div key={entry.id} className={`p-2 rounded border-l-2 ${
            entry.level === 'error' ? 'bg-red-900/30 border-red-500 text-red-200' :
            entry.level === 'warn' ? 'bg-yellow-900/30 border-yellow-500 text-yellow-200' :
            'bg-gray-800/50 border-blue-500 text-blue-200'
          }`}>
            <div className="flex gap-2 opacity-50 mb-1">
                <span>{entry.timestamp}</span>
                <span className="uppercase font-bold">{entry.level}</span>
            </div>
            <div className="break-all whitespace-pre-wrap">{entry.message}</div>
            {entry.data && (
                <pre className="mt-2 bg-black/50 p-2 rounded overflow-auto max-h-40 text-[10px] text-gray-400">
                    {JSON.stringify(entry.data, null, 2)}
                </pre>
            )}
          </div>
        ))}
        {entries.length === 0 && <div className="text-gray-500 text-center mt-10">No logs yet...</div>}
      </div>
    </div>
  );
};
