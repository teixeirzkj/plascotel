import { supabase } from "./supabase";

const BUCKET = "imagens";
const MAX_DIMENSAO = 1600;
const QUALIDADE_JPEG = 0.82;

/**
 * Reduz fotos grandes (comum em fotos tiradas direto do celular, às vezes
 * vários MB) antes de enviar — sem isso, cada imagem de produto demora pra
 * carregar no site, principalmente ao trocar de cor/tamanho. PNG com
 * transparência mantém o formato (só reduz a resolução); o resto vira JPEG
 * comprimido.
 */
async function comprimirImagem(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_DIMENSAO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, largura, altura);

    const formatoSaida = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, formatoSaida, formatoSaida === "image/jpeg" ? QUALIDADE_JPEG : undefined)
    );

    // Só usa o resultado comprimido se ele realmente ficou menor.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/**
 * Envia um arquivo de imagem para o Supabase Storage e retorna a URL
 * pública para salvar no produto/categoria. Requer o bucket "imagens"
 * criado (ver supabase/storage.sql) e um usuário admin logado.
 */
export async function uploadImage(file: File, pasta: "produtos" | "categorias") {
  if (!supabase) {
    throw new Error("Supabase não está configurado.");
  }

  const processado = await comprimirImagem(file);
  const extensao = processado.type === "image/png" ? "png" : "jpg";
  const nomeArquivo = `${pasta}/${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, processado, {
    // O nome do arquivo é um UUID único e nunca é reaproveitado, então dá
    // pra cachear "para sempre" — acelera visitas seguintes.
    cacheControl: "31536000",
    upsert: false,
    contentType: processado.type || file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}
