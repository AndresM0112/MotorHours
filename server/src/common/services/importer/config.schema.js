import { z } from "zod";
export const ConfigSchema = z.object({
  file: z.object({
    type: z.enum(["xlsx","csv"]),
    sheet: z.string().optional(),
    headerRow: z.union([z.number(), z.literal("auto")]).optional(),
    skipEmptyRows: z.boolean().optional(),
    delimiter: z.string().optional(), // para CSV
  }),
  mapping: z.record(z.any()),        // se valida finamente dentro de runImport
  lookups: z.record(z.any()).optional(),
  output: z.object({
    table: z.string(),
    batchSize: z.number().optional(),
    onDuplicate: z.array(z.string()),
  }),
  errors: z.object({ mode: z.enum(["collect","fail-fast"]).optional(), max: z.number().optional() }).optional()
});
