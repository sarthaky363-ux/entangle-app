import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCw, Sparkles } from 'lucide-react';
import { createDemoScenarioSchedule, DEMO_SCENARIO_DURATION_MS, dispatchDemoScenarioInput } from '../scenario/demoScenario.ts';
import { useWorldStore } from '../state/store.ts';

type ScenarioStatus = 'idle' | 'running' | 'paused' | 'complete';

export const DemoScenarioControls: React.FC = () => {
  const isKilled = useWorldStore(state => state.isKilled);
  const [status, setStatus] = useState<ScenarioStatus>('idle');
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [progressMs, setProgressMs] = useState(0);
  const statusRef = useRef(status);
  const speedRef = useRef(speed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scheduleRef = useRef<ReturnType<typeof createDemoScenarioSchedule>>([]);
  const nextInputRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const tick = (now: number) => {
    const store = useWorldStore.getState();
    if (store.isKilled) {
      if (statusRef.current === 'running') setStatus('paused');
      lastTickRef.current = now;
      return;
    }
    if (statusRef.current !== 'running') {
      lastTickRef.current = now;
      return;
    }

    elapsedRef.current = Math.min(
      DEMO_SCENARIO_DURATION_MS,
      elapsedRef.current + Math.max(0, now - lastTickRef.current) * speedRef.current,
    );
    lastTickRef.current = now;

    const schedule = scheduleRef.current;
    while (
      nextInputRef.current < schedule.length &&
      schedule[nextInputRef.current].atMs <= elapsedRef.current
    ) {
      const input = schedule[nextInputRef.current];
      dispatchDemoScenarioInput(
        input,
        event => useWorldStore.getState().dispatchEvent(event),
        (report, id, ts, eventId) => useWorldStore.getState().addScenarioReport(report, id, ts, eventId),
      );
      nextInputRef.current += 1;
    }

    setProgressMs(elapsedRef.current);
    if (nextInputRef.current === schedule.length) {
      setStatus('complete');
      statusRef.current = 'complete';
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    const store = useWorldStore.getState();
    if (store.isKilled) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    store.resetToInitialDemo();
    const startTs = Date.now();
    scheduleRef.current = createDemoScenarioSchedule(startTs);
    nextInputRef.current = 0;
    elapsedRef.current = 0;
    setProgressMs(0);
    setStatus('running');
    statusRef.current = 'running';
    lastTickRef.current = startTs;
    intervalRef.current = setInterval(() => tick(Date.now()), 50);
    tick(startTs);
  };

  const togglePause = () => {
    if (statusRef.current === 'running') {
      setStatus('paused');
      statusRef.current = 'paused';
    } else if (statusRef.current === 'paused' && !useWorldStore.getState().isKilled) {
      setStatus('running');
      statusRef.current = 'running';
      lastTickRef.current = Date.now();
    }
  };

  const progressPercent = Math.min(100, Math.round(progressMs / DEMO_SCENARIO_DURATION_MS * 100));
  const statusLabel = status === 'complete'
    ? 'Complete'
    : status === 'paused'
    ? 'Paused'
    : status === 'running'
    ? `${progressPercent}%`
    : '90 sec';

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#E4D9C5] bg-[#FAF6EE] px-2 py-1">
      <button
        type="button"
        onClick={start}
        disabled={isKilled}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#5F7A61] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#4D664F] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={status === 'idle' ? 'Run 90-second demo scenario' : 'Restart demo scenario'}
      >
        {status === 'idle' ? <Play className="h-3.5 w-3.5" /> : <RotateCw className="h-3.5 w-3.5" />}
        {status === 'idle' ? 'Run scenario' : 'Run again'}
      </button>
      {(status === 'running' || status === 'paused') && (
        <button
          type="button"
          onClick={togglePause}
          className="inline-flex items-center gap-1 rounded-full border border-[#D8CCB5] bg-[#FFFDF8] px-2.5 py-1.5 text-[11px] font-semibold text-[#3A2E26]"
          aria-label={status === 'running' ? 'Pause demo scenario' : 'Resume demo scenario'}
        >
          {status === 'running' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {status === 'running' ? 'Pause' : 'Resume'}
        </button>
      )}
      <label className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#7A6A5A]">
        Speed
        <select
          value={speed}
          onChange={event => setSpeed(Number(event.target.value) as 1 | 2 | 4)}
          className="rounded-full border border-[#D8CCB5] bg-[#FFFDF8] px-2 py-1 text-[11px] text-[#3A2E26]"
          aria-label="Demo scenario playback speed"
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </label>
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#7A6A5A]" aria-live="polite">
        <Sparkles className="h-3 w-3 text-[#B0623A]" />
        {statusLabel}
      </span>
    </div>
  );
};
