import React, { useEffect, useRef, useState } from 'react';
import { GameEvent } from '../types';

interface TerminalLogProps {
  logs: { id: string, text: string, type: 'info' | 'error' | 'success' | 'warning' }[];
}

export const TerminalLog: React.FC<TerminalLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-full w-full bg-[#0a0f18] border border-slate-700/50 rounded font-mono text-[10px] p-2 overflow-hidden relative shadow-inner">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-6 bg-slate-800 border-b border-slate-700 flex items-center px-2 justify-between z-10">
            <span className="text-slate-400">TERMINAL_OUTPUT // tty1</span>
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                <div className="w-2 h-2 rounded-full bg-slate-600"></div>
            </div>
        </div>

        {/* Content */}
        <div className="pt-6 pb-2 h-full overflow-y-auto scrollbar-none space-y-1">
            <div className="text-slate-500">System boot sequence initiated...</div>
            <div className="text-slate-500">Loading kernel modules... OK</div>
            <div className="text-slate-500">Mounting /dev/sda1... OK</div>
            <div className="text-emerald-500/50">----------------------------------------</div>
            
            {logs.map((log) => (
                <div key={log.id} className="flex gap-2 font-mono">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                    <span className={`
                        ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
                        ${log.type === 'warning' ? 'text-amber-500' : ''}
                        ${log.type === 'success' ? 'text-emerald-400' : ''}
                        ${log.type === 'info' ? 'text-cyan-200' : ''}
                    `}>
                        {log.type === 'error' && '>> FATAL: '}
                        {log.type === 'warning' && '>> WARN: '}
                        {log.type === 'success' && '>> OK: '}
                        {log.text}
                    </span>
                </div>
            ))}
            <div ref={bottomRef} />
            
            {/* Blinking Cursor */}
            <div className="flex gap-1 items-center text-cyan-500 mt-2">
                <span>root@event-sys:~#</span>
                <span className="w-2 h-4 bg-cyan-500 animate-pulse"></span>
            </div>
        </div>
    </div>
  );
};