export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function discountPercent(preco: number, precoPromocional: number) {
  return Math.round(((preco - precoPromocional) / preco) * 100);
}
