import { NextResponse } from "next/server";

import { refineSelectedText, type RefineAction } from "@/lib/notes";
import { syncCurrentUser } from "@/lib/sync-user";

type RefinePayload = {
  action?: RefineAction;
  text?: string;
};

const refineActions = new Set<RefineAction>([
  "improve-grammar",
  "rephrase",
  "make-shorter",
  "make-longer",
  "simplify-language",
  "change-tone",
]);

export async function POST(request: Request) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as RefinePayload;
    const action = payload.action;

    if (!action || !refineActions.has(action)) {
      return NextResponse.json({ error: "Invalid refine action." }, { status: 400 });
    }

    return NextResponse.json({
      text: refineSelectedText(payload.text || "", action),
      provider: "stub",
    });
  } catch (error) {
    console.error("AI refine failed", error);

    return NextResponse.json(
      { error: "Unable to refine this text. Please try again." },
      { status: 400 }
    );
  }
}
