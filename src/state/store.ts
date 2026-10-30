/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Central Event-Sourced Store (Zustand)
 * STRICT REQUIREMENTS:
 * 1. The store holds an append-only events[] array. All other state is derived by a reducer.
 * 2. dispatchEvent(event) appends it, increments version, and synchronously notifies every subscriber.
 * 3. Agents subscribe to the store; they never poll.
 * 4. replayFromZero() rebuilds derived state from events[0..N] to prove determinism.
 * 5. Entanglement: Report additions and official alerts trigger automatic credibility recomputation.
 */

import { create } from 'zustand';
import { buildGenesisEvents } from '../data/seedScenario.ts';
import { INITIAL_DERIVED_STATE, reduceAllEvents, reduceEvent } from './reducer.ts';
import {
  Area,
  CommsDraft,
  DerivedWorldState,
  Event,
  Incident,
  OfficialAlert,
  Plan,
  Report,
  Resource,
  RoadClosure,
  Volunteer,
} from './types.ts';
import { computeCredibility, evaluateAllAffectedReports, isIncidentDispatchable } from '../tools/credibility.ts';

export type EventSubscriber = (event: Event, state: WorldStoreState) => void;

export interface WorldStoreState extends DerivedWorldState {
  events: Event[];
  version: number;
  lastEvent?: Event;

  // Compatibility properties
  candidatePlans: Plan[];
  approvedPlanId?: string;
  agentStates: Record<string, { isEvaluating: boolean; currentTask?: string; lastExecutedAt?: number; lastLatencyMs?: number }>;
  context: {
    rainfallMmHr: number;
    highTideAlert: boolean;
    highTideTime: string;
    ambientTempC: number;
    wetBulbTempC: number;
    controlRoomShift: string;
    activeMonsoonWarning: string;
  };

  // Core Dispatch & Event-Sourcing Controls
  dispatchEvent: (
    eventData: Omit<Event, 'id' | 'ts' | 'version'> & { id?: string; ts?: number; version?: number }
  ) => Event | null;
  replayFromZero: () => { success: boolean; eventCount: number; version: number };
  subscribeToEvents: (listener: EventSubscriber) => () => void;

  // Operator & Agent Actions
  toggleKillSwitch: (reason?: string) => void;
  approvePlan: (planId: string) => void;
  rejectPlan: (planId: string, reason: string) => void;
  approveCommsDraft: (draftId: string) => void;
  ingestReport: (report: Omit<Report, 'id' | 'ts'>) => void;
  addCitizenReport: (report: any) => void;
  releaseNextOfficialAlert: () => OfficialAlert | null;
  addScenarioReport: (report: Omit<Report, 'id' | 'ts'>, id: string, ts: number, eventId: string) => Event | null;
  resetToInitialDemo: () => void;
  setCandidatePlans: (plans: Plan[]) => void;
  setAgentEvaluating: (agent: string, isEvaluating: boolean, currentTask?: string, lastLatencyMs?: number) => void;
  logAgentActivity: (activity: any) => void;
  createOrUpdateIncident: (incident: Incident, reason?: string, actor?: string) => void;
}

const eventSubscribers = new Set<EventSubscriber>();
const OPERATOR_ACTION = Symbol('operatorAction');

function operatorPayload<T extends object>(payload: T): T {
  return { ...payload, [OPERATOR_ACTION]: true } as T;
}

const initialEvents: Event[] = buildGenesisEvents();
const initialDerivedState: DerivedWorldState = reduceAllEvents(initialEvents, INITIAL_DERIVED_STATE);

const initialContext = {
  rainfallMmHr: 72,
  highTideAlert: true,
  highTideTime: '15:42 IST (+4.68m)',
  ambientTempC: 33,
  wetBulbTempC: 30.2,
  controlRoomShift: 'Monsoon Ops Shift #3 (Bandra HQ)',
  activeMonsoonWarning: 'Red Alert (Extremely Heavy)',
};

