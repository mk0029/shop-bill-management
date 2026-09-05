import { NextRequest, NextResponse } from "next/server";
import { createDocument, updateDocument, deleteDocument } from "@/lib/sanity/write-router";
import { getServerAuth } from "@/lib/server-auth";
import { isAdminLike } from "@/lib/rbac";

const TYPE_PURPOSE: Record<string, string> = {
  brand: "brands",
  brands: "brands",
  category: "categories",
  categories: "categories",
  specification: "specifications",
  specificationOption: "specifications",
  specifications: "specifications",
  dynamicField: "dynamic-fields",
  dynamicFieldItem: "dynamic-fields",
  dynamicFields: "dynamic-fields",
  supplier: "suppliers",
  suppliers: "suppliers",
  product: "products",
  products: "products",
  stockTransaction: "stock",
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated || !isAdminLike(auth.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const type = String(body?.type || "");
    const purpose = TYPE_PURPOSE[type];
    if (!purpose) {
      return NextResponse.json({ success: false, error: `Unsupported type: ${type}` }, { status: 400 });
    }

    if (action === "create") {
      const doc = body?.doc;
      if (!doc || typeof doc !== "object") {
        return NextResponse.json({ success: false, error: "Missing doc" }, { status: 400 });
      }
      const result = await createDocument(doc, purpose);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || "Create failed" }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: { _id: result.documentId, ...doc } });
    }

    if (action === "update") {
      const id = String(body?.id || "");
      const patch = body?.patch;
      if (!id || !patch || typeof patch !== "object") {
        return NextResponse.json({ success: false, error: "Missing id or patch" }, { status: 400 });
      }
      const result = await updateDocument(id, patch, purpose);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || "Update failed" }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "delete") {
      const id = String(body?.id || "");
      if (!id) {
        return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
      }
      const result = await deleteDocument(id, purpose);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || "Delete failed" }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}