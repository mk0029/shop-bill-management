import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/server-auth";
import { sanityClient, urlFor } from "@/lib/sanity";

type UserProfile = {
  _id: string;
  customerId?: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  profileImage?: unknown;
  role?: string;
  updatedAt?: string;
};

type HomeAddress = {
  _id?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
};

function imageUrl(source: unknown) {
  try {
    return source ? urlFor(source).width(240).height(240).fit("crop").url() : "";
  } catch {
    return "";
  }
}

function toClientUser(user: UserProfile | null) {
  if (!user) return null;
  return {
    ...user,
    id: user._id,
    profileImageUrl: imageUrl(user.profileImage),
  };
}

function addressDocId(userId: string) {
  return `address.home.${userId.replace(/[^a-zA-Z0-9_.-]/g, "-")}`;
}

async function getCurrentUser() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated || !auth.userId) return null;
  const user = await sanityClient.fetch<UserProfile | null>(
    `*[_type=="user" && _id==$userId && isActive != false][0]{
      _id,
      customerId,
      name,
      email,
      phone,
      location,
      profileImage,
      role,
      updatedAt
    }`,
    { userId: auth.userId },
  );
  return user;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?._id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const homeAddress = await sanityClient.fetch<HomeAddress | null>(
      `*[_type=="address" && userId._ref==$userId && type=="home"] | order(isDefault desc, updatedAt desc, _updatedAt desc)[0]{
        _id,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        landmark
      }`,
      { userId: user._id },
    );
    return NextResponse.json({ success: true, user: toClientUser(user), homeAddress: homeAddress || null });
  } catch (error) {
    console.error("[Profile] fetch failed", error);
    return NextResponse.json({ success: false, error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const location = typeof body?.location === "string" ? body.location.trim().slice(0, 160) : undefined;
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 180) : undefined;
    const address = body?.homeAddress && typeof body.homeAddress === "object" ? body.homeAddress as HomeAddress : undefined;
    const profileImageAssetId = typeof body?.profileImageAssetId === "string" ? body.profileImageAssetId.trim() : "";
    const removeProfileImage = body?.removeProfileImage === true;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: "Enter a valid email address" }, { status: 400 });
    }

    const safePatch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (location !== undefined) safePatch.location = location;
    if (email) safePatch.email = email;
    if (profileImageAssetId) {
      safePatch.profileImage = {
        _type: "image",
        asset: { _type: "reference", _ref: profileImageAssetId },
      };
    }

    const userPatch = sanityClient.patch(auth.userId).set(safePatch);
    if (removeProfileImage) userPatch.unset(["profileImage"]);
    if (email === "") userPatch.unset(["email"]);
    await userPatch.commit();
    let updatedAddress: HomeAddress | null = null;
    if (address) {
      const cleanAddress = {
        addressLine1: String(address.addressLine1 || "").trim().slice(0, 180),
        addressLine2: String(address.addressLine2 || "").trim().slice(0, 180),
        city: String(address.city || "").trim().slice(0, 100),
        state: String(address.state || "").trim().slice(0, 100),
        pincode: String(address.pincode || "").replace(/\D/g, "").slice(0, 6),
        landmark: String(address.landmark || "").trim().slice(0, 140),
      };
      const hasAnyAddress = Object.values(cleanAddress).some(Boolean);
      if (hasAnyAddress) {
        if (!cleanAddress.addressLine1 || !cleanAddress.city || !cleanAddress.state || !/^[0-9]{6}$/.test(cleanAddress.pincode)) {
          return NextResponse.json(
            { success: false, error: "Home address requires address line 1, city, state, and 6-digit pincode" },
            { status: 400 },
          );
        }

        const now = new Date().toISOString();
        const docId = addressDocId(auth.userId);
        await sanityClient.createIfNotExists({
          _id: docId,
          _type: "address",
          userId: { _type: "reference", _ref: auth.userId },
          type: "home",
          isDefault: true,
          createdAt: now,
        });
        updatedAddress = await sanityClient
          .patch(docId)
          .set({
            ...cleanAddress,
            userId: { _type: "reference", _ref: auth.userId },
            type: "home",
            isDefault: true,
            updatedAt: now,
          })
          .commit<HomeAddress>();
      }
    }

    const updated = await getCurrentUser();
    return NextResponse.json({ success: true, user: toClientUser(updated), homeAddress: updatedAddress });
  } catch (error) {
    console.error("[Profile] update failed", error);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}
