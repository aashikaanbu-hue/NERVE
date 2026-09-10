import {
  AuditAction,
  UserStatus,
} from "@prisma/client";

import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";

import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";

import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  verifyPassword,
} from "../../lib/security.js";

import {
  type AuthenticatedRequest,
  requireAuthentication,
} from "../../middleware/auth.js";

import { loginSchema } from "./auth.schemas.js";

export const authRouter = Router();

const REFRESH_COOKIE_NAME =
  "nerve_refresh_token";

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    error: {
      code: "TOO_MANY_LOGIN_ATTEMPTS",
      message:
        "Too many login attempts. Please try again later.",
    },
  },
});

function setRefreshCookie(
  response: Response,
  refreshToken: string,
): void {
  response.cookie(
    REFRESH_COOKIE_NAME,
    refreshToken,
    {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "strict",
      path: "/api/v1/auth",
      maxAge:
        env.jwtRefreshDays *
        24 *
        60 *
        60 *
        1000,
    },
  );
}

function clearRefreshCookie(
  response: Response,
): void {
  response.clearCookie(
    REFRESH_COOKIE_NAME,
    {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "strict",
      path: "/api/v1/auth",
    },
  );
}

function getRequestIp(
  request: Request,
): string | null {
  return request.ip ?? null;
}

function getUserAgent(
  request: Request,
): string | null {
  return request.get("user-agent") ?? null;
}

authRouter.post(
  "/login",
  loginRateLimiter,

  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation =
        loginSchema.safeParse(request.body);

      if (!validation.success) {
        response.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message:
              "The login information is invalid.",
            fields:
              validation.error.flatten()
                .fieldErrors,
          },
        });

        return;
      }

      const {
        email,
        password,
        role,
      } = validation.data;

      const user =
        await prisma.user.findUnique({
          where: {
            email,
          },
        });

      const passwordIsValid =
        user !== null
          ? await verifyPassword(
              password,
              user.passwordHash,
            )
          : false;

      const credentialsAreValid =
        user !== null &&
        passwordIsValid &&
        user.role === role;

      if (!credentialsAreValid) {
        await prisma.auditLog.create({
          data: {
            actorId: user?.id,
            action:
              AuditAction.LOGIN_FAILED,
            success: false,
            ipAddress:
              getRequestIp(request),
            userAgent:
              getUserAgent(request),
            metadata: {
              email,
              requestedRole: role,
              reason:
                "Invalid credentials or role",
            },
          },
        });

        response.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message:
              "Email, password or workspace role is incorrect.",
          },
        });

        return;
      }

      if (
        user.status !== UserStatus.ACTIVE
      ) {
        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action:
              AuditAction.LOGIN_FAILED,
            success: false,
            ipAddress:
              getRequestIp(request),
            userAgent:
              getUserAgent(request),
            metadata: {
              reason: "Account is not active",
              status: user.status,
            },
          },
        });

        response.status(403).json({
          error: {
            code: "ACCOUNT_NOT_ACTIVE",
            message:
              "This account is not currently active.",
          },
        });

        return;
      }

      const accessToken =
        createAccessToken({
          userId: user.id,
          email: user.email,
          role: user.role,
        });

      const refreshToken =
        createRefreshToken();

      const refreshTokenHash =
        hashRefreshToken(refreshToken);

      const expiresAt =
        getRefreshTokenExpiry();

      await prisma.$transaction([
        prisma.session.create({
          data: {
            userId: user.id,
            refreshTokenHash,
            expiresAt,
            ipAddress:
              getRequestIp(request),
            userAgent:
              getUserAgent(request),
          },
        }),

        prisma.user.update({
          where: {
            id: user.id,
          },

          data: {
            lastLoginAt: new Date(),
          },
        }),

        prisma.auditLog.create({
          data: {
            actorId: user.id,
            action:
              AuditAction.LOGIN_SUCCESS,
            success: true,
            ipAddress:
              getRequestIp(request),
            userAgent:
              getUserAgent(request),
          },
        }),
      ]);

      setRefreshCookie(
        response,
        refreshToken,
      );

      response.status(200).json({
        data: {
          accessToken,

          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            status: user.status,
            organisation:
              user.organisation,
            district: user.district,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  "/refresh",

  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const refreshToken =
        request.cookies?.[
          REFRESH_COOKIE_NAME
        ];

      if (
        !refreshToken ||
        typeof refreshToken !== "string"
      ) {
        response.status(401).json({
          error: {
            code:
              "REFRESH_TOKEN_REQUIRED",
            message:
              "A valid session is required.",
          },
        });

        return;
      }

      const tokenHash =
        hashRefreshToken(refreshToken);

      const session =
        await prisma.session.findUnique({
          where: {
            refreshTokenHash:
              tokenHash,
          },

          include: {
            user: true,
          },
        });

      const sessionIsInvalid =
        !session ||
        session.revokedAt !== null ||
        session.expiresAt <= new Date() ||
        session.user.status !==
          UserStatus.ACTIVE;

      if (sessionIsInvalid) {
        clearRefreshCookie(response);

        response.status(401).json({
          error: {
            code: "INVALID_SESSION",
            message:
              "The session is invalid or expired.",
          },
        });

        return;
      }

      const newRefreshToken =
        createRefreshToken();

      const newRefreshTokenHash =
        hashRefreshToken(
          newRefreshToken,
        );

      const newExpiry =
        getRefreshTokenExpiry();

      const accessToken =
        createAccessToken({
          userId: session.user.id,
          email: session.user.email,
          role: session.user.role,
        });

      await prisma.$transaction([
        prisma.session.update({
          where: {
            id: session.id,
          },

          data: {
            refreshTokenHash:
              newRefreshTokenHash,
            expiresAt: newExpiry,
            ipAddress:
              getRequestIp(request),
            userAgent:
              getUserAgent(request),
          },
        }),

        prisma.auditLog.create({
          data: {
            actorId: session.user.id,
            action:
              AuditAction.TOKEN_REFRESHED,
            success: true,
            ipAddress:
              getRequestIp(request),
            userAgent:
              getUserAgent(request),
          },
        }),
      ]);

      setRefreshCookie(
        response,
        newRefreshToken,
      );

      response.status(200).json({
        data: {
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  "/logout",

  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const refreshToken =
        request.cookies?.[
          REFRESH_COOKIE_NAME
        ];

      if (
        refreshToken &&
        typeof refreshToken === "string"
      ) {
        const refreshTokenHash =
          hashRefreshToken(
            refreshToken,
          );

        const session =
          await prisma.session.findUnique({
            where: {
              refreshTokenHash,
            },

            select: {
              id: true,
              userId: true,
            },
          });

        if (session) {
          await prisma.$transaction([
            prisma.session.update({
              where: {
                id: session.id,
              },

              data: {
                revokedAt: new Date(),
              },
            }),

            prisma.auditLog.create({
              data: {
                actorId:
                  session.userId,
                action:
                  AuditAction.USER_LOGOUT,
                success: true,
                ipAddress:
                  getRequestIp(request),
                userAgent:
                  getUserAgent(request),
              },
            }),
          ]);
        }
      }

      clearRefreshCookie(response);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

authRouter.get(
  "/me",
  requireAuthentication,

  async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const {
        auth,
      } = request as AuthenticatedRequest;

      const user =
        await prisma.user.findUnique({
          where: {
            id: auth.userId,
          },

          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            organisation: true,
            district: true,
            lastLoginAt: true,
            createdAt: true,
          },
        });

      if (!user) {
        response.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message:
              "The authenticated user no longer exists.",
          },
        });

        return;
      }

      response.status(200).json({
        data: {
          user,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);