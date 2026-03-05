// features/areas/hooks/useEmployeesOptions.js
import { useEffect, useMemo, useState } from "react";
import { paginationUsersAPI } from "@api/requests/usersApi";

/**
 * Devuelve opciones [{id, nombre}] para multiselect de empleados.
 * No modifica la capa /api. Consumimos paginationUsersAPI tal cual.
 */
export default function useEmployeesOptions({
  filtros = { prfId: 14, estado: 1 }, // ajusta a tus filtros reales
  limit = 500,
} = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const body = useMemo(
    () => ({
      filtros,
      start: 0,
      limit,
      sortField: "nombre",
      sortOrder: 1,
    }),
    [filtros, limit]
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await paginationUsersAPI(body);
        const rows = data?.datos || data || [];
        const mapped = rows.map((u) => ({
          id: u.usuId ?? u.id ?? u.usu_id,
          nombre:
            `${u.nombre ?? u.usu_nombre ?? ""} ${u.apellido ?? u.usu_apellido ?? ""}`.trim() ||
            u.usuario ||
            u.usu_usuario ||
            `ID ${u.usuId ?? u.id ?? u.usu_id}`,
        }));
        if (!cancel) setOptions(mapped);
      } catch {
        if (!cancel) setOptions([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [body]);

  return { options, loading };
}
