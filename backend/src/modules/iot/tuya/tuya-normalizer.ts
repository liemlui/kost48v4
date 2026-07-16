import { IotReadingQuality } from '../../../generated/prisma';

type TuyaStatus = { code?: unknown; value?: unknown; t?: unknown };
type TuyaDefinition = { code?: unknown; type?: unknown; values?: unknown };

export type NormalizedTelemetry = {
  metric: string;
  valueDecimal?: number;
  valueText?: string;
  unit?: string;
  quality: IotReadingQuality;
  reason?: string;
};

const METRIC_MAP: Record<string, { metric: string; unit?: string }> = {
  add_ele: { metric: 'electricity.energy_total_kwh', unit: 'kWh' },
  total_forward_energy: { metric: 'electricity.energy_total_kwh', unit: 'kWh' },
  cur_power: { metric: 'electricity.power_w', unit: 'W' },
  cur_voltage: { metric: 'electricity.voltage_v', unit: 'V' },
  cur_current: { metric: 'electricity.current_a', unit: 'A' },
};

function parseValues(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw !== 'string') return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

export function getTuyaStatusDefinitions(specification: Record<string, unknown>): TuyaDefinition[] {
  return Array.isArray(specification?.status) ? specification.status as TuyaDefinition[] : [];
}

export function normalizeTuyaStatus(
  statuses: Array<Record<string, unknown>>,
  specification: Record<string, unknown>,
): NormalizedTelemetry[] {
  const definitions = new Map(
    getTuyaStatusDefinitions(specification)
      .filter((item) => typeof item.code === 'string')
      .map((item) => [String(item.code), item]),
  );

  return (statuses as TuyaStatus[])
    .filter((item) => typeof item.code === 'string')
    .map((item) => {
      const code = String(item.code);
      const definition = definitions.get(code);
      const values = parseValues(definition?.values);
      const mapped = METRIC_MAP[code];
      const metric = mapped?.metric ?? `tuya.${code}`;
      const rawUnit = typeof values.unit === 'string' ? values.unit : undefined;
      const unit = mapped?.unit ?? rawUnit;

      if (typeof item.value === 'number' && Number.isFinite(item.value)) {
        const hasScale = Number.isInteger(Number(values.scale));
        const scale = hasScale ? Number(values.scale) : 0;
        return {
          metric,
          valueDecimal: item.value / Math.pow(10, scale),
          unit,
          quality: hasScale ? IotReadingQuality.GOOD : IotReadingQuality.SUSPECT,
          ...(!hasScale ? { reason: 'Tuya specification tidak menyediakan scale; nilai disimpan tanpa pembagian' } : {}),
        };
      }

      return {
        metric,
        valueText: typeof item.value === 'string' ? item.value : JSON.stringify(item.value),
        unit,
        quality: IotReadingQuality.GOOD,
      };
    });
}

export function tuyaObservedAt(statuses: Array<Record<string, unknown>>, fallback = new Date()): Date {
  const timestamps = statuses
    .map((item) => Number(item.t))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => value < 10_000_000_000 ? value * 1000 : value);
  return timestamps.length ? new Date(Math.max(...timestamps)) : fallback;
}
