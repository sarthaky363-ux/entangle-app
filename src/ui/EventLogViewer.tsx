/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Versioned Event Ledger Drawer
 * Complete audit trail of every state transition in the versioned WorldState.
 */

import React from 'react';
import { History, X, Shield, GitCommit, User, Bot, AlertTriangle } from 'lucide-react';
import { useWorldStore } from '../state/store.ts';

interface EventLogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EventLogViewer: React.FC<EventLogViewerProps> = ({ isOpen, onClose }) => {
  const { events, version } = useWorldStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-[#FFFDF8] h-full shadow-2xl flex flex-col border-l border-[#E4D9C5] animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E4D9C5] flex items-center justify-between bg-[#FAF6EE]">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#5F7A61]" />
            <div>
              <h2 className="text-base font-bold font-heading text-[#3A2E26]">
                WorldState Event Ledger
              </h2>
              <p className="text-xs text-[#7A6A5A]">
                Append-only immutable record • Current State Version: v{version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F2EBDD] text-[#7A6A5A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 font-mono text-xs">
          {events.map((evt, idx) => {
            const isHuman = evt.actor === 'human';
            const isSystem = evt.actor === 'system';
            const isKill = evt.type.includes('KILL');

            return (
              <div
                key={evt.id}
                className={`p-3.5 rounded-xl border ${
                  isKill
                    ? 'bg-[#F6DDD6] border-[#B8412F]'
                    : isHuman
                    ? 'bg-[#E3EDDF] border-[#6E8F6A]'
                    : 'bg-[#FAF6EE] border-[#E4D9C5]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold px-2 py-0.5 rounded-full bg-[#FFFDF8] border border-[#E4D9C5] text-[10px] text-[#3A2E26]">
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
                  </div>
                  <span className="text-[10px] text-[#7A6A5A]">
                    {new Date(evt.ts).toLocaleTimeString()}
                  </span>
                </div>

                <div className="font-bold text-[#3A2E26] text-xs mb-1">
                  {evt.type}
                </div>

                <p className="text-[11px] text-[#7A6A5A] leading-relaxed mb-2 font-sans">
                  {evt.reason}
                </p>

                {evt.payload && Object.keys(evt.payload).length > 0 && (
                  <pre className="p-2 rounded-lg bg-[#FFFDF8] border border-[#E4D9C5] text-[10px] overflow-x-auto text-[#3A2E26]">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
