export interface EnderecoPorCep {
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
}

/**
 * Busca o endereço a partir do CEP usando a API pública e gratuita do
 * ViaCEP (não precisa de token). Retorna null se o CEP não existir ou a
 * consulta falhar — o cliente sempre pode preencher o endereço manualmente.
 */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep | null> {
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.erro) return null;
    return {
      estado: data.uf ?? "",
      cidade: data.localidade ?? "",
      bairro: data.bairro ?? "",
      rua: data.logradouro ?? "",
    };
  } catch {
    return null;
  }
}
