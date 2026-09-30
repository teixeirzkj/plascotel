import { supabase } from "./supabase";

const BUCKET = "imagens";
const MAX_DIMENSAO = 1600;
const QUALIDADE_JPEG = 0.82;
const TAMANHO_MAXIMO_BYTES = 8 * 1024 * 1024; // 8 MiB — mesmo limite do bucket (supabase/storage.sql)

// Assinatura binária (magic bytes) de cada formato aceito — o `file.type`
// do navegador é só o que o próprio SO/navegador "achou" pela extensão,
// então é fácil de forjar (renomear qualquer arquivo pra ".jpg"). Ler os
// primeiros bytes de verdade é o que realmente garante que o conteúdo É
// uma imagem desses formatos, não só que o nome do arquivo parece uma.
const ASSINATURAS: { tipo: "image/jpeg" | "image/png" | "image/webp"; bytes: number[] }[] = [
  { tipo: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { tipo: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // WEBP: "RIFF" + 4 bytes de tamanho + "WEBP" — checamos só o prefixo "RIFF".
  { tipo: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

async function detectarTipoReal(file: File): Promise<string | null> {
  const cabecalho = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  for (const { tipo, bytes } of ASSINATURAS) {
    if (bytes.every((b, i) => cabecalho[i] === b)) return tipo;
  }
  return null;
}

/**
 * Reduz fotos grandes (comum em fotos tiradas direto do celular, às vezes
 * vários MB) antes de enviar — sem isso, cada imagem de produto demora pra
 * carregar no site, principalmente ao trocar de cor/tamanho. PNG com
 * transparência mantém o formato (só reduz a resolução); o resto vira JPEG
 * comprimido. WEBP não é recodificado (suporte de `canvas.toBlob` pra webp
 * é inconsistente entre navegadores) — sobe como veio.
 *
 * O tipo de saída vem sempre de `tipoReal` (magic bytes), nunca de
 * `file.type` (alegado pelo navegador) — é o que garante extensão e
 * content-type corretos mesmo pra um arquivo com nome/tipo forjado.
 */
async function comprimirImagem(file: File, tipoReal: string): Promise<{ blob: Blob; tipo: string }> {
  if (tipoReal === "image/webp") return { blob: file, tipo: tipoReal };

  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, MAX_DIMENSAO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, tipo: tipoReal };
    ctx.drawImage(bitmap, 0, 0, largura, altura);

    const formatoSaida = tipoReal === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, formatoSaida, formatoSaida === "image/jpeg" ? QUALIDADE_JPEG : undefined)
    );

    // Só usa o resultado comprimido se ele realmente ficou menor.
    return blob && blob.size < file.size ? { blob, tipo: formatoSaida } : { blob: file, tipo: tipoReal };
  } catch {
    return { blob: file, tipo: tipoReal };
  }
}

/**
 * Envia um arquivo de imagem para o Supabase Storage e retorna a URL
 * pública para salvar no produto/categoria. Requer o bucket "imagens"
 * criado (ver supabase/storage.sql) e um usuário admin logado.
 */
export async function uploadImage(file: File, pasta: "produtos" | "categorias" | "banner") {
  if (!supabase) {
    throw new Error("Supabase não está configurado.");
  }

  if (file.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("Imagem maior que 8 MB — reduza o tamanho antes de enviar.");
  }

  const tipoReal = await detectarTipoReal(file);
  if (!tipoReal) {
    throw new Error("Arquivo não reconhecido como imagem (JPEG, PNG ou WEBP).");
  }

  const { blob: processado, tipo } = await comprimirImagem(file, tipoReal);
  const extensao = tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg";
  const nomeArquivo = `${pasta}/${crypto.randomUUID()}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, processado, {
    // O nome do arquivo é um UUID único e nunca é reaproveitado, então dá
    // pra cachear "para sempre" — acelera visitas seguintes.
    cacheControl: "31536000",
    upsert: false,
    // Content-type é o REAL (detectado pelos magic bytes), nunca o que o
    // navegador alegou — o bucket também reforça essa allow-list do lado
    // do servidor (ver supabase/storage.sql).
    contentType: tipo,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return data.publicUrl;
}
