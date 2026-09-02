import { launchDetailResponseSchema } from "@/api/contracts";
import { apiError, handleApiFailure, validatedJson } from "@/api/http";
import { readProductData } from "@/api/data";
import { detailEnvelope, launchDetail } from "@/api/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;
    if (id.length > 240) {
      return apiError(
        400,
        "BAD_REQUEST",
        "The launch identifier is too long.",
        {
          recovery: "Use a Launch Library 2 ID or AstraOps launch slug.",
        },
      );
    }
    const data = await readProductData();
    const detail = launchDetail(data, id);
    if (!detail) {
      return apiError(404, "NOT_FOUND", "No launch matches that identifier.", {
        recovery:
          "Use GET /api/launches to discover current launch identifiers.",
      });
    }
    return validatedJson(
      launchDetailResponseSchema,
      detailEnvelope(data, detail),
    );
  } catch (error) {
    return handleApiFailure(error);
  }
}
