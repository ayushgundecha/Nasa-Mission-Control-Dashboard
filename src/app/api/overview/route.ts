import { overviewResponseSchema } from "@/api/contracts";
import { handleApiFailure, validatedJson } from "@/api/http";
import { readProductData } from "@/api/data";
import { overviewEnvelope } from "@/api/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const data = await readProductData();
    return validatedJson(overviewResponseSchema, overviewEnvelope(data));
  } catch (error) {
    return handleApiFailure(error);
  }
}
