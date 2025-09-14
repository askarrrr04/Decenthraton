import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(request: Request) {
  try {
    // Extract parts from query parameters
    const { searchParams } = new URL(request.url);
    const parts = searchParams.get("parts")?.split(",").map(Number) || [0];

    // Generate model filename based on parts
    const modelName = parts.sort((a, b) => a - b).join("") || "0";
    const filePath = join(process.cwd(), `${modelName}.glb`);

    const glbBuffer = await readFile(filePath);

    // Convert Buffer to ArrayBuffer
    const arrayBuffer = glbBuffer.buffer.slice(
      glbBuffer.byteOffset,
      glbBuffer.byteOffset + glbBuffer.byteLength
    );

    return new Response(arrayBuffer as ArrayBuffer, {
      headers: {
        "Content-Type": "model/gltf-binary",
      },
    });
  } catch (error) {
    console.error("GLB model error:", error);
    return NextResponse.json({ error: "Failed to get GLB model" }, { status: 500 });
  }
}
