import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import Home from "./pages/Home";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryDetailPage from "./pages/CategoryDetailPage";
import ProductDetail from "./pages/ProductDetail";
import OffersPage from "./pages/OffersPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PolicyPage from "./pages/PolicyPage";
import NotFound from "./pages/NotFound";

// O painel admin (e libs que só ele usa, como o gráfico de vendas) fica
// num pacote separado, baixado só por quem realmente acessa o /admin —
// clientes da loja não precisam desse código.
const AdminLayout = lazy(() =>
  import("./components/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminVendaManual = lazy(() => import("./pages/admin/AdminVendaManual"));

function AdminFallback() {
  return <p className="p-10 text-center text-charcoal/50">Carregando...</p>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/moveis" element={<ProductsPage />} />
          <Route path="/categorias" element={<CategoriesPage />} />
          <Route path="/categorias/:slug" element={<CategoryDetailPage />} />
          <Route path="/produto/:slug" element={<ProductDetail />} />
          <Route path="/ofertas" element={<OffersPage />} />
          <Route path="/carrinho" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedido-realizado" element={<OrderSuccessPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/contato" element={<ContactPage />} />
          <Route
            path="/politica-privacidade"
            element={
              <PolicyPage
                title="Política de privacidade"
                paragraphs={[
                  "Respeitamos a sua privacidade. Os dados fornecidos no checkout (nome, contato e endereço) são utilizados exclusivamente para processar seu pedido e realizar a entrega.",
                  "Não compartilhamos suas informações com terceiros para fins comerciais.",
                ]}
              />
            }
          />
          <Route
            path="/termos-de-uso"
            element={
              <PolicyPage
                title="Termos de uso"
                paragraphs={[
                  "Ao utilizar este site, você concorda com nossos termos de compra, incluindo preços, prazos de entrega e formas de pagamento apresentados em cada produto.",
                  "As imagens são meramente ilustrativas e podem apresentar pequenas variações em relação ao produto entregue.",
                ]}
              />
            }
          />
          <Route
            path="/politica-de-troca"
            element={
              <PolicyPage
                title="Política de troca"
                paragraphs={[
                  "Você tem até 7 dias corridos após o recebimento para solicitar troca ou devolução, desde que o produto esteja em sua embalagem original e sem sinais de uso.",
                  "Para solicitar, entre em contato pelo WhatsApp informando o número do seu pedido.",
                ]}
              />
            }
          />
          <Route
            path="/politica-de-entrega"
            element={
              <PolicyPage
                title="Política de entrega"
                paragraphs={[
                  "O prazo de entrega varia de acordo com o produto e a região, e é informado na página de cada produto.",
                  "Após a confirmação do pagamento, você receberá atualizações sobre o status da entrega pelo WhatsApp.",
                ]}
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="/admin/login"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminLogin />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <Suspense fallback={<AdminFallback />}>
                <AdminLayout />
              </Suspense>
            </ProtectedAdminRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminDashboard />
              </Suspense>
            }
          />
          <Route
            path="produtos"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminProducts />
              </Suspense>
            }
          />
          <Route
            path="produtos/novo"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminProductForm />
              </Suspense>
            }
          />
          <Route
            path="produtos/:id"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminProductForm />
              </Suspense>
            }
          />
          <Route
            path="categorias"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminCategories />
              </Suspense>
            }
          />
          <Route
            path="pedidos"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminOrders />
              </Suspense>
            }
          />
          <Route
            path="venda-manual"
            element={
              <Suspense fallback={<AdminFallback />}>
                <AdminVendaManual />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
