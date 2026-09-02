import { launchesQuerySchema, launchesResponseSchema } from "@/api/contracts";
import {
  handleApiFailure,
  parseQuery,
  publicCacheHeaders,
  validatedJson,
} from "@/api/http";
import { readProductData } from "@/api/data";
import { listLaunches } from "@/api/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const query = parseQuery(launchesQuerySchema, request);
    return validatedJson(
      launchesResponseSchema,
      listLaunches(await readProductData(), query),
      publicCacheHeaders,
    );
  } catch (error) {
    return handleApiFailure(error);
  }
}
