import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiPlus, FiUpload, FiX } from "react-icons/fi";
import { fetchCategories, fetchProducts } from "../../data/repository";
import {
  adminCreateCategory,
  adminCreateProduct,
  adminUpdateProduct,
  adminSaveProductVariants,
} from "../../data/adminRepository";
import { uploadImage } from "../../lib/storage";
import { ImageUploadField } from "../../components/admin/ImageUploadField";
import { VariantImagesField } from "../../components/admin/VariantImagesField";
import type { Category, Product, ProductVariant } from "../../types";
import { useCatalogStore } from "../../store/catalog";

type FormState = Omit<Product, "id" | "imagens" | "cores" | "variantes"> & {
  imagensTexto: string;
  coresTexto: string;
};

type VariantForm = Omit<ProductVariant, "id"> & { id?: string };

function novaVariante(): VariantForm {
  return { cor: "", tamanho: "", preco: 0, precoPromocional: null, estoque: 0, imagens: [] };
}

const emptyForm: FormState = {
  nome: "",
  slug: "",
  categoriaId: "",
  descricao: "",
  descricaoCurta: "",
  preco: 0,
  precoPromocional: null,
  imagensTexto: "",
  coresTexto: "",
  dimensoes: "",
  material: "",
  estoque: 0,
  destaque: false,
  oferta: false,
  novo: false,
  maisVendido: false,
  prazoEntrega: "",
  peso: undefined,
  altura: undefined,
  largura: undefined,
  comprimento: undefined,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id || id === "novo";
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [variantes, setVariantes] = useState<VariantForm[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [novaCategoriaAberta, setNovaCategoriaAberta] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState({
    nome: "",
    slug: "",
    descricao: "",
    imagem: "",
  });
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [erroCategoria, setErroCategoria] = useState<string | null>(null);

  function reloadCategorias() {
    return fetchCategories().then((cats) => {
      setCategorias(cats);
      return cats;
    });
  }

  useEffect(() => {
    reloadCategorias().then((cats) => {
      setForm((f) => (f.categoriaId ? f : { ...f, categoriaId: cats[0]?.id ?? "" }));
    });
  }, []);

  async function handleCreateCategoria(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoCategoria(true);
    setErroCategoria(null);
    try {
      const created = await adminCreateCategory(novaCategoria);
      await reloadCategorias();
      await useCatalogStore.getState().refresh();
      update("categoriaId", created.id);
      setNovaCategoria({ nome: "", slug: "", descricao: "", imagem: "" });
      setNovaCategoriaAberta(false);
    } catch (err: any) {
      setErroCategoria(err.message ?? "Erro ao criar categoria.");
    } finally {
      setSalvandoCategoria(false);
    }
  }

  useEffect(() => {
    if (isNew) return;
    fetchProducts().then((produtos) => {
      const p = produtos.find((x) => x.id === id);
      if (p) {
        setForm({
          ...p,
          imagensTexto: p.imagens.join("\n"),
          coresTexto: p.cores.join(", "),
        });
        setVariantes(p.variantes ?? []);
      }
      setLoading(false);
    });
  }, [id, isNew]);

  function updateVariante(index: number, patch: Partial<VariantForm>) {
    setVariantes((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removerVariante(index: number) {
    setVariantes((prev) => prev.filter((_, i) => i !== index));
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const imagens = form.imagensTexto
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  function setImagens(next: string[]) {
    update("imagensTexto", next.join("\n"));
  }

  const [uploadingImagens, setUploadingImagens] = useState(false);
  const [erroImagens, setErroImagens] = useState<string | null>(null);

  async function handleImagensSelecionadas(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingImagens(true);
    setErroImagens(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        urls.push(await uploadImage(file, "produtos"));
      }
      setImagens([...imagens, ...urls]);
    } catch (err: any) {
      setErroImagens(err.message ?? "Erro ao enviar imagem.");
    } finally {
      setUploadingImagens(false);
      e.target.value = "";
    }
  }

  function removerImagem(index: number) {
    setImagens(imagens.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (imagens.length === 0) {
      setError("Adicione pelo menos uma imagem do produto.");
      return;
    }
    if (variantes.some((v) => (!v.cor.trim() && !v.tamanho.trim()) || v.preco <= 0)) {
      setError(
        "Preencha a cor e/ou o tamanho, e um preço maior que zero, em todas as variações."
      );
      return;
    }
    setSaving(true);
    setError(null);
    const payload: Omit<Product, "id"> = {
      ...form,
      imagens,
      cores: form.coresTexto.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      const produtoId = isNew ? await adminCreateProduct(payload) : id!;
      if (!isNew) await adminUpdateProduct(id!, payload);
      await adminSaveProductVariants(
        produtoId,
        variantes.map((v) => ({
          cor: v.cor,
          tamanho: v.tamanho,
          preco: v.preco,
          precoPromocional: v.precoPromocional,
          estoque: v.estoque,
          imagens: v.imagens,
        }))
      );
      await useCatalogStore.getState().refresh();
      navigate("/admin/produtos");
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-charcoal/60">Carregando...</p>;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-8 font-display text-2xl sm:text-3xl">
        {isNew ? "Novo produto" : "Editar produto"}
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-card">
        {error && <p className="text-sm text-offer">{error}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome">
            <input
              required
              value={form.nome}
              onChange={(e) => {
                update("nome", e.target.value);
                if (isNew) update("slug", slugify(e.target.value));
              }}
              className="input"
            />
          </Field>
          <Field label="Slug (URL)">
            <input
              required
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Categoria">
            <div className="flex gap-2">
              <select
                required
                value={form.categoriaId}
                onChange={(e) => update("categoriaId", e.target.value)}
                className="input"
              >
                {categorias.length === 0 && <option value="">Nenhuma categoria</option>}
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setNovaCategoriaAberta((o) => !o)}
                aria-label="Nova categoria"
                className="flex flex-none items-center justify-center rounded-xl border border-sand px-3 hover:bg-wood-100"
              >
                {novaCategoriaAberta ? <FiX size={16} /> : <FiPlus size={16} />}
              </button>
            </div>
          </Field>
          <Field label="Estoque">
            <input
              required
              type="number"
              min={0}
              value={form.estoque}
              onChange={(e) => update("estoque", Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Preço (R$)">
            <input
              required
              type="number"
              step="0.01"
              min={0}
              value={form.preco}
              onChange={(e) => update("preco", Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Preço promocional (R$) — opcional">
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.precoPromocional ?? ""}
              onChange={(e) =>
                update("precoPromocional", e.target.value ? Number(e.target.value) : null)
              }
              className="input"
            />
          </Field>
        </div>

        {novaCategoriaAberta && (
          <div className="flex flex-col gap-3 rounded-xl border border-sand bg-wood-50 p-4">
            <p className="text-sm font-semibold">Nova categoria</p>
            {erroCategoria && <p className="text-sm text-offer">{erroCategoria}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                placeholder="Nome"
                value={novaCategoria.nome}
                onChange={(e) => {
                  const nome = e.target.value;
                  setNovaCategoria((c) => ({ ...c, nome, slug: slugify(nome) }));
                }}
                className="input"
              />
              <input
                placeholder="Slug (URL)"
                value={novaCategoria.slug}
                onChange={(e) =>
                  setNovaCategoria((c) => ({ ...c, slug: e.target.value }))
                }
                className="input"
              />
              <input
                placeholder="Descrição curta"
                value={novaCategoria.descricao}
                onChange={(e) =>
                  setNovaCategoria((c) => ({ ...c, descricao: e.target.value }))
                }
                className="input sm:col-span-2"
              />
              <ImageUploadField
                pasta="categorias"
                value={novaCategoria.imagem}
                onChange={(url) => setNovaCategoria((c) => ({ ...c, imagem: url }))}
              />
            </div>
            <button
              type="button"
              onClick={handleCreateCategoria}
              disabled={salvandoCategoria || !novaCategoria.nome || !novaCategoria.slug}
              className="w-fit rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {salvandoCategoria ? "Criando..." : "Criar categoria"}
            </button>
          </div>
        )}

        <Field label="Descrição curta">
          <input
            required
            value={form.descricaoCurta}
            onChange={(e) => update("descricaoCurta", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Descrição completa">
          <textarea
            required
            rows={4}
            value={form.descricao}
            onChange={(e) => update("descricao", e.target.value)}
            className="input"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-charcoal/80">
            Imagens (a primeira é a principal)
          </span>

          {imagens.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {imagens.map((url, i) => (
                <div
                  key={url + i}
                  className="group relative h-20 w-20 overflow-hidden rounded-xl border border-sand"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-charcoal/80 px-1 text-[9px] font-bold text-white">
                      Principal
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removerImagem(i)}
                    aria-label="Remover imagem"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-sand px-4 py-2 text-sm font-semibold hover:bg-wood-100">
            <FiUpload size={15} />
            {uploadingImagens ? "Enviando..." : "Enviar imagens"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploadingImagens}
              onChange={handleImagensSelecionadas}
            />
          </label>

          {erroImagens && <p className="text-sm text-offer">{erroImagens}</p>}
          {imagens.length === 0 && !erroImagens && (
            <p className="text-xs text-charcoal/50">Nenhuma imagem enviada ainda.</p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-sand p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                Variações por cor e/ou tamanho (preço e estoque diferentes)
              </p>
              <p className="text-xs text-charcoal/50">
                Use isso só quando cores/tamanhos do produto custam ou têm
                estoque diferente. Preencha cor, tamanho, ou os dois — nem
                todo produto precisa dos dois juntos. Cadastrando pelo menos
                uma variação aqui, o site usa preço/estoque/fotos de cada uma
                em vez dos campos gerais acima.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVariantes((prev) => [...prev, novaVariante()])}
              className="flex flex-none items-center gap-2 rounded-full border border-sand px-4 py-2 text-sm font-semibold hover:bg-wood-100"
            >
              <FiPlus size={15} /> Adicionar variação
            </button>
          </div>

          {variantes.length > 0 && (
            <div className="flex flex-col gap-4">
              {variantes.map((v, i) => (
                <div key={v.id ?? i} className="flex flex-col gap-3 rounded-xl bg-wood-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
                      <Field label="Cor (opcional)">
                        <input
                          value={v.cor}
                          onChange={(e) => updateVariante(i, { cor: e.target.value })}
                          className="input"
                        />
                      </Field>
                      <Field label="Tamanho (opcional)">
                        <input
                          value={v.tamanho}
                          onChange={(e) => updateVariante(i, { tamanho: e.target.value })}
                          className="input"
                        />
                      </Field>
                      <Field label="Preço (R$)">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={v.preco}
                          onChange={(e) => updateVariante(i, { preco: Number(e.target.value) })}
                          className="input"
                        />
                      </Field>
                      <Field label="Preço promo. (R$)">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={v.precoPromocional ?? ""}
                          onChange={(e) =>
                            updateVariante(i, {
                              precoPromocional: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="input"
                        />
                      </Field>
                      <Field label="Estoque">
                        <input
                          type="number"
                          min={0}
                          value={v.estoque}
                          onChange={(e) => updateVariante(i, { estoque: Number(e.target.value) })}
                          className="input"
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerVariante(i)}
                      aria-label="Remover variação"
                      className="mt-6 flex-none rounded-full p-2 text-offer hover:bg-offer/10"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                  <VariantImagesField
                    value={v.imagens}
                    onChange={(imgs) => updateVariante(i, { imagens: imgs })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cores (separadas por vírgula) — só quando o preço/estoque não muda">
            <input
              value={form.coresTexto}
              onChange={(e) => update("coresTexto", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Dimensões">
            <input
              value={form.dimensoes}
              onChange={(e) => update("dimensoes", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Material">
            <input
              value={form.material}
              onChange={(e) => update("material", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Prazo de entrega">
            <input
              value={form.prazoEntrega}
              onChange={(e) => update("prazoEntrega", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium text-charcoal/80">
            Peso e dimensões da embalagem (para calcular o frete)
          </p>
          <p className="mb-3 text-xs text-charcoal/50">
            Se não preencher, o site usa um valor padrão genérico e o frete
            calculado pode ficar impreciso.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Peso (kg)">
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.peso ?? ""}
                onChange={(e) =>
                  update("peso", e.target.value ? Number(e.target.value) : undefined)
                }
                className="input"
              />
            </Field>
            <Field label="Altura (cm)">
              <input
                type="number"
                step="0.1"
                min={0}
                value={form.altura ?? ""}
                onChange={(e) =>
                  update("altura", e.target.value ? Number(e.target.value) : undefined)
                }
                className="input"
              />
            </Field>
            <Field label="Largura (cm)">
              <input
                type="number"
                step="0.1"
                min={0}
                value={form.largura ?? ""}
                onChange={(e) =>
                  update("largura", e.target.value ? Number(e.target.value) : undefined)
                }
                className="input"
              />
            </Field>
            <Field label="Comprimento (cm)">
              <input
                type="number"
                step="0.1"
                min={0}
                value={form.comprimento ?? ""}
                onChange={(e) =>
                  update("comprimento", e.target.value ? Number(e.target.value) : undefined)
                }
                className="input"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-5">
          <Checkbox label="Destaque" checked={form.destaque} onChange={(v) => update("destaque", v)} />
          <Checkbox label="Oferta" checked={form.oferta} onChange={(v) => update("oferta", v)} />
          <Checkbox label="Novo" checked={form.novo} onChange={(v) => update("novo", v)} />
          <Checkbox
            label="Mais vendido"
            checked={form.maisVendido}
            onChange={(v) => update("maisVendido", v)}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-charcoal px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar produto"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/produtos")}
            className="rounded-full border border-sand px-6 py-3 font-semibold"
          >
            Cancelar
          </button>
        </div>
      </form>
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

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-wood-700"
      />
      {label}
    </label>
  );
}
