import { useEffect, useState } from "react";
import { FiMapPin, FiPhone, FiMail, FiChevronDown, FiTrash2, FiDownload, FiSearch, FiTruck } from "react-icons/fi";
import {
  fetchAdminOrders,
  adminUpdateOrderStatus,
  adminDeleteAllOrders,
  adminUpdateOrderTracking,
  type AdminOrder,
} from "../../data/adminRepository";
import { formatCurrency } from "../../lib/format";

const statusOptions = [
  "aguardando_pagamento",
  "novo",
  "confirmado",
  "enviado",
  "entregue",
  "divergencia_valor",
  "cancelado",
];

const statusLabel: Record<string, string> = {
  aguardando_pagamento: "aguardando pagamento",
  divergencia_valor: "valor divergente",
};

const statusColor: Record<string, string> = {
  aguardando_pagamento: "bg-gold",
  novo: "bg-wood-500",
  confirmado: "bg-charcoal",
  enviado: "bg-wood-300",
  entregue: "bg-green-600",
  divergencia_valor: "bg-offer",
  cancelado: "bg-offer",
};

function mesAtual() {
  return new Date().toISOString().slice(0, 7); // "AAAA-MM"
}

/** Pedido que chegou a ir pro InfinitePay mas nunca foi pago = carrinho abandonado. */
function ehCarrinhoAbandonado(p: AdminOrder) {
  return p.formaPagamento === "infinitepay" && p.status === "cancelado";
}

