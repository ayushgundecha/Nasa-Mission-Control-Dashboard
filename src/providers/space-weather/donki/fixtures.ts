import {
  donkiCmeSchema,
  donkiFlareSchema,
  donkiGeomagneticStormSchema,
  donkiNotificationSchema,
} from "./schema";

export const donkiFlareFixture = donkiFlareSchema.parse([
  {
    flrID: "2026-09-01T10:00:00-FLR-001",
    beginTime: "2026-09-01T10:00Z",
    peakTime: "2026-09-01T10:18Z",
    endTime: "2026-09-01T10:31Z",
    classType: "M1.2",
    sourceLocation: "N14W22",
    note: "Analyst-recorded solar flare event.",
    submissionTime: "2026-09-01T11:00Z",
    link: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/001",
  },
]);

export const donkiCmeFixture = donkiCmeSchema.parse([
  {
    activityID: "2026-09-01T09:24:00-CME-001",
    startTime: "2026-09-01T09:24Z",
    sourceLocation: "N14W22",
    note: "CME analysis recorded by the M2M catalog.",
    submissionTime: "2026-09-01T13:00Z",
    link: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/CME/001",
    cmeAnalyses: [
      {
        time21_5: "2026-09-01T11:12Z",
        speed: 674,
        isMostAccurate: true,
        note: "Most accurate analysis.",
      },
      {
        time21_5: "2026-09-01T11:10Z",
        speed: null,
        isMostAccurate: false,
        note: null,
      },
    ],
  },
]);

export const donkiStormFixture = donkiGeomagneticStormSchema.parse([
  {
    gstID: "2026-09-01T18:00:00-GST-001",
    startTime: "2026-09-01T18:00Z",
    allKpIndex: [
      {
        observedTime: "2026-09-01T21:00Z",
        kpIndex: 6,
        source: "NOAA",
      },
    ],
    submissionTime: "2026-09-01T22:00Z",
    link: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/GST/001",
  },
]);

export const donkiNotificationFixture = donkiNotificationSchema.parse([
  {
    messageType: "Report",
    messageID: "20260901-AL-001",
    messageURL:
      "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/Notification/001?api_key=must-not-persist",
    messageIssueTime: "2026-09-01T22:30Z",
    messageBody: "Analyst notification. No causal inference added by AstraOps.",
  },
]);

export const donkiEmptyFixture = donkiFlareSchema.parse([]);
