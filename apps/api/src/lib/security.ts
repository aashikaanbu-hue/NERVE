import {
  createHash,
  randomBytes,
} from "node:crypto";

import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt, {
  type JwtPayload,
  type SignOptions,
} from "jsonwebtoken";

import { env } from "../config/env.js";

const PASSWORD_SALT_ROUNDS = 12;

const TOKEN_ISSUER = "nerve-api";
const TOKEN_AUDIENCE = "nerve-web";

export type AccessTokenClaims = {
  userId: string;
  email: string;
  role: UserRole;
};

type NerveJwtPayload = JwtPayload & {
  email?: string;
  role?: UserRole;
  tokenType?: string;
};

export async function hashPassword(
  password: string,
): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function createAccessToken(
  claims: AccessTokenClaims,
): string {
  const options: SignOptions = {
    expiresIn:
      env.jwtAccessExpiresIn as SignOptions["expiresIn"],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    subject: claims.userId,
  };

  return jwt.sign(
    {
      email: claims.email,
      role: claims.role,
      tokenType: "access",
    },
    env.jwtSecret,
    options,
  );
}

export function verifyAccessToken(
  token: string,
): AccessTokenClaims {
  const payload = jwt.verify(
    token,
    env.jwtSecret,
    {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    },
  ) as NerveJwtPayload;

  if (
    payload.tokenType !== "access" ||
    !payload.sub ||
    !payload.email ||
    !payload.role
  ) {
    throw new Error("Invalid access token payload.");
  }

  return {
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}

export function createRefreshToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashRefreshToken(
  refreshToken: string,
): string {
  return createHash("sha256")
    .update(refreshToken)
    .digest("hex");
}

export function getRefreshTokenExpiry(): Date {
  const expiry = new Date();

  expiry.setDate(
    expiry.getDate() + env.jwtRefreshDays,
  );

  return expiry;
}