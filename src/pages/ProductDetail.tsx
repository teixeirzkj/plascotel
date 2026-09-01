import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMinus, FiPlus, FiShoppingBag, FiTruck, FiRefreshCw, FiCreditCard } from "react-icons/fi";
import { useCatalogStore } from "../store/catalog";
import { formatCurrency, discountPercent } from "../lib/format";
import { useCartStore } from "../store/cart";
import { imagensDaVariante } from "../lib/productPricing";
import { WhatsAppButton } from "../components/WhatsAppButton";
import { STORE_NAME } from "../config/store";

export default function ProductDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const products = useCatalogStore((s) => s.products);
  const categories = useCatalogStore((s) => s.categories);
  const loaded = useCatalogStore((s) => s.loaded);
  const product = slug ? products.find((p) => p.slug === slug) : undefined;
  const temVariantes = (product?.variantes?.length ?? 0) > 0;

  const [activeImage, setActiveImage] = useState(0);
  const [cor, setCor] = useState(product?.cores[0] ?? "");
  const [corSelecionada, setCorSelecionada] = useState(product?.variantes?.[0]?.cor ?? "");
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(product?.variantes?.[0]?.tamanho ?? "");
  const [quantidade, setQuantidade] = useState(1);
  const addItem = useCartStore((s) => s.addItem);

  // Cores únicas oferecidas pelo produto (na ordem cadastrada). Os tamanhos
  // mostrados são só os que essa cor realmente tem — não faz sentido exibir
  // um tamanho que não existe pra cor selecionada (nem que fique desativado).
  const coresDisponiveis = temVariantes
    ? [...new Set(product!.variantes!.map((v) => v.cor).filter(Boolean))]
    : [];
  const tamanhosDisponiveis = temVariantes
    ? [
        ...new Set(
          product!
            .variantes!.filter((v) => coresDisponiveis.length === 0 || v.cor === corSelecionada)
            .map((v) => v.tamanho)
            .filter(Boolean)
        ),
      ]
    : [];

  // Acha a variação para uma combinação de cor/tamanho; se a combinação
  // exata não existir (nem toda cor tem todo tamanho), cai para a primeira
  // variação que bate com pelo menos um dos dois.
  function variantePara(corAlvo: string, tamanhoAlvo: string) {
    const vs = product!.variantes!;
    return (
      vs.find((v) => v.cor === corAlvo && v.tamanho === tamanhoAlvo) ??
      vs.find((v) => v.cor === corAlvo) ??
      vs.find((v) => v.tamanho === tamanhoAlvo) ??
      vs[0]
    );
  }

  const variante = temVariantes ? variantePara(corSelecionada, tamanhoSelecionado) : null;

  function selecionarCor(novaCor: string) {
    const v = variantePara(novaCor, tamanhoSelecionado);
    setCorSelecionada(v.cor);
    setTamanhoSelecionado(v.tamanho);
  }

  function selecionarTamanho(novoTamanho: string) {
    const v = variantePara(corSelecionada, novoTamanho);
    setCorSelecionada(v.cor);
    setTamanhoSelecionado(v.tamanho);
  }

  useEffect(() => {
    if (product && searchParams.get("comprar") === "1") {
      addItem(product, 1, variante);
      navigate("/checkout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    if (!product) return;
    if (temVariantes) {
      setCorSelecionada(product.variantes![0].cor);
      setTamanhoSelecionado(product.variantes![0].tamanho);
    } else if (!cor) {
      setCor(product.cores[0] ?? "");
    }
    setActiveImage(0);
    setQuantidade(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    setActiveImage(0);
    setQuantidade(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variante?.id]);

  // Espera o catálogo carregar do banco antes de decidir que o produto não
  // existe (evita redirecionar antes da resposta do Supabase chegar).
  if (!product && !loaded) return null;
  if (!product) return <Navigate to="/moveis" replace />;

  const categoria = categories.find((c) => c.id === product.categoriaId);
  const precoBase = variante ? variante.preco : product.preco;
  const precoAtual = variante
    ? variante.precoPromocional ?? variante.preco
    : product.precoPromocional ?? product.preco;
  const temPromo = variante ? variante.precoPromocional !== null : product.precoPromocional !== null;
  const estoqueAtual = variante ? variante.estoque : product.estoque;
  const disponivel = estoqueAtual > 0;
  const imagensAtuais = imagensDaVariante(product, variante);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-14">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <motion.div
            key={activeImage}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            className="aspect-square overflow-hidden rounded-2xl bg-wood-50"
          >
            <img
              src={imagensAtuais[activeImage] ?? imagensAtuais[0]}
              alt={product.nome}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </motion.div>
          {imagensAtuais.length > 1 && (
            <div className="mt-3 flex gap-3">
              {imagensAtuais.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-xl border-2 sm:h-20 sm:w-20 ${
                    i === activeImage ? "border-wood-700" : "border-transparent"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2 lg:mt-0">
          {categoria && (
            <span className="text-xs font-semibold uppercase tracking-widest text-wood-500">
              {categoria.nome}
            </span>
          )}
          <h1 className="mt-2 font-display text-2xl leading-snug sm:text-3xl md:text-4xl">
            {product.nome}
          </h1>

          <div className="mt-5 flex flex-col gap-1 sm:mt-6">
            {temPromo && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-charcoal/40 line-through sm:text-base">
                  {formatCurrency(precoBase)}
                </span>
                <span className="rounded-full bg-offer px-2 py-0.5 text-[11px] font-bold text-white">
                  -{discountPercent(precoBase, precoAtual)}%
                </span>
              </div>
            )}
            <p className="font-display text-2xl font-semibold sm:text-3xl">
              {formatCurrency(precoAtual)}
            </p>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-charcoal/70 sm:mt-7 sm:text-base">
            {product.descricao}
          </p>

          {temVariantes ? (
            <>
              {coresDisponiveis.length > 0 && (
                <div className="mt-7 sm:mt-8">
                  <h3 className="mb-2.5 text-sm font-semibold">Cor</h3>
                  <div className="flex flex-wrap gap-2">
                    {coresDisponiveis.map((c) => (
                      <button
                        key={c}
                        onClick={() => selecionarCor(c)}
                        className={`rounded-full border px-4 py-2 text-sm ${
                          corSelecionada === c
                            ? "border-charcoal bg-charcoal text-white"
                            : "border-sand hover:bg-wood-100"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tamanhosDisponiveis.length > 0 && (
                <div className="mt-7 sm:mt-8">
                  <h3 className="mb-2.5 text-sm font-semibold">Tamanho</h3>
                  <div className="flex flex-wrap gap-2">
                    {tamanhosDisponiveis.map((t) => (
                      <button
                        key={t}
                        onClick={() => selecionarTamanho(t)}
                        className={`rounded-full border px-4 py-2 text-sm ${
                          tamanhoSelecionado === t
                            ? "border-charcoal bg-charcoal text-white"
                            : "border-sand hover:bg-wood-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {variante?.estoque === 0 && (
                <p className="mt-3 text-sm font-medium text-offer">
                  Esgotado nessa combinação de cor/tamanho.
                </p>
              )}
            </>
          ) : (
            product.cores.length > 0 && (
              <div className="mt-7 sm:mt-8">
                <h3 className="mb-2.5 text-sm font-semibold">Cor</h3>
                <div className="flex flex-wrap gap-2">
                  {product.cores.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCor(c)}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        cor === c
                          ? "border-charcoal bg-charcoal text-white"
                          : "border-sand hover:bg-wood-100"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          <div className="mt-7 sm:mt-8">
            <h3 className="mb-2.5 text-sm font-semibold">Quantidade</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-sand">
                <button
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="p-3 hover:bg-wood-100"
                  aria-label="Diminuir"
                >
                  <FiMinus size={14} />
                </button>
                <span className="w-8 text-center">{quantidade}</span>
                <button
                  onClick={() =>
                    setQuantidade((q) => Math.min(estoqueAtual, q + 1))
                  }
                  className="p-3 hover:bg-wood-100"
                  aria-label="Aumentar"
                >
                  <FiPlus size={14} />
                </button>
              </div>
              <span className="text-sm text-charcoal/60">
                {disponivel ? `${estoqueAtual} em estoque` : "Fora de estoque"}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row">
            <button
              disabled={!disponivel}
              onClick={() => addItem(product, quantidade, variante)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-charcoal px-6 py-3.5 font-semibold text-white transition hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiShoppingBag /> Adicionar ao carrinho
            </button>
            <button
              disabled={!disponivel}
              onClick={() => {
                addItem(product, quantidade, variante);
                navigate("/checkout");
              }}
              className="flex-1 rounded-full border border-charcoal px-6 py-3.5 font-semibold text-charcoal transition hover:bg-wood-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Comprar agora
            </button>
          </div>

          <div className="mt-3">
            <WhatsAppButton
              message={`Olá! Tenho uma dúvida sobre o produto "${product.nome}" da ${STORE_NAME}.`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366]/10 px-6 py-3.5 font-semibold text-[#128C4A] transition hover:bg-[#25D366]/20"
            >
              Tirar dúvidas pelo WhatsApp
            </WhatsAppButton>
          </div>

          <dl className="mt-9 grid grid-cols-2 gap-4 rounded-2xl bg-white p-5 text-sm shadow-card sm:mt-10">
            <div>
              <dt className="text-charcoal/50">Dimensões</dt>
              <dd className="mt-0.5 font-medium">{product.dimensoes}</dd>
            </div>
            <div>
              <dt className="text-charcoal/50">Material</dt>
              <dd className="mt-0.5 font-medium">{product.material}</dd>
            </div>
          </dl>

          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm text-charcoal/70">
              <FiTruck className="flex-none text-wood-700" /> Entrega em {product.prazoEntrega}
            </div>
            <div className="flex items-center gap-2 text-sm text-charcoal/70">
              <FiCreditCard className="flex-none text-wood-700" /> Pagamento online seguro
            </div>
            <div className="flex items-center gap-2 text-sm text-charcoal/70">
              <FiRefreshCw className="flex-none text-wood-700" /> Troca em até 7 dias
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
