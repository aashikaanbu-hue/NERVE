import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  MapPinned,
  Navigation,
  Radio,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { login, type UserRole } from "../lib/auth";

type RoleOption = {
  value: UserRole;
  label: string;
};

const roleOptions: RoleOption[] = [
  { value: "GOVERNMENT_AUTHORITY", label: "Government Authority" },
  { value: "LOGISTICS_OPERATOR", label: "Logistics Operator" },
  { value: "FIELD_OFFICIAL", label: "Field Official" },
  { value: "DRIVER", label: "Driver" },
];

const workspacePreviews = [
  { label: "Authority", detail: "Approve response", Icon: Building2 },
  { label: "Logistics", detail: "Protect deliveries", Icon: Truck },
  { label: "Field", detail: "Verify evidence", Icon: MapPinned },
  { label: "Driver", detail: "Follow safe routes", Icon: Navigation },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>("GOVERNMENT_AUTHORITY");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password, role });
      navigate("/dashboard", { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Login could not be completed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page login-v6">
      <aside>
        <div className="login-photo" />
        <div className="login-photo-shade" />

        <Link className="login-brand-card" to="/" aria-label="NERVE home">
          <img
            src="/brand/nerve-logo-clean.png"
            alt="NERVE — North Eastern Region Vision and Efficiency"
          />
        </Link>

        <div className="login-message">
          <span className="login-network-label">
            <Radio /> NERVE RESILIENCE NETWORK
          </span>

          <h1>One platform. The right operational view for every responder.</h1>

          <p>
            Enter a secure role-based workspace for live risk evidence,
            community impact, route decisions and coordinated field action.
          </p>

          <div className="login-role-grid" aria-label="Available workspaces">
            {workspacePreviews.map(({ label, detail, Icon }) => (
              <article key={label}>
                <Icon />
                <span>
                  <b>{label}</b>
                  <small>{detail}</small>
                </span>
              </article>
            ))}
          </div>
        </div>

        <section className="login-security-strip">
          <ShieldCheck />
          <span>
            <b>Human-supervised by design</b>
            <small>Critical actions require verified authority approval.</small>
          </span>
          <CheckCircle2 />
        </section>
      </aside>

      <main>
        <Link className="back" to="/">
          ← Back to platform
        </Link>

        <div className="login-form-shell">
          <div className="form-status">
            <span>
              <i /> Secure access
            </span>
            <small>East Khasi Hills pilot</small>
          </div>

          <form onSubmit={handleSubmit}>
            <span className="form-kicker">IDENTITY &amp; ACCESS</span>
            <h2>Welcome to NERVE</h2>
            <p>Select your workspace and sign in with an authorised account.</p>

            {error && (
              <div className="login-error" role="alert">
                <AlertCircle />
                <span>{error}</span>
              </div>
            )}

            <label>
              Workspace role
              <select
                value={role}
                disabled={loading}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Email address
              <input
                type="email"
                value={email}
                placeholder="name@organisation.gov.in"
                autoComplete="email"
                required
                disabled={loading}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              Password
              <div className="password">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  disabled={loading}
                  onChange={(event) => setPassword(event.target.value)}
                />

                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>

            <div className="options">
              <label>
                <input type="checkbox" disabled={loading} />
                Keep me signed in
              </label>

              <button type="button" disabled={loading}>
                Forgot password?
              </button>
            </div>

            <button className="submit" type="submit" disabled={loading}>
              <LockKeyhole />
              {loading ? "Verifying account..." : "Enter secure workspace"}
              {!loading && <ArrowRight />}
            </button>

            <div className="login-form-note">
              <ShieldCheck />
              <span>Encrypted session · Role-controlled access · Audited</span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
