import { microsoftConnection } from "../../common/configs/microsoftGraph.config.js";
import {
  getConnection,
  releaseConnection,
} from "../../common/configs/db.config.js";

export const getSitesDrive = async (req, res, next) => {
  try {
    const data = [];
    const drive = `/sites`;

    const client = await microsoftConnection();
    const driveItems = await client.api(drive).orderby("name asc").get();

    if (driveItems.value.length > 0) {
      for (const { name, id } of driveItems.value) {
        data.push({
          id,
          nombre: name,
        });
      }
    }

    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

export const getUserDrive = async (_, res, next) => {
  try {
    const data = [];

    const client = await microsoftConnection();
    const driveItems = await client.api("/users").get();

    if (driveItems.value.length > 0) {
      for (const { displayName, mail, id } of driveItems.value) {
        data.push({
          id,
          nombre: `${displayName} (${mail})`,
        });
      }
    }

    return res.status(200).json(data);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al cargar usuarios de SharePoint" });
  }
};

export const getUnitsDrive = async (req, res, next) => {
  const { sitio } = req.query;

  try {
    const data = [];
    const drive = `/sites/${sitio}/drives`;

    const client = await microsoftConnection();
    const driveItems = await client.api(drive).orderby("name asc").get();

    if (driveItems.value.length > 0) {
      for (const { name, id } of driveItems.value) {
        data.push({
          id,
          nombre: name,
        });
      }
    }

    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

// export const getFoldersDrive = async (req, res, next) => {
//   const { sitio, biblioteca, carpeta } = req.query;

//   try {
//     const data = [];
//     const drive =
//       sitio && biblioteca && !carpeta
//         ? `/users/${sitio}/drives/${biblioteca}/root/children`
//         : `/drives/${biblioteca}/items/${carpeta}/children`;

//     const client = await microsoftConnection();
//     const driveItems = await client.api(drive).filter(`folder ne null`).get();

//     if (driveItems.value.length > 0) {
//       for (const { name, id, folder } of driveItems.value) {
//         const { childCount } = folder || { childCount: 0 };

//         if (childCount > 0) {
//           data.push({
//             key: id,
//             label: name,
//             leaf: true,
//             children: [{ key: 0, label: "" }],
//           });
//         } else {
//           data.push({
//             key: id,
//             label: name,
//           });
//         }
//       }
//     }

//     return res.status(200).json(data);
//   } catch (err) {
//     next(err);
//   }
// };

export const getFoldersDrive = async (req, res, next) => {
  const { sitio, biblioteca, carpeta } = req.query;

  try {
    const data = [];
    const drive =
      sitio && biblioteca && !carpeta
        ? `/sites/${sitio}/drives/${biblioteca}/root/children`
        : `/drives/${biblioteca}/items/${carpeta}/children`;

    const client = await microsoftConnection();
    const driveItems = await client.api(drive).filter(`folder ne null`).get();

    if (driveItems.value.length > 0) {
      for (const { name, id, folder } of driveItems.value) {
        const { childCount } = folder || { childCount: 0 };

        if (childCount > 0) {
          data.push({
            key: id,
            label: name,
            leaf: true,
            children: [{ key: 0, label: "" }],
          });
        } else {
          data.push({
            key: id,
            label: name,
          });
        }
      }
    }

    return res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};
export const PutStorageSite = async (req, res, next) => {
  const { sitio, biblioteca, carpeta, ruta, usuario } = req.body;
  let conn = null;
  let release = false;
  try {
    if (!conn) {
      conn = await getConnection();
      release = true;
    }

    await conn.beginTransaction();

    const storagePayload = {
      reg_sitio: sitio,
      reg_biblioteca: biblioteca,
      reg_carpeta: carpeta,
      reg_ruta: ruta,
      reg_usu_act: usuario,
      reg_fec_act: new Date(),
    };

    const [query] = await conn.query(
      `UPDATE tbl_reglas SET ? WHERE reg_id = 1`,
      [storagePayload]
    );

    if (query.affectedRows === 0) {
      throw new Error("Error al actualizar registro.");
    }

    await conn.commit();
    return res.status(200).json({
      message: "Actualizado correctamente"
    });
  } catch (err) {
    if (conn) await conn.rollback();
    next(err);
  } finally {
    if (release) releaseConnection(conn);
  }
};