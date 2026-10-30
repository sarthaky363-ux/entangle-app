/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Agent Activity & Tool Inspection Console
 * STRICT REQUIREMENT: Every agent tool call is visible with name, inputs, output, and execution time.
 */

import React, { useState } from 'react';
import {
  Activity,
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Terminal,
  Zap,
} from 'lucide-react';
import { useWorldStore } from '../state/store.ts';
import { AgentActivityLog, AgentRole } from '../state/types.ts';

export const AgentActivityPanel: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const logs: AgentActivityLog[] = ((useWorldStore.getState() as any).agentLogs || []);
  const filteredLogs = logs.filter((log: AgentActivityLog) => {
    if (selectedAgent !== 'all' && log.agent !== selectedAgent) return false;
    return true;
  });

  const getAgentColor = (role: AgentRole) => {
    switch (role) {
      case 'triage': return 'bg-[#5F7A61] text-white';
      case 'credibility': return 'bg-[#4F7C82] text-white';
      case 'dispatch': return 'bg-[#B0623A] text-white';
      case 'simulation': return 'bg-[#7A6A5A] text-white';
      case 'comms': return 'bg-[#9E2F22] text-white';
      default: return 'bg-[#3A2E26] text-white';
    }
  };

  return (
    <div className="bg-[#FFFDF8] rounded-[20px] border border-[#E4D9C5] p-5 shadow-xs flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 pb-3 border-b border-[#E4D9C5]">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-[#4F7C82]" />
          <div>
            <h2 className="text-base font-bold font-heading text-[#3A2E26]">
              Agent Activity &amp; Tool Ledger
            </h2>
            <p className="text-[11px] text-[#7A6A5A]">
              Live inspection of tool executions, arguments &amp; returned telemetry
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {['all', 'triage', 'credibility', 'dispatch', 'simulation', 'comms'].map(agent => (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              className={`px-2.5 py-0.5 rounded-full capitalize text-[11px] font-semibold border transition-colors ${
                selectedAgent === agent
                  ? 'bg-[#3A2E26] text-white border-[#3A2E26]'
                  : 'bg-[#FAF6EE] text-[#7A6A5A] border-[#E4D9C5] hover:text-[#3A2E26]'
              }`}
            >
              {agent}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries Stream */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px]">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#7A6A5A]">
            No tool activity recorded for this filter.
          </div>
        ) : (
          filteredLogs.map((log: AgentActivityLog) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] overflow-hidden text-xs"
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#F2EBDD] transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getAgentColor(
                        log.agent
                      )}`}
                    >
                      {log.agent}
                    </span>
                    <span className="font-mono font-bold text-[#3A2E26]">
                      {log.toolName}
                    </span>
                    <span className="text-[11px] text-[#7A6A5A] truncate max-w-xs">
                      • {log.triggerReason}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11px] text-[#7A6A5A]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {log.executionMs}ms
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full font-bold ${
                        log.status === 'success'
                          ? 'text-[#3D5939] bg-[#E3EDDF]'
                          : 'text-[#B8412F] bg-[#F6DDD6]'
                      }`}
                    >
                      {log.status}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>

                {/* Expanded Inspection Drawer */}
                {isExpanded && (
                  <div className="p-3 bg-[#FFFDF8] border-t border-[#E4D9C5] space-y-2.5 text-[11px] font-mono">
                    <div>
                      <span className="text-[#7A6A5A] font-bold block mb-1">
                        Input Parameters:
                      </span>
                      <pre className="p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] overflow-x-auto text-[#3A2E26]">
                        {JSON.stringify(log.inputParams, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <span className="text-[#5F7A61] font-bold block mb-1">
                        Tool Output / Calculated Result:
                      </span>
                      <pre className="p-2.5 rounded-lg bg-[#FAF6EE] border border-[#E4D9C5] overflow-x-auto text-[#3A2E26]">
                        {JSON.stringify(log.outputResult, null, 2)}
                      </pre>
                    </div>

                    {log.errorDetail && (
                      <div className="p-2 rounded-lg bg-[#F6DDD6] text-[#7A1C0E]">
                        {log.errorDetail}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
