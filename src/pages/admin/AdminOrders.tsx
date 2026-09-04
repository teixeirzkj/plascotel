import { useEffect, useState } from "react";
import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { fetchAdminOrders, adminUpdateOrderStatus, type AdminOrder } from "../../data/adminRepository";
import { formatCurrency } from "../../lib/format";

const statusOptions = [
  "aguardando_pagamento",
  "novo",
  "confirmado",
  "enviado",
  "entregue",
  "cancelado",
];

const statusLabel: Record<string, string> = {
  aguardando_pagamento: "aguardando pagamento",
};

const statusColor: Record<string, string> = {
  aguardando_pagamento: "bg-gold",
  novo: "bg-wood-500",
  confirmado: "bg-charcoal",
  enviado: "bg-wood-300",
  entregue: "bg-green-600",
  cancelado: "bg-offer",
};

function mesAtual() {
  return new Date().toISOString().slice(0, 7); // "AAAA-MM"
}

export default function AdminOrders() {
  const [pedidos, setPedidos] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState<string>(""); // "" = todos os meses

  function reload() {
    setLoading(true);
    fetchAdminOrders()
      .then(setPedidos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const pedidosFiltrados = mes
    ? pedidos.filter((p) => p.criadoEm.slice(0, 7) === mes)
    : pedidos;

  const totalFiltrado = pedidosFiltrados.reduce((acc, p) => acc + p.total, 0);

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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">Pedidos</h1>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-charcoal/80">Filtrar por mês</span>
          <div className="flex gap-2">
            <input
              type="month"
              value={mes}
              max={mesAtual()}
              onChange={(e) => setMes(e.target.value)}
              className="input"
            />
            {mes && (
              <button
                type="button"
                onClick={() => setMes("")}
                className="rounded-full border border-sand px-4 text-sm font-medium hover:bg-wood-100"
              >
                Limpar
              </button>
            )}
          </div>
        </label>
      </div>

      {error && <p className="mb-4 text-sm text-offer">{error}</p>}

      {!loading && (
        <p className="mb-4 text-sm text-charcoal/60">
          {pedidosFiltrados.length} pedido(s) · Total: {formatCurrency(totalFiltrado)}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-charcoal/60">Carregando...</p>
        ) : pedidosFiltrados.length === 0 ? (
          <p className="text-charcoal/60">Nenhum pedido neste período.</p>
        ) : (
          pedidosFiltrados.map((p) => {
            const endereco = [
              p.cliente?.rua && p.cliente?.numero
                ? `${p.cliente.rua}, ${p.cliente.numero}`
                : p.cliente?.rua,
              p.cliente?.complemento,
              p.cliente?.bairro,
              p.cliente?.cidade && p.cliente?.estado
                ? `${p.cliente.cidade}/${p.cliente.estado}`
                : p.cliente?.cidade,
              p.cliente?.cep,
            ]
              .filter(Boolean)
              .join(" — ");

            return (
            <div key={p.id} className="rounded-2xl bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg">
                    Pedido #{p.numero}
                    {p.formaPagamento === "manual" && (
                      <span className="ml-2 rounded-full bg-wood-100 px-2 py-0.5 text-xs font-semibold text-wood-700">
                        Venda balcão
                      </span>
                    )}
                  </p>
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
                    {statusLabel[p.status] ?? p.status}
                  </span>
                  <select
                    value={p.status}
                    onChange={(e) => handleStatusChange(p.id, e.target.value)}
                    className="rounded-full border border-sand px-3 py-1.5 text-sm"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel[s] ?? s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(p.cliente?.whatsapp || p.cliente?.email || endereco) && (
                <div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-wood-50 p-3 text-sm text-charcoal/80">
                  {p.cliente?.whatsapp && (
                    <p className="flex items-center gap-2">
                      <FiPhone size={14} className="flex-none text-charcoal/50" />
                      <a
                        href={`https://wa.me/55${p.cliente.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {p.cliente.whatsapp}
                      </a>
                    </p>
                  )}
                  {p.cliente?.email && (
                    <p className="flex items-center gap-2">
                      <FiMail size={14} className="flex-none text-charcoal/50" />
                      {p.cliente.email}
                    </p>
                  )}
                  {endereco && (
                    <p className="flex items-start gap-2">
                      <FiMapPin size={14} className="mt-0.5 flex-none text-charcoal/50" />
                      <span>{endereco}</span>
                    </p>
                  )}
                </div>
              )}

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
            );
          })
        )}
      </div>
    </div>
  );
}
