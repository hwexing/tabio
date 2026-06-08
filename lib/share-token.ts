import "server-only";
import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) throw new Error("SESSION_JWT_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export async function createShareToken(tripId: string): Promise<string> {
  return new SignJWT({ tripId, scope: "edit" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyShareToken(
  token: string,
  expectedTripId: string
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.scope === "edit" || payload.scope === "view") && payload.tripId === expectedTripId;
  } catch {
    return false;
  }
}
