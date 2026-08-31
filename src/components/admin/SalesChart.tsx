import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { AdminOrder } from "../../data/adminRepository";
import { formatCurrency } from "../../lib/format";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function ultimosMeses(quantidade: number) {
  const hoje = new Date();
  const resultado: { chave: string; label: string }[] = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    resultado.push({ chave, label: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` });
  }
  return resultado;
}

export function SalesChart({ pedidos }: { pedidos: AdminOrder[] }) {
  const meses = ultimosMeses(6);
  const dados = meses.map(({ chave, label }) => {
    const doMes = pedidos.filter((p) => p.criadoEm.slice(0, 7) === chave && p.status !== "cancelado");
    return {
      mes: label,
      total: doMes.reduce((acc, p) => acc + p.total, 0),
      pedidos: doMes.length,
    };
  });

  const semDados = dados.every((d) => d.total === 0);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <h2 className="mb-4 font-display text-lg">Vendas nos últimos 6 meses</h2>
      {semDados ? (
        <p className="text-sm text-charcoal/60">Ainda não há vendas registradas neste período.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e0d8" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), "Faturamento"]}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="total" fill="#a3794f" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
