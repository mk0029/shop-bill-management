import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const category = searchParams.get("category");

  try {
    let query = `
      *[_type == "specificationOption" && isActive == true
    `;

    if (type) {
      query += ` && type == "${type}"`;
    }

    if (category) {
      query += ` && "${category}" in categories[]`;
    }

    query += `] {
      _id,
      type,
      value,
      label,
      sortOrder,
      description,
      categories,
      isActive
    } | order(sortOrder asc)`;

    const specifications = await sanityClient.fetch(query);

    return NextResponse.json(specifications);
  } catch (error) {
    console.error("Error fetching specifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch specifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newSpecification = await sanityClient.create({
      _type: "specificationOption",
      ...body,
      isActive: true,
    });

    return NextResponse.json(newSpecification);
  } catch (error) {
    console.error("Error creating specification:", error);
    return NextResponse.json(
      { error: "Failed to create specification" },
      { status: 500 }
    );
  }
}
