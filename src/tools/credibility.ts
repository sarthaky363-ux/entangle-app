/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ENTANGLE Credibility Module
 * Pure TypeScript deterministic computation of report source truth and corroboration.
 * 
 * STRICT SPECIFICATION:
 * computeCredibility(report, allReports, officialAlerts, volunteerTrustMap?) returns { score: 0-1, reasons: string[] }
 * 
 * - Reinforcement: +0.15 for each INDEPENDENT report (different reporterId) within 300 m and 30 minutes, capped at +0.45.
 * - Cancellation: -0.5 if the claim type (flood, collapse, dam breach, fire) is contradicted by an official alert
 *   for that area in the last 60 minutes, -0.2 if no official source exists for an extreme claim.
 * - Specificity: +0.1 each for a concrete street or landmark, a named count of people, a water depth.
 * - Reporter history: use the reporter's trust value, +/-0.1.
 * - Clamp to 0-1. Reasons must be a list of human-readable strings.
 * 
 * ENTANGLEMENT BEHAVIOUR:
 * - Reports below 0.35 are flagged "Unverified", kept visible, and excluded from dispatch until corroborated.
 * - Never delete a report.
 * - When a new report arrives that reinforces or contradicts an older one, recompute the old one and emit 'CREDIBILITY_UPDATED'
 *   so Triage and Dispatch re-run.
 */

import { Incident, OfficialAlert, Report } from '../state/types.ts';

export type ClaimType = 'flood' | 'collapse' | 'dam breach' | 'fire';

export interface CredibilityResult {
  score: number;
  reasons: string[];
  isUnverified: boolean;
  reinforcementsCount: number;
  contradictedByAlert?: OfficialAlert;
  extremeClaimUncorroborated: boolean;
  specificityBreakdown: {
    hasStreetOrLandmark: boolean;
    hasPeopleCount: boolean;
    hasWaterDepth: boolean;
  };
  reporterTrustAdjustment: number;
}

export function isReportDispatchable(report: Report): boolean {
  const score = report.credibility ?? report.credibilityScore ?? 0;
  return score >= 0.35 && report.isUnverified !== true;
}

export function isIncidentDispatchable(
  incident: Pick<Incident, 'reportIds'>,
  reports: Record<string, Report>
): boolean {
  return incident.reportIds.length === 0 ||
    incident.reportIds.some(reportId => {
      const report = reports[reportId];
      return report !== undefined && isReportDispatchable(report);
    });
}

// Concrete street and landmark dictionary across Mumbai districts (English, Hindi, Marathi)
const SPECIFIC_LANDMARKS = [
  'lane 4', 'kranti nagar', 'bail bazaar', 'lbs marg', 'kumbharwada',
  'dharavi', '90-feet road', 'milan subway', 'andheri subway', 'dahisar river',
  'postal colony', 'shell colony', 'shivaji nagar', 'mahim causeway', 'kalina',
  'sion station', 'sion circle', 'koliwada', 'saki naka', 'check-naka',
  'transit camp', 'railway bridge', 'sv road', 'borivali', 'weh junction',
  'क्रांती नगर', 'बैल बाजार', 'कुंभारवाडा', 'धारावी', '९० फूट रोड', 'सायन कोलीवाडा',
  'मिलन सबवे', 'अंधेरी सबवे', 'दहिसर चेक नाका', 'गोवंडी शिवाजी नगर', 'पोस्टल कॉलनी'
];

const GENERIC_LOCATION_MARKERS = [
  /\b(lane \d+|lane|gali|road|chowk|cross|junction|circle|culvert|subway|underpass|nullah|bridge|chawl|camp|weir|spillway)\b/i,
  /\b(मार्ग|गल्ली|नगर|चौक|नाका|कॉलनी|पूल|सबवे|नाला|चाळ)\b/u
];

const WATER_DEPTH_PATTERNS = [
  /\b(knee|knee-deep|knee-high|waist|waist-deep|waist-high|chest|chest-deep|chest-high|roof|rooftop)\b/i,
  /\b(ground floor|1st floor|first floor|submerged \d+cm|submerged \d+m|\d+\s*(cm|m|feet|ft|inches))\b/i,
  /\b(कमर|कंबर|कमरेभर|कंबरेभर|छत|छतावर|छतापर्यंत|गुडघा|गुडघे|गुडघाभर|घुटना|घुटने|पाण्याखाली|पाणी भरले)\b/u
];

const EXTREME_CLAIM_PATTERNS = [
  /\b(dam burst|dam has burst|dam breach|spillway breach|lake breach|entire .* submerged|thousands dead|catastrophic explosion|massive dam)\b/i,
  /\b(धरण फुटले|धरण फुटल्याची|संपूर्ण बुडाले)\b/u
];

/**
 * Detects claim types present in the report
 */
