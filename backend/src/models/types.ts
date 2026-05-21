// ---------------------------------------------------------------------------
// Banco de dados — refletem as tabelas no Supabase
// ---------------------------------------------------------------------------

export interface DevedorRow {
  id: number;
  nome: string;
  cpf_cnpj: string;
  telefone: string | null;
  email: string | null;
  criado_em: string;
}

export interface DividaRow {
  id: number;
  devedor_id: number;
  valor_original: number;
  data_vencimento: string;
  status: StatusDivida;
  criado_em: string;
}

export interface PagamentoRow {
  id: number;
  divida_id: number;
  valor_pago: number;
  data_pagamento: string;
  tipo: "parcial" | "total";
  criado_em: string;
}

// ---------------------------------------------------------------------------
// API — formato de resposta para o frontend
// ---------------------------------------------------------------------------

export type StatusDivida = "pendente" | "pago" | "atrasado";

export interface Divida {
  id: number;
  devedor: string;
  cpfCnpj: string;
  valorOriginal: number;
  totalPago: number;
  jurosAcumulados: number;
  multaAtraso: number;
  saldoDevedor: number;
  diasAtraso: number;
  dataVencimento: string;
  status: StatusDivida;
}

export interface CriarDividaDTO {
  devedor: string;
  /** Opcional; vazio grava "-" no cadastro (identificação é por nome). */
  cpfCnpj?: string;
  valorOriginal: number;
  dataVencimento: string;
  telefone?: string;
  email?: string;
}

export interface AtualizarDividaDTO {
  devedor?: string;
  cpfCnpj?: string;
  valorOriginal?: number;
  dataVencimento?: string;
  status?: StatusDivida;
  telefone?: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export interface CriarPagamentoDTO {
  dividaId: number;
  valorPago: number;
  dataPagamento?: string;
}

export interface Pagamento {
  id: number;
  dividaId: number;
  valorPago: number;
  dataPagamento: string;
  tipo: "parcial" | "total";
  criadoEm: string;
}

// ---------------------------------------------------------------------------
// Devedores (visão agrupada)
// ---------------------------------------------------------------------------

export interface DividaResumida {
  id: number;
  valorOriginal: number;
  totalPago: number;
  jurosAcumulados: number;
  multaAtraso: number;
  saldoDevedor: number;
  diasAtraso: number;
  dataVencimento: string;
  status: StatusDivida;
}

export interface DevedorComDividas {
  id: number;
  nome: string;
  cpfCnpj: string;
  telefone: string | null;
  email: string | null;
  totalOriginal: number;
  totalJuros: number;
  totalPago: number;
  saldoTotal: number;
  qtdDividas: number;
  qtdAtrasadas: number;
  dividas: DividaResumida[];
}

// ---------------------------------------------------------------------------
// Juros
// ---------------------------------------------------------------------------

export interface ConfigJuros {
  taxaMensal: number;
  multaAtraso: number;
  tipoJuros: "simples" | "compostos";
  carenciaDias: number;
}

export interface PagamentoParaCalculo {
  valor_pago: number;
  data_pagamento: string;
}

export interface ResultadoCalculo {
  valorOriginal: number;
  totalPago: number;
  jurosAcumulados: number;
  multaAtraso: number;
  saldoDevedor: number;
  diasAtraso: number;
}
