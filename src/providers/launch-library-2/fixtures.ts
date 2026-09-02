import { ll2LaunchPageSchema, type Ll2LaunchPage } from "./schema";

const agency = {
  id: 147,
  url: "https://lldev.thespacedevs.com/2.3.0/agencies/147/",
  name: "Rocket Lab",
  abbrev: "RL",
  type: { name: "Commercial" },
  country: [{ alpha_2_code: "US" }],
  info_url: "https://rocketlabcorp.com/",
};

const baseLaunch = {
  id: "9f5a4cb6-63f9-47e1-9512-b468bae2a8e6",
  url: "https://lldev.thespacedevs.com/2.3.0/launches/9f5a4cb6-63f9-47e1-9512-b468bae2a8e6/",
  name: "Electron | Owl Around The World",
  slug: "electron-owl-around-the-world",
  launch_designator: null,
  status: {
    id: 1,
    name: "Go for Launch",
    abbrev: "Go",
    description: "Current T-0 confirmed by official or reliable sources.",
  },
  last_updated: "2026-08-30T21:12:03Z",
  net: "2026-09-01T11:30:00Z",
  net_precision: {
    id: 1,
    name: "Minute",
    abbrev: "MIN",
    description: "The T-0 is accurate to the minute.",
  },
  window_start: "2026-09-01T11:30:00Z",
  window_end: "2026-09-01T11:30:00Z",
  image: {
    image_url: "https://images.example.test/electron.jpg",
    thumbnail_url: "https://images.example.test/electron-thumbnail.jpg",
    credit: "Rocket Lab",
    license: {
      name: "Rocket Lab Image Use Policy",
      link: "https://rocketlabcorp.com/about/gallery/",
    },
  },
  launch_service_provider: agency,
  rocket: {
    configuration: {
      id: 26,
      url: "https://lldev.thespacedevs.com/2.3.0/launcher_configurations/26/",
      name: "Electron",
      full_name: "Electron",
      variant: "",
      active: true,
      manufacturer: agency,
      reusable: false,
      length: 18,
      leo_capacity: 300,
    },
  },
  mission: {
    id: 6848,
    name: "Owl Around The World",
    type: "Earth Science",
    description: "Synthetic aperture radar satellite mission.",
    orbit: { id: 8, name: "Low Earth Orbit", abbrev: "LEO" },
    agencies: [],
  },
  pad: {
    id: 210,
    url: "https://lldev.thespacedevs.com/2.3.0/pads/210/",
    name: "Launch Complex 1",
    latitude: -39.260881,
    longitude: 177.865826,
    location: {
      id: 10,
      url: "https://lldev.thespacedevs.com/2.3.0/locations/10/",
      name: "Mahia Peninsula, New Zealand",
    },
  },
  webcast_live: false,
  updates: [],
  info_urls: [
    {
      priority: 10,
      source: "rocketlabcorp.com",
      title: "Official mission page",
      url: "https://rocketlabcorp.com/missions/owl-around-the-world/",
      type: { name: "Official Page" },
    },
  ],
  vid_urls: [
    {
      priority: 10,
      source: "youtube.com",
      publisher: "Rocket Lab",
      title: "Official launch webcast",
      url: "https://www.youtube.com/watch?v=fixture",
      type: { name: "Webcast" },
    },
  ],
};

export const ll2LaunchFixture =
  ll2LaunchPageSchema.shape.results.element.parse(baseLaunch);

export const ll2UpcomingFixture: Ll2LaunchPage = ll2LaunchPageSchema.parse({
  count: 1,
  next: null,
  previous: null,
  results: [baseLaunch],
});

export const ll2ScheduleStateFixture: Ll2LaunchPage = ll2LaunchPageSchema.parse(
  {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        ...baseLaunch,
        id: "25dff94a-b418-4c4f-9b20-73e84b7a1650",
        url: "https://lldev.thespacedevs.com/2.3.0/launches/25dff94a-b418-4c4f-9b20-73e84b7a1650/",
        slug: "scrubbed-fixture",
        name: "Electron | Scrubbed Fixture",
        status: {
          id: 2,
          name: "To Be Determined",
          abbrev: "TBD",
          description: "Current date is a placeholder.",
        },
        updates: [
          {
            id: 1001,
            comment: "Scrubbed for the day due to weather.",
            info_url: "https://example.test/scrub-notice",
            created_on: "2026-08-31T12:00:00Z",
          },
        ],
      },
      {
        ...baseLaunch,
        id: "6f0ea04c-c0e6-47a1-818b-28ff67ee1b07",
        url: "https://lldev.thespacedevs.com/2.3.0/launches/6f0ea04c-c0e6-47a1-818b-28ff67ee1b07/",
        slug: "cancelled-year-fixture",
        name: "Concept Launcher | Cancelled Year Fixture",
        status: {
          id: 2,
          name: "To Be Determined",
          abbrev: "TBD",
          description: "Current date is a placeholder.",
        },
        net: "2027-12-31T00:00:00Z",
        net_precision: {
          id: 14,
          name: "Year",
          abbrev: "Y",
          description: "The T-0 is expected in the given year.",
        },
        window_start: "2027-12-31T00:00:00Z",
        window_end: "2027-12-31T00:00:00Z",
        updates: [
          {
            id: 1002,
            comment: "Mission cancelled by the customer.",
            info_url: null,
            created_on: "2026-09-01T12:00:00Z",
          },
        ],
      },
    ],
  },
);