export function detectClaimTypes(text: string, flags: string[] = []): ClaimType[] {
  const claims: ClaimType[] = [];
  const textLower = text.toLowerCase();
  const flagsStr = flags.join(' ').toLowerCase();

  // Dam breach
  if (
    textLower.includes('dam') ||
    textLower.includes('burst') ||
    textLower.includes('breach') ||
    textLower.includes('powai') ||
    textLower.includes('धरण') ||
    flagsStr.includes('dam')
  ) {
    claims.push('dam breach');
  }

  // Collapse
  if (
    textLower.includes('collapse') ||
    textLower.includes('collapsed') ||
    textLower.includes('landslide') ||
    textLower.includes('falling down') ||
    textLower.includes('कोसळली') ||
    textLower.includes('पडले') ||
    flagsStr.includes('collapse')
  ) {
    claims.push('collapse');
  }

  // Fire
  if (
    textLower.includes('fire') ||
    textLower.includes('smoke') ||
    textLower.includes('short circuit') ||
    textLower.includes('blast') ||
    textLower.includes('cylinder') ||
    textLower.includes('आग') ||
    flagsStr.includes('fire')
  ) {
    claims.push('fire');
  }

  // Flood / Waterlogging
  if (
    textLower.includes('water') ||
    textLower.includes('flood') ||
    textLower.includes('submerged') ||
    textLower.includes('inundated') ||
    textLower.includes('waterlogging') ||
    textLower.includes('nullah') ||
    textLower.includes('पाणी') ||
    textLower.includes('पूर') ||
    flagsStr.includes('water') ||
    flagsStr.includes('flood')
  ) {
    claims.push('flood');
  }

  return claims;
}

/**
 * Checks if a report contains an extreme disaster claim
 */
export function isExtremeClaim(text: string, flags: string[] = []): boolean {
  if (flags.includes('extreme_claim') || flags.includes('viral_rumour')) return true;
  return EXTREME_CLAIM_PATTERNS.some(pat => pat.test(text));
}

/**
 * Computes source credibility for a report using the exact deterministic formula:
 * - Reinforcement (+0.15 per independent report within 300m and 30min, cap +0.45)
 * - Cancellation (-0.5 if claim contradicted by official alert in last 60min, -0.2 if extreme claim without official source)
 * - Specificity (+0.1 each for street/landmark, people count, water depth)
 * - Reporter history (+/-0.1 based on reporter trust)
 * - Clamped to 0.0 - 1.0
 */
