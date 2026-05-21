import { useMemo } from 'react';
import type { MeterReading, Room } from '../types';

type Utility = 'ELECTRICITY' | 'WATER' | string;

export type MeterAnomaly = {
  id: string;
  severity: 'INFO' | 'WARNING' | 'HIGH';
  roomId?: number | string;
  roomLabel: string;
  utilityType: Utility;
  title: string;
  message: string;
  recommendedAction: string;
};

type Input = {
  rooms?: Room[];
  readings?: MeterReading[];
  now?: Date;
  staleDays?: number;
};

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function daysSince(value?: string | Date | null, now = new Date()) {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function useMeterAnomalyDetector({ rooms = [], readings = [], now = new Date(), staleDays = 35 }: Input) {
  return useMemo(() => {
    const roomById = new Map(rooms.map((room) => [String(room.id), room]));
    const grouped = new Map<string, MeterReading[]>();
    for (const reading of readings) {
      const key = `${reading.roomId}:${reading.utilityType}`;
      const list = grouped.get(key) ?? [];
      list.push(reading);
      grouped.set(key, list);
    }

    const anomalies: MeterAnomaly[] = [];
    grouped.forEach((list, key) => {
      const sorted = [...list].sort((a, b) => new Date(b.readingAt).getTime() - new Date(a.readingAt).getTime());
      const latest = sorted[0];
      const previous = sorted[1];
      const room = roomById.get(String(latest.roomId));
      const roomLabel = room?.code ?? `Kamar #${latest.roomId}`;
      const age = daysSince(latest.readingAt, now);

      if (age !== null && age > staleDays) {
        anomalies.push({
          id: `${key}:stale`,
          severity: 'WARNING',
          roomId: latest.roomId,
          roomLabel,
          utilityType: latest.utilityType,
          title: 'Meter belum diperbarui',
          message: `${roomLabel} belum punya reading ${latest.utilityType} selama ${age} hari.`,
          recommendedAction: 'Cek kamar dan catat meter terbaru.',
        });
      }

      if (previous) {
        const usage = toNumber(latest.readingValue) - toNumber(previous.readingValue);
        const gapDays = Math.max(1, daysSince(previous.readingAt, latest.readingAt ? new Date(latest.readingAt) : now) ?? 1);
        const dailyUsage = usage / gapDays;
        const threshold = latest.utilityType === 'ELECTRICITY' ? 35 : 4;
        if (usage < 0) {
          anomalies.push({ id: `${key}:decrease`, severity: 'HIGH', roomId: latest.roomId, roomLabel, utilityType: latest.utilityType, title: 'Meter menurun', message: `Angka meter terbaru lebih kecil dari catatan sebelumnya.`, recommendedAction: 'Cek ulang angka meter. Kalau meter diganti, tulis di catatan.' });
        } else if (dailyUsage > threshold) {
          anomalies.push({ id: `${key}:spike`, severity: 'WARNING', roomId: latest.roomId, roomLabel, utilityType: latest.utilityType, title: 'Pemakaian melonjak', message: `Pemakaian rata-rata ${dailyUsage.toFixed(1)} per hari terlihat terlalu tinggi.`, recommendedAction: 'Cek kemungkinan bocor, alat listrik bermasalah, atau salah catat.' });
        } else if (usage === 0 && gapDays >= 14 && room?.status === 'OCCUPIED') {
          anomalies.push({ id: `${key}:zero`, severity: 'INFO', roomId: latest.roomId, roomLabel, utilityType: latest.utilityType, title: 'Pemakaian nol tidak biasa', message: `Tidak ada perubahan meter selama ${gapDays} hari padahal kamar sedang dihuni.`, recommendedAction: 'Cek apakah meter belum dicatat.' });
        }
      }
    });

    return {
      anomalies,
      highCount: anomalies.filter((item) => item.severity === 'HIGH').length,
      warningCount: anomalies.filter((item) => item.severity === 'WARNING').length,
      summary: anomalies.length ? `${anomalies.length} sinyal meter perlu dicek.` : 'Catatan meter terlihat aman dari data yang dimuat.',
    };
  }, [rooms, readings, now, staleDays]);
}
