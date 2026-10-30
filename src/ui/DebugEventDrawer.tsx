/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Developer-Only Debug Drawer & Event Replay Console
 * STRICT REQUIREMENT:
 * Lists the raw event log, with a button 'Replay events from zero' that rebuilds the state to prove it is derived.
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  History,
  RotateCcw,
  Search,
  ShieldCheck,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import { runWorldStateSelfChecks } from '../state/selfChecks.ts';
import { useWorldStore } from '../state/store.ts';
import { Event } from '../state/types.ts';
import { Button } from './Button.tsx';

interface DebugEventDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugEventDrawer: React.FC<DebugEventDrawerProps> = ({ isOpen, onClose }) => {
  const { events, version, replayFromZero } = useWorldStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActor, setSelectedActor] = useState<string>('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [replayNotice, setReplayNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReplay = () => {
    const result = replayFromZero();
    const selfCheck = runWorldStateSelfChecks();

    if (result.success && selfCheck.allPassed) {
      setReplayNotice(
        `Replayed all ${result.eventCount} events from zero. State is identical. Version = v${result.version}.`
      );
    } else {
      setReplayNotice('Replay finished with potential state divergence. Check console logs.');
    }

    setTimeout(() => {
      setReplayNotice(null);
    }, 6000);
  };

  const filteredEvents = [...events].reverse().filter(evt => {
    if (selectedActor !== 'all' && evt.actor !== selectedActor) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.type.toLowerCase().includes(q) ||
        evt.reason.toLowerCase().includes(q) ||
        evt.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const actors = Array.from(new Set(events.map(e => e.actor)));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-[#FFFDF8] h-full shadow-2xl flex flex-col border-l border-[#E4D9C5] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E4D9C5] bg-[#FAF6EE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#4F7C82] text-white flex items-center justify-center shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-base text-[#3A2E26]">
                  Developer Event Sourcing Ledger
                </h2>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4D9C5] text-[#3A2E26]">
                  v{version}
                </span>
              </div>
              <p className="text-xs text-[#7A6A5A]">
                Append-only log ({events.length} events). All state is pure derivation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F2EBDD] text-[#7A6A5A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verification & Replay Action Strip */}
        <div className="p-4 bg-[#FFFDF8] border-b border-[#E4D9C5] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#5F7A61]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Pure Reducer: State = f(events[0..{version}])</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleReplay}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Replay events from zero
          </Button>
        </div>

        {/* Replay Notice Toast */}
        {replayNotice && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-[#E3EDDF] border border-[#6E8F6A] text-[#3D5939] text-xs font-mono flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{replayNotice}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-[#E4D9C5] bg-[#FAF6EE] flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#7A6A5A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event type, reason, or ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-[#E4D9C5] bg-[#FFFDF8] text-[#3A2E26] focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
            />
          </div>

          <select
            value={selectedActor}
            onChange={e => setSelectedActor(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-full border border-[#E4D9C5] bg-[#FFFDF8] text-[#3A2E26] focus:outline-none"
          >
            <option value="all">All Actors</option>
            {actors.map(act => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        {/* Raw Event Log List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#7A6A5A]">
              No events matching search filter.
            </div>
          ) : (
            filteredEvents.map(evt => {
              const isExpanded = expandedEventId === evt.id;
              const isKill = evt.type.includes('KILL');
              const isHuman = evt.actor === 'human';

              return (
                <div
                  key={evt.id}
                  className={`
                    rounded-xl border transition-colors
                    ${
                      isKill
                        ? 'bg-[#F6DDD6]/60 border-[#B8412F]'
                        : isHuman
                        ? 'bg-[#E3EDDF]/60 border-[#6E8F6A]'
                        : 'bg-[#FFFDF8] border-[#E4D9C5]'
                    }
                  `}
                >
                  <div
                    onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#FAF6EE] gap-2 select-none"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold px-2 py-0.5 rounded-full bg-[#FAF6EE] border border-[#E4D9C5] text-[10px] text-[#3A2E26]">
                        v{evt.version}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isHuman
                            ? 'bg-[#5F7A61] text-white'
                            : isKill
                            ? 'bg-[#9E2F22] text-white'
                            : 'bg-[#4F7C82] text-white'
                        }`}
                      >
                        {evt.actor}
                      </span>
                      <span className="font-bold text-[#3A2E26] text-xs">
                        {evt.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#7A6A5A] shrink-0">
                      <span>{new Date(evt.ts).toLocaleTimeString()}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="px-3 pb-2 text-[11px] text-[#7A6A5A] font-sans">
                    {evt.reason}
                  </div>

                  {/* Expanded JSON payload */}
                  {isExpanded && (
                    <div className="p-3 bg-[#FAF6EE] border-t border-[#E4D9C5] space-y-1 text-[11px]">
                      <div className="text-[#7A6A5A] font-bold">Event Payload:</div>
                      <pre className="p-2.5 rounded-lg bg-[#FFFDF8] border border-[#E4D9C5] overflow-x-auto text-[#3A2E26]">
                        {JSON.stringify(evt.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
