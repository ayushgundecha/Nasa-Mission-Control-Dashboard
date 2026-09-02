# Space-weather integration

AstraOps combines current conditions and forecasts from NOAA's Space Weather Prediction Center with recent analyst-recorded events from NASA's DONKI catalog. NOAA and DONKI are independent: missing NASA credentials or a DONKI outage never hides valid NOAA conditions.

Primary references:

- [NOAA SWPC data service](https://services.swpc.noaa.gov/)
- [NOAA space-weather products index](https://services.swpc.noaa.gov/products/)
- [NOAA scales and Kp thresholds](https://www.swpc.noaa.gov/noaa-scales-explanation)
- [NASA CCMC DONKI API documentation](https://ccmc.gsfc.nasa.gov/tools/DONKI/)
- [NASA Open APIs](https://api.nasa.gov/#DONKI)

## NOAA datasets

| Dataset               | Public endpoint                                       | Stored window                                         | Target cadence |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------------- | -------------- |
| Planetary K-index     | `products/noaa-planetary-k-index-forecast.json`       | Previous 24 hours and next 72 hours                   | 5 minutes      |
| NOAA R/S/G scales     | `products/noaa-scales.json`                           | Previous day, current period, and three forecast days | 5 minutes      |
| Propagated solar wind | `products/geospace/propagated-solar-wind-1-hour.json` | Latest 60 one-minute rows                             | 5 minutes      |

The Kp feed's `observed`, `estimated`, and `predicted` values remain distinct. The product never presents a predicted point as a current measurement. Solar-wind speed is stored in kilometres per second; total magnetic field and Bz are stored in nanotesla. A missing value remains `null`, including when another field in the same observation is present. A measured zero remains zero.

The geomagnetic interpretation follows NOAA's published G-scale thresholds: Kp below 5 is below storm level, Kp 5 through 9 maps to G1 through G5. AstraOps adds an `elevated` band for Kp 4 to below 5, but does not call that range a NOAA storm. Copy describes possible operational relevance and never asserts that a condition affected a specific mission.

## NASA DONKI context

The server requests a bounded seven-day range for flare (`FLR`), coronal mass ejection (`CME`), geomagnetic storm (`GST`), and notification records. Refreshes target 30 minutes. These records are normalized as `analyst_event`; they are contextual catalog entries, not direct real-time measurements and not proof that one event caused another.

`NASA_API_KEY` is optional and server-only. It appears only in the outbound request. Persisted source links, health records, logs, and public data strip the key. Without the key, the application returns NOAA data with a clear DONKI-unavailable warning.

## Reliability and verification

All payloads pass strict Zod contracts before persistence. The shared provider runtime adds timeouts, bounded retries, atomic cache writes, freshness labels, last-known-good fallback, and sanitized health errors. Empty or invalid refreshes do not erase valid cached records.

On 2 September 2026, read-only contract checks from the development host validated the selected NOAA Kp, scales, summary, and propagated one-hour solar-wind payloads. NASA's public DONKI hosts reset or timed out from this host during the same check, so the DONKI contract is covered deterministically against the official CCMC field documentation and is intentionally not described as live-validated. A successful deployment-side live check remains required before claiming end-to-end DONKI availability.
