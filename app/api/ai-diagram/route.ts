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

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not set in environment." },
        { status: 500 }
      );
    }

    // OpenRouter endpoint
    const url = "https://openrouter.ai/api/v1/chat/completions";

    // Strong layout instructions for clean diagram output (DeepSeek V3)
    const systemPrompt = `
You are a diagram layout engine. Generate clean, well‑spaced Excalidraw JSON.

RULES:
- Respond ONLY with a JSON array.
- NO markdown, NO code fences, NO text before/after JSON.
- No overlapping. No messy stacking.
- Use clear hierarchical layout.
- y coordinates must increase by 250 per step.
- x coordinates must be spaced by 300 horizontally.
- Create 6–12 shapes.
- Supported types: rectangle, diamond, ellipse, arrow, text.
- Arrows must include: "points": [[0,0],[120,0]].
- All shapes must include: id, type, x, y, width, height, text, fontSize.
`;

    const userPrompt = `
Diagram type: ${diagramType}
User description: ${prompt}

Return ONLY a JSON array. No explanations.
`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Flowbase Diagram Generation",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3
      }),
    });

    const json = await response.json();

    if (!json || !json.choices || !json.choices[0]?.message?.content) {
      return NextResponse.json(
        { error: "OpenRouter returned invalid structure", raw: json },
        { status: 500 }
      );
    }

    const raw = json.choices[0].message.content;

    // Clean markdown or accidental text
    const clean = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let elements = [];
    try {
      const parsed = JSON.parse(clean);

      elements = parsed.map((el: any) => {
        const isArrow = el.type === "arrow";

        return {
          id: el.id || `ds_${Date.now()}_${Math.random()}`,
          type: el.type || "rectangle",
          x: Number(el.x) || 0,
          y: Number(el.y) || 0,
          width: Number(el.width) || 180,
          height: Number(el.height) || 80,
          points: isArrow
            ? (el.points && Array.isArray(el.points)) ? el.points : [[0,0],[120,0]]
            : undefined,
          text: el.text || "",
          fontSize: el.fontSize || 20,

          // required internal fields
          version: 1,
          versionNonce: Math.floor(Math.random() * 999999999),
          seed: Math.floor(Math.random() * 999999999),
          strokeWidth: 2,
          strokeColor: "#000000",
          backgroundColor: "transparent",
          fillStyle: "hachure",
          strokeStyle: "solid",
          roughness: 1,
          opacity: 100,
          angle: 0,
          roundness: { type: 2 },
          groupIds: [],
          boundElements: [],
          updated: Date.now(),
        };
      });
    } catch (err) {
      return NextResponse.json(
        { error: "OpenRouter DeepSeek returned non‑JSON output.", raw: clean },
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