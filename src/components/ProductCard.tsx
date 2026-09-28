import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiShoppingBag } from "react-icons/fi";
import type { Product } from "../types";
import { useCatalogStore } from "../store/catalog";
import { formatCurrency, discountPercent } from "../lib/format";
import { useCartStore } from "../store/cart";
import { StarRating } from "./StarRating";
import {
  precoExibicao,
  precoOriginalExibicao,
  temPromocaoExibicao,
  precoVariaPorCor,
  imagemPrincipal,
  estoqueExibicao,
} from "../lib/productPricing";

const ESTOQUE_BAIXO_LIMITE = 3;

export function ProductCard({ product }: { product: Product }) {
  const [hover, setHover] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();
  const categorias = useCatalogStore((s) => s.categories);
  const categoria = categorias.find((c) => c.id === product.categoriaId);
  const temVariantes = (product.variantes?.length ?? 0) > 0;
  const temPromo = temPromocaoExibicao(product);
  const preco = precoExibicao(product);
  const precoOriginal = precoOriginalExibicao(product);
  const variaPorCor = precoVariaPorCor(product);
  const estoque = estoqueExibicao(product);
  const estoqueBaixo = estoque > 0 && estoque <= ESTOQUE_BAIXO_LIMITE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      // No celular é uma linha compacta (foto pequena à esquerda, texto à
      // direita) pra caber vários produtos na tela, um embaixo do outro.
      // A partir do tablet (sm:) volta a ser o card vertical normal.
      className="group relative flex flex-row items-stretch gap-3 overflow-hidden rounded-2xl bg-white p-2.5 shadow-card sm:flex-col sm:gap-0 sm:p-0"
    >
      <Link
        to={`/produto/${product.slug}`}
        className="relative block aspect-square w-24 flex-none overflow-hidden rounded-xl bg-wood-50 sm:aspect-[4/5] sm:w-full sm:rounded-none"
      >
        <img
          src={hover && product.imagens[1] ? product.imagens[1] : imagemPrincipal(product)}
          alt={product.nome}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <div className="hidden gap-1.5 sm:absolute sm:left-3 sm:top-3 sm:flex sm:flex-col">
          {product.oferta && temPromo && (
            <span className="rounded-full bg-offer px-2.5 py-1 text-xs font-bold text-white">
              -{discountPercent(precoOriginal, preco)}% OFERTA
            </span>
          )}
          {product.novo && (
            <span className="rounded-full bg-charcoal px-2.5 py-1 text-xs font-bold text-white">
              NOVO
            </span>
          )}
          {estoqueBaixo && (
            <span className="rounded-full bg-offer px-2.5 py-1 text-xs font-bold text-white">
              ÚLTIMAS {estoque} UN.
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            if (temVariantes) {
              navigate(`/produto/${product.slug}`);
            } else {
              addItem(product, 1);
            }
          }}
          aria-label={temVariantes ? "Escolher cor" : "Adicionar ao carrinho"}
          className="absolute bottom-3 right-3 hidden h-11 w-11 items-center justify-center rounded-full bg-charcoal text-white opacity-0 shadow-soft transition-all duration-300 sm:flex sm:translate-y-2 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
        >
          <FiShoppingBag size={17} />
        </button>
      </Link>
      <Link to={`/produto/${product.slug}`} className="flex min-w-0 flex-1 flex-col justify-center py-0.5 sm:justify-start sm:p-4">
        {categoria && (
          <span className="hidden text-xs font-medium uppercase tracking-wide text-wood-500 sm:block">
            {categoria.nome}
          </span>
        )}
        <h3 className="line-clamp-2 font-display text-sm leading-snug text-charcoal sm:mt-1 sm:text-lg">
          {product.nome}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-charcoal/60 sm:mt-1 sm:line-clamp-2 sm:text-sm">
          {product.descricaoCurta}
        </p>
        {(product.avaliacaoQuantidade ?? 0) > 0 && (
          <div className="mt-1 sm:mt-1.5">
            <StarRating media={product.avaliacaoMedia} quantidade={product.avaliacaoQuantidade} size={12} />
          </div>
        )}
        <div className="mt-1 flex flex-col gap-0.5 sm:mt-3">
          {temPromo && (
            <span className="text-xs text-charcoal/40 line-through sm:text-sm">
              {formatCurrency(precoOriginal)}
            </span>
          )}
          <span className="font-display text-sm font-semibold text-charcoal sm:text-xl">
            {variaPorCor && "A partir de "}
            {formatCurrency(preco)}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
