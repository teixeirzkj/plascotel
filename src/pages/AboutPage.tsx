import { WhyChooseUs } from "../components/WhyChooseUs";
import { Benefits } from "../components/Benefits";
import { STORE_NAME } from "../config/store";

export default function AboutPage() {
  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-14 text-center md:px-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-wood-500">
          Sobre nós
        </span>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl">
          A {STORE_NAME} é feita de casa e histórias
        </h1>
        <p className="mt-4 text-charcoal/70">
          Nascemos com o propósito de levar tudo o que uma casa precisa —
          móveis, cama, mesa e banho, pratos, decoração e muito mais — com
          qualidade, design moderno e atendimento próximo para cada cliente.
          Selecionamos cada peça pensando em conforto, durabilidade e
          estilo, para que sua casa reflita quem você é.
        </p>
      </div>
      <WhyChooseUs />
      <Benefits />
    </section>
  );
}
