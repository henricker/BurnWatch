
export interface ServiceAnomaly {
  name: string;          // Nome do serviço (ex: "S3", "Edge Functions")
  currentSpend: number;  // Valor do gasto no dia da anomalia (em cêntimos)
  averageSpend: number;  // Média móvel dos últimos dias (em cêntimos)
  spikePercent: number;  // Percentagem de aumento em relação à média (ex: 450)
  zScore: number;        // Pontuação Z que determinou a gravidade da anomalia
}

/**
 * Interface para agrupar serviços anómalos por provedor.
 */
export interface ProviderAnomalyGroup {
  services: ServiceAnomaly[]; // Lista de serviços afetados neste provedor
  providerTotal: number;      // Impacto financeiro total deste provedor (em cêntimos)
}

/**
 * O relatório consolidado que será enviado para os canais de notificação.
 * Agrega contexto financeiro global e detalhes por provedor.
 */
export interface MultiCloudAnomalyReport {
  organizationName: string;       // Nome da organização afetada
  dashboardUrl: string;           // URL direto para o dashboard de analytics
  
  totalImpactCents: number;       // Soma do impacto financeiro de todas as anomalias (em cêntimos)
  
  // Campos opcionais de contexto financeiro (podem não estar disponíveis se o cálculo falhar)
  totalMTDCents?: number;         // Gasto acumulado Month-to-Date (em cêntimos)
  budgetLimitCents?: number;      // Limite do plano ou orçamento definido (em cêntimos)
  budgetUsedPercent?: number;     // Percentagem do orçamento já consumida
  
  // Mapa de provedores (chave: nome do provedor, valor: grupo de anomalias)
  // Ex: { "AWS": { ... }, "VERCEL": { ... } }
  providers: Record<string, ProviderAnomalyGroup>;
}

/**
 * Configurações de notificação armazenadas na Organização.
 */
export interface NotificationSettings {
  anomaly?: boolean;      // Ativar alertas de anomalia (Z-Score > 2.0)
  dailySummary?: boolean; // Ativar resumo diário de burn rate (futuro)
  limitWarning?: boolean; // Ativar aviso de limite de plano (ex: 80%) (futuro)
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  anomaly: true,
  dailySummary: false,
  limitWarning: true,
};

// Mantemos a interface antiga (AnomalyAlert) se ainda houver código legado a usá-la,
// mas o ideal é migrar tudo para o MultiCloudAnomalyReport.
export interface AnomalyAlert {
  organizationName: string;
  provider: string;
  serviceName?: string;
  valueCents: number;
  averageCents: number;
  description?: string;
  dashboardUrl: string;
}