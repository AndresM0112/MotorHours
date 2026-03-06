// src/components/generales/VerFileSharePoint.jsx
import React, { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import Iframe from "react-iframe";

import useHandleApiError from "@hook/useHandleApiError";

export const VerFileSharePoint = ({ title = "", visible, onClose, fileId, fileUrl, }) => {
  const handleApiError = useHandleApiError();

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDown, setLoadingDown] = useState(false);

  useEffect(() => {

    if (!visible) {
      if (url && url.startsWith("blob:")) {
        window.URL.revokeObjectURL(url);
      }
      setUrl("");
      setLoading(false);
      return;
    }

    // 1) Si viene una URL directa (blob/http/https), úsala tal cual
    if (fileUrl) {
      setLoading(false);
      setUrl(fileUrl);
      return;
    }

    // 2) Sin fileUrl, pero con fileId => modo SharePoint
    if (!fileId) {
      setUrl("");
      return;
    }

    let cancelled = false;
    setLoading(true);

    previewTicketEvidenceAPI(fileId)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data || res;
        const previewUrl = data?.preview;
        if (!previewUrl) {
          throw new Error("No se recibió URL de vista previa.");
        }
        setUrl(previewUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        handleApiError(err);
        onClose()
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      setLoading(false);
      setUrl("");
    };
  }, [visible, fileId, fileUrl]);

  const download = async () => {

    try {
      setLoadingDown(true);
      if (fileId) {


        //   return;
        // setLoadingDown(true);
        // try {
        //   const { data } = await downloadTicketEvidenceAPI(fileId);
        //   const downloadUrl =
        //     data?.downloadUrl || data?.downloadURL || data?.url || data;
        //   if (!downloadUrl) throw new Error("No se recibió downloadUrl");

        //   // fuerza descarga en la misma pestaña
        //   window.open(downloadUrl, "_self");

        // flujo normal SharePoint
        //   const { data } = await downloadTicketEvidenceAPI(fileId);
        //   const downloadUrl =
        //     data?.downloadUrl || data?.downloadURL || data?.url || data;
        //   if (!downloadUrl) throw new Error("No se recibió downloadUrl");

        //   window.open(downloadUrl, "_self");
        // } else if (fileUrl) {
        //   // flujo para blobs / URLs directas
        //   const a = document.createElement("a");
        //   a.href = fileUrl;
        //   const fecha = new Date().toISOString().slice(0, 10);
        //   a.download = `${fecha} - PAVAS.pdf`; 
        //   // a.download = "INFORME DE ATENCIÓN DE INCIDENTE – TICKETS.pdf"; 
        //   document.body.appendChild(a);
        //   a.click();
        //   a.remove();
        const { data } = await downloadTicketEvidenceAPI(fileId);
        const downloadUrl =
          data?.downloadUrl || data?.downloadURL || data?.url || data;
        if (!downloadUrl) throw new Error("No se recibió downloadUrl");

        window.open(downloadUrl, "_self");
      } else if (fileUrl) {
        // flujo para blobs / URLs directas
        const a = document.createElement("a");
        a.href = fileUrl;
        a.download = "INFORME DE ATENCIÓN DE INCIDENTE – TICKETS.pdf"; 
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      handleApiError(error);
      onClose()
    } finally {
      setLoadingDown(false);
    }
  };

  return (
    <Dialog
      maximizable
      draggable
      header={title}
      visible={visible}
      onHide={onClose}
      breakpoints={{ "1584px": "80vw", "960px": "60vw", "672px": "100vw" }}
      style={{ width: "70vw" }}
      footer={
        <Button
          className="p-button-success"
          onClick={download}
          label="Descargar"
          loading={loadingDown}
          disabled={!fileId && !fileUrl}
        />
      }
    >
      {!url && loading ? (
        <div className="text-center">
          <ProgressSpinner />
        </div>
      ) : url ? (
        <Iframe
          url={url}
          width="100%"
          height="750px"
          className="myClassname"
          display="initial"
          position="relative"
          loading="auto"
          allowFullScreen
        />
      ) : (
        <div className="text-center p-4">
          No se pudo cargar la vista previa.
        </div>
      )}
    </Dialog>
  );
};
