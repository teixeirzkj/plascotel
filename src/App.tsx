import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
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
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminVendaManual from "./pages/admin/AdminVendaManual";

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
                  "O prazo de entrega varia de acordo com o produto e a região, e é informado na página de cada móvel.",
                  "Após a confirmação do pagamento, você receberá atualizações sobre o status da entrega pelo WhatsApp.",
                ]}
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="produtos" element={<AdminProducts />} />
          <Route path="produtos/novo" element={<AdminProductForm />} />
          <Route path="produtos/:id" element={<AdminProductForm />} />
          <Route path="categorias" element={<AdminCategories />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="venda-manual" element={<AdminVendaManual />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
