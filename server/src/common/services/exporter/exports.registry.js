export const exportConfigs = {
  "usuarios-dyn": {
    from: "tbl_usuarios u",
    joins: [
      "LEFT JOIN tbl_estados_usuario e ON u.est_id = e.est_id",
      "LEFT JOIN tbl_pais p ON u.pai_id = p.pai_id",
      "LEFT JOIN tbl_ciudad c ON u.ciu_id = c.ciu_id",
    ],
    fields: {
      id: { select: "u.usu_id", header: "ID" },
      documento: { select: "u.usu_documento", header: "Documento" },
      nombre_completo: {
        select:
          "CONCAT(COALESCE(u.usu_nombre,''),' ',COALESCE(u.usu_apellido,''))",
        header: "Nombre completo",
      },
      email: { select: "u.usu_correo", header: "Email", transform: "toLower" },
      telefono: {
        select: "u.usu_telefono",
        header: "Teléfono",
        transform: "onlyDigits",
      },
      estado: { select: "e.est_nombre", header: "Estado" },
      pais: { select: "p.pai_nombre", header: "País" },
      ciudad: { select: "c.ciu_nombre", header: "Ciudad" },
      fecha_registro: {
        select: "u.usu_fec_reg",
        header: "Fecha registro",
        transform: "toDate",
      },
    },
    default_select: [
      "id",
      "documento",
      "nombre_completo",
      "email",
      "telefono",
      "estado",
      "pais",
      "ciudad",
      "fecha_registro",
    ],
    filters: {
      id: { column: "u.usu_id", op: "=", type: "number" }, // WHERE u.usu_id = ?
      ids: { column: "u.usu_id", op: "IN", type: "number" }, // WHERE u.usu_id IN (?,?,?)
      estado: { column: "e.est_nombre", op: "=", type: "string" },
      pais: { column: "p.pai_nombre", op: "=", type: "string" },
      ciudad: { column: "c.ciu_nombre", op: "=", type: "string" },
      buscar: {
        type: "search_or",
        columns: [
          "u.usu_nombre",
          "u.usu_apellido",
          "u.usu_documento",
          "u.usu_correo",
        ],
      },
      fecha_desde: { column: "u.usu_fec_reg", op: ">=", type: "date" },
      fecha_hasta: { column: "u.usu_fec_reg", op: "<=", type: "date" },
    },
    sort: {
      allowed: ["fecha_registro", "nombre_completo", "documento", "email"],
      default: { by: "fecha_registro", dir: "DESC" },
    },
    limit: { max: 50000, default: 10000 },
  },
};
