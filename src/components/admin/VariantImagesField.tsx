import { useState } from "react";
import { FiUpload, FiX } from "react-icons/fi";
import { uploadImage } from "../../lib/storage";

interface VariantImagesFieldProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

/** Upload de várias fotos para uma variação de cor específica. */
export function VariantImagesField({ value, onChange }: VariantImagesFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of files) urls.push(await uploadImage(file, "produtos"));
      onChange([...value, ...urls]);
    } catch (err: any) {
      setError(err.message ?? "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function remover(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div
              key={url + i}
              className="group relative h-14 w-14 overflow-hidden rounded-lg border border-sand"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remover(i)}
                aria-label="Remover imagem"
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink/70 text-white"
              >
                <FiX size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-sand px-3 py-1.5 text-xs font-semibold hover:bg-wood-100">
        <FiUpload size={13} />
        {uploading ? "Enviando..." : "Fotos desta cor"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={handleFiles}
        />
      </label>
      {error && <p className="text-xs text-offer">{error}</p>}
    </div>
  );
}
