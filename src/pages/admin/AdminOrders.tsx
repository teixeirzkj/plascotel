import { useEffect, useState } from "react";
import { fetchAdminOrders, adminUpdateOrderStatus, type AdminOrder } from "../../data/adminRepository";
import { formatCurrency } from "../../lib/format";

const statusOptions = ["novo", "confirmado", "enviado", "entregue", "cancelado"];

const statusColor: Record<string, string> = {
  novo: "bg-wood-500",
  confirmado: "bg-charcoal",
  enviado: "bg-gold",
  entregue: "bg-green-600",
  cancelado: "bg-offer",
};

export default function AdminOrders() {
  const [pedidos, setPedidos] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    fetchAdminOrders()
      .then(setPedidos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleStatusChange(id: string, status: string) {
    try {
      await adminUpdateOrderStatus(id, status);
      reload();
    } catch (err: any) {
      alert(err.message ?? "Erro ao atualizar status.");
    }
  }

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl sm:text-3xl">Pedidos</h1>

      {error && <p className="mb-4 text-sm text-offer">{error}</p>}

      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-charcoal/60">Carregando...</p>
        ) : pedidos.length === 0 ? (
          <p className="text-charcoal/60">Nenhum pedido ainda.</p>
        ) : (
          pedidos.map((p) => (
            <div key={p.id} className="rounded-2xl bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg">Pedido #{p.numero}</p>
                  <p className="text-sm text-charcoal/60">
                    {p.cliente?.nomeCompleto} — {new Date(p.criadoEm).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                      statusColor[p.status] ?? "bg-charcoal"
                    }`}
                  >
                    {p.status}
                  </span>
                  <select
                    value={p.status}
                    onChange={(e) => handleStatusChange(p.id, e.target.value)}
                    className="rounded-full border border-sand px-3 py-1.5 text-sm"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ul className="mt-4 flex flex-col gap-1 border-t border-sand pt-3 text-sm">
                {p.itens.map((i, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span className="text-charcoal/70">
                      {i.nome} × {i.quantidade}
                    </span>
                    <span>{formatCurrency(i.precoUnitario * i.quantidade)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-sand pt-3 font-semibold">
                <span>Total</span>
                <span>{formatCurrency(p.total)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