export function computeCredibility(
  report: Report,
  allReports: Report[],
  officialAlerts: OfficialAlert[] = [],
  volunteerTrustMap: Record<string, number> = {}
): CredibilityResult {
  const reasons: string[] = [];
  const text = report.text || '';
  const textLower = text.toLowerCase();
  const reportTs = report.ts || Date.now();

  // 1. Base Prior
  let baseScore = 0.50; // Neutral prior for unverified citizen report
  if (report.source === 'official') {
    baseScore = 0.90;
    reasons.push('Baseline: Official agency dispatch (0.90 prior)');
  } else if (report.source === 'volunteer') {
    baseScore = 0.80;
    reasons.push('Baseline: Registered civil defence volunteer dispatch (0.80 prior)');
  } else {
    reasons.push('Baseline: Unverified citizen report (0.50 neutral prior)');
  }

  // 2. Reinforcement: +0.15 for each INDEPENDENT report (different reporterId) within 300m and 30min, capped at +0.45
  let reinforcementsCount = 0;
  const maxTimeDiffMs = 30 * 60 * 1000; // 30 minutes
  const maxCoordinateDist = 30; // Schematic scale: 10 units are approximately 100 metres

  allReports.forEach(other => {
    // Must be a different report and a different reporter (INDEPENDENT)
    if (!other.id || other.id === report.id) return;
    if (!other.reporterId || !report.reporterId || other.reporterId === report.reporterId) return;

    // Time window check: within 30 minutes
    const otherTs = other.ts || reportTs;
    if (Math.abs(reportTs - otherTs) > maxTimeDiffMs) return;

    // Spatial check: within 300m
    const dx = (report.location?.x || 0) - (other.location?.x || 0);
    const dy = (report.location?.y || 0) - (other.location?.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If within radius or matching same micro-hotspot lane
    if (dist <= maxCoordinateDist) {
      reinforcementsCount++;
    }
  });

  const reinforcementBoost = Math.min(0.45, reinforcementsCount * 0.15);
  if (reinforcementsCount > 0) {
    reasons.push(
      `Reinforced by ${reinforcementsCount} ${reinforcementsCount === 1 ? 'report' : 'reports'} (+${reinforcementBoost.toFixed(2)})`
    );
  }

  // 3. Cancellation:
  // -0.5 if the claim type (flood, collapse, dam breach, fire) is contradicted by an official alert for that area in last 60 minutes
  // -0.2 if no official source exists for an extreme claim
  let cancellationPenalty = 0;
  let contradictedByAlert: OfficialAlert | undefined;
  const sixtyMinutesMs = 60 * 60 * 1000;
  const claims = detectClaimTypes(text, report.flags);

  // Check contradictions against official alerts
  for (const alert of officialAlerts) {
    const alertTs = alert.ts;
    const alertAge = Date.now() - alertTs;
    const isWithin60Min = alertAge >= 0 && alertAge <= sixtyMinutesMs;
    if (!isWithin60Min) continue;

    const alertTextLower = (alert.headline + ' ' + alert.text).toLowerCase();
    const alertArea = (alert.area || '').toLowerCase();
    const reportArea = (report.area || '').toLowerCase();
    const isAreaMatch = !alert.area || alertArea === 'all' || alertArea === reportArea;
    if (!isAreaMatch) continue;

    // Contradiction A: Alert explicitly specifies contradicted claims
    if (alert.contradictsClaims && alert.contradictsClaims.length > 0) {
      const matchesContradicted = alert.contradictsClaims.some(c => textLower.includes(c.toLowerCase()));
      if (matchesContradicted) {
        contradictedByAlert = alert;
        cancellationPenalty += 0.50;
        reasons.push(`Contradicted by ${alert.agency || alert.source} alert: "${alert.headline}" (-0.50)`);
        break;
      }
    }

    // Contradiction B: Explicit debunking in alert text
    if (
      (alertTextLower.includes('no dam burst') ||
        alertTextLower.includes('dam intact') ||
        alertTextLower.includes('false report') ||
        alertTextLower.includes('disregard viral') ||
        alertTextLower.includes('operating normally')) &&
      claims.includes('dam breach')
    ) {
      contradictedByAlert = alert;
      cancellationPenalty += 0.50;
      reasons.push(`Contradicted by official hydrology alert: "${alert.headline}" (-0.50)`);
      break;
    }
  }

  // Extreme claim check
  let extremeClaimUncorroborated = false;
  if (isExtremeClaim(text, report.flags)) {
    // Look for official confirmation
    const hasOfficialCorroboration = officialAlerts.some(alert => {
      const alertAge = Date.now() - alert.ts;
      if (alertAge < 0 || alertAge > sixtyMinutesMs) return false;
      const alertArea = (alert.area || '').toLowerCase();
      const reportArea = (report.area || '').toLowerCase();
      const isAreaMatch = !alert.area || alertArea === 'all' || alertArea === reportArea;
      const isClaimMatch = !alert.claimType || claims.includes(alert.claimType as ClaimType);
      return isAreaMatch && isClaimMatch && alert.isExtremeConfirmed === true;
    });

    if (!hasOfficialCorroboration) {
      extremeClaimUncorroborated = true;
      cancellationPenalty += 0.20;
      reasons.push('Extreme disaster claim lacks official agency confirmation (-0.20)');
    }
  }

  // 4. Specificity: +0.1 each for concrete street/landmark, named count of people, water depth
  let specificityBoost = 0;
  const specificityBreakdown = {
    hasStreetOrLandmark: false,
    hasPeopleCount: false,
    hasWaterDepth: false,
  };

  // a) Concrete street or landmark
  const hasLandmark = SPECIFIC_LANDMARKS.some(l => textLower.includes(l.toLowerCase())) ||
    GENERIC_LOCATION_MARKERS.some(pat => pat.test(text));
  if (hasLandmark) {
    specificityBreakdown.hasStreetOrLandmark = true;
    specificityBoost += 0.10;
    reasons.push('Specific street, corridor, or landmark identified (+0.10)');
  }

  // b) Named count of people
  const hasExplicitPeopleCount = (report.peopleAtRisk !== undefined && report.peopleAtRisk > 0);
  const mentionsCountRegex = /\b(\d+|६|५|२५|४५|६५|८०|८२)\s*(people|persons|family|families|elders|children|kids|members|infants|passengers|laborer|मुले|लोक|नागरिक|व्यक्ती|लोग|प्रवासी)\b/i;
  const mentionsAgeRegex = /\b(\d+)\s*(वर्ष|yo|year old|years old)\b/i;

  if (hasExplicitPeopleCount || mentionsCountRegex.test(text) || mentionsAgeRegex.test(text)) {
    specificityBreakdown.hasPeopleCount = true;
    specificityBoost += 0.10;
    const countDisplay = report.peopleAtRisk ? `${report.peopleAtRisk} individuals` : 'Specific headcount';
    reasons.push(`Named count of people at risk provided: ${countDisplay} (+0.10)`);
  }

  // c) Water depth
  const hasWaterDepth = WATER_DEPTH_PATTERNS.some(pat => pat.test(text));
  if (hasWaterDepth) {
    specificityBreakdown.hasWaterDepth = true;
    specificityBoost += 0.10;
    reasons.push('Concrete water depth or physical immersion level reported (+0.10)');
  }

  // 5. Reporter history: +/-0.1 based on reporter trust
  let reporterTrustAdjustment = 0;
  let reporterTrust: number | undefined;

  if (report.reporterId && volunteerTrustMap[report.reporterId] !== undefined) {
    reporterTrust = volunteerTrustMap[report.reporterId];
  } else if (report.source === 'volunteer') {
    reporterTrust = 0.95;
  } else if (report.source === 'official') {
    reporterTrust = 1.0;
  } else if (report.reporterId?.includes('anon') || report.reporterId?.includes('panic')) {
    reporterTrust = 0.20;
  }

  if (reporterTrust !== undefined) {
    if (reporterTrust >= 0.85) {
      reporterTrustAdjustment = 0.10;
      reasons.push(`High reporter trust index (${(reporterTrust * 100).toFixed(0)}%) (+0.10)`);
    } else if (reporterTrust <= 0.40) {
      reporterTrustAdjustment = -0.10;
      reasons.push(`Low / anonymous reporter trust history (${(reporterTrust * 100).toFixed(0)}%) (-0.10)`);
    } else {
      reporterTrustAdjustment = Math.round((reporterTrust - 0.5) * 0.2 * 100) / 100;
      if (reporterTrustAdjustment !== 0) {
        reasons.push(`Reporter trust adjustment: ${reporterTrustAdjustment > 0 ? '+' : ''}${reporterTrustAdjustment.toFixed(2)}`);
      }
    }
  }

  // 6. Final Score Calculation & Clamping
  const rawScore = baseScore + reinforcementBoost - cancellationPenalty + specificityBoost + reporterTrustAdjustment;
  const clampedScore = Math.max(0, Math.min(1, Math.round(rawScore * 100) / 100));
  const isUnverified = clampedScore < 0.35;

  if (isUnverified) {
    reasons.push('Score < 0.35: Flagged as Unverified (excluded from dispatch until corroborated)');
  }

  return {
    score: clampedScore,
    reasons,
    isUnverified,
    reinforcementsCount,
    contradictedByAlert,
    extremeClaimUncorroborated,
    specificityBreakdown,
    reporterTrustAdjustment,
  };
}

export interface AffectedReportEvaluation {
  reportId: string;
  previousScore?: number;
  newScore: number;
  isUnverified: boolean;
  reasons: string[];
  changed: boolean;
}

/**
 * Entanglement Evaluator:
 * When a report is ingested or an official alert is released, recompute credibility for all
 * reports within spatial/temporal vicinity or with matching claims.
 */
export function evaluateAllAffectedReports(
  triggerReportOrAlert: {
    area?: string;
    location?: { x: number; y: number };
    reporterId?: string;
    ts?: number;
    isAlert?: boolean;
  },
  allReports: Report[],
  officialAlerts: OfficialAlert[],
  volunteerTrustMap: Record<string, number> = {}
): AffectedReportEvaluation[] {
  const updates: AffectedReportEvaluation[] = [];

  allReports.forEach(rep => {
    if (!rep.id) return;
    if (triggerReportOrAlert.isAlert) {
      const alertArea = triggerReportOrAlert.area?.toLowerCase();
      if (alertArea && alertArea !== 'all' && rep.area.toLowerCase() !== alertArea) return;
    } else {
      if (Math.abs(rep.ts - (triggerReportOrAlert.ts ?? rep.ts)) > 30 * 60 * 1000) return;
      if (triggerReportOrAlert.reporterId && rep.reporterId === triggerReportOrAlert.reporterId) return;
      if (triggerReportOrAlert.location) {
        const distance = Math.hypot(
          rep.location.x - triggerReportOrAlert.location.x,
          rep.location.y - triggerReportOrAlert.location.y
        );
        if (distance > 30) return;
      }
    }

    const prevScore = rep.credibility ?? rep.credibilityScore;
    const result = computeCredibility(rep, allReports, officialAlerts, volunteerTrustMap);

    const previousReasons = rep.credibilityReasons || (rep.credibilityExplanation ? [rep.credibilityExplanation] : []);
    const changed = prevScore === undefined ||
      Math.abs((prevScore || 0) - result.score) >= 0.02 ||
      previousReasons.join('\n') !== result.reasons.join('\n') ||
      rep.isUnverified !== result.isUnverified;
    updates.push({
      reportId: rep.id,
      previousScore: prevScore,
      newScore: result.score,
      isUnverified: result.isUnverified,
      reasons: result.reasons,
      changed,
    });
  });

  return updates;
}
