import { Navigate, useParams } from "react-router-dom";
import { useCatalogStore } from "../store/catalog";
import { ProductGridSkeleton } from "../components/ProductCardSkeleton";
import ProductsPage from "./ProductsPage";

export default function CategoryDetailPage() {
  const { slug } = useParams();
  const categories = useCatalogStore((s) => s.categories);
  const loaded = useCatalogStore((s) => s.loaded);
  const categoria = categories.find((c) => c.slug === slug);

  // Espera o catálogo carregar do banco pelo menos uma vez antes de decidir
  // que a categoria não existe — evita redirecionar antes da resposta do
  // Supabase chegar (ex: categoria criada só no banco, ainda sem estar nos
  // dados de exemplo usados na primeira renderização).
  if (!categoria && !loaded) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="mb-8 h-8 w-48 animate-pulse rounded bg-wood-100" />
        <ProductGridSkeleton />
      </section>
    );
  }
  if (!categoria) return <Navigate to="/categorias" replace />;

  return (
    <ProductsPage
      title={categoria.nome}
      subtitle={categoria.descricao}
      baseFilter={(produtos) =>
        produtos.filter((p) => p.categoriaId === categoria.id)
      }
      hideCategoryFilter
      breadcrumb={[{ label: "Início", to: "/" }, { label: categoria.nome }]}
    />
  );
}