const initialAgentStates = {
  triage: { isEvaluating: false, lastExecutedAt: Date.now() - 1000 * 60 * 20, lastLatencyMs: 240 },
  credibility: { isEvaluating: false, lastExecutedAt: Date.now() - 1000 * 60 * 15, lastLatencyMs: 180 },
  dispatch: { isEvaluating: false, lastExecutedAt: Date.now() - 1000 * 60 * 10, lastLatencyMs: 420 },
  simulation: { isEvaluating: false, lastExecutedAt: Date.now() - 1000 * 60 * 10, lastLatencyMs: 190 },
  comms: { isEvaluating: false },
};

function getVolunteerTrustMap(volunteers: Record<string, Volunteer>): Record<string, number> {
  return Object.fromEntries(Object.values(volunteers).map(volunteer => [volunteer.id, volunteer.trust]));
}

function scheduleCredibilityUpdates(
  trigger: { area?: string; location?: { x: number; y: number }; reporterId?: string; ts?: number; isAlert?: boolean },
  getState: () => WorldStoreState,
  cause: string
): void {
  setTimeout(() => {
    const state = getState();
    if (state.isKilled) return;
    const trustMap = getVolunteerTrustMap(state.volunteers);
    const updates = evaluateAllAffectedReports(
      trigger,
      Object.values(state.reports),
      state.officialAlerts,
      trustMap
    );

    updates.forEach(update => {
      if (!update.changed) return;
      state.dispatchEvent({
        actor: 'Credibility',
        type: 'CREDIBILITY_UPDATED',
        payload: {
          reportId: update.reportId,
          credibility: update.newScore,
          credibilityScore: update.newScore,
          explanation: update.reasons.join('; '),
          reasons: update.reasons,
          isUnverified: update.isUnverified,
        },
        reason: `Credibility adjusted to ${(update.newScore * 100).toFixed(0)}% after ${cause}`,
      });
    });
  }, 25);
}

