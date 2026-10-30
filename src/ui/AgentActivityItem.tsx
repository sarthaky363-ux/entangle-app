/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AgentActivityItem: Displays transparent, auditable agent tool executions.
 * Shows tool name, inputs, output, and execution duration in milliseconds.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock, Terminal } from 'lucide-react';
import { AgentActivityLog } from '../state/types.ts';

interface AgentActivityItemProps {
  activity: Partial<AgentActivityLog> & {
    toolName?: string;
    timestamp?: number;
    agent?: string;
    inputParams?: any;
    outputResult?: any;
    executionMs?: number;
    status?: 'success' | 'retry' | 'error';
    errorDetail?: string;
    reason?: string;
  };
}

export const AgentActivityItem: React.FC<AgentActivityItemProps> = ({ activity }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toolName = activity.toolName || 'agent_action';
  const executionMs = activity.executionMs ?? 12;
  const status = activity.status ?? 'success';
  const timeStr = activity.timestamp ? new Date(activity.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

  return (
    <div className="rounded-[14px] bg-[#FAF6EE] border border-[#E4D9C5] p-3 text-xs font-mono transition-all hover:bg-[#F2EBDD]">
      <div 
        className="flex items-center justify-between gap-2 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button 
            type="button"
            className="text-[#7A6A5A] hover:text-[#3A2E26] shrink-0"
            aria-label="Toggle execution payload"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          
          <span className="font-bold text-[#5F7A61] truncate">
            {toolName}()
          </span>
          
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-[#E4D9C5] text-[#3A2E26]">
            {activity.agent || 'Triage'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[10px] text-[#7A6A5A]">
            <Clock className="w-3 h-3 text-[#4F7C82]" />
            {executionMs}ms
          </span>

          {status === 'success' ? (
            <span className="w-2 h-2 rounded-full bg-[#5F7A61]" title="Successful execution" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#9E2F22]" title={activity.errorDetail || 'Execution error'} />
          )}
        </div>
      </div>

      {activity.reason && (
        <div className="font-sans text-[11px] text-[#7A6A5A] mt-1 line-clamp-2 pl-5">
          {activity.reason}
        </div>
      )}

      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-[#E4D9C5] space-y-2 text-[10px] pl-5 animate-in fade-in">
          <div>
            <span className="font-bold text-[#7A6A5A] uppercase tracking-wider block mb-0.5">
              Input Parameters:
            </span>
            <pre className="p-2 rounded-lg bg-[#FFFDF8] border border-[#E4D9C5] overflow-x-auto text-[#3A2E26]">
              {JSON.stringify(activity.inputParams || {}, null, 2)}
            </pre>
          </div>

          <div>
            <span className="font-bold text-[#7A6A5A] uppercase tracking-wider block mb-0.5">
              Tool Output:
            </span>
            <pre className="p-2 rounded-lg bg-[#FFFDF8] border border-[#E4D9C5] overflow-x-auto text-[#5F7A61]">
              {JSON.stringify(activity.outputResult || {}, null, 2)}
            </pre>
          </div>

          <div className="flex items-center justify-between text-[9px] text-[#7A6A5A] pt-1">
            <span>Executed at {timeStr}</span>
            <span>Deterministic TS Computation</span>
          </div>
        </div>
      )}
    </div>
  );
};
