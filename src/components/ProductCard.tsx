import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiShoppingBag } from "react-icons/fi";
import type { Product } from "../types";
import { useCatalogStore } from "../store/catalog";
import { formatCurrency, discountPercent } from "../lib/format";
import { useCartStore } from "../store/cart";
import {
  precoExibicao,
  precoOriginalExibicao,
  temPromocaoExibicao,
  precoVariaPorCor,
  imagemPrincipal,
} from "../lib/productPricing";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card"
    >
      <Link to={`/produto/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-wood-50">
        <img
          src={hover && product.imagens[1] ? product.imagens[1] : imagemPrincipal(product)}
          alt={product.nome}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
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
          className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-charcoal text-white opacity-0 shadow-soft transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <FiShoppingBag size={17} />
        </button>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {categoria && (
          <span className="text-xs font-medium uppercase tracking-wide text-wood-500">
            {categoria.nome}
          </span>
        )}
        <Link to={`/produto/${product.slug}`}>
          <h3 className="mt-1 font-display text-lg leading-snug text-charcoal">
            {product.nome}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-charcoal/60">
          {product.descricaoCurta}
        </p>
        <div className="mt-2 flex flex-col gap-0.5 sm:mt-3">
          {temPromo && (
            <span className="text-xs text-charcoal/40 line-through sm:text-sm">
              {formatCurrency(precoOriginal)}
            </span>
          )}
          <span className="font-display text-base font-semibold text-charcoal sm:text-xl">
            {variaPorCor && "A partir de "}
            {formatCurrency(preco)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
