/**
 * Copy for Slack and Discord notifications, by locale.
 * Used so the organization OWNER receives messages in their preferred language.
 */
export type NotificationLocale = "pt" | "en" | "es";

export interface NotificationMessages {
  slack: {
    anomalyTitle: string;
    anomalyDescriptionConsolidated: string; // {organizationName} {totalImpact}
    valueLabel: string;
    averageLabel: string;
    openDashboard: string;
    anomalyDescriptionTemplate: string;
    anomalyDescriptionWithStats: string; // {provider} {serviceName} {value} {average}
    monthlyContextLabel: string;
    budgetSpendLine: string; // {mtd} {budget} {percent}
    consumedLabel: string;
    anomalyFooter: string;
    testVerified: string;
    testOrgLabel: string;
    testContext: string;
  };
  discord: {
    anomalyTitle: string;
    anomalyDescriptionConsolidated: string; // {organizationName} {totalImpact}
    valueLabel: string;
    averageLabel: string;
    orgLabel: string;
    footer: string;
    anomalyDescriptionTemplate: string;
    anomalyDescriptionWithStats: string;
    monthlyContextLabel: string;
    budgetSpendLine: string; // {mtd} {budget} {percent}
    anomalyFooter: string;
    testTitle: string;
    testDescription: string;
    testOrgLabel: string;
    testFooter: string;
  };
}

