import jsPDF from "jspdf";
import { formatCurrency } from "./format";
import { STORE_NAME, STORE_EMAIL, WHATSAPP_NUMBER } from "../config/store";
import type { AdminOrder } from "../data/adminRepository";

const statusLabelPdf: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  novo: "Novo",
  confirmado: "Confirmado",
  enviado: "Enviado",
  entregue: "Entregue",
  divergencia_valor: "Valor divergente",
  cancelado: "Cancelado",
};

/**
 * Gera um PDF simples com o resumo do pedido — NÃO é uma nota fiscal (não
 * tem validade fiscal/legal nenhuma, é só um comprovante pra mandar pro
 * cliente enquanto a emissão de nota de verdade não está automatizada).
 * Fica bem avisado no próprio PDF pra não confundir ninguém.
 */
export function gerarComprovantePedido(pedido: AdminOrder) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margem = 15;
  const larguraUtil = 210 - margem * 2;
  let y = margem;

  function linha(altura = 6) {
    y += altura;
    if (y > 280) {
      doc.addPage();
      y = margem;
    }
  }

  // Cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(STORE_NAME, margem, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Pedido #${pedido.numero}`, 210 - margem, y, { align: "right" });
  linha(6);
  doc.text(new Date(pedido.criadoEm).toLocaleString("pt-BR"), 210 - margem, y, { align: "right" });

  linha(4);
  doc.setDrawColor(180);
  doc.line(margem, y, 210 - margem, y);
  linha(6);

  // Aviso — bem visível, pra ninguém confundir com nota fiscal de verdade.
  doc.setFillColor(255, 244, 214);
  doc.rect(margem, y - 4, larguraUtil, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(150, 100, 0);
  doc.text("COMPROVANTE DE PEDIDO — NÃO É DOCUMENTO FISCAL (NF-e/NFC-e)", margem + 2, y + 1);
  doc.setTextColor(0, 0, 0);
  linha(10);

  // Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Cliente", margem, y);
  linha(6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(pedido.cliente?.nomeCompleto || "-", margem, y);
  linha(5);
  if (pedido.cliente?.whatsapp) {
    doc.text(`WhatsApp: ${pedido.cliente.whatsapp}`, margem, y);
    linha(5);
  }
  if (pedido.cliente?.email) {
    doc.text(`E-mail: ${pedido.cliente.email}`, margem, y);
    linha(5);
  }

  // Endereço
  const endereco = [
    pedido.cliente?.rua && pedido.cliente?.numero
      ? `${pedido.cliente.rua}, ${pedido.cliente.numero}`
      : pedido.cliente?.rua,
    pedido.cliente?.complemento,
    pedido.cliente?.bairro,
    pedido.cliente?.cidade && pedido.cliente?.estado
      ? `${pedido.cliente.cidade}/${pedido.cliente.estado}`
      : pedido.cliente?.cidade,
    pedido.cliente?.cep,
  ]
    .filter(Boolean)
    .join(" — ");
  if (endereco) {
    linha(1);
    doc.setFont("helvetica", "bold");
    doc.text("Endereço de entrega", margem, y);
    linha(5);
    doc.setFont("helvetica", "normal");
    const enderecoQuebrado = doc.splitTextToSize(endereco, larguraUtil);
    doc.text(enderecoQuebrado, margem, y);
    linha(5 * enderecoQuebrado.length);
  }

  linha(3);
  doc.line(margem, y, 210 - margem, y);
  linha(7);

  // Itens
  const colDescricao = margem;
  const colQtd = margem + 110;
  const colUnit = margem + 130;
  const colTotal = 210 - margem;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Item", colDescricao, y);
  doc.text("Qtd.", colQtd, y);
  doc.text("Vl. unit.", colUnit, y);
  doc.text("Total", colTotal, y, { align: "right" });
  linha(2);
  doc.line(margem, y, 210 - margem, y);
  linha(6);

  doc.setFont("helvetica", "normal");
  for (const item of pedido.itens) {
    const nomeQuebrado = doc.splitTextToSize(item.nome, 100);
    doc.text(nomeQuebrado, colDescricao, y);
    doc.text(String(item.quantidade), colQtd, y);
    doc.text(formatCurrency(item.precoUnitario), colUnit, y);
    doc.text(formatCurrency(item.precoUnitario * item.quantidade), colTotal, y, { align: "right" });
    linha(5 * Math.max(nomeQuebrado.length, 1));
  }

  linha(2);
  doc.line(margem, y, 210 - margem, y);
  linha(7);

  // Totais
  doc.setFontSize(10);
  doc.text("Subtotal", colUnit, y);
  doc.text(formatCurrency(pedido.subtotal), colTotal, y, { align: "right" });
  linha(6);
  doc.text("Frete", colUnit, y);
  doc.text(pedido.frete > 0 ? formatCurrency(pedido.frete) : "Grátis", colTotal, y, { align: "right" });
  linha(7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", colUnit, y);
  doc.text(formatCurrency(pedido.total), colTotal, y, { align: "right" });
  linha(9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Forma de pagamento: ${pedido.formaPagamento === "infinitepay" ? "InfinitePay" : pedido.formaPagamento === "manual" ? "Venda balcão" : "WhatsApp"}`, margem, y);
  linha(5);
  doc.text(`Status: ${statusLabelPdf[pedido.status] ?? pedido.status}`, margem, y);
  if (pedido.valorPago != null) {
    linha(5);
    doc.text(`Valor pago: ${formatCurrency(pedido.valorPago)}`, margem, y);
  }
  if (pedido.pagoEm) {
    linha(5);
    doc.text(`Pago em: ${new Date(pedido.pagoEm).toLocaleString("pt-BR")}`, margem, y);
  }

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(130);
  const rodape = [STORE_EMAIL, WHATSAPP_NUMBER ? `WhatsApp: ${WHATSAPP_NUMBER}` : null]
    .filter(Boolean)
    .join(" · ");
  doc.text(rodape || STORE_NAME, margem, 290);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 210 - margem, 290, { align: "right" });

  doc.save(`comprovante-pedido-${pedido.numero}.pdf`);
}
