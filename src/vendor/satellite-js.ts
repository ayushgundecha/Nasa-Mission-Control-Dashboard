/**
 * Browser-safe satellite.js 7.1 adapter.
 *
 * satellite.js 7.1.0's public index also re-exports its optional WASM runtime,
 * which causes webpack to follow Node-only `node:module` and `worker_threads`
 * imports into a browser worker. These are the package's public JS SGP4
 * implementations, imported directly until the upstream export is split.
 */
export { json2satrec } from "../../node_modules/satellite.js/dist/io.js";
export {
  gstime,
  propagate,
} from "../../node_modules/satellite.js/dist/propagation.js";
export {
  degreesLat,
  degreesLong,
  eciToEcf,
  eciToGeodetic,
} from "../../node_modules/satellite.js/dist/transforms.js";
export { SatRecError } from "../../node_modules/satellite.js/dist/propagation/SatRec.js";