const MESSAGES: Record<NotificationLocale, NotificationMessages> = {
  pt: {
    slack: {
      anomalyTitle: "⚠️ Spike detetado!",
      anomalyDescriptionConsolidated:
        "Detetámos anomalias de custo na organização *{organizationName}*.\nImpacto total estimado: *{totalImpact}* acima da média.",
      valueLabel: "Valor",
      averageLabel: "Média",
      openDashboard: "Abrir Dashboard",
      anomalyDescriptionTemplate: "Spike detetado em **{provider}**{serviceName}.",
      anomalyDescriptionWithStats: "Spike detetado (Z-Score > 2). Total diário {value} vs média {average}.",
      monthlyContextLabel: "Contexto Mensal",
      budgetSpendLine: "Gasto: *{mtd}* / {budget} ({percent}%)",
      consumedLabel: "Consumido",
      anomalyFooter: "BurnWatch Intelligence",
      testVerified: "Ligação ao webhook verificada.",
      testOrgLabel: "Organização",
      testContext: "Notification Engine • Mensagem de teste",
    },
    discord: {
      anomalyTitle: "🚨 ANOMALIA DE CUSTO",
      anomalyDescriptionConsolidated:
        "Detetámos anomalias de custo na organização **{organizationName}**.\nImpacto total estimado: **{totalImpact}** acima da média.",
      valueLabel: "Valor",
      averageLabel: "Média",
      orgLabel: "Organização",
      footer: "BurnWatch Notification Engine",
      anomalyDescriptionTemplate: "Spike detetado no provedor **{provider}**{serviceName}.",
      anomalyDescriptionWithStats: "Spike detetado (Z-Score > 2). Total diário {value} vs média {average}.",
      monthlyContextLabel: "Contexto Mensal",
      budgetSpendLine: "Gasto: **{mtd}** / {budget} ({percent}%)",
      anomalyFooter: "BurnWatch Intelligence",
      testTitle: "✅ Ligação verificada",
      testDescription: "O webhook está configurado corretamente.",
      testOrgLabel: "Organização",
      testFooter: "BurnWatch • Mensagem de teste",
    },
  },
  en: {
    slack: {
      anomalyTitle: "⚠️ Spike detected!",
      anomalyDescriptionConsolidated:
        "We detected cost anomalies in organization *{organizationName}*.\nEstimated total impact: *{totalImpact}* above average.",
      valueLabel: "Value",
      averageLabel: "Average",
      openDashboard: "Open Dashboard",
      anomalyDescriptionTemplate: "Spike detected on **{provider}**{serviceName}.",
      anomalyDescriptionWithStats: "Spike detected (Z-Score > 2). Daily total {value} vs average {average}.",
      monthlyContextLabel: "Monthly context",
      budgetSpendLine: "Spend: *{mtd}* / {budget} ({percent}%)",
      consumedLabel: "Consumed",
      anomalyFooter: "BurnWatch Intelligence",
      testVerified: "Webhook connection verified.",
      testOrgLabel: "Organization",
      testContext: "Notification Engine • Test message",
    },
    discord: {
      anomalyTitle: "🚨 COST ANOMALY",
      anomalyDescriptionConsolidated:
        "We detected cost anomalies in organization **{organizationName}**.\nEstimated total impact: **{totalImpact}** above average.",
      valueLabel: "Value",
      averageLabel: "Average",
      orgLabel: "Organization",
      footer: "BurnWatch Notification Engine",
      anomalyDescriptionTemplate: "Spike detected on provider **{provider}**{serviceName}.",
      anomalyDescriptionWithStats: "Spike detected (Z-Score > 2). Daily total {value} vs average {average}.",
      monthlyContextLabel: "Monthly context",
      budgetSpendLine: "Spend: **{mtd}** / {budget} ({percent}%)",
      anomalyFooter: "BurnWatch Intelligence",
      testTitle: "✅ Connection verified",
      testDescription: "Webhook is configured correctly.",
      testOrgLabel: "Organization",
      testFooter: "BurnWatch • Test message",
    },
  },
  es: {
    slack: {
      anomalyTitle: "⚠️ ¡Spike detectado!",
      anomalyDescriptionConsolidated:
        "Hemos detectado anomalías de coste en la organización *{organizationName}*.\nImpacto total estimado: *{totalImpact}* por encima de la media.",
      valueLabel: "Valor",
      averageLabel: "Media",
      openDashboard: "Abrir Dashboard",
      anomalyDescriptionTemplate: "Spike detectado en **{provider}**{serviceName}.",
      anomalyDescriptionWithStats: "Spike detectado (Z-Score > 2). Total diario {value} vs media {average}.",
      monthlyContextLabel: "Contexto mensual",
      budgetSpendLine: "Gasto: *{mtd}* / {budget} ({percent}%)",
      consumedLabel: "Consumido",
      anomalyFooter: "BurnWatch Intelligence",
      testVerified: "Conexión al webhook verificada.",
      testOrgLabel: "Organización",
      testContext: "Notification Engine • Mensaje de prueba",
    },
    discord: {
      anomalyTitle: "🚨 ANOMALÍA DE COSTE",
      anomalyDescriptionConsolidated:
        "Hemos detectado anomalías de coste en la organización **{organizationName}**.\nImpacto total estimado: **{totalImpact}** por encima de la media.",
      valueLabel: "Valor",
      averageLabel: "Media",
      orgLabel: "Organización",
      footer: "BurnWatch Notification Engine",
      anomalyDescriptionTemplate: "Spike detectado en el proveedor **{provider}**{serviceName}.",
      anomalyDescriptionWithStats: "Spike detectado (Z-Score > 2). Total diario {value} vs media {average}.",
      monthlyContextLabel: "Contexto mensual",
      budgetSpendLine: "Gasto: **{mtd}** / {budget} ({percent}%)",
      anomalyFooter: "BurnWatch Intelligence",
      testTitle: "✅ Conexión verificada",
      testDescription: "El webhook está configurado correctamente.",
      testOrgLabel: "Organización",
      testFooter: "BurnWatch • Mensaje de prueba",
    },
  },
};

const DEFAULT_LOCALE: NotificationLocale = "en";

export function getNotificationMessages(locale: string | null | undefined): NotificationMessages {
  const key = locale === "pt" || locale === "en" || locale === "es" ? locale : DEFAULT_LOCALE;
  return MESSAGES[key];
}

export function formatAnomalyDescription(
  template: string,
  provider: string,
  serviceName?: string,
): string {
  const servicePart = serviceName ? ` (${serviceName})` : "";
  return template
    .replace("{provider}", provider)
    .replace("{serviceName}", servicePart);
}

export function formatAnomalyDescriptionWithStats(
  template: string,
  provider: string,
  serviceName: string | undefined,
  valueFormatted: string,
  averageFormatted: string,
): string {
  const servicePart = serviceName ? ` (${serviceName})` : "";
  return template
    .replace("{provider}", provider)
    .replace("{serviceName}", servicePart)
    .replace("{value}", valueFormatted)
    .replace("{average}", averageFormatted);
}
