export type PlannerSection = "Recrutamento" | "Operação" | "Vendas";

export interface KpiTemplate {
  name: string;
  unit: string;
  frequency: "diario" | "semanal" | "mensal" | "trimestral";
  indicatorType: "numero_absoluto" | "percentual" | "razao";
  desiredDirection: "aumentar" | "diminuir" | "manter";
  section: PlannerSection;
}

export const PLANNER_KPI_TEMPLATES: KpiTemplate[] = [
  // 1. Recrutamento
  { name: "Reuniões agendadas", unit: "reuniões", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar", section: "Recrutamento" },
  { name: "Reuniões realizadas", unit: "reuniões", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar", section: "Recrutamento" },
  { name: "Corretores entraram", unit: "corretores", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar", section: "Recrutamento" },
  { name: "Estagiários entraram", unit: "estagiários", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar", section: "Recrutamento" },
  { name: "Corretores saíram", unit: "corretores", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "diminuir", section: "Recrutamento" },
  { name: "Estagiários saíram", unit: "estagiários", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "diminuir", section: "Recrutamento" },
  // 2. Operação
  { name: "Novos contratos de representação", unit: "contratos", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar", section: "Operação" },
  { name: "Contratos cancelados", unit: "contratos", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "diminuir", section: "Operação" },
  { name: "Contratos vendidos", unit: "contratos", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar", section: "Operação" },
  // 3. Vendas
  { name: "VGV", unit: "R$", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar", section: "Vendas" },
  { name: "VGC Recebido e reportado", unit: "R$", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar", section: "Vendas" },
];

export const PLANNER_SECTIONS: { key: PlannerSection; color: string; bg: string; border: string }[] = [
  { key: "Recrutamento", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { key: "Operação", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  { key: "Vendas", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
];

export function templatesBySection(section: PlannerSection) {
  return PLANNER_KPI_TEMPLATES.filter(t => t.section === section);
}

const SECTION_KEYWORDS: Record<PlannerSection, string[]> = {
  "Recrutamento": ["recrutamento", "seleção", "selecao", "creci", "corretor", "agente", "captação de agente"],
  "Operação": ["captação", "captacao", "cre ", "cres", "representação", "representacao", "imóvel", "imovel", "proprietário", "locação"],
  "Vendas": ["negociação", "negociacao", "fechamento", "vgh", "vendas", "honorário", "honrario", "comercial", "transação", "vgc"],
};

export function relevantSectionsForGoal(
  keyProcessName: string | null | undefined,
  dimensionName: string | null | undefined,
): PlannerSection[] {
  const text = `${keyProcessName ?? ""} ${dimensionName ?? ""}`.toLowerCase();
  if (!text.trim()) return PLANNER_SECTIONS.map(s => s.key);

  const matched = (Object.keys(SECTION_KEYWORDS) as PlannerSection[]).filter(section =>
    SECTION_KEYWORDS[section].some(kw => text.includes(kw))
  );

  return matched.length > 0 ? matched : PLANNER_SECTIONS.map(s => s.key);
}
