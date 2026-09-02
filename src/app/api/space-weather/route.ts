import { spaceWeatherResponseSchema } from "@/api/contracts";
import { handleApiFailure, validatedJson } from "@/api/http";
import { readProductData } from "@/api/data";
import { weatherEnvelope } from "@/api/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const data = await readProductData();
    return validatedJson(spaceWeatherResponseSchema, weatherEnvelope(data));
  } catch (error) {
    return handleApiFailure(error);
  }
}
