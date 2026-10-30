/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Three simultaneous dispatch candidates, their assignment diff, and comparison view.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, GitBranch, GitCompare, HelpCircle, ShieldCheck, UserRound, X } from 'lucide-react';
import { DispatchPlansUpdatedPayload } from '../agents/dispatch.ts';
import { Plan } from '../state/types.ts';
import { useWorldStore } from '../state/store.ts';
import { Button } from './Button.tsx';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './Card.tsx';

interface PlanLatticeProps {
  plans: Plan[];
  latestChange?: DispatchPlansUpdatedPayload;
  approvedPlanId?: string;
  disabledPlanIds: string[];
  isKilled: boolean;
  onApprove: (planId: string) => void;
  onReject: (planId: string, reason: string) => void;
}

const STRATEGY_LABELS: Record<string, string> = {
  maximise_coverage: 'Maximise coverage',
  protect_critical: 'Protect critical',
  minimise_risk: 'Minimise risk',
};

const OutcomeHistogram: React.FC<{ outcomes: number[] }> = ({ outcomes }) => {
  const binCount = 12;
  const min = Math.min(...outcomes);
  const max = Math.max(...outcomes);
  const span = Math.max(1, max - min);
  const bins = Array.from({ length: binCount }, () => 0);
  outcomes.forEach(outcome => {
    const index = Math.min(binCount - 1, Math.floor((outcome - min) / span * binCount));
    bins[index]++;
  });
  const maxCount = Math.max(1, ...bins);

  return (
    <svg viewBox="0 0 360 150" className="w-full" role="img" aria-label="Histogram of people reached across simulated worlds">
      <line x1="24" y1="122" x2="350" y2="122" stroke="#B8AA95" strokeWidth="1" />
      {bins.map((count, index) => {
        const height = count / maxCount * 96;
        const width = 24;
        return (
          <rect
            key={index}
            x={29 + index * 26}
            y={121 - height}
            width={width}
            height={height}
            rx="2"
            fill="#5F7A61"
            opacity="0.8"
          >
            <title>{count} simulated worlds</title>
          </rect>
        );
      })}
      <text x="24" y="142" fill="#7A6A5A" fontSize="10">{Math.round(min)} people</text>
      <text x="350" y="142" fill="#7A6A5A" fontSize="10" textAnchor="end">{Math.round(max)} people</text>
      <text x="187" y="12" fill="#7A6A5A" fontSize="10" textAnchor="middle">Simulated worlds</text>
    </svg>
  );
};

function getAssignmentDiff(left: Plan | undefined, right: Plan | undefined): {
  onlyLeft: string[];
  onlyRight: string[];
} {
  const key = (assignment: Plan['assignments'][number]) =>
    `${assignment.incidentId}:${assignment.volunteerId}:${assignment.resourceId || ''}`;
  const leftAssignments = left?.assignments || [];
  const rightAssignments = right?.assignments || [];
  const rightKeys = new Set(rightAssignments.map(key));
  const leftKeys = new Set(leftAssignments.map(key));
  return {
    onlyLeft: leftAssignments.filter(assignment => !rightKeys.has(key(assignment)))
      .map(assignment => `${assignment.volunteerId} → ${assignment.incidentId}`),
    onlyRight: rightAssignments.filter(assignment => !leftKeys.has(key(assignment)))
      .map(assignment => `${assignment.volunteerId} → ${assignment.incidentId}`),
  };
}

