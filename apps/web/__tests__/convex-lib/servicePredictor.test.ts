/**
 * Unit tests for convex/lib/servicePredictor.ts
 *
 * computeServicePrediction() is the core prediction engine that drives:
 *  - Service urgency ranking on the fleet dashboard
 *  - "Overdue" / "Approaching" badges on every vessel card
 *  - Automatic fleet_service_overdue / fleet_service_approaching notifications
 *
 * All tests pass a fixed `nowMs` so they are deterministic regardless of wall-clock time.
 */

import {
  computeServicePrediction,
  deriveVesselUrgency,
  computeFleetHealthScore,
  type HoursReading,
} from "convex-lib/servicePredictor";

// Fixed reference point: 2026-01-01 00:00:00 UTC
const NOW = 1735689600000;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Build a log entry N days before NOW with a given hours reading. */
function daysAgo(n: number, hours: number): HoursReading {
  return { recordedAt: NOW - n * DAY, hours };
}

// ═══════════════════════════════════════════════════════════════════════════════
// computeServicePrediction
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeServicePrediction — null / insufficient data", () => {
  it("returns all-null when serviceIntervalHours is undefined", () => {
    const result = computeServicePrediction(
      [daysAgo(10, 50), daysAgo(0, 100)],
      undefined,
      undefined,
      NOW,
    );
    expect(result.hoursUntilService).toBeNull();
    expect(result.isOverdue).toBe(false);
    expect(result.avgHoursPerDay).toBeNull();
  });

  it("returns all-null when serviceIntervalHours is 0", () => {
    const result = computeServicePrediction(
      [daysAgo(10, 50), daysAgo(0, 100)],
      0,
      undefined,
      NOW,
    );
    expect(result.hoursUntilService).toBeNull();
    expect(result.isOverdue).toBe(false);
  });

  it("returns all-null when logs array is empty", () => {
    const result = computeServicePrediction([], 100, 0, NOW);
    expect(result.hoursUntilService).toBeNull();
    expect(result.predictedServiceDate).toBeNull();
  });

  it("returns all-null when logs array has exactly one entry", () => {
    const result = computeServicePrediction([daysAgo(5, 50)], 100, 0, NOW);
    expect(result.hoursUntilService).toBeNull();
    expect(result.avgHoursPerDay).toBeNull();
  });
});

// ─── basic happy path ─────────────────────────────────────────────────────────

describe("computeServicePrediction — basic happy path", () => {
  it("correctly computes hours remaining when below threshold", () => {
    // Last service at 0 hrs. Interval 100 hrs. Currently at 60 hrs.
    const logs = [daysAgo(30, 30), daysAgo(0, 60)];
    const result = computeServicePrediction(logs, 100, 0, NOW);

    expect(result.hoursUntilService).toBe(40);
    expect(result.isOverdue).toBe(false);
    expect(result.overdueByHours).toBeNull();
  });

  it("marks isOverdue when hours exceed next service threshold", () => {
    // Last service at 200 hrs. Interval 100 hrs (next at 300). Currently at 320.
    const logs = [daysAgo(20, 280), daysAgo(0, 320)];
    const result = computeServicePrediction(logs, 100, 200, NOW);

    expect(result.isOverdue).toBe(true);
    expect(result.hoursUntilService).toBe(-20);
    expect(result.overdueByHours).toBe(20);
    expect(result.predictedServiceDate).toBeNull();
    expect(result.daysUntilService).toBeNull();
  });

  it("marks isOverdue when hours exactly equal threshold", () => {
    // Exactly AT the threshold — isOverdue because hoursUntilService === 0
    const logs = [daysAgo(10, 0), daysAgo(0, 100)];
    const result = computeServicePrediction(logs, 100, 0, NOW);

    expect(result.isOverdue).toBe(true);
    expect(result.hoursUntilService).toBe(0);
    expect(result.overdueByHours).toBe(0);
  });

  it("correctly uses lastServiceHours as base for next threshold", () => {
    // Last service at 500 hrs. Interval 250 hrs (next at 750). Currently at 600.
    const logs = [daysAgo(20, 560), daysAgo(0, 600)];
    const result = computeServicePrediction(logs, 250, 500, NOW);

    expect(result.hoursUntilService).toBe(150);
    expect(result.isOverdue).toBe(false);
  });

  it("defaults lastServiceHours to 0 when undefined", () => {
    // Interval 100 hrs from 0 (next at 100). Currently at 80.
    const logs = [daysAgo(8, 70), daysAgo(0, 80)];
    const result = computeServicePrediction(logs, 100, undefined, NOW);

    expect(result.hoursUntilService).toBe(20);
  });
});

