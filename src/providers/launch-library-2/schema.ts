import { z } from "zod";

const nullableUrl = z.url().nullable();
const utcDateTime = z.iso.datetime({ offset: true });

const countrySchema = z.object({ alpha_2_code: z.string().length(2) });
const agencyTypeSchema = z.object({ name: z.string() });

export const ll2AgencySchema = z.object({
  id: z.number().int(),
  url: z.url(),
  name: z.string().min(1),
  abbrev: z.string().nullable().optional(),
  type: agencyTypeSchema.nullable().optional(),
  country: z.array(countrySchema).default([]),
  info_url: nullableUrl.optional(),
});

const imageLicenseSchema = z.object({
  name: z.string().min(1),
  link: nullableUrl,
});

export const ll2ImageSchema = z.object({
  image_url: z.url(),
  thumbnail_url: nullableUrl.optional(),
  credit: z.string().nullable(),
  license: imageLicenseSchema.nullable(),
});

const launcherConfigurationSchema = z.object({
  id: z.number().int(),
  url: z.url(),
  name: z.string().min(1),
  full_name: z.string().min(1),
  variant: z.string().nullable().optional(),
  active: z.boolean(),
  manufacturer: ll2AgencySchema.nullable(),
  reusable: z.boolean().nullable(),
  length: z.number().nullable(),
  leo_capacity: z.number().nullable(),
});

const missionSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  type: z.string().nullable(),
  description: z.string().nullable(),
  orbit: z
    .object({
      id: z.number().int(),
      name: z.string().min(1),
      abbrev: z.string().nullable(),
    })
    .nullable(),
  agencies: z.array(ll2AgencySchema).default([]),
});

const padSchema = z.object({
  id: z.number().int(),
  url: z.url(),
  name: z.string().min(1),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  location: z
    .object({
      id: z.number().int(),
      url: z.url(),
      name: z.string().min(1),
    })
    .nullable(),
});

const infoUrlSchema = z.object({
  priority: z.number().int().nullable().optional(),
  source: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  url: z.url(),
  type: z.object({ name: z.string() }).nullable().optional(),
});

const videoUrlSchema = z.object({
  priority: z.number().int().nullable().optional(),
  source: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  url: z.url(),
  type: z.object({ name: z.string() }).nullable().optional(),
});

const updateSchema = z.object({
  id: z.number().int(),
  comment: z.string().min(1),
  info_url: nullableUrl.optional(),
  created_on: utcDateTime,
});

export const ll2LaunchSchema = z.object({
  id: z.uuid(),
  url: z.url(),
  name: z.string().min(1),
  slug: z.string().min(1),
  launch_designator: z.string().nullable(),
  status: z.object({
    id: z.number().int(),
    name: z.string().min(1),
    abbrev: z.string().min(1),
    description: z.string().min(1),
  }),
  last_updated: utcDateTime,
  net: utcDateTime,
  net_precision: z.object({
    id: z.number().int(),
    name: z.string().min(1),
    abbrev: z.string().min(1),
    description: z.string().min(1),
  }),
  window_start: utcDateTime,
  window_end: utcDateTime,
  image: ll2ImageSchema.nullable(),
  launch_service_provider: ll2AgencySchema.nullable(),
  rocket: z
    .object({ configuration: launcherConfigurationSchema.nullable() })
    .nullable(),
  mission: missionSchema.nullable(),
  pad: padSchema.nullable(),
  webcast_live: z.boolean(),
  updates: z.array(updateSchema).default([]),
  info_urls: z.array(infoUrlSchema).default([]),
  vid_urls: z.array(videoUrlSchema).default([]),
});

export const ll2LaunchPageSchema = z.object({
  count: z.number().int().nonnegative(),
  next: nullableUrl,
  previous: nullableUrl,
  results: z.array(ll2LaunchSchema),
});

export type Ll2Agency = z.infer<typeof ll2AgencySchema>;
export type Ll2Launch = z.infer<typeof ll2LaunchSchema>;
export type Ll2LaunchPage = z.infer<typeof ll2LaunchPageSchema>;
