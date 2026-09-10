import type { UserRole } from "@prisma/client";
import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  type AccessTokenClaims,
  verifyAccessToken,
} from "../lib/security.js";

export type AuthenticatedRequest = Request & {
  auth: AccessTokenClaims;
};

function getBearerToken(
  authorizationHeader: string | undefined,
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] =
    authorizationHeader.split(" ");

  if (
    scheme?.toLowerCase() !== "bearer" ||
    !token
  ) {
    return null;
  }

  return token;
}

export function requireAuthentication(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const token = getBearerToken(
    request.headers.authorization,
  );

  if (!token) {
    response.status(401).json({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message:
          "A valid access token is required.",
      },
    });

    return;
  }

  try {
    const claims = verifyAccessToken(token);

    (
      request as AuthenticatedRequest
    ).auth = claims;

    next();
  } catch {
    response.status(401).json({
      error: {
        code: "INVALID_ACCESS_TOKEN",
        message:
          "The access token is invalid or expired.",
      },
    });
  }
}

export function requireRoles(
  ...allowedRoles: UserRole[]
) {
  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    const authenticatedRequest =
      request as AuthenticatedRequest;

    if (!authenticatedRequest.auth) {
      response.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message:
            "Authentication is required.",
        },
      });

      return;
    }

    if (
      !allowedRoles.includes(
        authenticatedRequest.auth.role,
      )
    ) {
      response.status(403).json({
        error: {
          code: "ACCESS_DENIED",
          message:
            "Your role cannot access this resource.",
        },
      });

      return;
    }

    next();
  };
}