import { NextResponse } from "next/server";
import {
  getCoilsideCloudBindings,
  normalizeCloudProfile,
} from "@/lib/cloud-server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function getProfile(request: Request): string | null {
  return normalizeCloudProfile(request.headers.get("x-coilside-profile"));
}

function safePhotoId(value: string): string | null {
  const id = value.trim();
  return /^[A-Za-z0-9_-]{4,120}$/.test(id) ? id : null;
}

function keyFor(profile: string, id: string) {
  return `${profile}/${id}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const profile = getProfile(request);
  const id = safePhotoId((await context.params).id);
  if (!profile || !id) {
    return NextResponse.json({ error: "Invalid photo request." }, { status: 400 });
  }

  const { COILSIDE_PHOTOS: bucket } = getCoilsideCloudBindings();
  if (!bucket) {
    return NextResponse.json(
      { available: false, reason: "COILSIDE_PHOTOS binding is not configured." },
      { status: 503 }
    );
  }

  const object = await bucket.get(keyFor(profile, id));
  if (!object) return new Response(null, { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("etag", object.httpEtag || object.etag || "");
  headers.set("cache-control", "private, no-store");
  if (!headers.get("content-type")) {
    headers.set("content-type", "image/jpeg");
  }

  return new Response(object.body, { headers });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const profile = getProfile(request);
  const id = safePhotoId((await context.params).id);
  if (!profile || !id) {
    return NextResponse.json({ error: "Invalid photo request." }, { status: 400 });
  }

  const { COILSIDE_PHOTOS: bucket } = getCoilsideCloudBindings();
  if (!bucket) {
    return NextResponse.json(
      { available: false, reason: "COILSIDE_PHOTOS binding is not configured." },
      { status: 503 }
    );
  }

  const body = await request.arrayBuffer();
  if (body.byteLength === 0) {
    return NextResponse.json({ error: "Photo body is empty." }, { status: 400 });
  }
  if (body.byteLength > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo exceeds 20 MB limit." }, { status: 413 });
  }

  const contentType = request.headers.get("content-type") || "application/octet-stream";
  await bucket.put(keyFor(profile, id), body, {
    httpMetadata: { contentType },
    customMetadata: { uploadedAt: String(Date.now()) },
  });

  return NextResponse.json({ available: true, saved: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const profile = getProfile(request);
  const id = safePhotoId((await context.params).id);
  if (!profile || !id) {
    return NextResponse.json({ error: "Invalid photo request." }, { status: 400 });
  }

  const { COILSIDE_PHOTOS: bucket } = getCoilsideCloudBindings();
  if (!bucket) {
    return NextResponse.json(
      { available: false, reason: "COILSIDE_PHOTOS binding is not configured." },
      { status: 503 }
    );
  }

  await bucket.delete(keyFor(profile, id));
  return NextResponse.json({ available: true, deleted: true });
}
