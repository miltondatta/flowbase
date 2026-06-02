import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ASSEMBLYAI_API_KEY in environment." },
      { status: 500 }
    );
  }

  try {
    // AssemblyAI temporary tokens: https://www.assemblyai.com/docs/streaming/authenticate-with-a-temporary-token
    const url = "https://streaming.assemblyai.com/v3/token?expires_in_seconds=600";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "AssemblyAI token generation failed", details: text },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ token: data.token });
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to create AssemblyAI token" },
      { status: 500 }
    );
  }
}