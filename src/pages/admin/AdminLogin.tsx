import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { FiAlertTriangle } from "react-icons/fi";
import { useAuthStore } from "../../store/auth";
import { isSupabaseConfigured } from "../../lib/supabase";
import { STORE_NAME } from "../../config/store";

export default function AdminLogin() {
  const { session, signIn } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) {
    const from = (location.state as any)?.from?.pathname || "/admin";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const err = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      navigate("/admin");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-charcoal px-6">
      <div className="w-full max-w-sm rounded-2xl bg-cream p-8 shadow-soft">
        <h1 className="font-display text-2xl">{STORE_NAME} Admin</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Acesse com seu e-mail e senha de administrador.
        </p>

        {!isSupabaseConfigured && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-offer/10 p-3 text-sm text-offer">
            <FiAlertTriangle className="mt-0.5 flex-none" />
            <span>
              Supabase ainda não configurado. Preencha VITE_SUPABASE_URL e
              VITE_SUPABASE_ANON_KEY no arquivo .env para habilitar o login.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Senha</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          {error && <p className="text-sm text-offer">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-full bg-charcoal py-3 font-semibold text-white transition hover:bg-charcoal-800 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