// ─── velocity / prediction accuracy ──────────────────────────────────────────

describe("computeServicePrediction — velocity and date projection", () => {
  it("calculates avgHoursPerDay correctly", () => {
    // 30 hours logged over 10 days → 3 hrs/day
    const logs = [daysAgo(10, 0), daysAgo(0, 30)];
    const result = computeServicePrediction(logs, 100, 0, NOW);

    expect(result.avgHoursPerDay).toBeCloseTo(3, 5);
  });

  it("projects service date based on usage velocity", () => {
    // 3 hrs/day. 70 hours remaining. 70/3 ≈ 23.33 days from now.
    const logs = [daysAgo(10, 0), daysAgo(0, 30)];
    const result = computeServicePrediction(logs, 100, 0, NOW);

    const expectedDays = 70 / 3;
    expect(result.daysUntilService).toBeCloseTo(expectedDays, 3);

    const expectedDate = NOW + expectedDays * DAY;
    expect(result.predictedServiceDate).toBeCloseTo(expectedDate, -3); // within 1 second
  });

  it("handles a vessel that runs 1 hour per day", () => {
    // 1 hr/day. Interval 100 hrs from 0. Currently at 40 hrs. 60 hrs left → 60 days.
    const logs = [daysAgo(40, 0), daysAgo(0, 40)];
    const result = computeServicePrediction(logs, 100, 0, NOW);

    expect(result.avgHoursPerDay).toBeCloseTo(1, 5);
    expect(result.daysUntilService).toBeCloseTo(60, 3);
  });

  it("handles a high-usage charter vessel (10 hrs/day)", () => {
    // Charter running 10 hrs/day. 200 hr interval. Last service at 0. Now at 180. 20 left → 2 days.
    const logs = [daysAgo(18, 0), daysAgo(0, 180)];
    const result = computeServicePrediction(logs, 200, 0, NOW);

    expect(result.avgHoursPerDay).toBeCloseTo(10, 3);
    expect(result.daysUntilService).toBeCloseTo(2, 1);
  });

  it("predicts correctly when multiple readings span months", () => {
    // 300 hours over 100 days → 3 hrs/day. Interval 500 from 0. At 300 → 200 hrs left → 66.67 days.
    const logs = [
      daysAgo(100, 0),
      daysAgo(50, 150),
      daysAgo(0, 300),
    ];
    const result = computeServicePrediction(logs, 500, 0, NOW);

    expect(result.avgHoursPerDay).toBeCloseTo(3, 3);
    expect(result.hoursUntilService).toBe(200);
    expect(result.daysUntilService).toBeCloseTo(200 / 3, 2);
  });

  it("uses only the first and last readings for velocity (not intermediate)", () => {
    // Same start/end as above but a middle reading that is unusually high won't affect result.
    const logsWithMiddle = [
      daysAgo(100, 0),
      daysAgo(50, 200), // unusually fast mid-period
      daysAgo(0, 300),
    ];
    const logsWithout = [daysAgo(100, 0), daysAgo(0, 300)];

    const r1 = computeServicePrediction(logsWithMiddle, 500, 0, NOW);
    const r2 = computeServicePrediction(logsWithout, 500, 0, NOW);

    expect(r1.avgHoursPerDay).toBeCloseTo(r2.avgHoursPerDay!, 5);
  });
});

// ─── zero / edge velocity ─────────────────────────────────────────────────────

describe("computeServicePrediction — zero velocity edge cases", () => {
  it("returns null avgHoursPerDay when all readings are at the same timestamp", () => {
    // Elapsed days = 0 → cannot compute velocity
    const logs = [
      { recordedAt: NOW, hours: 0 },
      { recordedAt: NOW, hours: 50 },
    ];
    const result = computeServicePrediction(logs, 100, 0, NOW);

    expect(result.avgHoursPerDay).toBeNull();
    expect(result.predictedServiceDate).toBeNull();
    expect(result.daysUntilService).toBeNull();
    // hoursUntilService IS still computable from the reading values
    expect(result.hoursUntilService).toBe(50);
  });

  it("returns null predictedServiceDate when vessel has zero usage (idle)", () => {
    // Hours never changed → avgHoursPerDay = 0 → can't project
    const logs = [daysAgo(30, 100), daysAgo(0, 100)];
    const result = computeServicePrediction(logs, 200, 0, NOW);

    expect(result.avgHoursPerDay).toBe(0);
    expect(result.predictedServiceDate).toBeNull();
    expect(result.daysUntilService).toBeNull();
    expect(result.hoursUntilService).toBe(100);
    expect(result.isOverdue).toBe(false);
  });

  it("handles unsorted log order — always uses earliest and latest", () => {
    const logsReversed = [
      daysAgo(0, 90),
      daysAgo(30, 0),
    ];
    const logsSorted = [daysAgo(30, 0), daysAgo(0, 90)];

    const r1 = computeServicePrediction(logsReversed, 100, 0, NOW);
    const r2 = computeServicePrediction(logsSorted, 100, 0, NOW);

    expect(r1.avgHoursPerDay).toBeCloseTo(r2.avgHoursPerDay!, 5);
    expect(r1.hoursUntilService).toBe(r2.hoursUntilService);
  });
});

