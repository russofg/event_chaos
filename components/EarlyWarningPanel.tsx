import React from 'react';
import { EarlyWarning, SYSTEM_COLORS } from '../types';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface EarlyWarningPanelProps {
  warnings: EarlyWarning[];
}

export const EarlyWarningPanel: React.FC<EarlyWarningPanelProps> = ({ warnings }) => {
  if (warnings.length === 0) return null;

  const getSeverityColor = (severity: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (severity) {
      case 'HIGH': return 'border-red-500 bg-red-950/80';
      case 'MEDIUM': return 'border-orange-500 bg-orange-950/80';
      case 'LOW': return 'border-yellow-500 bg-yellow-950/80';
    }
  };

  return (
    <div className="absolute top-20 left-8 z-[100] w-80 space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
      {warnings.map(warning => (
        <div
          key={warning.id}
          className={`border-l-4 ${getSeverityColor(warning.severity)} rounded-r-lg p-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right`}
        >
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 mt-0.5 ${
              warning.severity === 'HIGH' ? 'text-red-400' :
              warning.severity === 'MEDIUM' ? 'text-orange-400' :
              'text-yellow-400'
            }`} />
            <div className="flex-1">
              <div className={`text-xs font-mono uppercase tracking-wider ${
                warning.severity === 'HIGH' ? 'text-red-400' :
                warning.severity === 'MEDIUM' ? 'text-orange-400' :
                'text-yellow-400'
              }`}>
                ADVERTENCIA TEMPRANA
              </div>
              <div className={`text-[10px] font-mono ${SYSTEM_COLORS[warning.systemId].split(' ')[0]}`}>
                {warning.systemId}
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-slate-400">
              <Clock className="w-3 h-3" />
              {warning.timeUntilEvent}s
            </div>
          </div>
          
          <p className="text-xs text-slate-200 mb-2 leading-relaxed">
            {warning.message}
          </p>
          
          {warning.canPrevent && warning.preventionAction && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
              <CheckCircle className="w-3 h-3" />
              <span className="font-mono">Prevenir: {warning.preventionAction}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
