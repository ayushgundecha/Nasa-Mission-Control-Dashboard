import type {
  Launch,
  MissionEvaluation,
  MissionInput,
  SourceStamp,
} from "../contracts";
import { CONTRACT_VERSION } from "../contracts";

export const launchLibrarySourceFixture: SourceStamp = {
  provider: "launch_library_2",
  providerLabel: "Launch Library 2",
  upstreamRecordId: "550e8400-e29b-41d4-a716-446655440000",
  sourceUrl:
    "https://ll.thespacedevs.com/2.3.0/launches/550e8400-e29b-41d4-a716-446655440000/",
  observedAt: "2026-09-02T03:45:00.000Z",
  fetchedAt: "2026-09-02T04:00:00.000Z",
  upstreamVersion: "2.3.0",
  adapterVersion: "1.0.0",
  freshness: {
    state: "fresh",
    ageSeconds: 900,
    staleAfterSeconds: 3600,
    reason: null,
  },
};

export const launchFixture: Launch = {
  id: "ll2:550e8400-e29b-41d4-a716-446655440000",
  name: "AstraOps Contract Test Mission",
  slug: "astraops-contract-test-mission",
  status: "scheduled",
  window: {
    start: "2026-09-03T14:20:00.000Z",
    end: "2026-09-03T16:20:00.000Z",
    precision: "minute",
  },
  launchServiceProviderId: "ll2_agency:spacedev-example",
  vehicleId: "ll2_vehicle:vehicle-example",
  missionDescription:
    "A deterministic fixture used to prove the AstraOps public launch contract.",
  pad: {
    name: "Launch Complex Example",
    locationName: "Cape Canaveral, United States",
    position: { latitudeDegrees: 28.5619, longitudeDegrees: -80.5774 },
  },
  webcastUrl: null,
  imageUrl: null,
  source: launchLibrarySourceFixture,
};

const assumedPayload = {
  value: 1200,
  unit: "kg" as const,
  evidenceClass: "user_assumed" as const,
  source: null,
  method: null,
  uncertainty: null,
};

export const missionInputFixture: MissionInput = {
  contractVersion: CONTRACT_VERSION,
  title: "Lunar polar reconnaissance concept",
  objective:
    "Estimate a transparent reconnaissance scenario for a lunar polar orbit.",
  targetId: "astraops_target:moon",
  targetClass: "moon",
  departureWindow: {
    start: "2026-11-01T00:00:00.000Z",
    end: "2026-11-30T23:59:59.000Z",
    precision: "window",
  },
  payloadMass: assumedPayload,
  vehicleId: null,
  assumptions: [
    {
      key: "payload_mass",
      label: "Payload mass",
      value: assumedPayload,
      rationale: "User-selected preliminary payload allocation.",
    },
  ],
};

export const missionEvaluationFixture: MissionEvaluation = {
  id: "astraops_evaluation:fixture-lunar-001",
  contractVersion: CONTRACT_VERSION,
  calculationVersion: "1.0.0",
  classification: "operational_estimate",
  evaluatedAt: "2026-09-02T04:10:00.000Z",
  input: missionInputFixture,
  outputs: {
    estimatedDuration: {
      value: 4.5,
      unit: "days",
      evidenceClass: "astraops_computed",
      source: null,
      method: "patched-conic-v1",
      uncertainty: { lower: 3.5, upper: 6, confidenceLabel: "scenario range" },
    },
    estimatedDeltaV: {
      value: 4100,
      unit: "m_per_s",
      evidenceClass: "astraops_computed",
      source: null,
      method: "patched-conic-v1",
      uncertainty: null,
    },
    payloadMargin: null,
  },
  findings: [
    {
      code: "VEHICLE_NOT_SELECTED",
      severity: "warning",
      title: "Vehicle capability not evaluated",
      explanation:
        "No vehicle profile was selected, so payload margin is unavailable.",
      recovery:
        "Select a vehicle profile to calculate an estimated payload margin.",
      relatedInputKeys: ["vehicleId"],
    },
  ],
  evidenceSourceIds: [],
};

export const invalidFixtures = {
  nonUtcSource: {
    ...launchLibrarySourceFixture,
    fetchedAt: "2026-09-02T09:30:00+05:30",
  },
  missingExternalSource: {
    value: 42,
    unit: "km",
    evidenceClass: "provider_observed",
    source: null,
    method: null,
    uncertainty: null,
  },
  exoplanetMarkedOperational: {
    ...missionEvaluationFixture,
    classification: "operational_estimate",
    input: {
      ...missionInputFixture,
      targetId: "nea:kepler-186-f",
      targetClass: "exoplanet",
    },
  },
  unknownLaunchField: {
    ...launchFixture,
    providerPayload: { should: "fail closed" },
  },
} as const;
