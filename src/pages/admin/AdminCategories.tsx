import { useEffect, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import { fetchCategories } from "../../data/repository";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminUpdateCategory,
} from "../../data/adminRepository";
import { useCatalogStore } from "../../store/catalog";
import { ImageUploadField } from "../../components/admin/ImageUploadField";
import type { Category } from "../../types";

const emptyForm = { nome: "", slug: "", descricao: "", imagem: "" };

export default function AdminCategories() {
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    fetchCategories().then(setCategorias).finally(() => setLoading(false));
  }

  useEffect(reload, []);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({ nome: c.nome, slug: c.slug, descricao: c.descricao, imagem: c.imagem });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.imagem) {
      setError("Envie uma imagem para a categoria.");
      return;
    }
    setError(null);
    try {
      if (editing) {
        await adminUpdateCategory(editing.id, form);
      } else {
        await adminCreateCategory(form);
      }
      setShowForm(false);
      reload();
      useCatalogStore.getState().refresh();
    } catch (err: any) {
      setError(err.message ?? "Erro ao salvar categoria.");
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir a categoria "${nome}"?`)) return;
    try {
      await adminDeleteCategory(id);
      reload();
      useCatalogStore.getState().refresh();
    } catch (err: any) {
      alert(err.message ?? "Erro ao excluir categoria.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl">Categorias</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white"
        >
          <FiPlus /> Nova categoria
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-charcoal/60">Carregando...</p>
        ) : (
          categorias.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-card">
              <img src={c.imagem} alt={c.nome} className="h-32 w-full object-cover" />
              <div className="p-4">
                <p className="font-display text-lg">{c.nome}</p>
                <p className="text-sm text-charcoal/60">{c.descricao}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex items-center gap-1 rounded-full border border-sand px-3 py-1.5 text-xs font-semibold"
                  >
                    <FiEdit2 size={13} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.nome)}
                    className="flex items-center gap-1 rounded-full border border-offer/40 px-3 py-1.5 text-xs font-semibold text-offer"
                  >
                    <FiTrash2 size={13} /> Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">
                {editing ? "Editar categoria" : "Nova categoria"}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && <p className="text-sm text-offer">{error}</p>}
              <input
                required
                placeholder="Nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="input"
              />
              <input
                required
                placeholder="Slug (URL)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="input"
              />
              <input
                required
                placeholder="Descrição curta"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="input"
              />
              <ImageUploadField
                pasta="categorias"
                value={form.imagem}
                onChange={(url) => setForm({ ...form, imagem: url })}
              />
              <button
                type="submit"
                className="rounded-full bg-charcoal py-3 font-semibold text-white"
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
