import { supabase } from "./supabase";

const BUCKET = "imagens";

/**
 * Envia um arquivo de imagem para o Supabase Storage e retorna a URL
 * pública para salvar no produto/categoria. Requer o bucket "imagens"
 * criado (ver supabase/storage.sql) e um usuário admin logado.
 */
export async function uploadImage(file: File, pasta: "produtos" | "categorias") {
  if (!supabase) {
    throw new Error("Supabase não está configurado.");
  }
  const extensao = file.name.split(".").pop() || "jpg";
  const nomeArquivo = `${pasta}/${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}