function paraCsv(pedidos: AdminOrder[]) {
  const linhas = [
    ["Número", "Data", "Cliente", "WhatsApp", "Status", "Forma de pagamento", "Subtotal", "Frete", "Total"],
    ...pedidos.map((p) => [
      String(p.numero),
      new Date(p.criadoEm).toLocaleString("pt-BR"),
      p.cliente?.nomeCompleto ?? "",
      p.cliente?.whatsapp ?? "",
      statusLabel[p.status] ?? p.status,
      p.formaPagamento,
      p.subtotal.toFixed(2).replace(".", ","),
      p.frete.toFixed(2).replace(".", ","),
      p.total.toFixed(2).replace(".", ","),
    ]),
  ];
  return linhas.map((linha) => linha.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

export default function AdminOrders() {
  const [pedidos, setPedidos] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mes, setMes] = useState<string>(""); // "" = todos os meses
  const [busca, setBusca] = useState("");
  const [soAbandonados, setSoAbandonados] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [apagando, setApagando] = useState(false);
  const [rastreios, setRastreios] = useState<Record<string, string>>({});
  const [salvandoRastreio, setSalvandoRastreio] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    fetchAdminOrders()
      .then(setPedidos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const buscaNormalizada = busca.trim().toLowerCase();
  const pedidosFiltrados = pedidos.filter((p) => {
    if (mes && p.criadoEm.slice(0, 7) !== mes) return false;
    if (soAbandonados && !ehCarrinhoAbandonado(p)) return false;
    if (buscaNormalizada) {
      const alvo = `${p.numero} ${p.cliente?.nomeCompleto ?? ""}`.toLowerCase();
      if (!alvo.includes(buscaNormalizada)) return false;
    }
    return true;
  });

  const totalFiltrado = pedidosFiltrados.reduce((acc, p) => acc + p.total, 0);
  const abandonadosNoMes = pedidos.filter(
    (p) => ehCarrinhoAbandonado(p) && (!mes || p.criadoEm.slice(0, 7) === mes)
  ).length;

  async function handleStatusChange(id: string, status: string) {
    try {
      await adminUpdateOrderStatus(id, status);
      reload();
    } catch (err: any) {
      alert(err.message ?? "Erro ao atualizar status.");
    }
  }

  async function handleSalvarRastreio(id: string) {
    setSalvandoRastreio(id);
    try {
      await adminUpdateOrderTracking(id, rastreios[id] ?? "");
      reload();
    } catch (err: any) {
      alert(err.message ?? "Erro ao salvar código de rastreio.");
    } finally {
      setSalvandoRastreio(null);
    }
  }

  function toggleExpandido(id: string) {
    setExpandidos((e) => ({ ...e, [id]: !e[id] }));
  }

  function handleExportarCsv() {
    const csv = "﻿" + paraCsv(pedidosFiltrados);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos${mes ? `-${mes}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleApagarTudo() {
    if (
      !confirm(
        `Apagar TODOS os ${pedidos.length} pedidos? Essa ação não pode ser desfeita. O estoque reservado por pedidos pendentes será devolvido antes de apagar.`
      )
    ) {
      return;
    }
    setApagando(true);
    try {
      await adminDeleteAllOrders();
      reload();
    } catch (err: any) {
      alert(err.message ?? "Erro ao apagar os pedidos.");
    } finally {
      setApagando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">Pedidos</h1>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-charcoal/80">Buscar</span>
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome ou número do pedido"
                className="input pl-8"
              />
            </div>
          </label>
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
          {pedidosFiltrados.length > 0 && (
            <button
              type="button"
              onClick={handleExportarCsv}
              className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2.5 text-sm font-medium hover:bg-wood-100"
            >
              <FiDownload size={14} /> Exportar CSV
            </button>
          )}
          {pedidos.length > 0 && (
            <button
              type="button"
              onClick={handleApagarTudo}
              disabled={apagando}
              className="flex items-center gap-1.5 rounded-full border border-offer px-4 py-2.5 text-sm font-medium text-offer transition hover:bg-offer/10 disabled:opacity-50"
            >
              <FiTrash2 size={14} /> {apagando ? "Apagando..." : "Apagar tudo"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-offer">{error}</p>}

      {abandonadosNoMes > 0 && (
        <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 rounded-xl bg-wood-50 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={soAbandonados}
            onChange={(e) => setSoAbandonados(e.target.checked)}
            className="h-4 w-4 accent-wood-700"
          />
          Mostrar só carrinhos abandonados ({abandonadosNoMes})
        </label>
      )}

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
            const aberto = !!expandidos[p.id];

            return (
            <div key={p.id} className="rounded-2xl bg-white p-5 shadow-card">
              <button
                type="button"
                onClick={() => toggleExpandido(p.id)}
                className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <FiChevronDown
                    size={18}
                    className={`flex-none text-charcoal/40 transition-transform ${aberto ? "rotate-180" : ""}`}
                  />
                  <div>
                    <p className="font-display text-lg">
                      Pedido #{p.numero}
                      {p.formaPagamento === "manual" && (
                        <span className="ml-2 rounded-full bg-wood-100 px-2 py-0.5 text-xs font-semibold text-wood-700">
                          Venda balcão
                        </span>
                      )}
                      {ehCarrinhoAbandonado(p) && (
                        <span className="ml-2 rounded-full bg-charcoal/10 px-2 py-0.5 text-xs font-semibold text-charcoal/70">
                          Carrinho abandonado
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-charcoal/60">{p.cliente?.nomeCompleto}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-sm font-medium text-charcoal/70 sm:inline">
                    {formatCurrency(p.total)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold text-white ${
                      statusColor[p.status] ?? "bg-charcoal"
                    }`}
                  >
                    {statusLabel[p.status] ?? p.status}
                  </span>
                </div>
              </button>

              {aberto && (
                <div className="mt-4 border-t border-sand pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-charcoal/60">
                      {new Date(p.criadoEm).toLocaleString("pt-BR")}
                    </p>
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

                  {(p.transactionNsu || p.valorPago != null) && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 rounded-xl bg-wood-50 p-3 text-xs text-charcoal/70">
                      {p.transactionNsu && <span>Transação: {p.transactionNsu}</span>}
                      {p.valorPago != null && <span>Valor pago: {formatCurrency(p.valorPago)}</span>}
                      {p.pagoEm && <span>Pago em: {new Date(p.pagoEm).toLocaleString("pt-BR")}</span>}
                    </div>
                  )}

                  {(p.status === "confirmado" || p.status === "enviado" || p.status === "entregue") && (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <label className="flex flex-1 flex-col gap-1.5 text-sm">
                        <span className="flex items-center gap-1.5 font-medium text-charcoal/80">
                          <FiTruck size={14} /> Código de rastreio (Correios)
                        </span>
                        <input
                          value={rastreios[p.id] ?? p.codigoRastreio ?? ""}
                          onChange={(e) => setRastreios((r) => ({ ...r, [p.id]: e.target.value }))}
                          placeholder="Ex: BR123456789BR"
                          className="input"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSalvarRastreio(p.id)}
                        disabled={salvandoRastreio === p.id}
                        className="rounded-full border border-sand px-4 py-2.5 text-sm font-medium hover:bg-wood-100 disabled:opacity-50"
                      >
                        {salvandoRastreio === p.id ? "Salvando..." : "Salvar"}
                      </button>
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
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
