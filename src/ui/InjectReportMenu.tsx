/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * InjectReportMenu: Interactive operator control to inject any of the 8 pre-written citizen & field reports.
 * Triggers live Triage Agent evaluation, duplicate detection, and deterministic priority scoring.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, ChevronDown, Mic, MicOff } from 'lucide-react';
import { PRESET_CITIZEN_REPORTS, PresetReportItem } from '../data/presetReports.ts';
import { useWorldStore } from '../state/store.ts';
import { LanguageCode } from '../state/types.ts';
import { Button } from './Button.tsx';

type SpeechLocale = 'hi-IN' | 'mr-IN' | 'en-IN';

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const SPEECH_LANGUAGES: { locale: SpeechLocale; code: LanguageCode; label: string }[] = [
  { locale: 'hi-IN', code: 'hi', label: 'Hindi (India)' },
  { locale: 'mr-IN', code: 'mr', label: 'Marathi (India)' },
  { locale: 'en-IN', code: 'en', label: 'English (India)' },
];

interface InjectReportMenuProps {
  onInjected?: (report: PresetReportItem) => void;
  onVoiceInjected?: () => void;
}

export const InjectReportMenu: React.FC<InjectReportMenuProps> = ({ onInjected, onVoiceInjected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [injectedKey, setInjectedKey] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState('');
  const [speechLocale, setSpeechLocale] = useState<SpeechLocale>('hi-IN');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalizedTranscriptRef = useRef('');
  const store = useWorldStore();
  const selectedSpeechLanguage = SPEECH_LANGUAGES.find(language => language.locale === speechLocale)!;
  const speechRecognitionSupported = typeof window !== 'undefined' &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!store.isKilled) return;
    recognitionRef.current?.stop();
    setIsListening(false);
  }, [store.isKilled]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectReport = (preset: PresetReportItem) => {
    if (store.isKilled) {
      alert('System is frozen under Global Kill Switch. Disengage switch before injecting reports.');
      return;
    }

    // Ingest into event-sourced store
    store.addCitizenReport({
      area: preset.area,
      text: preset.text,
      language: preset.language,
      source: preset.source,
      reporterId: preset.reporterId,
      location: preset.location,
      peopleAtRisk: preset.peopleAtRisk,
      flags: preset.flags,
      credibility: preset.credibility,
    });

    setInjectedKey(preset.presetKey);
    setTimeout(() => setInjectedKey(null), 2000);
    setIsOpen(false);

    if (onInjected) {
      onInjected(preset);
    }
  };

  const handleStartListening = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechError('Speech recognition is not available in this browser. Type the report below instead.');
      return;
    }

    setSpeechError(null);
    finalizedTranscriptRef.current = '';
    setVoiceText('');
    const recognition = new Recognition();
    recognition.lang = speechLocale;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = event => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript || '';
        if (result.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }
      finalizedTranscriptRef.current = finalTranscript;
      setVoiceText(`${finalizedTranscriptRef.current}${interimTranscript}`);
    };
    recognition.onerror = event => {
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone access was denied. Allow microphone access or type the report below.',
        'service-not-allowed': 'The browser speech service is unavailable. Type the report below instead.',
        'no-speech': 'No speech was detected. Try again or type the report below.',
      };
      setSpeechError(errorMessages[event.error] || 'Speech recognition stopped unexpectedly. You can edit the transcript or type the report.');
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setIsListening(false);
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      recognitionRef.current = null;
      setIsListening(false);
      setSpeechError(error instanceof Error ? error.message : 'Could not start speech recognition. Type the report below instead.');
    }
  };

  const handleStopListening = () => {
    recognitionRef.current?.stop();
  };

  const handleVoiceReportSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = voiceText.trim();
    if (!text || store.isKilled || isListening) return;

    store.addCitizenReport({
      text,
      language: selectedSpeechLanguage.code,
      source: 'citizen',
    });
    setVoiceText('');
    finalizedTranscriptRef.current = '';
    setSpeechError(null);
    setIsOpen(false);
    onVoiceInjected?.();
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'duplicate':
        return <span className="px-2 py-0.5 rounded-full bg-[#E4D9C5] text-[#3A2E26] text-[10px] font-mono font-bold">Duplicate</span>;
      case 'rumour':
        return <span className="px-2 py-0.5 rounded-full bg-[#F6DDD6] text-[#9E2F22] text-[10px] font-mono font-bold">Rumour</span>;
      case 'multilingual_hi':
        return <span className="px-2 py-0.5 rounded-full bg-[#D7E3E5] text-[#4F7C82] text-[10px] font-mono font-bold">Hindi (hi)</span>;
      case 'multilingual_mr':
        return <span className="px-2 py-0.5 rounded-full bg-[#E3EDDF] text-[#3D5939] text-[10px] font-mono font-bold">Marathi (mr)</span>;
      case 'vague':
        return <span className="px-2 py-0.5 rounded-full bg-[#FAF6EE] border border-[#E4D9C5] text-[#7A6A5A] text-[10px] font-mono font-bold">No Location</span>;
      case 'heatwave':
        return <span className="px-2 py-0.5 rounded-full bg-[#EED8CE] text-[#B0623A] text-[10px] font-mono font-bold">Heatwave</span>;
      case 'volunteer':
        return <span className="px-2 py-0.5 rounded-full bg-[#E3EDDF] text-[#5F7A61] text-[10px] font-mono font-bold">Volunteer</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        leftIcon={<Send className="w-3.5 h-3.5" />}
        rightIcon={<ChevronDown className="w-3.5 h-3.5" />}
        className="font-heading font-bold text-xs"
      >
        Inject Report (8 Scenarios)
      </Button>

      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-[340px] sm:w-[460px] max-h-[85vh] overflow-y-auto rounded-[20px] bg-[#FFFDF8] border border-[#E4D9C5] shadow-[0_8px_30px_rgba(58,46,38,0.14)] z-50 p-3 space-y-2 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1.5 border-b border-[#E4D9C5] flex items-center justify-between">
            <div>
              <h4 className="font-heading font-bold text-xs text-[#3A2E26] uppercase tracking-wider">
                Simulate Field &amp; Citizen Reports
              </h4>
              <p className="text-[11px] text-[#7A6A5A]">
                Select a scenario to trigger live multi-agent triage and deterministic priority scoring.
              </p>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF6EE] text-[#5F7A61] border border-[#E4D9C5]">
              8 Presets
            </span>
          </div>

          <form onSubmit={handleVoiceReportSubmit} className="rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="voice-report-language" className="text-[10px] font-mono font-bold uppercase text-[#7A6A5A]">
                Recognition language
              </label>
              <select
                id="voice-report-language"
                value={speechLocale}
                onChange={event => setSpeechLocale(event.target.value as SpeechLocale)}
                disabled={isListening}
                className="rounded-lg border border-[#E4D9C5] bg-[#FFFDF8] px-2 py-1 text-xs text-[#3A2E26] focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
              >
                {SPEECH_LANGUAGES.map(language => (
                  <option key={language.locale} value={language.locale}>{language.label}</option>
                ))}
              </select>
            </div>

            {speechRecognitionSupported ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isListening ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={isListening ? handleStopListening : handleStartListening}
                  disabled={store.isKilled}
                  leftIcon={isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                >
                  {isListening ? 'Stop recording' : 'Start recording'}
                </Button>
                <span aria-live="polite" className="text-[11px] text-[#7A6A5A]">
                  {isListening ? `Listening in ${selectedSpeechLanguage.label}…` : `Language: ${selectedSpeechLanguage.label}`}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-[#7A6A5A]">
                Speech recognition is not supported in this browser. Type the citizen report below.
              </p>
            )}

            <label htmlFor="voice-report-text" className="block text-[10px] font-mono font-bold uppercase text-[#7A6A5A]">
              {isListening ? 'Live transcript' : 'Report text'}
            </label>
            <textarea
              id="voice-report-text"
              value={voiceText}
              onChange={event => {
                setVoiceText(event.target.value);
                finalizedTranscriptRef.current = event.target.value;
              }}
              readOnly={isListening}
              rows={3}
              placeholder="Record speech or type a citizen report…"
              className="w-full resize-y rounded-lg border border-[#E4D9C5] bg-[#FFFDF8] p-2 text-xs leading-relaxed text-[#3A2E26] focus:outline-none focus:ring-2 focus:ring-[#4F7C82] read-only:bg-[#F2EBDD]"
            />
            {speechError && <p role="alert" className="text-[11px] text-[#9E2F22]">{speechError}</p>}
            <p className="text-[10px] text-[#7A6A5A]">
              This app does not directly upload audio; your browser may use its own speech service. The transcript follows the existing Triage workflow.
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={!voiceText.trim() || isListening || store.isKilled}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send citizen report
            </Button>
          </form>

          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
            {PRESET_CITIZEN_REPORTS.map(preset => {
              const wasJustInjected = injectedKey === preset.presetKey;
              return (
                <div
                  key={preset.presetKey}
                  onClick={() => handleSelectReport(preset)}
                  className={`
                    p-3 rounded-[14px] border text-left transition-all cursor-pointer group
                    ${
                      wasJustInjected
                        ? 'bg-[#E3EDDF] border-[#5F7A61]'
                        : 'bg-[#FAF6EE] border-[#E4D9C5] hover:bg-[#F2EBDD] hover:border-[#5F7A61]/40'
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-heading font-bold text-xs text-[#3A2E26] group-hover:text-[#5F7A61] transition-colors">
                      {preset.label}
                    </span>
                    {getCategoryBadge(preset.category)}
                  </div>

                  <p className="text-[11px] text-[#3A2E26] line-clamp-2 italic font-sans mb-1.5">
                    &ldquo;{preset.text}&rdquo;
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#7A6A5A] pt-1 border-t border-[#E4D9C5]/50">
                    <span className="truncate max-w-[260px] text-[#5F7A61]">
                      → {preset.expectedAction}
                    </span>
                    <span className="uppercase font-semibold shrink-0">
                      {preset.area}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 rounded-xl bg-[#FAF6EE] text-[10px] font-mono text-[#7A6A5A] border border-[#E4D9C5] text-center">
            All reports invoke Triage with Gemini function-calling and strict JSON output.
          </div>
        </div>
      )}
    </div>
  );
};
