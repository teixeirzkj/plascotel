import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { heroSlides } from "../data/heroSlides";

const AUTOPLAY_MS = 6000;

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const next = useCallback(
    () => setIndex((i) => (i + 1) % heroSlides.length),
    []
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length),
    []
  );

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [next, paused]);

  const slide = heroSlides[index];

  return (
    <section
      className="relative mt-0 h-[58svh] min-h-[440px] w-full overflow-hidden md:h-[92svh] md:min-h-[560px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (delta > 50) prev();
        else if (delta < -50) next();
        touchStartX.current = null;
      }}
    >
      <AnimatePresence mode="sync">
        <motion.div
          key={slide.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9 }}
        >
          <motion.img
            src={slide.imagem}
            alt={slide.titulo}
            // A primeira imagem é o elemento de LCP da Home — carrega com
            // prioridade alta; as próximas do carrossel podem esperar.
            fetchPriority={index === 0 ? "high" : "auto"}
            loading={index === 0 ? "eager" : "lazy"}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/10" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-6 pb-8 pt-14 md:px-10 md:pb-28 md:pt-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl text-white"
          >
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-block rounded-full border border-white/30 px-3 py-1 text-xs font-medium uppercase tracking-widest"
            >
              {slide.badge}
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-3 font-display text-3xl leading-[1.15] md:mt-4 md:text-4xl md:leading-[1.1] lg:text-6xl"
            >
              {slide.titulo}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-3 text-sm text-white/85 md:mt-4 md:text-base lg:text-lg"
            >
              {slide.descricao}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 flex flex-wrap gap-3 md:mt-7"
            >
              <Link
                to={slide.ctaPrimarioTo}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-charcoal transition hover:bg-wood-100"
              >
                {slide.ctaPrimarioLabel}
              </Link>
              <Link
                to={slide.ctaSecundarioTo}
                className="rounded-full border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {slide.ctaSecundarioLabel}
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        onClick={prev}
        aria-label="Slide anterior"
        className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-white/30 md:left-3 md:flex md:p-3"
      >
        <FiChevronLeft size={22} />
      </button>
      <button
        onClick={next}
        aria-label="Próximo slide"
        className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur transition hover:bg-white/30 md:right-3 md:flex md:p-3"
      >
        <FiChevronRight size={22} />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 md:bottom-6">
        {heroSlides.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Ir para o slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-8 bg-white" : "w-3 bg-white/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
