import { WhyChooseUs } from "../components/WhyChooseUs";
import { Benefits } from "../components/Benefits";
import { useSiteContentStore } from "../store/siteContent";

export default function AboutPage() {
  const sobre = useSiteContentStore((s) => s.conteudo.sobre);

  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-14 text-center md:px-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-wood-500">
          Sobre nós
        </span>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl">
          {sobre.titulo}
        </h1>
        <p className="mt-4 whitespace-pre-line text-charcoal/70">{sobre.texto}</p>
      </div>
      <WhyChooseUs />
      <Benefits />
    </section>
  );
}
