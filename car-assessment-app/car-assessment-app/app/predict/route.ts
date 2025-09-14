// app/api/predict/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Simulated backend response for testing model 23.glb
    const mockData = {
      parts: [6], // Left rear door, right front door
      issues: ["царапины на левой задней двери", "вмятина на правой передней двери"],
      status: "dirty",
    };

    console.log("Детали авто:", mockData.parts);
    console.log("Дефекты:", mockData.issues);
    console.log("Статус авто:", mockData.status);

    return NextResponse.json({
      parts: mockData.parts,
      issues: mockData.issues,
      status: mockData.status,
      message: "Analysis completed successfully",
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
