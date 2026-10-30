/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Shared WorldState Types
 * Exact specification: Event-sourced disaster coordination model.
 */

export type LanguageCode = 'en' | 'hi' | 'mr';
export type ReportSource = 'citizen' | 'official' | 'volunteer';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'assigned' | 'resolved' | 'dispatched';
export type VehicleType = 'none' | 'bike' | 'car' | 'boat';
export type PlanStatus = 'candidate' | 'approved' | 'rejected' | 'executed' | 'superposition' | 'discarded';
export type DisasterType = 'flood' | 'heatwave' | 'compound';
export type AgentRole = 'triage' | 'credibility' | 'dispatch' | 'simulation' | 'comms';

export interface AgentActivityLog {
  id: string;
  timestamp: number;
  agent: AgentRole;
  toolName: string;
  inputParams: Record<string, any>;
  outputResult: Record<string, any>;
  executionMs: number;
  status: 'success' | 'retry' | 'error';
  errorDetail?: string;
  triggerReason: string;
}

export interface LocationCoordinates {
  x: number;
  y: number;
}

export interface Area {
  id: string;
  name: string;
  region: string;
  coordinates: LocationCoordinates;
  vulnerability: number;
  hotspots?: string[];
}

export interface Report {
  id: string;
  ts: number;
  area: string;
  text: string;
  language: LanguageCode;
  englishTranslation?: string;
  translationStatus?: 'pending' | 'available' | 'unavailable';
  source: ReportSource;
  reporterId: string;
  location: LocationCoordinates;
  peopleAtRisk?: number;
  flags: string[];
  credibility?: number;
  mergedInto?: string;
  credibilityReasons?: string[];
  isUnverified?: boolean;

  // Compatibility aliases
  timestamp?: number;
  wardId?: string;
  locationName?: string;
  credibilityScore?: number;
  isVerified?: boolean;
  reporterContactMasked?: string;
  sensorCorroboration?: {
    sensorId?: string;
    sensorReading?: string;
    isCorroborated: boolean;
  };
  credibilityExplanation?: string;
  disasterType?: string;
}

export interface Incident {
  id: string;
  area: string;
  summary: string;
  priority: number;
  severity: SeverityLevel;
  needs: string[];
  reportIds: string[];
  status: IncidentStatus;

  // Compatibility aliases
  location?: LocationCoordinates;
  coordinates?: LocationCoordinates;
  title?: string;
  wardId?: string;
  locationName?: string;
  priorityScore?: number;
  priorityBreakdown?: any;
  waterLevelCm?: number;
  heatIndexC?: number;
  requiresEvacuation?: boolean;
  requiresEvac?: boolean;
  type?: DisasterType | string;
  assignedResourceIds?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface Volunteer {
  id: string;
  name: string;
  skills: string[];
  vehicle: VehicleType;
  location: LocationCoordinates;
  available: boolean;
  trust: number;
  assignedIncidentId?: string;
  phoneMasked?: string;
}

export interface Resource {
  id: string;
  type: string;
  quantity: number;
  depotArea: string;
  allocatedQty?: number;

  // Compatibility aliases
  name?: string;
  unitCode?: string;
  currentWardId?: string;
  baseWardId?: string;
  status?: string;
  speedKmH?: number;
  capacityPeople?: number;
}

export interface PlanAssignment {
  volunteerId: string;
  incidentId: string;
  resourceId?: string;
  qty?: number;
}

export interface MonteCarloResult {
  trials: number;
  seed: number;
  expectedReached: number;
  worstCase5pct: number;
  confidenceInterval95: {
    lower: number;
    upper: number;
  };
  probabilityAllCriticalReached: number;
  outcomes: number[];
  rankScore?: number;
}

export interface Plan {
  id: string;
  assignments: PlanAssignment[];
  coverage: number;
  etaMinutes: number;
  riskScore: number;
  probability: number;
  simResult?: {
    trials: number;
    successRate: number;
    p10ETA: number;
    p50ETA: number;
    p90ETA: number;
    livesSafeguarded: number;
  };
  status: PlanStatus;
  simulationMetrics?: MonteCarloResult;
  simulationExplanation?: string;
  changeReason?: string;
  probabilityDelta?: number;

  // Compatibility aliases
  name?: string;
  strategy?: string;
  strategyName?: string;
  explanation?: string;
  agentExplanation?: string;
  allocations?: any[];
  createdAt?: number;
}

export interface Event {
  id: string;
  ts: number;
  actor: string;
  type: string;
  payload: any;
  reason: string;
  version: number;
}

export interface CommsDraft {
  id: string;
  incidentId: string;
  wardId: string;
  areaName: string;
  disasterType: DisasterType;
  language: LanguageCode;
  text: string;
  approvedByHuman: boolean;
  publishedAt?: number;
  broadcastChannels: ('sms' | 'whatsapp')[];
}

export interface PriorityBreakdown {
  vulnerabilityWeight: number;
  severityScore: number;
  waterRiseVelocityCmHr?: number;
  heatIndexDeltaC?: number;
  populationAtRiskDensity: number;
  computedScore: number;
  formulaDescription: string;
}

export interface MonteCarloMetrics {
  trialsRun: number;
  successRatePct: number;
  expectedAverageETAMin: number;
  p10ETAMin: number;
  p50ETAMin: number;
  p90ETAMin: number;
  livesSafeguardedEstimate: number;
  fatigueRiskFactor: number;
  chokepointWards: string[];
  vulnerabilityMitigationPct: number;
}

// Semantic and legacy aliases
export type CandidatePlan = Plan;
export type CitizenReport = Report;
export type DisasterContext = any;
export type WorldEvent = Event;
export type ResourceType = string;

export type OfficialAgency = 'IMD' | 'BMC' | 'NDRF' | 'TRAFFIC' | 'IOT';

export interface OfficialAlert {
  id: string;
  ts: number;
  source: string;
  agency?: OfficialAgency;
  headline: string;
  text: string;
  urgency: 'critical' | 'high' | 'medium' | 'info';
  area?: string;
  claimType?: 'flood' | 'collapse' | 'dam breach' | 'fire' | 'weather';
  contradictsClaims?: string[];
  isExtremeConfirmed?: boolean;
}

export interface RoadClosure {
  area?: string;
  from?: string;
  to?: string;
  description: string;
  penaltyMinutes: number;
}

export interface DerivedWorldState {
  reports: Record<string, Report>;
  incidents: Record<string, Incident>;
  volunteers: Record<string, Volunteer>;
  resources: Record<string, Resource>;
  plans: Record<string, Plan>;
  areas: Record<string, Area>;
  officialAlerts: OfficialAlert[];
  pendingAlertsQueue: OfficialAlert[];
  roadClosures: RoadClosure[];
  commsDrafts: Record<string, CommsDraft>;
  commsOutbox: CommsDraft[];
  rejectionConstraints: string[];
  simulationSeed: number;
  isKilled: boolean;
  killReason?: string;
  killedAt?: number;
}
