/**
 * Pure service-prediction engine — no Convex runtime dependency.
 * Fully testable in Jest without mocking.
 *
 * Design notes:
 * - QR Captain tracks SERVICE INTERVAL LABELS only (e.g. "250 Hr Service Due").
 *   We never auto-generate service descriptions — manufacturer liability / warranty.
 * - Prediction is velocity-based: avg daily hours derived from the reading history,
 *   then projected forward to the next service threshold.
 */

export interface HoursReading {
  hours: number;
  recordedAt: number; // Unix ms
}

export interface ServicePrediction {
  /** Average engine hours run per day (null if < 2 readings or 0 elapsed days) */
  avgHoursPerDay: number | null;
  /** Predicted Unix ms date of next service (null if can't project or already overdue) */
  predictedServiceDate: number | null;
  /** Hours remaining until next service threshold (negative = overdue) */
  hoursUntilService: number | null;
  /** Days until next service (null if can't project or overdue) */
  daysUntilService: number | null;
  /** True when current hours have already passed the next service threshold */
  isOverdue: boolean;
  /** How many hours past the threshold (null if not overdue) */
  overdueByHours: number | null;
}

const NULL_PREDICTION: ServicePrediction = {
  avgHoursPerDay: null,
  predictedServiceDate: null,
  hoursUntilService: null,
  daysUntilService: null,
  isOverdue: false,
  overdueByHours: null,
};

/**
 * Compute the service prediction for a piece of equipment.
 *
 * @param logs            Full reading history for the equipment (any order, deduplicated externally)
 * @param serviceIntervalHours  Manufacturer service interval in hours (e.g. 100 for a 100-hr oil change)
 * @param lastServiceHours      Engine hours at the time of the last service (defaults to 0)
 * @param nowMs                 Current timestamp in ms (defaults to Date.now() — injectable for tests)
 */
export function computeServicePrediction(
  logs: HoursReading[],
  serviceIntervalHours: number | undefined,
  lastServiceHours: number | undefined,
  nowMs: number = Date.now(),
): ServicePrediction {
  if (!serviceIntervalHours || logs.length < 2) {
    return { ...NULL_PREDICTION };
  }

  const sorted = [...logs].sort((a, b) => a.recordedAt - b.recordedAt);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const elapsedDays = (last.recordedAt - first.recordedAt) / (1000 * 60 * 60 * 24);
  const avgHoursPerDay =
    elapsedDays > 0 ? (last.hours - first.hours) / elapsedDays : null;

  const currentHours = last.hours;
  const baseHours = lastServiceHours ?? 0;
  const nextServiceAt = baseHours + serviceIntervalHours;
  const hoursUntilService = nextServiceAt - currentHours;
  const isOverdue = hoursUntilService <= 0;
  const overdueByHours = isOverdue ? Math.abs(hoursUntilService) : null;

  let predictedServiceDate: number | null = null;
  let daysUntilService: number | null = null;

  if (avgHoursPerDay !== null && avgHoursPerDay > 0 && !isOverdue) {
    daysUntilService = hoursUntilService / avgHoursPerDay;
    predictedServiceDate = nowMs + daysUntilService * 24 * 60 * 60 * 1000;
  }

  return {
    avgHoursPerDay,
    predictedServiceDate,
    hoursUntilService,
    daysUntilService,
    isOverdue,
    overdueByHours,
  };
}

/**
 * Derive a vessel's overall service urgency based on all its equipment predictions.
 * Used in fleet dashboard to rank vessels that need attention first.
 */
export function deriveVesselUrgency(
  predictions: ServicePrediction[],
): "overdue" | "approaching" | "ok" | "unknown" {
  if (predictions.length === 0) return "unknown";
  if (predictions.some((p) => p.isOverdue)) return "overdue";
  if (predictions.some((p) => p.hoursUntilService !== null && p.hoursUntilService <= 20))
    return "approaching";
  if (predictions.every((p) => p.hoursUntilService === null)) return "unknown";
  return "ok";
}

/**
 * Compute the fleet health score (0–100 integer).
 * Excludes storage vessels. A vessel is "healthy" if it is not overdue and not out-of-service.
 */
export function computeFleetHealthScore(vessels: {
  status: string;
  isOverdue: boolean;
}[]): number {
  const active = vessels.filter((v) => v.status !== "storage");
  if (active.length === 0) return 100;
  const healthy = active.filter((v) => !v.isOverdue && v.status !== "out_of_service");
  return Math.round((healthy.length / active.length) * 100);
}
