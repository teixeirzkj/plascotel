import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiBox, FiTag, FiShoppingCart, FiAlertTriangle } from "react-icons/fi";
import { fetchProducts, fetchCategories } from "../../data/repository";
import { fetchAdminOrders, type AdminOrder } from "../../data/adminRepository";
import { isSupabaseConfigured } from "../../lib/supabase";
import { formatCurrency } from "../../lib/format";
import { SalesChart } from "../../components/admin/SalesChart";
import type { Product, Category } from "../../types";

export default function AdminDashboard() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [pedidos, setPedidos] = useState<AdminOrder[]>([]);

  useEffect(() => {
    fetchProducts().then(setProdutos);
    fetchCategories().then(setCategorias);
    if (isSupabaseConfigured) {
      fetchAdminOrders().then(setPedidos).catch(() => setPedidos([]));
    }
  }, []);

  // Quando o produto tem variações por cor, olha o estoque de cada cor
  // separado (é isso que decide se dá pra vender ou não).
  const linhasEstoque = produtos.flatMap((p) =>
    (p.variantes?.length ?? 0) > 0
      ? p.variantes!.map((v) => ({ id: v.id, nome: `${p.nome} — ${v.cor}`, estoque: v.estoque }))
      : [{ id: p.id, nome: p.nome, estoque: p.estoque }]
  );
  const estoqueBaixo = linhasEstoque.filter((l) => l.estoque <= 3);
  const faturamento = pedidos.reduce((acc, p) => acc + p.total, 0);

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl sm:text-3xl">Dashboard</h1>

      {!isSupabaseConfigured && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl bg-offer/10 p-4 text-sm text-offer">
          <FiAlertTriangle className="mt-0.5 flex-none" size={18} />
          <span>
            Você está vendo dados de exemplo. Conecte o Supabase (.env) para
            gerenciar produtos, categorias e pedidos reais com estoque
            automático.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={FiBox} label="Produtos" value={produtos.length} to="/admin/produtos" />
        <Card icon={FiTag} label="Categorias" value={categorias.length} to="/admin/categorias" />
        <Card icon={FiShoppingCart} label="Pedidos" value={pedidos.length} to="/admin/pedidos" />
        <Card
          icon={FiShoppingCart}
          label="Faturamento total"
          value={formatCurrency(faturamento)}
          to="/admin/pedidos"
        />
      </div>

      {isSupabaseConfigured && (
        <div className="mt-10">
          <SalesChart pedidos={pedidos} />
        </div>
      )}

      <div className="mt-10 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg">Estoque baixo (≤ 3 unidades)</h2>
        {estoqueBaixo.length === 0 ? (
          <p className="text-sm text-charcoal/60">Nenhum produto com estoque baixo.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {estoqueBaixo.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{l.nome}</span>
                <span className="flex-none font-semibold text-offer">{l.estoque} un.</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string | number;
  to: string;
}) {
  return (
    <Link to={to} className="rounded-2xl bg-white p-5 shadow-card transition hover:-translate-y-0.5">
      <Icon size={20} />
      <p className="mt-3 font-display text-2xl">{value}</p>
      <p className="text-sm text-charcoal/60">{label}</p>
    </Link>
  );
}
