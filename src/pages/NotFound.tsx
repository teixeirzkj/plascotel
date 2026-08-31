import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <h1 className="font-display text-5xl">404</h1>
      <p className="mt-3 text-charcoal/60">
        Página não encontrada. Que tal voltar para os móveis?
      </p>
      <Link
        to="/"
        className="mt-6 rounded-full bg-charcoal px-6 py-3 font-semibold text-white"
      >
        Voltar ao início
      </Link>
    </section>
  );
}