// ─── approaching threshold ────────────────────────────────────────────────────

describe("computeServicePrediction — approaching service (≤20 hrs)", () => {
  it("is NOT marked overdue when hoursUntilService = 20 (boundary)", () => {
    const logs = [daysAgo(8, 0), daysAgo(0, 80)];
    const result = computeServicePrediction(logs, 100, 0, NOW);

    expect(result.hoursUntilService).toBe(20);
    expect(result.isOverdue).toBe(false);
  });

  it("is NOT marked overdue when hoursUntilService = 1", () => {
    const logs = [daysAgo(99, 0), daysAgo(0, 99)];
    const result = computeServicePrediction(logs, 100, 0, NOW);

    expect(result.hoursUntilService).toBe(1);
    expect(result.isOverdue).toBe(false);
  });

  it("becomes overdue on the very next log if it crosses threshold", () => {
    // 99 hrs. Log another 2 hrs — now 101, next service at 100.
    const logsAfter = [daysAgo(100, 0), daysAgo(0, 101)];
    const result = computeServicePrediction(logsAfter, 100, 0, NOW);

    expect(result.isOverdue).toBe(true);
    expect(result.overdueByHours).toBe(1);
  });
});

// ─── large fleet scenarios ────────────────────────────────────────────────────

describe("computeServicePrediction — realistic fleet scenarios", () => {
  it("charter vessel: 250-hr service interval, last serviced at 1000 hrs, now at 1220", () => {
    // 1220 hrs, next at 1250, 30 hrs remaining. Running 10 hrs/day → 3 days.
    const logs = [daysAgo(22, 1000), daysAgo(0, 1220)];
    const result = computeServicePrediction(logs, 250, 1000, NOW);

    expect(result.hoursUntilService).toBe(30);
    expect(result.isOverdue).toBe(false);
    expect(result.avgHoursPerDay).toBeCloseTo(10, 0);
    expect(result.daysUntilService).toBeCloseTo(3, 0);
  });

  it("fishing vessel: 100-hr service, overdue by 45 hrs", () => {
    const logs = [daysAgo(14, 200), daysAgo(0, 345)];
    const result = computeServicePrediction(logs, 100, 200, NOW);

    expect(result.isOverdue).toBe(true);
    expect(result.hoursUntilService).toBe(-45);
    expect(result.overdueByHours).toBe(45);
    expect(result.predictedServiceDate).toBeNull();
  });

  it("storage vessel: logs but no usage — still reports hours until service", () => {
    const logs = [daysAgo(60, 400), daysAgo(0, 400)]; // zero hours added
    const result = computeServicePrediction(logs, 500, 0, NOW);

    expect(result.avgHoursPerDay).toBe(0);
    expect(result.hoursUntilService).toBe(100); // 500 - 400
    expect(result.predictedServiceDate).toBeNull(); // can't predict with 0 velocity
  });

  it("brand-new vessel: first two readings, no prior service", () => {
    const logs = [daysAgo(7, 0), daysAgo(0, 21)]; // 3 hrs/day for a week
    const result = computeServicePrediction(logs, 100, undefined, NOW);

    expect(result.hoursUntilService).toBe(79);
    expect(result.avgHoursPerDay).toBeCloseTo(3, 1);
    expect(result.daysUntilService).toBeCloseTo(79 / 3, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// deriveVesselUrgency
// ═══════════════════════════════════════════════════════════════════════════════

describe("deriveVesselUrgency", () => {
  const overdueP = {
    avgHoursPerDay: 10,
    predictedServiceDate: null,
    hoursUntilService: -20,
    daysUntilService: null,
    isOverdue: true,
    overdueByHours: 20,
  };

  const approachingP = {
    avgHoursPerDay: 5,
    predictedServiceDate: NOW + 4 * DAY,
    hoursUntilService: 15,
    daysUntilService: 3,
    isOverdue: false,
    overdueByHours: null,
  };

  const okP = {
    avgHoursPerDay: 2,
    predictedServiceDate: NOW + 50 * DAY,
    hoursUntilService: 100,
    daysUntilService: 50,
    isOverdue: false,
    overdueByHours: null,
  };

  const unknownP = {
    avgHoursPerDay: null,
    predictedServiceDate: null,
    hoursUntilService: null,
    daysUntilService: null,
    isOverdue: false,
    overdueByHours: null,
  };

  it("returns 'unknown' for empty predictions array", () => {
    expect(deriveVesselUrgency([])).toBe("unknown");
  });

  it("returns 'overdue' when any engine is overdue", () => {
    expect(deriveVesselUrgency([okP, overdueP])).toBe("overdue");
  });

  it("returns 'overdue' even if most engines are ok", () => {
    expect(deriveVesselUrgency([okP, okP, okP, overdueP])).toBe("overdue");
  });

  it("returns 'approaching' when at least one engine is within 20 hrs", () => {
    expect(deriveVesselUrgency([okP, approachingP])).toBe("approaching");
  });

  it("overdue trumps approaching", () => {
    expect(deriveVesselUrgency([approachingP, overdueP])).toBe("overdue");
  });

  it("returns 'ok' when all engines have hours remaining > 20", () => {
    expect(deriveVesselUrgency([okP, okP])).toBe("ok");
  });

  it("returns 'unknown' when all predictions are null (no interval set)", () => {
    expect(deriveVesselUrgency([unknownP, unknownP])).toBe("unknown");
  });

  it("returns 'ok' when mix of ok and unknown (has_at_least_one_known)", () => {
    expect(deriveVesselUrgency([okP, unknownP])).toBe("ok");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// computeFleetHealthScore
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeFleetHealthScore", () => {
  it("returns 100 when fleet is empty", () => {
    expect(computeFleetHealthScore([])).toBe(100);
  });

  it("returns 100 when all vessels are healthy", () => {
    const vessels = [
      { status: "in_service", isOverdue: false },
      { status: "in_service", isOverdue: false },
      { status: "in_maintenance", isOverdue: false },
    ];
    expect(computeFleetHealthScore(vessels)).toBe(100);
  });

  it("returns 100 when only storage vessels exist (all excluded)", () => {
    const vessels = [
      { status: "storage", isOverdue: false },
      { status: "storage", isOverdue: true },
    ];
    expect(computeFleetHealthScore(vessels)).toBe(100);
  });

  it("excludes storage vessels from the denominator", () => {
    // 2 active vessels, 1 overdue, 1 storage
    const vessels = [
      { status: "in_service", isOverdue: false },
      { status: "in_service", isOverdue: true },
      { status: "storage", isOverdue: false },
    ];
    // 1 healthy out of 2 active = 50%
    expect(computeFleetHealthScore(vessels)).toBe(50);
  });

  it("counts out_of_service as unhealthy even when not overdue", () => {
    const vessels = [
      { status: "in_service", isOverdue: false },
      { status: "out_of_service", isOverdue: false },
    ];
    expect(computeFleetHealthScore(vessels)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    // 2 of 3 healthy = 66.666...% → rounds to 67
    const vessels = [
      { status: "in_service", isOverdue: false },
      { status: "in_service", isOverdue: false },
      { status: "in_service", isOverdue: true },
    ];
    expect(computeFleetHealthScore(vessels)).toBe(67);
  });

  it("returns 0 when every active vessel is overdue", () => {
    const vessels = [
      { status: "in_service", isOverdue: true },
      { status: "in_maintenance", isOverdue: true },
    ];
    expect(computeFleetHealthScore(vessels)).toBe(0);
  });

  it("handles large realistic fleet correctly", () => {
    // 12 vessels: 2 storage, 8 healthy, 2 overdue → 8/10 = 80%
    const vessels = [
      ...Array(8).fill({ status: "in_service", isOverdue: false }),
      ...Array(2).fill({ status: "in_service", isOverdue: true }),
      ...Array(2).fill({ status: "storage", isOverdue: false }),
    ];
    expect(computeFleetHealthScore(vessels)).toBe(80);
  });
});
