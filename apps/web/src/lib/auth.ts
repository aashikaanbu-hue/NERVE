const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:4000/api/v1";

export type UserRole =
  | "GOVERNMENT_AUTHORITY"
  | "LOGISTICS_OPERATOR"
  | "FIELD_OFFICIAL"
  | "DRIVER";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: string;
  organisation?: string | null;
  district?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
};

type LoginInput = {
  email: string;
  password: string;
  role: UserRole;
};

type LoginResponse = {
  data: {
    accessToken: string;
    user: AuthUser;
  };
};

type CurrentUserResponse = {
  data: {
    user: AuthUser;
  };
};

type RefreshResponse = {
  data: {
    accessToken: string;
  };
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const ACCESS_TOKEN_KEY =
  "nerve_access_token";

const USER_KEY =
  "nerve_authenticated_user";

function notifyAuthenticationChanged(
  user: AuthUser | null,
): void {
  window.dispatchEvent(
    new CustomEvent(
      "nerve-authentication-changed",
      {
        detail: {
          user,
        },
      },
    ),
  );
}

function saveAccessToken(
  token: string,
): void {
  sessionStorage.setItem(
    ACCESS_TOKEN_KEY,
    token,
  );
}

export function getAccessToken():
  | string
  | null {
  return sessionStorage.getItem(
    ACCESS_TOKEN_KEY,
  );
}

export function saveAuthenticatedUser(
  user: AuthUser,
): void {
  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );

  notifyAuthenticationChanged(user);
}

export function getAuthenticatedUser():
  | AuthUser
  | null {
  const storedUser =
    sessionStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const user =
      JSON.parse(storedUser) as AuthUser;

    if (
      !user.id ||
      !user.email ||
      !user.role
    ) {
      clearAuthentication();
      return null;
    }

    return user;
  } catch {
    clearAuthentication();
    return null;
  }
}

export function clearAuthentication():
  void {
  sessionStorage.removeItem(
    ACCESS_TOKEN_KEY,
  );

  sessionStorage.removeItem(
    USER_KEY,
  );

  notifyAuthenticationChanged(null);
}

async function getErrorMessage(
  response: Response,
): Promise<string> {
  try {
    const body =
      (await response.json()) as ApiErrorResponse;

    return (
      body.error?.message ??
      "The request could not be completed."
    );
  } catch {
    return "The request could not be completed.";
  }
}

async function closePreviousSession():
  Promise<void> {
  const currentToken =
    getAccessToken();

  try {
    await fetch(
      `${API_URL}/auth/logout`,
      {
        method: "POST",
        credentials: "include",

        headers: currentToken
          ? {
              Authorization:
                `Bearer ${currentToken}`,
            }
          : undefined,
      },
    );
  } catch {
    /*
     * Login should still be allowed even if
     * the previous session is unavailable.
     */
  } finally {
    clearAuthentication();
  }
}

export async function login(
  input: LoginInput,
): Promise<AuthUser> {
  /*
   * Remove the previous account before
   * starting a different role login.
   */
  await closePreviousSession();

  const loginInput: LoginInput = {
    email: input.email
      .trim()
      .toLowerCase(),

    password: input.password,

    role: input.role,
  };

  const response = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",
      credentials: "include",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(
        loginInput,
      ),
    },
  );

  if (!response.ok) {
    clearAuthentication();

    throw new Error(
      await getErrorMessage(response),
    );
  }

  const result =
    (await response.json()) as LoginResponse;

  const accessToken =
    result.data?.accessToken;

  const user =
    result.data?.user;

  if (!accessToken || !user) {
    clearAuthentication();

    throw new Error(
      "The server returned an invalid login response.",
    );
  }

  /*
   * Prevent a user from entering a workspace
   * that does not match the selected role.
   */
  if (user.role !== loginInput.role) {
    await closePreviousSession();

    throw new Error(
      "The selected workspace role does not match this account.",
    );
  }

  if (
    user.email.toLowerCase() !==
    loginInput.email
  ) {
    await closePreviousSession();

    throw new Error(
      "The authenticated account does not match the entered email.",
    );
  }

  saveAccessToken(accessToken);
  saveAuthenticatedUser(user);

  return user;
}

export async function refreshAccessToken():
  Promise<string> {
  const response = await fetch(
    `${API_URL}/auth/refresh`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  if (!response.ok) {
    clearAuthentication();

    throw new Error(
      "Your session has expired. Please sign in again.",
    );
  }

  const result =
    (await response.json()) as RefreshResponse;

  const accessToken =
    result.data?.accessToken;

  if (!accessToken) {
    clearAuthentication();

    throw new Error(
      "Unable to refresh the session.",
    );
  }

  saveAccessToken(accessToken);

  return accessToken;
}

async function authenticatedRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  let token =
    getAccessToken();

  const createHeaders = (
    accessToken: string | null,
  ): Headers => {
    const headers =
      new Headers(options.headers);

    if (accessToken) {
      headers.set(
        "Authorization",
        `Bearer ${accessToken}`,
      );
    } else {
      headers.delete(
        "Authorization",
      );
    }

    return headers;
  };

  let response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      credentials: "include",
      headers: createHeaders(token),
    },
  );

  if (response.status === 401) {
    token =
      await refreshAccessToken();

    response = await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        credentials: "include",
        headers:
          createHeaders(token),
      },
    );
  }

  return response;
}

export async function getCurrentUser():
  Promise<AuthUser> {
  const response =
    await authenticatedRequest(
      "/auth/me",
    );

  if (!response.ok) {
    clearAuthentication();

    throw new Error(
      await getErrorMessage(response),
    );
  }

  const result =
    (await response.json()) as CurrentUserResponse;

  const user =
    result.data?.user;

  if (!user) {
    clearAuthentication();

    throw new Error(
      "The server did not return the authenticated user.",
    );
  }

  saveAuthenticatedUser(user);

  return user;
}

export async function logout():
  Promise<void> {
  const currentToken =
    getAccessToken();

  try {
    await fetch(
      `${API_URL}/auth/logout`,
      {
        method: "POST",
        credentials: "include",

        headers: currentToken
          ? {
              Authorization:
                `Bearer ${currentToken}`,
            }
          : undefined,
      },
    );
  } finally {
    clearAuthentication();
  }
}