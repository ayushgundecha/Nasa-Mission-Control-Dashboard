import { healthResponseSchema } from "@/api/contracts";
import {
  handleApiFailure,
  healthCacheHeaders,
  validatedJson,
} from "@/api/http";
import { readProductData } from "@/api/data";
import { healthEnvelope } from "@/api/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const data = await readProductData();
    return validatedJson(
      healthResponseSchema,
      healthEnvelope(data),
      healthCacheHeaders,
    );
  } catch (error) {
    return handleApiFailure(error);
  }
}
