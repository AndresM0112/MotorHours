import { z } from "zod";

export function buildZodSchema(mapping) {
  const shape = {};
  for (const key of Object.keys(mapping)) {
    const m = mapping[key]; // { field, type, required }
    let schema = z.any();
    switch (m.type) {
      case "string":
        schema = z.string().or(z.number().transform(String));
        break;
      case "email":
        schema = z.string().email().nullable().optional();
        break;
      case "date":
        schema = z.date().nullable().optional();
        break;
      case "number":
        schema = z.number().or(z.string().transform(Number));
        break;
      default:
        schema = z.any();
    }
    if (m.required) {
      schema = schema.refine(
        (v) => v !== undefined && v !== null && v !== "",
        "Requerido"
      );
    }
    shape[m.field] = schema;
  }
  return z.object(shape);
}
