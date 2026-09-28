import { useEffect, useState } from "react";
import { FiPlus, FiX, FiChevronDown, FiChevronRight } from "react-icons/fi";
import { fetchConteudoSite, type ConteudoSite } from "../../data/siteContent";
import { adminSalvarConteudo } from "../../data/adminRepository";
import { ImageUploadField } from "../../components/admin/ImageUploadField";
import { useSiteContentStore } from "../../store/siteContent";
import type { HeroSlide } from "../../data/heroSlides";

type SlideForm = HeroSlide & { colapsado?: boolean };

function novoSlide(): SlideForm {
  return {
    id: crypto.randomUUID(),
    imagem: "",
    badge: "",
    titulo: "",
    descricao: "",
    ctaPrimarioLabel: "Ver coleção",
    ctaPrimarioTo: "/moveis",
    ctaSecundarioLabel: "Ver categorias",
    ctaSecundarioTo: "/categorias",
    colapsado: false,
  };
}

export default function AdminSecoes() {
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<SlideForm[]>([]);
  const [sobreTitulo, setSobreTitulo] = useState("");
  const [sobreTexto, setSobreTexto] = useState("");
  const [footerDescricao, setFooterDescricao] = useState("");

  const [salvandoBanner, setSalvandoBanner] = useState(false);
  const [salvandoSobre, setSalvandoSobre] = useState(false);
  const [salvandoFooter, setSalvandoFooter] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    fetchConteudoSite().then((c: ConteudoSite) => {
      setSlides(c.heroSlides.map((s) => ({ ...s, colapsado: true })));
      setSobreTitulo(c.sobre.titulo);
      setSobreTexto(c.sobre.texto);
      setFooterDescricao(c.footer.descricao);
      setLoading(false);
    });
  }, []);

  function avisar(texto: string) {
    setMensagem(texto);
    setTimeout(() => setMensagem(null), 3000);
  }

  function updateSlide(index: number, patch: Partial<SlideForm>) {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removerSlide(index: number) {
    setSlides((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSalvarBanner() {
    setSalvandoBanner(true);
    try {
      const payload = slides.map(({ colapsado, ...s }) => s);
      await adminSalvarConteudo("hero_slides", payload);
      await useSiteContentStore.getState().refresh();
      avisar("Banner salvo!");
    } catch (err: any) {
      alert(err.message ?? "Erro ao salvar o banner.");
    } finally {
      setSalvandoBanner(false);
    }
  }

  async function handleSalvarSobre() {
    setSalvandoSobre(true);
    try {
      await adminSalvarConteudo("sobre", { titulo: sobreTitulo, texto: sobreTexto });
      await useSiteContentStore.getState().refresh();
      avisar("Página \"Sobre\" salva!");
    } catch (err: any) {
      alert(err.message ?? "Erro ao salvar.");
    } finally {
      setSalvandoSobre(false);
    }
  }

  async function handleSalvarFooter() {
    setSalvandoFooter(true);
    try {
      await adminSalvarConteudo("footer", { descricao: footerDescricao });
      await useSiteContentStore.getState().refresh();
      avisar("Rodapé salvo!");
    } catch (err: any) {
      alert(err.message ?? "Erro ao salvar.");
    } finally {
      setSalvandoFooter(false);
    }
  }

  if (loading) return <p className="text-charcoal/60">Carregando...</p>;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">Seções do site</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Edite o banner da home, o texto da página "Sobre" e o rodapé sem mexer em código.
        </p>
      </div>

      {mensagem && (
        <p className="rounded-xl bg-green-600/10 px-4 py-2.5 text-sm font-medium text-green-700">
          {mensagem}
        </p>
      )}

      {/* Banner */}
      <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg">Banner (topo da home)</h2>
            <p className="text-xs text-charcoal/50">
              Os slides aparecem na ordem em que estão aqui. "Ver coleção"/"Ver categorias" são links —
              use caminhos do site, ex: /moveis, /ofertas, /categorias.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSlides((prev) => [...prev, novoSlide()])}
            className="flex flex-none items-center gap-2 rounded-full border border-sand px-4 py-2 text-sm font-semibold hover:bg-wood-100"
          >
            <FiPlus size={15} /> Adicionar slide
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {slides.map((s, i) => (
            <div key={s.id} className="rounded-xl bg-wood-50">
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => updateSlide(i, { colapsado: !s.colapsado })}
                  className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
                >
                  {s.colapsado ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
                  <span>{s.titulo || `Slide ${i + 1}`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removerSlide(i)}
                  aria-label="Remover slide"
                  className="flex-none rounded-full p-2 text-offer hover:bg-offer/10"
                >
                  <FiX size={16} />
                </button>
              </div>

              {!s.colapsado && (
                <div className="flex flex-col gap-3 px-4 pb-4">
                  <ImageUploadField
                    pasta="banner"
                    value={s.imagem}
                    onChange={(url) => updateSlide(i, { imagem: url })}
                  />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Selo (badge)">
                      <input
                        value={s.badge}
                        onChange={(e) => updateSlide(i, { badge: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Título">
                      <input
                        value={s.titulo}
                        onChange={(e) => updateSlide(i, { titulo: e.target.value })}
                        className="input"
                      />
                    </Field>
                  </div>
                  <Field label="Descrição">
                    <textarea
                      rows={2}
                      value={s.descricao}
                      onChange={(e) => updateSlide(i, { descricao: e.target.value })}
                      className="input"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Botão 1 - texto">
                      <input
                        value={s.ctaPrimarioLabel}
                        onChange={(e) => updateSlide(i, { ctaPrimarioLabel: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Botão 1 - link">
                      <input
                        value={s.ctaPrimarioTo}
                        onChange={(e) => updateSlide(i, { ctaPrimarioTo: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Botão 2 - texto">
                      <input
                        value={s.ctaSecundarioLabel}
                        onChange={(e) => updateSlide(i, { ctaSecundarioLabel: e.target.value })}
                        className="input"
                      />
                    </Field>
                    <Field label="Botão 2 - link">
                      <input
                        value={s.ctaSecundarioTo}
                        onChange={(e) => updateSlide(i, { ctaSecundarioTo: e.target.value })}
                        className="input"
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          ))}
          {slides.length === 0 && (
            <p className="text-sm text-charcoal/50">Nenhum slide. Adicione pelo menos um.</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSalvarBanner}
          disabled={salvandoBanner}
          className="w-fit rounded-full bg-charcoal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {salvandoBanner ? "Salvando..." : "Salvar banner"}
        </button>
      </section>

      {/* Sobre */}
      <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="font-display text-lg">Página "Sobre nós"</h2>
        <Field label="Título">
          <input value={sobreTitulo} onChange={(e) => setSobreTitulo(e.target.value)} className="input" />
        </Field>
        <Field label="Texto">
          <textarea
            rows={5}
            value={sobreTexto}
            onChange={(e) => setSobreTexto(e.target.value)}
            className="input"
          />
        </Field>
        <button
          type="button"
          onClick={handleSalvarSobre}
          disabled={salvandoSobre}
          className="w-fit rounded-full bg-charcoal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {salvandoSobre ? "Salvando..." : "Salvar"}
        </button>
      </section>

      {/* Rodapé */}
      <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="font-display text-lg">Rodapé</h2>
        <Field label="Texto abaixo da logo">
          <textarea
            rows={3}
            value={footerDescricao}
            onChange={(e) => setFooterDescricao(e.target.value)}
            className="input"
          />
        </Field>
        <button
          type="button"
          onClick={handleSalvarFooter}
          disabled={salvandoFooter}
          className="w-fit rounded-full bg-charcoal px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {salvandoFooter ? "Salvando..." : "Salvar"}
        </button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-charcoal/80">{label}</span>
      {children}
    </label>
  );
}
