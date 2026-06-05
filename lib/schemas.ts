import { z } from "zod";

// ===== 入力スキーマ =====
export const GenerateInputSchema = z.object({
  destination: z.string().min(1),
  startDate: z.string().optional(),
  nights: z.number().int().min(1).max(30),
  partySize: z.number().int().min(1).max(20),
  budgetJpy: z.number().optional(),
  purposes: z.array(z.string()).max(10).default([]),
  freeMemo: z.string().max(1000).optional(),
});

export type GenerateInput = z.infer<typeof GenerateInputSchema>;

// ===== AI出力スキーマ =====
export const SpotSchema = z.object({
  startTime: z.string(),
  name: z.string(),
  category: z.string(),
  memo: z.string(),
  lat: z.number(),
  lng: z.number(),
  moveToNext: z.string(),
});

export const DaySchema = z.object({
  dayIndex: z.number().int().min(1),
  title: z.string(),
  spots: z.array(SpotSchema).min(1),
});

export const ItinerarySchema = z.object({
  title: z.string(),
  days: z.array(DaySchema).min(1),
});

export type Itinerary = z.infer<typeof ItinerarySchema>;
