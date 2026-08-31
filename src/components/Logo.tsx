import { Link } from "react-router-dom";
import { STORE_NAME } from "../config/store";

/**
 * Logo oficial da Plascotel (public/logo.jpg — fundo branco, sem
 * transparência). Em fundos claros usamos mix-blend-mode: multiply para o
 * branco do arquivo "sumir" contra o fundo da página. Em fundos escuros
 * (footer, telas com overlay) envolvemos a imagem em um selo branco para
 * manter a marca legível.
 */
interface LogoProps {
  className?: string;
  dark?: boolean;
}

export function Logo({ className = "", dark = false }: LogoProps) {
  return (
    <Link
      to="/"
      className={`flex items-center select-none ${className}`}
      aria-label={STORE_NAME}
    >
      {dark ? (
        <span className="flex items-center rounded-xl bg-white px-2.5 py-1.5 shadow-soft">
          <img src="/logo.jpg" alt={STORE_NAME} className="h-8 w-auto object-contain" />
        </span>
      ) : (
        <img
          src="/logo.jpg"
          alt={STORE_NAME}
          className="h-10 w-auto object-contain mix-blend-multiply md:h-11"
        />
      )}
    </Link>
  );
}
