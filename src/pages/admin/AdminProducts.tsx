import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { fetchProducts } from "../../data/repository";
import { adminDeleteProduct } from "../../data/adminRepository";
import { useCatalogStore } from "../../store/catalog";
import { formatCurrency } from "../../lib/format";
import { precoExibicao, estoqueExibicao, imagemPrincipal } from "../../lib/productPricing";
import type { Product } from "../../types";

export default function AdminProducts() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    fetchProducts()
      .then(setProdutos)
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir o produto "${nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await adminDeleteProduct(id);
      reload();
      useCatalogStore.getState().refresh();
    } catch (err: any) {
      alert(err.message ?? "Erro ao excluir produto.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl">Produtos</h1>
        <Link
          to="/admin/produtos/novo"
          className="flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white"
        >
          <FiPlus /> Novo produto
        </Link>
      </div>

      {loading ? (
        <p className="p-6 text-center text-charcoal/50">Carregando...</p>
      ) : produtos.length === 0 ? (
        <p className="p-6 text-center text-charcoal/50">Nenhum produto cadastrado.</p>
      ) : (
        <>
          {/* Cards — celular e tablet, sem rolagem horizontal */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {produtos.map((p) => (
              <li key={p.id} className="rounded-2xl bg-white p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <img
                    src={imagemPrincipal(p)}
                    alt=""
                    className="h-16 w-16 flex-none rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.nome}</p>
                    <p className="mt-0.5 text-sm text-charcoal/70">
                      {(p.variantes?.length ?? 0) > 0 && "A partir de "}
                      {formatCurrency(precoExibicao(p))}
                    </p>
                    <p
                      className={`text-sm ${
                        estoqueExibicao(p) <= 3 ? "font-semibold text-offer" : "text-charcoal/60"
                      }`}
                    >
                      {estoqueExibicao(p)} un. em estoque
                      {(p.variantes?.length ?? 0) > 0 && ` (${p.variantes!.length} cores)`}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.oferta && <Tag color="bg-offer">Oferta</Tag>}
                      {p.novo && <Tag color="bg-charcoal">Novo</Tag>}
                      {estoqueExibicao(p) === 0 && <Tag color="bg-charcoal/50">Esgotado</Tag>}
                    </div>
                  </div>
                  <div className="flex flex-none flex-col gap-1">
                    <Link
                      to={`/admin/produtos/${p.id}`}
                      className="rounded-full p-2 hover:bg-wood-100"
                      aria-label="Editar"
                    >
                      <FiEdit2 size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id, p.nome)}
                      className="rounded-full p-2 text-offer hover:bg-offer/10"
                      aria-label="Excluir"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Tabela — telas grandes */}
          <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-card lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sand text-charcoal/50">
                  <th className="p-4 font-medium">Produto</th>
                  <th className="p-4 font-medium">Preço</th>
                  <th className="p-4 font-medium">Estoque</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => (
                  <tr key={p.id} className="border-b border-sand/60">
                    <td className="flex items-center gap-3 p-4">
                      <img src={imagemPrincipal(p)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <span className="font-medium">
                        {p.nome}
                        {(p.variantes?.length ?? 0) > 0 && (
                          <span className="ml-2 text-xs font-normal text-charcoal/50">
                            ({p.variantes!.length} cores)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-4">
                      {(p.variantes?.length ?? 0) > 0 && "A partir de "}
                      {formatCurrency(precoExibicao(p))}
                    </td>
                    <td className={`p-4 ${estoqueExibicao(p) <= 3 ? "font-semibold text-offer" : ""}`}>
                      {estoqueExibicao(p)} un.
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {p.oferta && <Tag color="bg-offer">Oferta</Tag>}
                        {p.novo && <Tag color="bg-charcoal">Novo</Tag>}
                        {estoqueExibicao(p) === 0 && <Tag color="bg-charcoal/50">Esgotado</Tag>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/admin/produtos/${p.id}`}
                          className="rounded-full p-2 hover:bg-wood-100"
                          aria-label="Editar"
                        >
                          <FiEdit2 size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, p.nome)}
                          className="rounded-full p-2 text-offer hover:bg-offer/10"
                          aria-label="Excluir"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${color}`}>
      {children}
    </span>
  );
}
