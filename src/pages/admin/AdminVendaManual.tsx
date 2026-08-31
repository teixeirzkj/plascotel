import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { fetchProducts } from "../../data/repository";
import { createManualSale, type ManualSaleItem } from "../../data/adminRepository";
import { formatCurrency } from "../../lib/format";
import type { Product } from "../../types";

export default function AdminVendaManual() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeCliente, setNomeCliente] = useState("");
  const [itens, setItens] = useState<ManualSaleItem[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts()
      .then((p) => {
        setProdutos(p);
        setProdutoSelecionado(p[0]?.id ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const produtoAtual = produtos.find((p) => p.id === produtoSelecionado);

  const jaAdicionado = itens.reduce(
    (acc, i) => (i.produtoId === produtoSelecionado ? acc + i.quantidade : acc),
    0
  );
  const estoqueDisponivel = produtoAtual ? produtoAtual.estoque - jaAdicionado : 0;

  function handleAdicionarItem() {
    setError(null);
    if (!produtoAtual) return;
    if (quantidade < 1) return;
    if (quantidade > estoqueDisponivel) {
      setError(`Estoque insuficiente. Disponível: ${estoqueDisponivel} un.`);
      return;
    }

    setItens((prev) => {
      const existente = prev.find((i) => i.produtoId === produtoAtual.id);
      if (existente) {
        return prev.map((i) =>
          i.produtoId === produtoAtual.id ? { ...i, quantidade: i.quantidade + quantidade } : i
        );
      }
      return [
        ...prev,
        {
          produtoId: produtoAtual.id,
          nome: produtoAtual.nome,
          precoUnitario: produtoAtual.precoPromocional ?? produtoAtual.preco,
          quantidade,
        },
      ];
    });
    setQuantidade(1);
  }

  function handleRemoverItem(produtoId: string) {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }

  const total = itens.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0);

  async function handleFinalizar() {
    if (itens.length === 0) return;
    setSaving(true);
    setError(null);
    setSucesso(null);
    try {
      const venda = await createManualSale(itens, nomeCliente);
      setSucesso(venda.numero);
      setItens([]);
      setNomeCliente("");
      // Recarrega os produtos para refletir o novo estoque no formulário.
      const p = await fetchProducts();
      setProdutos(p);
    } catch (err: any) {
      setError(err.message ?? "Erro ao lançar a venda.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-charcoal/60">Carregando...</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-display text-2xl sm:text-3xl">Venda manual</h1>
      <p className="mb-8 text-sm text-charcoal/60">
        Lance aqui uma venda feita fora do site (ex: na loja física). O
        estoque dos produtos é descontado automaticamente.
      </p>

      {sucesso && (
        <p className="mb-4 rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-700">
          Venda #{sucesso} lançada com sucesso e estoque atualizado!
        </p>
      )}
      {error && <p className="mb-4 text-sm text-offer">{error}</p>}

      <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-card">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-charcoal/80">Cliente (opcional)</span>
          <input
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
            placeholder="Venda balcão"
            className="input"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-charcoal/80">Produto</span>
            <select
              value={produtoSelecionado}
              onChange={(e) => setProdutoSelecionado(e.target.value)}
              className="input"
            >
              {produtos.length === 0 && <option value="">Nenhum produto</option>}
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — estoque: {p.estoque}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-charcoal/80">Qtd.</span>
            <input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="input w-24"
            />
          </label>
          <button
            type="button"
            onClick={handleAdicionarItem}
            disabled={!produtoAtual || estoqueDisponivel <= 0}
            className="flex h-fit items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <FiPlus size={16} /> Adicionar
          </button>
        </div>
        {produtoAtual && (
          <p className="-mt-2 text-xs text-charcoal/50">
            Disponível: {estoqueDisponivel} un. · {formatCurrency(produtoAtual.precoPromocional ?? produtoAtual.preco)}
          </p>
        )}

        <div className="border-t border-sand pt-4">
          {itens.length === 0 ? (
            <p className="text-sm text-charcoal/60">Nenhum item adicionado ainda.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {itens.map((i) => (
                <li key={i.produtoId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    {i.nome} × {i.quantidade}
                  </span>
                  <div className="flex flex-none items-center gap-3">
                    <span>{formatCurrency(i.precoUnitario * i.quantidade)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoverItem(i.produtoId)}
                      aria-label="Remover item"
                      className="text-offer hover:opacity-70"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-between border-t border-sand pt-3 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleFinalizar}
            disabled={saving || itens.length === 0}
            className="rounded-full bg-charcoal px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Lançando..." : "Finalizar venda"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/pedidos")}
            className="rounded-full border border-sand px-6 py-3 font-semibold"
          >
            Ver pedidos
          </button>
        </div>
      </div>
    </div>
  );
}
