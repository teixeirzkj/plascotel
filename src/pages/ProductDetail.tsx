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
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-10 md:px-10 md:py-14">
      <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <motion.div
            key={activeImage}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            className="aspect-[5/4] overflow-hidden rounded-2xl bg-wood-50 sm:aspect-square"
          >
            <img
              src={imagensAtuais[activeImage] ?? imagensAtuais[0]}
              alt={product.nome}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </motion.div>
          {imagensAtuais.length > 1 && (
            <div className="mt-2 flex gap-2 sm:mt-3 sm:gap-3">
              {imagensAtuais.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(i)}
                  className={`h-12 w-12 overflow-hidden rounded-lg border-2 sm:h-20 sm:w-20 sm:rounded-xl ${
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

          <p className="mt-4 text-sm leading-relaxed text-charcoal/70 sm:mt-6 sm:text-base">
            {product.descricao}
          </p>

          {temVariantes ? (
            <>
              {coresDisponiveis.length > 0 && (
                <div className="mt-4 sm:mt-8">
                  <h3 className="mb-1.5 text-xs font-semibold sm:mb-2.5 sm:text-sm">Cor</h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {coresDisponiveis.map((c) => (
                      <button
                        key={c}
                        onClick={() => selecionarCor(c)}
                        className={`rounded-full border px-2.5 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm ${
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
                <div className="mt-4 sm:mt-8">
                  <h3 className="mb-1.5 text-xs font-semibold sm:mb-2.5 sm:text-sm">Tamanho</h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {tamanhosDisponiveis.map((t) => (
                      <button
                        key={t}
                        onClick={() => selecionarTamanho(t)}
                        className={`rounded-full border px-2.5 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm ${
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
                <p className="mt-2 text-xs font-medium text-offer sm:mt-3 sm:text-sm">
                  Esgotado nessa combinação de cor/tamanho.
                </p>
              )}
            </>
          ) : (
            product.cores.length > 0 && (
              <div className="mt-4 sm:mt-8">
                <h3 className="mb-1.5 text-xs font-semibold sm:mb-2.5 sm:text-sm">Cor</h3>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {product.cores.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCor(c)}
                      className={`rounded-full border px-2.5 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm ${
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

          <div className="mt-4 sm:mt-8">
            <h3 className="mb-1.5 text-xs font-semibold sm:mb-2.5 sm:text-sm">Quantidade</h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center rounded-full border border-sand">
                <button
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="p-2 hover:bg-wood-100 sm:p-3"
                  aria-label="Diminuir"
                >
                  <FiMinus size={13} />
                </button>
                <span className="w-7 text-center text-sm sm:w-8 sm:text-base">{quantidade}</span>
                <button
                  onClick={() =>
                    setQuantidade((q) => Math.min(estoqueAtual, q + 1))
                  }
                  className="p-2 hover:bg-wood-100 sm:p-3"
                  aria-label="Aumentar"
                >
                  <FiPlus size={13} />
                </button>
              </div>
              <span className="text-xs text-charcoal/60 sm:text-sm">
                {disponivel ? `${estoqueAtual} em estoque` : "Fora de estoque"}
              </span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:mt-8 sm:flex-row sm:gap-3">
            <button
              disabled={!disponivel}
              onClick={() => addItem(product, quantidade, variante)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-charcoal px-6 py-3 font-semibold text-white transition hover:bg-charcoal-800 disabled:cursor-not-allowed disabled:opacity-40 sm:py-3.5"
            >
              <FiShoppingBag /> Adicionar ao carrinho
            </button>
            <button
              disabled={!disponivel}
              onClick={() => {
                addItem(product, quantidade, variante);
                navigate("/checkout");
              }}
              className="flex-1 rounded-full border border-charcoal px-6 py-3 font-semibold text-charcoal transition hover:bg-wood-100 disabled:cursor-not-allowed disabled:opacity-40 sm:py-3.5"
            >
              Comprar agora
            </button>
          </div>

          <div className="mt-2 sm:mt-3">
            <WhatsAppButton
              message={`Olá! Tenho uma dúvida sobre o produto "${product.nome}" da ${STORE_NAME}.`}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366]/10 px-6 py-3 font-semibold text-[#128C4A] transition hover:bg-[#25D366]/20 sm:py-3.5"
            >
              Tirar dúvidas pelo WhatsApp
            </WhatsAppButton>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-white p-4 text-xs shadow-card sm:mt-9 sm:p-5 sm:text-sm">
            <div>
              <dt className="text-charcoal/50">Dimensões</dt>
              <dd className="mt-0.5 font-medium">{product.dimensoes}</dd>
            </div>
            <div>
              <dt className="text-charcoal/50">Material</dt>
              <dd className="mt-0.5 font-medium">{product.material}</dd>
            </div>
          </dl>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:mt-7 sm:grid-cols-3 sm:gap-3">
            <div className="flex items-center gap-2 text-xs text-charcoal/70 sm:text-sm">
              <FiTruck className="flex-none text-wood-700" /> Entrega em {product.prazoEntrega}
            </div>
            <div className="flex items-center gap-2 text-xs text-charcoal/70 sm:text-sm">
              <FiCreditCard className="flex-none text-wood-700" /> Pagamento online seguro
            </div>
            <div className="flex items-center gap-2 text-xs text-charcoal/70 sm:text-sm">
              <FiRefreshCw className="flex-none text-wood-700" /> Troca em até 7 dias
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