const ProbabilityRing: React.FC<{ probability: number; leading: boolean }> = ({ probability, leading }) => {
  const circumference = 2 * Math.PI * 17;
  const percent = Math.max(0, Math.min(1, probability));
  return (
    <div className="relative w-12 h-12 shrink-0" aria-label={`${Math.round(percent * 100)} percent probability`}>
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r="17" fill="none" stroke="#E4D9C5" strokeWidth="3" />
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="none"
          stroke={leading ? '#B0623A' : '#5F7A61'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-bold text-[#3A2E26]">
        {Math.round(percent * 100)}%
      </span>
    </div>
  );
};

interface DecisionTraceProps {
  plan: Plan;
  events: ReturnType<typeof useWorldStore.getState>['events'];
  incidents: ReturnType<typeof useWorldStore.getState>['incidents'];
}

const DecisionTrace: React.FC<DecisionTraceProps> = ({ plan, events, incidents }) => {
  const incidentIds = new Set(plan.assignments.map(assignment => assignment.incidentId));
  const reportIds = new Set(plan.assignments.flatMap(assignment =>
    incidents[assignment.incidentId]?.reportIds || []
  ));
  const reportEvents = events.filter(event =>
    ['REPORT_ADDED', 'REPORT_INGESTED'].includes(event.type) && reportIds.has(event.payload?.id)
  );
  const credibilityEvents = events.filter(event =>
    event.type === 'CREDIBILITY_UPDATED' && reportIds.has(event.payload?.reportId)
  );
  const priorityEvents = events.filter(event =>
    ['INCIDENT_CREATED', 'INCIDENT_UPDATED'].includes(event.type) &&
    incidentIds.has(event.payload?.id)
  );
  const planEvents = events.filter(event => {
    if (['PLAN_CREATED', 'PLAN_SUPERPOSITION_GENERATED'].includes(event.type)) {
      return event.payload?.id === plan.id;
    }
    return event.type === 'DISPATCH_PLANS_UPDATED' &&
      event.payload?.plans?.some((candidate: Plan) => candidate.id === plan.id);
  });
  const simulationEvents = events.filter(event =>
    event.type === 'SIMULATION_RESULTS_UPDATED' &&
    event.payload?.plans?.some((candidate: Plan) => candidate.id === plan.id)
  );
  const decisionEvent = [...events].reverse().find(event =>
    ['PLAN_APPROVED', 'PLAN_REJECTED'].includes(event.type) &&
    event.payload?.planId === plan.id
  );
  const latest = <T,>(items: T[]): T | undefined => items[items.length - 1];
  const latestPlanEvent = latest(planEvents);
  const planRecord = latestPlanEvent?.type === 'DISPATCH_PLANS_UPDATED'
    ? latestPlanEvent.payload.plans.find((candidate: Plan) => candidate.id === plan.id)
    : latestPlanEvent?.payload as Plan | undefined;
  const latestSimulationEvent = latest(simulationEvents);
  const simulationRecord = latestSimulationEvent?.payload.plans.find((candidate: Plan) => candidate.id === plan.id);
  const steps = [
    {
      title: 'Reports',
      text: reportEvents.length
        ? reportEvents.slice(-3).map(event => {
            const report = event.payload;
            return `${report.id} · ${report.area}: ${report.text || event.reason}`;
          }).join(' | ')
        : 'Unavailable in the event log for this plan’s assignments.',
    },
    {
      title: 'Credibility',
      text: reportIds.size
        ? Array.from(reportIds).map(reportId => {
            const update = latest(credibilityEvents.filter(event => event.payload?.reportId === reportId));
            const original = latest(reportEvents.filter(event => event.payload?.id === reportId));
            const score = update?.payload?.credibility ?? update?.payload?.credibilityScore ??
              original?.payload?.credibility ?? original?.payload?.credibilityScore;
            return `${reportId}: ${typeof score === 'number' ? `${(score * 100).toFixed(0)}%` : 'unavailable'}${update?.reason ? ` (${update.reason})` : ''}`;
          }).join(' · ')
        : 'Unavailable: no report is linked to the plan assignments.',
    },
    {
      title: 'Priority',
      text: priorityEvents.length
        ? priorityEvents.slice(-3).map(event =>
            `${event.payload.summary || event.payload.id}: ${typeof event.payload.priority === 'number' ? `${event.payload.priority}/100` : 'priority unavailable'}`
          ).join(' · ')
        : 'Unavailable in the event log for this plan’s incidents.',
    },
    {
      title: 'Candidate plans',
      text: planRecord
        ? `${planRecord.name || planRecord.strategy || plan.id} · ${planRecord.assignments?.length ?? 'unavailable'} assignments · coverage ${planRecord.coverage ?? 'unavailable'}% · probability ${typeof planRecord.probability === 'number' ? `${(planRecord.probability * 100).toFixed(1)}%` : 'unavailable'}`
        : 'Unavailable: no candidate-plan event found.',
    },
    {
      title: 'Simulation',
      text: simulationRecord?.simulationMetrics
        ? `${simulationRecord.simulationMetrics.trials} trials · expected reached ${Math.round(simulationRecord.simulationMetrics.expectedReached)} · worst 5% ${Math.round(simulationRecord.simulationMetrics.worstCase5pct)} · seed ${simulationRecord.simulationMetrics.seed}`
        : 'Unavailable: no simulation result for this plan is recorded yet.',
    },
    {
      title: 'Human decision',
      text: decisionEvent
        ? `${decisionEvent.type === 'PLAN_APPROVED' ? 'Approved' : 'Rejected'} · ${decisionEvent.reason}`
        : 'No human decision is recorded for this plan.',
    },
  ];

  return (
    <ol className="mt-3 space-y-0" aria-label={`Decision explanation for ${plan.name || plan.id}`}>
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-3 pb-3 last:pb-0">
          {index < steps.length - 1 && <span className="absolute left-[11px] top-6 h-full w-px bg-[#D8CCB5]" aria-hidden="true" />}
          <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#A6B99F] bg-[#E3EDDF] font-mono text-[10px] font-bold text-[#3D5939]">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 rounded-lg border border-[#E4D9C5] bg-[#FFFDF8] p-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wide text-[#3A2E26]">{step.title}</h4>
            <p className="mt-1 break-words text-[10px] leading-relaxed text-[#7A6A5A]">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
};

export const PlanLattice: React.FC<PlanLatticeProps> = ({
  plans,
  latestChange,
  approvedPlanId,
  disabledPlanIds,
  isKilled,
  onApprove,
  onReject,
}) => {
  const volunteers = useWorldStore(state => state.volunteers);
  const incidents = useWorldStore(state => state.incidents);
  const reports = useWorldStore(state => state.reports);
  const simulationSeed = useWorldStore(state => state.simulationSeed);
  const dispatchEvent = useWorldStore(state => state.dispatchEvent);
  const events = useWorldStore(state => state.events);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [leftPlanId, setLeftPlanId] = useState(plans[0]?.id || '');
  const [rightPlanId, setRightPlanId] = useState(plans[1]?.id || '');
  const [seedDraft, setSeedDraft] = useState(String(simulationSeed));
  const [distributionPlanId, setDistributionPlanId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [explainingPlanId, setExplainingPlanId] = useState<string | null>(null);

  const rankedPlans = useMemo(
    () => [...plans]
      .filter(plan =>
        plan.status === 'candidate' ||
        plan.id === approvedPlanId ||
        (Boolean(approvedPlanId) && plan.status === 'discarded')
      )
      .sort((a, b) => b.probability - a.probability),
    [plans, approvedPlanId]
  );
  const distributionPlan = plans.find(plan => plan.id === distributionPlanId);
  const populationAtRisk = Object.values(incidents)
    .filter(incident => incident.status !== 'resolved')
    .reduce((total, incident) => {
      const count = incident.reportIds.reduce((sum, id) => sum + Math.max(0, reports[id]?.peopleAtRisk || 0), 0);
      return total + (count || 1);
    }, 0);
  const simulationMax = Math.max(1, populationAtRisk);
  const leadingPlanId = rankedPlans[0]?.id;
  const selectedPlan = rankedPlans.find(plan => plan.id === selectedPlanId) || rankedPlans[0];
  const leftPlan = plans.find(plan => plan.id === leftPlanId) || plans[0];
  const rightPlan = plans.find(plan => plan.id === rightPlanId) || plans[1];
  const assignmentDiff = getAssignmentDiff(leftPlan, rightPlan);

  useEffect(() => setSeedDraft(String(simulationSeed)), [simulationSeed]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#4F7C82]" />
            <CardTitle className="text-sm">Dispatch plan lattice</CardTitle>
          </div>
          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF6EE] border border-[#E4D9C5] text-[#7A6A5A]">
            {plans.length} candidates
          </span>
        </div>
        <CardDescription>
          Plans are re-ranked by simulated reach (60%), worst-case reach (25%), and operational risk (15%).
        </CardDescription>
        <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-[#7A6A5A]">
          <label htmlFor="simulation-seed" className="font-bold uppercase tracking-wide">Simulation seed</label>
          <input
            id="simulation-seed"
            type="number"
            min="0"
            max="4294967295"
            step="1"
            value={seedDraft}
            onChange={event => setSeedDraft(event.target.value)}
            onBlur={() => {
              const seed = Number(seedDraft);
              if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
                setSeedDraft(String(simulationSeed));
                return;
              }
              if (seed !== simulationSeed) {
                dispatchEvent({
                  actor: 'human',
                  type: 'SIMULATION_SEED_UPDATED',
                  payload: { seed },
                  reason: `Operator changed the Monte Carlo reproducibility seed to ${seed}.`,
                });
              }
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            aria-label="Simulation seed for reproducible Monte Carlo trials"
            className="w-28 rounded-md border border-[#E4D9C5] bg-[#FAF6EE] px-2 py-1 text-[#3A2E26]"
          />
          <span>Same seed + plan = same worlds</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <section className="rounded-xl border-2 border-[#5F7A61]/40 bg-[#E3EDDF]/45 p-3" aria-label="Awaiting your decision">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#3A2E26]">
              {approvedPlanId ? 'Measurement · plan approved' : 'Awaiting your decision'}
            </h3>
            {!approvedPlanId && <span className="rounded-full bg-[#FFFDF8] px-2 py-1 text-[9px] font-mono font-bold text-[#5F7A61]">Human approval required</span>}
          </div>
          {selectedPlan ? (
            <>
              <label htmlFor="decision-plan" className="mt-3 block text-[10px] font-mono font-bold uppercase text-[#7A6A5A]">
                Top-ranked plan · choose another of the three
              </label>
              <select
                id="decision-plan"
                value={approvedPlanId || selectedPlan.id}
                onChange={event => setSelectedPlanId(event.target.value)}
                disabled={isKilled || Boolean(approvedPlanId)}
                className="mt-1 w-full rounded-lg border border-[#D8CCB5] bg-[#FFFDF8] p-2 text-xs font-semibold text-[#3A2E26] disabled:opacity-70"
              >
                {rankedPlans.filter(plan => plan.status === 'candidate' || plan.id === approvedPlanId).map((plan, index) => (
                  <option key={plan.id} value={plan.id}>
                    {index === 0 ? 'Top-ranked · ' : ''}{STRATEGY_LABELS[plan.strategy || ''] || plan.name || plan.id}
                  </option>
                ))}
              </select>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono">
                <div className="rounded-lg bg-[#FFFDF8] p-2"><span className="block text-[8px] uppercase text-[#7A6A5A]">Coverage</span><strong className="text-xs text-[#5F7A61]">{selectedPlan.coverage}%</strong></div>
                <div className="rounded-lg bg-[#FFFDF8] p-2"><span className="block text-[8px] uppercase text-[#7A6A5A]">Avg ETA</span><strong className="text-xs text-[#3A2E26]">{selectedPlan.etaMinutes} min</strong></div>
                <div className="rounded-lg bg-[#FFFDF8] p-2"><span className="block text-[8px] uppercase text-[#7A6A5A]">Risk</span><strong className="text-xs text-[#B0623A]">{selectedPlan.riskScore}/100</strong></div>
              </div>
              {selectedPlan.simulationMetrics && (
                <p className="mt-2 text-[10px] leading-relaxed text-[#3A2E26]">
                  Simulation: {selectedPlan.simulationMetrics.trials} worlds · about {Math.round(selectedPlan.simulationMetrics.expectedReached)} people reached · worst 5%: {Math.round(selectedPlan.simulationMetrics.worstCase5pct)} · all critical incidents reached in {Math.round(selectedPlan.simulationMetrics.probabilityAllCriticalReached * 100)}% of runs.
                </p>
              )}
              <p className="mt-2 text-[11px] leading-relaxed text-[#5A5146]">
                {selectedPlan.simulationExplanation || selectedPlan.explanation || 'Plain-language rationale will appear when simulation finishes.'}
              </p>
              <button
                type="button"
                aria-expanded={explainingPlanId === selectedPlan.id}
                onClick={() => setExplainingPlanId(explainingPlanId === selectedPlan.id ? null : selectedPlan.id)}
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#4F7C82] hover:text-[#3A2E26]"
              >
                <HelpCircle className="h-3 w-3" />
                Explain this decision
              </button>
              {explainingPlanId === selectedPlan.id && (
                <DecisionTrace plan={selectedPlan} events={events} incidents={incidents} />
              )}
              {!approvedPlanId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isKilled || disabledPlanIds.includes(selectedPlan.id)}
                    onClick={() => onApprove(selectedPlan.id)}
                    className="bg-[#5F7A61] hover:bg-[#4D664F]"
                  >
                    Approve
                  </Button>
                  <Button variant="secondary" size="sm" disabled={isKilled} onClick={() => setIsRejecting(value => !value)}>
                    <AlertTriangle className="mr-1 h-3 w-3" /> Reject with reason
                  </Button>
                </div>
              )}
              {isRejecting && !approvedPlanId && (
                <form
                  className="mt-3 space-y-2 rounded-lg border border-[#E4D9C5] bg-[#FFFDF8] p-2"
                  onSubmit={event => {
                    event.preventDefault();
                    if (!rejectionReason.trim() || !selectedPlan) return;
                    onReject(selectedPlan.id, rejectionReason.trim());
                    setRejectionReason('');
                    setIsRejecting(false);
                  }}
                >
                  <label htmlFor="rejection-reason" className="block text-[10px] font-semibold text-[#3A2E26]">
                    What should Dispatch change? (e.g. “avoid volunteer V12”)
                  </label>
                  <textarea
                    id="rejection-reason"
                    required
                    maxLength={240}
                    rows={2}
                    value={rejectionReason}
                    onChange={event => setRejectionReason(event.target.value)}
                    className="w-full resize-y rounded-md border border-[#D8CCB5] bg-white p-2 text-xs text-[#3A2E26]"
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] text-[#7A6A5A]">{rejectionReason.length}/240</span>
                    <Button type="submit" variant="danger" size="sm" disabled={isKilled || !rejectionReason.trim()}>
                      Reject and re-plan
                    </Button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <p className="mt-2 text-xs text-[#7A6A5A]">Dispatch is preparing the three candidate plans.</p>
          )}
        </section>

        <div className="grid grid-cols-3 gap-2">
          {rankedPlans.map(plan => {
            const leading = plan.id === leadingPlanId;
            const disabled = isKilled || disabledPlanIds.includes(plan.id) || Boolean(approvedPlanId);
            const collapsed = Boolean(approvedPlanId) && plan.id !== approvedPlanId;
            const strategy = plan.strategy || plan.name || plan.id;
            const delta = latestChange?.probabilityChanges?.[plan.id] ?? plan.probabilityDelta ?? 0;
            const deltaLabel = Number.isInteger(delta) ? delta.toFixed(0) : delta.toFixed(1);
            return (
              <article
                key={plan.id}
                aria-hidden={collapsed}
                className={`min-w-0 overflow-hidden rounded-xl bg-[#FFFDF8] border-2 transition-all duration-700 ease-in-out ${
                  collapsed ? 'max-h-0 scale-75 p-0 opacity-0' : 'max-h-[720px] p-2.5 opacity-100'
                } ${
                  plan.id === selectedPlan?.id ? 'border-[#5F7A61] shadow-[0_2px_8px_rgba(95,122,97,0.16)]' :
                  leading ? 'border-[#B0623A] shadow-[0_2px_8px_rgba(176,98,58,0.12)]' : 'border-[#E4D9C5]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <ProbabilityRing probability={plan.probability} leading={leading} />
                  {leading && <span className="text-[9px] uppercase tracking-wide text-[#B0623A] font-bold">Leading</span>}
                </div>
                <h4 className="mt-2 min-h-8 font-heading text-[10px] leading-tight font-bold text-[#3A2E26]">
                  {STRATEGY_LABELS[plan.strategy || ''] || strategy}
                </h4>

                <div className="grid grid-cols-3 gap-1 text-center font-mono mt-2">
                  <div className="rounded-md bg-[#FAF6EE] p-1">
                    <span className="block text-[8px] uppercase text-[#7A6A5A]">Cover</span>
                    <span className="text-[10px] font-bold text-[#5F7A61]">{plan.coverage}%</span>
                  </div>
                  <div className="rounded-md bg-[#FAF6EE] p-1">
                    <span className="block text-[8px] uppercase text-[#7A6A5A]">ETA</span>
                    <span className="text-[10px] font-bold text-[#3A2E26]">{plan.etaMinutes}m</span>
                  </div>
                  <div className="rounded-md bg-[#FAF6EE] p-1">
                    <span className="block text-[8px] uppercase text-[#7A6A5A]">Risk</span>
                    <span className="text-[10px] font-bold text-[#B0623A]">{plan.riskScore}</span>
                  </div>
                </div>

                {delta !== 0 && (
                  <p className={`mt-2 text-[9px] leading-tight font-mono ${delta > 0 ? 'text-[#5F7A61]' : 'text-[#9E2F22]'}`}>
                    {delta > 0 ? '+' : ''}{deltaLabel}% because {latestChange?.changeReason || plan.changeReason || 'dispatch inputs changed'}
                  </p>
                )}

                <p className="mt-2 min-h-10 text-[9px] leading-snug text-[#7A6A5A]">
                  {plan.simulationExplanation || plan.explanation || 'Simulation explanation will appear after evaluation.'}
                </p>

                {plan.simulationMetrics && (
                  <div className="mt-2 rounded-md bg-[#FAF6EE] p-2" aria-label="Expected people reached simulation estimate">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[8px] uppercase font-mono font-bold text-[#7A6A5A]">Expected people reached</span>
                      <span className="text-[9px] font-mono font-bold text-[#3A2E26]">
                        {Math.round(plan.simulationMetrics.expectedReached)}
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 rounded-full bg-[#E4D9C5]" aria-hidden="true">
                      <span
                        className="absolute top-0 h-2 rounded-full bg-[#A6B99F]"
                        style={{
                          left: `${Math.min(100, plan.simulationMetrics.confidenceInterval95.lower / simulationMax * 100)}%`,
                          width: `${Math.max(1, Math.min(100, (plan.simulationMetrics.confidenceInterval95.upper - plan.simulationMetrics.confidenceInterval95.lower) / simulationMax * 100))}%`,
                        }}
                      />
                      <span
                        className="absolute top-[-2px] h-3 w-1 rounded bg-[#B0623A]"
                        style={{ left: `${Math.min(99, plan.simulationMetrics.expectedReached / simulationMax * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[8px] font-mono text-[#7A6A5A]">
                      <span>95% CI {Math.round(plan.simulationMetrics.confidenceInterval95.lower)}–{Math.round(plan.simulationMetrics.confidenceInterval95.upper)}</span>
                      <span>Simulated {plan.simulationMetrics.trials} worlds</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDistributionPlanId(plan.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[8px] font-mono font-bold text-[#4F7C82] hover:text-[#3A2E26]"
                    >
                      <BarChart3 className="h-3 w-3" />
                      Show distribution
                    </button>
                  </div>
                )}

                <div className="mt-2 border-t border-[#E4D9C5]/70 pt-2 space-y-1.5">
                  <span className="block text-[8px] uppercase font-mono font-bold text-[#7A6A5A]">
                    Assignments ({plan.assignments.length})
                  </span>
                  {plan.assignments.length > 0 ? plan.assignments.slice(0, 3).map(assignment => (
                    <div key={`${assignment.incidentId}-${assignment.volunteerId}`} className="min-w-0 flex items-start gap-1 text-[9px] leading-tight text-[#3A2E26]">
                      <UserRound className="w-2.5 h-2.5 shrink-0 text-[#4F7C82] mt-0.5" />
                      <span className="truncate">
                        {volunteers[assignment.volunteerId]?.name || assignment.volunteerId}
                        <span className="block text-[8px] text-[#7A6A5A]">{incidents[assignment.incidentId]?.area || assignment.incidentId}</span>
                      </span>
                    </div>
                  )) : (
                    <span className="text-[9px] text-[#7A6A5A]">No eligible incidents</span>
                  )}
                  {plan.assignments.length > 3 && (
                    <span className="block text-[8px] text-[#7A6A5A]">+{plan.assignments.length - 3} more</span>
                  )}
                </div>

                <button
                  type="button"
                  aria-expanded={explainingPlanId === plan.id}
                  onClick={() => setExplainingPlanId(explainingPlanId === plan.id ? null : plan.id)}
                  className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-[#4F7C82] hover:text-[#3A2E26]"
                >
                  <HelpCircle className="h-3 w-3" />
                  Explain this decision
                </button>
                {explainingPlanId === plan.id && (
                  <DecisionTrace plan={plan} events={events} incidents={incidents} />
                )}

                <Button
                  type="button"
                  variant={plan.id === selectedPlan?.id ? 'secondary' : 'ghost'}
                  size="sm"
                  fullWidth
                  disabled={disabled}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className="mt-2 min-h-[34px] px-1.5 text-[9px]"
                >
                  {approvedPlanId === plan.id ? 'Approved measurement' : disabledPlanIds.includes(plan.id) ? 'Unavailable' : 'Pick this plan'}
                </Button>
              </article>
            );
          })}
        </div>

        {latestChange && (
          <div className="rounded-lg border border-[#E4D9C5] bg-[#FAF6EE] p-2">
            <p className="font-mono text-[9px] text-[#7A6A5A]">
              <span className="font-bold text-[#3A2E26]">Latest diff — because {latestChange.changeReason}.</span>
            </p>
            <div className="mt-1 space-y-0.5">
              {latestChange.changes.map(change => {
                const details = [
                  ...change.added.map(assignment => `+ ${volunteers[assignment.volunteerId]?.name || assignment.volunteerId} → ${incidents[assignment.incidentId]?.area || assignment.incidentId}`),
                  ...change.removed.map(assignment => `− ${volunteers[assignment.volunteerId]?.name || assignment.volunteerId} → ${incidents[assignment.incidentId]?.area || assignment.incidentId}`),
                ];
                return (
                  <p key={change.strategy} className="text-[8px] font-mono text-[#7A6A5A]">
                    <span className="font-bold text-[#3A2E26]">{STRATEGY_LABELS[change.strategy]}:</span>{' '}
                    {details.length ? details.join('; ') : 'Assignments unchanged'}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCompareOpen(value => !value)}
          aria-expanded={isCompareOpen}
          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#4F7C82] hover:text-[#3A2E26]"
        >
          <GitCompare className="w-3 h-3" />
          {isCompareOpen ? 'Hide comparison' : 'Compare plans'}
        </button>

        {isCompareOpen && (
          <div className="rounded-lg border border-[#E4D9C5] bg-[#FAF6EE] p-2.5 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="First plan to compare" value={leftPlan?.id || ''} onChange={event => setLeftPlanId(event.target.value)} className="min-w-0 rounded-md border border-[#E4D9C5] bg-[#FFFDF8] p-1 text-[9px]">
                {rankedPlans.map(plan => <option key={plan.id} value={plan.id}>{STRATEGY_LABELS[plan.strategy || ''] || plan.name}</option>)}
              </select>
              <select aria-label="Second plan to compare" value={rightPlan?.id || ''} onChange={event => setRightPlanId(event.target.value)} className="min-w-0 rounded-md border border-[#E4D9C5] bg-[#FFFDF8] p-1 text-[9px]">
                {rankedPlans.map(plan => <option key={plan.id} value={plan.id}>{STRATEGY_LABELS[plan.strategy || ''] || plan.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px]">
              <div>
                <span className="font-bold text-[#B0623A]">{STRATEGY_LABELS[leftPlan?.strategy || ''] || leftPlan?.name}</span>
                {assignmentDiff.onlyLeft.length
                  ? assignmentDiff.onlyLeft.map(item => <p key={item} className="text-[#7A6A5A]">Only here: {item}</p>)
                  : <p className="text-[#7A6A5A]">No unique assignments</p>}
              </div>
              <div>
                <span className="font-bold text-[#5F7A61]">{STRATEGY_LABELS[rightPlan?.strategy || ''] || rightPlan?.name}</span>
                {assignmentDiff.onlyRight.length
                  ? assignmentDiff.onlyRight.map(item => <p key={item} className="text-[#7A6A5A]">Only here: {item}</p>)
                  : <p className="text-[#7A6A5A]">No unique assignments</p>}
              </div>
            </div>
          </div>
        )}

        {distributionPlan?.simulationMetrics && (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#3A2E26]/35" role="presentation" onClick={() => setDistributionPlanId(null)}>
            <aside
              className="h-full w-full max-w-md overflow-y-auto border-l border-[#E4D9C5] bg-[#FFFDF8] p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="simulation-distribution-title"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 id="simulation-distribution-title" className="font-heading text-base font-bold text-[#3A2E26]">
                    Outcome distribution
                  </h3>
                  <p className="mt-1 text-xs text-[#7A6A5A]">
                    {STRATEGY_LABELS[distributionPlan.strategy || ''] || distributionPlan.name} · {distributionPlan.simulationMetrics.trials} worlds · seed {distributionPlan.simulationMetrics.seed}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close outcome distribution"
                  onClick={() => setDistributionPlanId(null)}
                  className="rounded-full p-1 text-[#7A6A5A] hover:bg-[#F2EBDD]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 rounded-xl border border-[#E4D9C5] bg-[#FAF6EE] p-3">
                <OutcomeHistogram outcomes={distributionPlan.simulationMetrics.outcomes} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-[#FAF6EE] p-3">
                  <dt className="text-[#7A6A5A]">Expected reached</dt>
                  <dd className="mt-1 font-mono font-bold text-[#3A2E26]">{Math.round(distributionPlan.simulationMetrics.expectedReached)}</dd>
                </div>
                <div className="rounded-lg bg-[#FAF6EE] p-3">
                  <dt className="text-[#7A6A5A]">Worst 5% outcome</dt>
                  <dd className="mt-1 font-mono font-bold text-[#3A2E26]">{Math.round(distributionPlan.simulationMetrics.worstCase5pct)}</dd>
                </div>
                <div className="col-span-2 rounded-lg bg-[#FAF6EE] p-3">
                  <dt className="text-[#7A6A5A]">All critical incidents reached</dt>
                  <dd className="mt-1 font-mono font-bold text-[#3A2E26]">{Math.round(distributionPlan.simulationMetrics.probabilityAllCriticalReached * 100)}% of simulated worlds</dd>
                </div>
              </dl>
            </aside>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0">
        <p className="flex items-center justify-center gap-1 w-full text-center text-[9px] text-[#7A6A5A] font-mono">
          <ShieldCheck className="w-3 h-3 text-[#5F7A61]" />
          Human approval required before dispatch
        </p>
      </CardFooter>
    </Card>
  );
};
