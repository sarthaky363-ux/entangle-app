import React from 'react';
import { MessageCircle, Send, Smartphone } from 'lucide-react';
import { CommsDraft, LanguageCode } from '../state/types.ts';
import { useWorldStore } from '../state/store.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card.tsx';
import { Button } from './Button.tsx';

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
};

export const CommsBoard: React.FC = () => {
  const drafts = useWorldStore(state => state.commsDrafts);
  const outbox = useWorldStore(state => state.commsOutbox);
  const isKilled = useWorldStore(state => state.isKilled);
  const approveCommsDraft = useWorldStore(state => state.approveCommsDraft);
  const rows = new Map<string, CommsDraft[]>();

  Object.values(drafts).forEach(draft => {
    const areaDrafts = rows.get(draft.wardId) || [];
    areaDrafts.push(draft);
    rows.set(draft.wardId, areaDrafts);
  });
  if (rows.size === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[#4F7C82]" />
          <CardTitle className="text-sm">Comms Agent · operator review</CardTitle>
        </div>
        <CardDescription>
          Drafts are checked for length and script. Approving one language creates only that message in the mock outbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[690px] border-separate border-spacing-2 text-left align-top">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-wide text-[#7A6A5A]">
                <th className="w-28">Affected area</th>
                {(['en', 'hi', 'mr'] as LanguageCode[]).map(language => (
                  <th key={language}>{LANGUAGE_LABELS[language]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows.entries()].map(([wardId, areaDrafts]) => (
                <tr key={wardId}>
                  <th className="rounded-lg bg-[#F2EBDD] p-2 text-xs font-semibold text-[#3A2E26] align-top">
                    {areaDrafts[0].areaName}
                  </th>
                  {(['en', 'hi', 'mr'] as LanguageCode[]).map(language => {
                    const draft = areaDrafts.find(item => item.language === language);
                    if (!draft) return <td key={language} />;
                    return (
                      <td key={language} className="w-[28%] rounded-lg border border-[#E4D9C5] bg-[#FFFDF8] p-2 align-top">
                        <p lang={language} className="min-h-20 text-[11px] leading-relaxed text-[#3A2E26]">{draft.text}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={`font-mono text-[9px] ${Array.from(draft.text).length < 280 ? 'text-[#5F7A61]' : 'text-[#9E2F22]'}`}>
                            {Array.from(draft.text).length}/280
                          </span>
                          <Button
                            variant={draft.approvedByHuman ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={isKilled || draft.approvedByHuman}
                            onClick={() => approveCommsDraft(draft.id)}
                            leftIcon={<Send className="h-3 w-3" />}
                            className="text-[9px]"
                          >
                            {draft.approvedByHuman ? 'Approved' : 'Approve message'}
                          </Button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] p-3" aria-label="Mock message outbox">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#3A2E26]">
                <Smartphone className="h-3.5 w-3.5 text-[#5F7A61]" /> Mock outbox
              </h3>
              <p className="mt-0.5 text-[10px] text-[#7A6A5A]">Local preview only; no external messages are sent.</p>
            </div>
            <span className="rounded-full border border-[#E4D9C5] bg-[#FFFDF8] px-2 py-1 font-mono text-[9px] text-[#7A6A5A]">
              {outbox.length} approved messages
            </span>
          </div>
          {outbox.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-[#D8CCB5] bg-[#FFFDF8] p-3 text-center text-[10px] text-[#7A6A5A]">
              Nothing is queued. Approve an individual message above to add it to SMS and WhatsApp previews.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[...outbox].reverse().map(message => (
                <div key={message.id} className="rounded-lg border border-[#D8CCB5] bg-[#FFFDF8] p-2">
                  <div className="mb-1 flex items-center justify-between text-[9px] font-mono text-[#7A6A5A]">
                    <span>{message.areaName} · {LANGUAGE_LABELS[message.language]}</span>
                    <span>{message.publishedAt ? new Date(message.publishedAt).toLocaleTimeString() : ''}</span>
                  </div>
                  {message.broadcastChannels.map(channel => (
                    <div key={channel} className={`mt-1 rounded-lg p-2 ${channel === 'whatsapp' ? 'bg-[#E8F3E7]' : 'bg-[#E9F0F6]'}`}>
                      <div className="mb-1 flex items-center justify-between text-[9px] font-semibold text-[#5A6D62]">
                        <span className="capitalize">{channel}</span>
                        <span>Mock thread</span>
                      </div>
                      <p lang={message.language} className="text-[10px] leading-relaxed text-[#3A2E26]">{message.text}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
};