export const useWorldStore = create<WorldStoreState>((set, get) => ({
  // Append-only event log
  events: initialEvents,
  version: initialEvents.length,
  lastEvent: initialEvents[initialEvents.length - 1],

  // Derived WorldState Projections
  reports: initialDerivedState.reports,
  incidents: initialDerivedState.incidents,
  volunteers: initialDerivedState.volunteers,
  resources: initialDerivedState.resources,
  plans: initialDerivedState.plans,
  areas: initialDerivedState.areas,
  officialAlerts: initialDerivedState.officialAlerts || [],
  pendingAlertsQueue: initialDerivedState.pendingAlertsQueue || [],
  roadClosures: initialDerivedState.roadClosures || [],
  commsDrafts: initialDerivedState.commsDrafts,
  commsOutbox: initialDerivedState.commsOutbox,
  rejectionConstraints: initialDerivedState.rejectionConstraints,
  simulationSeed: initialDerivedState.simulationSeed,
  isKilled: initialDerivedState.isKilled,
  killReason: initialDerivedState.killReason,
  killedAt: initialDerivedState.killedAt,

  // Compatibility bindings
  candidatePlans: Object.values(initialDerivedState.plans),
  approvedPlanId: undefined,
  agentStates: initialAgentStates,
  context: initialContext,

  dispatchEvent: (eventData) => {
    const currentState = get();
    const isOperatorAction = eventData.payload?.[OPERATOR_ACTION] === true;
    if (currentState.isKilled && (eventData.type !== 'UNFREEZE' || eventData.actor !== 'human' || !isOperatorAction)) return null;
    if (!currentState.isKilled && eventData.type === 'UNFREEZE') return null;
    if (
      ['PLAN_APPROVED', 'PLAN_REJECTED', 'PLAN_EXECUTED', 'COMMS_MESSAGE_APPROVED', 'SYSTEM_FROZEN'].includes(eventData.type) &&
      (eventData.actor !== 'human' || !isOperatorAction)
    ) return null;

    const nextVersion = currentState.version + 1;
    const now = Date.now();

    const fullEvent: Event = {
      id: eventData.id || `evt_${Math.random().toString(36).substring(2, 9)}_${nextVersion}`,
      ts: eventData.ts || now,
      actor: eventData.actor,
      type: eventData.type,
      payload: eventData.payload && Object.fromEntries(
        Object.entries(eventData.payload).filter(([key]) => key !== String(OPERATOR_ACTION))
      ),
      reason: eventData.reason,
      version: nextVersion,
    };

    const currentDerived: DerivedWorldState = {
      reports: currentState.reports,
      incidents: currentState.incidents,
      volunteers: currentState.volunteers,
      resources: currentState.resources,
      plans: currentState.plans,
      areas: currentState.areas,
      officialAlerts: currentState.officialAlerts || [],
      pendingAlertsQueue: currentState.pendingAlertsQueue || [],
      roadClosures: currentState.roadClosures || [],
      commsDrafts: currentState.commsDrafts,
      commsOutbox: currentState.commsOutbox,
      rejectionConstraints: currentState.rejectionConstraints,
      simulationSeed: currentState.simulationSeed,
      isKilled: currentState.isKilled,
      killReason: currentState.killReason,
      killedAt: currentState.killedAt,
    };

    const nextDerived = reduceEvent(currentDerived, fullEvent);
    const sensitiveEventWasApplied = (() => {
      switch (fullEvent.type) {
        case 'PLAN_APPROVED':
          return nextDerived.plans[fullEvent.payload?.planId]?.status === 'approved';
        case 'PLAN_REJECTED':
          return nextDerived.plans[fullEvent.payload?.planId]?.status === 'rejected' &&
            nextDerived.rejectionConstraints.length === currentDerived.rejectionConstraints.length + 1;
        case 'PLAN_EXECUTED':
          return nextDerived.plans[fullEvent.payload?.planId]?.status === 'executed';
        case 'COMMS_DRAFTS_CREATED':
          return Array.isArray(fullEvent.payload?.drafts) &&
            fullEvent.payload.drafts.length > 0 &&
            fullEvent.payload.drafts.every((draft: CommsDraft) => Boolean(nextDerived.commsDrafts[draft.id]));
        case 'COMMS_MESSAGE_APPROVED':
          return nextDerived.commsDrafts[fullEvent.payload?.draftId]?.approvedByHuman === true &&
            nextDerived.commsOutbox.length === currentDerived.commsOutbox.length + 1;
        case 'SYSTEM_FROZEN':
          return !currentDerived.isKilled && nextDerived.isKilled;
        case 'UNFREEZE':
          return currentDerived.isKilled && !nextDerived.isKilled;
        default:
          return true;
      }
    })();
    if (!sensitiveEventWasApplied) return null;
    const updatedEvents = [...currentState.events, fullEvent];

    set({
      events: updatedEvents,
      version: nextVersion,
      lastEvent: fullEvent,
      candidatePlans: Object.values(nextDerived.plans),
      ...(fullEvent.type === 'PLAN_APPROVED' && nextDerived.plans[fullEvent.payload?.planId]?.status === 'approved'
        ? { approvedPlanId: fullEvent.payload?.planId }
        : {}),
      ...(fullEvent.type === 'SYSTEM_FROZEN'
        ? {
            agentStates: Object.fromEntries(Object.entries(currentState.agentStates).map(([name, agent]) => [
              name,
              { ...agent, isEvaluating: false, currentTask: 'Frozen by operator' },
            ])),
          }
        : fullEvent.type === 'UNFREEZE'
          ? {
              agentStates: Object.fromEntries(Object.entries(currentState.agentStates).map(([name, agent]) => [
                name,
                { ...agent, isEvaluating: false, currentTask: undefined },
              ])),
            }
          : {}),
      ...nextDerived,
    });

    const updatedState = get();

    // Synchronously notify all subscribed agents
    eventSubscribers.forEach(listener => {
      try {
        listener(fullEvent, updatedState);
      } catch (err) {
        console.error('[ENTANGLE Event Subscriber Error]:', err);
      }
    });

    return fullEvent;
  },

  replayFromZero: () => {
    const { events } = get();
    const replayedDerived = reduceAllEvents(events, INITIAL_DERIVED_STATE);

    set({
      version: events.length,
      lastEvent: events[events.length - 1],
      candidatePlans: Object.values(replayedDerived.plans),
      approvedPlanId: Object.values(replayedDerived.plans).find(plan =>
        plan.status === 'approved' || plan.status === 'executed'
      )?.id,
      ...replayedDerived,
    });

    return {
      success: true,
      eventCount: events.length,
      version: events.length,
    };
  },

  subscribeToEvents: (listener: EventSubscriber) => {
    eventSubscribers.add(listener);
    return () => {
      eventSubscribers.delete(listener);
    };
  },

  toggleKillSwitch: (reason = 'Operator Manual Emergency Override') => {
    const { isKilled, dispatchEvent } = get();
    if (!isKilled) {
      dispatchEvent({
        actor: 'human',
        type: 'SYSTEM_FROZEN',
        payload: operatorPayload({ reason }),
        reason: `Global Kill Switch engaged: ${reason}`,
      });
    } else {
      dispatchEvent({
        actor: 'human',
        type: 'UNFREEZE',
        payload: operatorPayload({}),
        reason: 'Global Kill Switch disengaged by operator',
      });
    }
  },

  approvePlan: (planId: string) => {
    const { dispatchEvent, plans, incidents, reports, isKilled } = get();
    const plan = plans[planId];
    if (isKilled || !plan || plan.status !== 'candidate') return;

    const blockedIncidents = plan.assignments
      .map(assignment => incidents[assignment.incidentId])
      .filter((incident): incident is Incident => Boolean(incident))
      .filter(incident => !isIncidentDispatchable(incident, reports));

    if (blockedIncidents.length > 0) {
      dispatchEvent({
        actor: 'dispatch',
        type: 'DISPATCH_BLOCKED_UNVERIFIED',
        payload: { planId, incidentIds: blockedIncidents.map(incident => incident.id) },
        reason: `Dispatch blocked: ${blockedIncidents.map(incident => incident.id).join(', ')} has no corroborated report.`,
      });
      return;
    }

    dispatchEvent({
      actor: 'human',
      type: 'PLAN_APPROVED',
      payload: operatorPayload({ planId, assignmentsCount: plan.assignments.length }),
      reason: `Operator approved ${plan.name || plan.id}. Superposition collapsed; units dispatched.`,
    });

  },

  rejectPlan: (planId: string, reason: string) => {
    const { dispatchEvent, plans, isKilled } = get();
    const plan = plans[planId];
    const safeReason = reason.trim().slice(0, 240);
    if (isKilled || !plan || plan.status !== 'candidate' || !safeReason) return;
    dispatchEvent({
      actor: 'human',
      type: 'PLAN_REJECTED',
      payload: operatorPayload({ planId, reason: safeReason }),
      reason: `Operator rejected ${plan.name || plan.id}: ${safeReason}`,
    });
  },

  approveCommsDraft: (draftId: string) => {
    const { dispatchEvent, commsDrafts, isKilled } = get();
    const draft = commsDrafts[draftId];
    if (isKilled || !draft || draft.approvedByHuman) return;

    dispatchEvent({
      actor: 'human',
      type: 'COMMS_MESSAGE_APPROVED',
      payload: operatorPayload({ draftId, wardId: draft.wardId, language: draft.language }),
      reason: `Operator authorized ${draft.language.toUpperCase()} ${draft.broadcastChannels.join('/')} update for ${draft.wardId.toUpperCase()}`,
    });
  },

  ingestReport: (reportData) => {
    const { dispatchEvent, reports, officialAlerts, volunteers, isKilled } = get();
    if (isKilled) return;
    const id = `rep_${Math.random().toString(36).substring(2, 8)}`;
    const report: Report = {
      ...reportData,
      id,
      ts: Date.now(),
    };
    const credibility = computeCredibility(
      report,
      [...Object.values(reports), report],
      officialAlerts,
      getVolunteerTrustMap(volunteers)
    );
    report.credibility = credibility.score;
    report.credibilityScore = credibility.score;
    report.credibilityReasons = credibility.reasons;
    report.isUnverified = credibility.isUnverified;

    dispatchEvent({
      actor: report.source === 'citizen' ? 'citizen' : `agent:${report.source}`,
      type: 'REPORT_ADDED',
      payload: report,
      reason: `Ingested field report from ${report.area.toUpperCase()} (${report.source}; ${(credibility.score * 100).toFixed(0)}% credibility)`,
    });
    scheduleCredibilityUpdates(
      { area: report.area, location: report.location, reporterId: report.reporterId, ts: report.ts },
      get,
      'spatial/temporal reinforcement'
    );
  },

  addCitizenReport: (reportData) => {
    const { dispatchEvent, reports, officialAlerts, volunteers, isKilled } = get();
    if (isKilled) return;
    const id = `rep_${Math.random().toString(36).substring(2, 8)}`;
    const report: Report = {
      ...reportData,
      id,
      ts: Date.now(),
      area: reportData.wardId || reportData.area || 'kurla',
      text: reportData.text,
      language: reportData.language || 'en',
      englishTranslation: (reportData.language || 'en') === 'en' ? reportData.text : undefined,
      translationStatus: (reportData.language || 'en') === 'en' ? 'available' : 'pending',
      source: reportData.source || 'citizen',
      reporterId: reportData.reporterId || 'citizen_anon',
      location: reportData.location || { x: 450, y: 350 },
      peopleAtRisk: reportData.peopleAtRisk,
      flags: reportData.flags || ['citizen_sos'],
    };

    // Calculate deterministic credibility for the new report
    const allReports = [...Object.values(reports), report];
    const credResult = computeCredibility(report, allReports, officialAlerts, getVolunteerTrustMap(volunteers));
    report.credibility = credResult.score;
    report.credibilityScore = credResult.score;
    report.credibilityReasons = credResult.reasons;
    report.isUnverified = credResult.isUnverified;

    dispatchEvent({
      actor: 'citizen',
      type: 'REPORT_ADDED',
      payload: report,
      reason: `Citizen distress report from ${report.area.toUpperCase()} (${(credResult.score * 100).toFixed(0)}% credibility)`,
    });

    scheduleCredibilityUpdates(
      { area: report.area, location: report.location, reporterId: report.reporterId, ts: report.ts },
      get,
      'spatial/temporal reinforcement'
    );
  },

  addScenarioReport: (reportData, id, ts, eventId) => {
    const { dispatchEvent, reports, officialAlerts, volunteers, isKilled } = get();
    if (isKilled) return null;
    const report: Report = { ...reportData, id, ts };
    const credibility = computeCredibility(
      report,
      [...Object.values(reports), report],
      officialAlerts,
      getVolunteerTrustMap(volunteers)
    );
    report.credibility = credibility.score;
    report.credibilityScore = credibility.score;
    report.credibilityReasons = credibility.reasons;
    report.isUnverified = credibility.isUnverified;
    const event = dispatchEvent({
      id: eventId,
      ts,
      actor: report.source === 'citizen' ? 'citizen' : `agent:${report.source}`,
      type: 'REPORT_ADDED',
      payload: report,
      reason: `Demo scenario report from ${report.area.toUpperCase()} (${report.source}; ${(credibility.score * 100).toFixed(0)}% credibility)`,
    });
    if (event) {
      scheduleCredibilityUpdates(
        { area: report.area, location: report.location, reporterId: report.reporterId, ts },
        get,
        'demo scenario report reinforcement'
      );
    }
    return event;
  },

  releaseNextOfficialAlert: () => {
    const { pendingAlertsQueue, dispatchEvent, isKilled } = get();
    if (isKilled) return null;
    if (!pendingAlertsQueue || pendingAlertsQueue.length === 0) return null;

    const nextAlert = pendingAlertsQueue[0];
    const updatedAlert: OfficialAlert = {
      ...nextAlert,
      ts: Date.now(),
    };

    const event = dispatchEvent({
      actor: nextAlert.agency ? `official:${nextAlert.agency.toLowerCase()}` : 'official',
      type: 'OFFICIAL_ALERT_RELEASED',
      payload: updatedAlert,
      reason: `Official emergency advisory issued: "${updatedAlert.headline}"`,
    });
    if (!event) return null;

    scheduleCredibilityUpdates(
      { area: updatedAlert.area, isAlert: true },
      get,
      `official advisory "${updatedAlert.headline}"`
    );

    return updatedAlert;
  },

  resetToInitialDemo: () => {
    if (get().isKilled) return;
    const currentState = get();
    const resetNotice: Event = {
      id: `demo_reset_${currentState.version}`,
      ts: Date.now(),
      actor: 'system',
      type: 'DEMO_SCENARIO_RESET',
      payload: {},
      reason: 'Demo scenario reset the WorldState to its seeded baseline.',
      version: currentState.version,
    };
    eventSubscribers.forEach(listener => {
      try {
        listener(resetNotice, currentState);
      } catch (err) {
        console.error('[ENTANGLE Event Subscriber Error]:', err);
      }
    });
    const freshEvents = buildGenesisEvents();
    const freshDerived = reduceAllEvents(freshEvents, INITIAL_DERIVED_STATE);
    set({
      events: freshEvents,
      version: freshEvents.length,
      lastEvent: freshEvents[freshEvents.length - 1],
      candidatePlans: Object.values(freshDerived.plans),
      approvedPlanId: undefined,
      ...freshDerived,
    });
  },

  setCandidatePlans: (plans) => {
    const { dispatchEvent, isKilled } = get();
    if (isKilled) return;
    const event = dispatchEvent({
      actor: 'agent:dispatch',
      type: 'PLANS_SUPERPOSITION_UPDATED',
      payload: { plans },
      reason: 'Generated 3 superposition candidate dispatch plans',
    });
    if (!event) return;
    set({ candidatePlans: plans });
  },

  setAgentEvaluating: (agent, isEvaluating, currentTask, lastLatencyMs) => {
    set((state) => ({
      agentStates: {
        ...state.agentStates,
        [agent]: {
          ...state.agentStates[agent],
          isEvaluating: state.isKilled ? false : isEvaluating,
          currentTask: state.isKilled ? 'Frozen by operator' : currentTask,
          ...(lastLatencyMs ? { lastLatencyMs, lastExecutedAt: Date.now() } : {}),
        },
      },
    }));
  },

  logAgentActivity: (activity) => {
    const { dispatchEvent, isKilled } = get();
    if (isKilled) return;
    dispatchEvent({
      actor: `agent:${activity.agent}`,
      type: 'AGENT_TOOL_CALLED',
      payload: activity,
      reason: `Agent ${activity.agent} invoked ${activity.toolName}`,
    });
  },

  createOrUpdateIncident: (incident, reason, actor) => {
    const { dispatchEvent, isKilled } = get();
    if (isKilled) return;
    dispatchEvent({
      actor: actor || 'agent:triage',
      type: 'INCIDENT_CREATED',
      payload: incident,
      reason: reason || `Updated incident ${incident.summary || incident.title || incident.id}`,
    });
  },
}));

export type { Area, Incident, Plan, Report, Resource, Volunteer, Event };
