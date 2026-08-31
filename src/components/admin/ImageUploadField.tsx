import { useState } from "react";
import { FiUpload, FiX } from "react-icons/fi";
import { uploadImage } from "../../lib/storage";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  pasta: "produtos" | "categorias";
}

/** Campo de upload de uma única imagem (usado para a foto de categoria). */
export function ImageUploadField({ value, onChange, pasta }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      onChange(await uploadImage(file, pasta));
    } catch (err: any) {
      setError(err.message ?? "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3 sm:col-span-2">
      {value && (
        <div className="relative h-16 w-16 flex-none overflow-hidden rounded-xl border border-sand">
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remover imagem"
            className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink/70 text-white"
          >
            <FiX size={10} />
          </button>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-sand px-4 py-2 text-sm font-semibold hover:bg-wood-100">
          <FiUpload size={15} />
          {uploading ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={handleFile}
          />
        </label>
        {error && <p className="text-xs text-offer">{error}</p>}
      </div>
    </div>
  );
}
