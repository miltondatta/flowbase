import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, diagramType } = await req.json();

    if (!prompt || !diagramType) {
      return NextResponse.json(
        { error: "Missing prompt or diagramType" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set in environment." },
        { status: 500 }
      );
    }

    const geminiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Generate an Excalidraw-compatible list of diagram elements as JSON." +
                    " Diagram type: " +
                    diagramType +
                    ". User prompt: " +
                    prompt +
                    ".\n" +
                    "IMPORTANT: Respond ONLY with valid JSON array of elements. No commentary."
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await geminiResponse.json();

    const text =
      result?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Sanitize Gemini output to ensure valid JSON
    const clean = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .replace(/^[^\[]*/, "")
      .replace(/[^\]]*$/, "");

    let elements = [];
    try {
      elements = JSON.parse(clean);

      // Normalize all elements into valid Excalidraw schema
      elements = elements.map((el: any) => {
        return {
          // Required core fields
          id: el.id || `ai_${Date.now()}_${Math.random()}`,
          type: el.type || "rectangle",
          x: Number(el.x) || 0,
          y: Number(el.y) || 0,
          width: Number(el.width) || 120,
          height: Number(el.height) || 60,

          // Text support
          text: el.text || "",
          fontSize: el.fontSize || 20,

          // Required technical fields Excalidraw expects
          version: el.version || 1,
          versionNonce: el.versionNonce || Math.floor(Math.random() * 10000000),
          seed: el.seed || Math.floor(Math.random() * 10000000),
          strokeWidth: el.strokeWidth || 2,
          strokeColor: el.strokeColor || "#000000",
          backgroundColor: el.backgroundColor || "transparent",
          fillStyle: el.fillStyle || "hachure",
          strokeStyle: el.strokeStyle || "solid",
          roughness: el.roughness || 1,
          opacity: el.opacity || 100,
          angle: el.angle || 0,
          roundness: el.roundness || { type: 2 },
          groupIds: Array.isArray(el.groupIds) ? el.groupIds : [],
          boundElements: Array.isArray(el.boundElements) ? el.boundElements : [],
          updated: Date.now()
        };
      });
    } catch {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON.", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json({ elements });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate diagram", details: String(error) },
      { status: 500 }
    );
  }
}