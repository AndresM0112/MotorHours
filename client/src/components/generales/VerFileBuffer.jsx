// import React, { useEffect, useRef, useState, useCallback } from "react";
// import { Dialog } from "primereact/dialog";
// import { ProgressSpinner } from "primereact/progressspinner";
// import { Button } from "primereact/button";
// import { previewTicketEvidenceAPI, downloadTicketEvidenceAPI } from "@api/requests/ticketsApi";
// import useHandleApiError from "@hook/useHandleApiError";

// const VIEWERS = { pdfjsCanvas: "pdfjsCanvas", embed: "embed" };

// export const VerFileBuffer = ({ title = "", visible, onClose, fileId, fileUrl }) => {
//     const handleApiError = useHandleApiError();
//     const [loading, setLoading] = useState(false);
//     const [loadingDown, setLoadingDown] = useState(false);
//     const [viewer, setViewer] = useState(VIEWERS.pdfjsCanvas);
//     const [blobUrl, setBlobUrl] = useState("");
//     const [dataUrl, setDataUrl] = useState("");
//     const [blobSizeKB, setBlobSizeKB] = useState(0);
//     const [scale, setScale] = useState(1);
//     const [manualZoom, setManualZoom] = useState(false);
//     const canvasWrapRef = useRef(null);

//     const ensurePdfJs = () =>
//         new Promise((resolve, reject) => {
//             if (window.pdfjsLib) return resolve(window.pdfjsLib);
//             window.process = window.process || { env: {} };
//             const VERSION = "2.16.105";
//             const s = document.createElement("script");
//             s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${VERSION}/pdf.min.js`;
//             s.async = true;
//             s.onload = () => {
//                 try {
//                     window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${VERSION}/pdf.worker.min.js`;
//                     resolve(window.pdfjsLib);
//                 } catch (e) {
//                     reject(e);
//                 }
//             };
//             s.onerror = reject;
//             document.head.appendChild(s);
//         });

//     useEffect(() => {
//         if (!visible) {
//             if (blobUrl && blobUrl.startsWith("blob:")) window.URL.revokeObjectURL(blobUrl);
//             setBlobUrl("");
//             setDataUrl("");
//             setLoading(false);
//             return;
//         }

//         const loadFile = async () => {
//             setLoading(true);
//             try {
//                 let url = fileUrl;
//                 if (!url && fileId) {
//                     const res = await previewTicketEvidenceAPI(fileId);
//                     url = res?.data?.preview || res?.preview;
//                     if (!url) throw new Error("No se recibió URL de vista previa.");
//                 }
//                 const response = await fetch(url);
//                 const blob = await response.blob();
//                 if (blob.size === 0) throw new Error("PDF vacío.");
//                 setBlobSizeKB((blob.size / 1024).toFixed(1));
//                 const objectUrl = URL.createObjectURL(blob);
//                 setBlobUrl(objectUrl);

//                 const reader = new FileReader();
//                 reader.onload = () => setDataUrl(String(reader.result));
//                 reader.readAsDataURL(blob);
//                 setViewer(VIEWERS.pdfjsCanvas);
//             } catch (error) {
//                 console.error(error);
//                 handleApiError(error);
//                 onClose();
//             } finally {
//                 setLoading(false);
//             }
//         };
//         loadFile();
//         return () => {
//             if (blobUrl && blobUrl.startsWith("blob:")) window.URL.revokeObjectURL(blobUrl);
//             setBlobUrl("");
//             setDataUrl("");
//         };
//     }, [visible, fileId, fileUrl]);

//     const renderPdf = useCallback(async () => {
//         if (!visible || viewer !== VIEWERS.pdfjsCanvas || !blobUrl || !canvasWrapRef.current)
//             return;
//         const wrap = canvasWrapRef.current;
//         wrap.innerHTML = "";

//         try {
//             const pdfjsLib = await ensurePdfJs();
//             const ab = await (await fetch(blobUrl)).arrayBuffer();
//             const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
//             const containerWidth = wrap.clientWidth;

//             let currentScale = scale;
//             if (!manualZoom && pdf.numPages > 0) {
//                 const firstPage = await pdf.getPage(1);
//                 const viewport = firstPage.getViewport({ scale: 1 });
//                 currentScale = containerWidth / viewport.width;
//                 setScale(currentScale);
//             }

//             const dpr = window.devicePixelRatio || 1;

//             for (let i = 1; i <= pdf.numPages; i++) {
//                 const page = await pdf.getPage(i);
//                 const viewport = page.getViewport({ scale: currentScale * dpr });
//                 const canvas = document.createElement("canvas");
//                 const ctx = canvas.getContext("2d");
//                 canvas.width = viewport.width;
//                 canvas.height = viewport.height;
//                 canvas.style.width = `${viewport.width / dpr}px`;
//                 canvas.style.height = `${viewport.height / dpr}px`;
//                 canvas.style.display = "block";
//                 canvas.style.margin = "0 auto 12px";
//                 canvas.style.background = "#fff";
//                 wrap.appendChild(canvas);
//                 await page.render({ canvasContext: ctx, viewport }).promise;
//             }
//         } catch (e) {
//             console.error(e);
//             if (dataUrl) setViewer(VIEWERS.embed);
//         }
//     }, [viewer, blobUrl, visible, dataUrl, scale, manualZoom]);

//     useEffect(() => {
//         renderPdf();
//     }, [renderPdf, scale]);
//     useEffect(() => {
//         const handleResize = () => {
//             if (!manualZoom) renderPdf();
//         };
//         window.addEventListener("resize", handleResize);
//         return () => window.removeEventListener("resize", handleResize);
//     }, [renderPdf, manualZoom]);

//     const download = async () => {
//         setLoadingDown(true);
//         try {
//             if (fileId) {
//                 const { data } = await downloadTicketEvidenceAPI(fileId);
//                 const downloadUrl = data?.downloadUrl || data?.downloadURL || data?.url || data;
//                 if (!downloadUrl) throw new Error("No se recibió downloadUrl");
//                 window.open(downloadUrl, "_self");
//             } else if (fileUrl) {
//                 const a = document.createElement("a");
//                 a.href = fileUrl;
//                 a.download = "INFORME DE ATENCIÓN DE INCIDENTE – TICKETS.pdf";
//                 document.body.appendChild(a);
//                 a.click();
//                 a.remove();
//             }
//         } catch (error) {
//             handleApiError(error);
//             onClose();
//         } finally {
//             setLoadingDown(false);
//         }
//     };

//     const zoomOut = () => {
//         setManualZoom(true);
//         setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(2))));
//     };
//     const zoomIn = () => {
//         setManualZoom(true);
//         setScale((s) => Math.min(3.0, parseFloat((s + 0.1).toFixed(2))));
//     };
//     const zoom100 = () => {
//         setManualZoom(true);
//         setScale(1);
//     };

//     return (
//         <Dialog
//             maximizable
//             draggable
//             header={title}
//             visible={visible}
//             onHide={onClose}
//             breakpoints={{ "1584px": "80vw", "960px": "60vw", "672px": "100vw" }}
//             style={{ width: "70vw", padding: 0 }}
//             contentStyle={{ padding: 0, overflow: "hidden" }}
//             footer={null}
//         >
//             {loading ? (
//                 <div className="text-center p-4">
//                     <ProgressSpinner />
//                 </div>
//             ) : (
//                 <div style={{ position: "relative", height: "80vh" }}>
//                     {viewer === VIEWERS.pdfjsCanvas ? (
//                         <div
//                             ref={canvasWrapRef}
//                             style={{
//                                 width: "100%",
//                                 height: "calc(80vh - 60px)", // espacio para el footer
//                                 overflowY: "auto",
//                                 overflowX: "hidden",
//                                 background: "#f3f3f5",
//                                 padding: 12,
//                                 paddingBottom: "calc(80px + env(safe-area-inset-bottom))", // evita que PDF quede debajo del footer en iPhone
//                             }}
//                         />
//                     ) : viewer === VIEWERS.embed && dataUrl ? (
//                         <embed
//                             src={dataUrl + "#view=FitH"}
//                             type="application/pdf"
//                             width="100%"
//                             height="100%"
//                             style={{ paddingBottom: 72 }}
//                         />
//                     ) : (
//                         <div className="text-center p-4">No se pudo cargar la vista previa.</div>
//                     )}

//                    <div
//     style={{
//         position: "absolute",
//         bottom: 0,
//         left: 0,
//         width: "100%",
//         padding: "8px 12px",
//         background: "#fff",
//         display: "flex",
//         justifyContent: "space-between",
//         alignItems: "center",
//         gap: 8,
//         flexWrap: "nowrap",
//         boxShadow: "0 -2px 6px rgba(0,0,0,0.1)",
//         zIndex: 10,
//     }}
// >
//     {/* Controles de zoom y tamaño del archivo */}
//     <div
//         className="flex align-items-center gap-2"
//         style={{
//             overflowX: "auto", // permite hacer scroll horizontal si no cabe
//             flexShrink: 1,      // puede encoger un poco pero no desaparecer
//             minWidth: 0,
//         }}
//     >
//         <span className="text-sm" style={{ flexShrink: 0, marginRight: 4 }}>
//             {blobSizeKB ? `${blobSizeKB} KB` : ""}
//         </span>
//         {viewer === VIEWERS.pdfjsCanvas && (
//             <>
//                 <Button label="−" className="p-button-text" onClick={zoomOut} />
//                 <Button label={`${Math.round(scale * 100)}%`} className="p-button-text" onClick={zoom100} />
//                 <Button label="+" className="p-button-text" onClick={zoomIn} />
//             </>
//         )}
//     </div>

//     {/* Botones de acción */}
//     <div className="flex gap-2 flex-shrink-0">
//         <Button
//             className="p-button-secondary"
//             label="Abrir en pestaña nueva"
//             disabled={!blobUrl}
//             onClick={() => blobUrl && window.open(blobUrl, "_blank")}
//             style={{ whiteSpace: "nowrap", minWidth: 110 }}
//         />
//         <Button
//             className="p-button-success"
//             label="Descargar"
//             disabled={!fileId && !fileUrl}
//             onClick={download}
//             loading={loadingDown}
//             style={{ whiteSpace: "nowrap", minWidth: 110 }}
//         />
//     </div>
// </div>

//                 </div>
//             )}
//         </Dialog>
//     );
// };
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Dialog } from "primereact/dialog";
import { ProgressSpinner } from "primereact/progressspinner";
import { Button } from "primereact/button";
import useHandleApiError from "@hook/useHandleApiError";

const VIEWERS = { pdfjsCanvas: "pdfjsCanvas", embed: "embed" };

export const VerFileBuffer = ({ title = "", visible, onClose, fileId, fileUrl }) => {
    const handleApiError = useHandleApiError();
    const [loading, setLoading] = useState(false);
    const [loadingDown, setLoadingDown] = useState(false);
    const [viewer, setViewer] = useState(VIEWERS.pdfjsCanvas);
    const [blobUrl, setBlobUrl] = useState("");
    const [dataUrl, setDataUrl] = useState("");
    const [blobSizeKB, setBlobSizeKB] = useState(0);
    const [scale, setScale] = useState(1);
    const [manualZoom, setManualZoom] = useState(false);
    const canvasWrapRef = useRef(null);

    const ensurePdfJs = () =>
        new Promise((resolve, reject) => {
            if (window.pdfjsLib) return resolve(window.pdfjsLib);
            window.process = window.process || { env: {} };
            const VERSION = "2.16.105";
            const s = document.createElement("script");
            s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${VERSION}/pdf.min.js`;
            s.async = true;
            s.onload = () => {
                try {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${VERSION}/pdf.worker.min.js`;
                    resolve(window.pdfjsLib);
                } catch (e) {
                    reject(e);
                }
            };
            s.onerror = reject;
            document.head.appendChild(s);
        });

    useEffect(() => {
        if (!visible) {
            if (blobUrl && blobUrl.startsWith("blob:")) window.URL.revokeObjectURL(blobUrl);
            setBlobUrl("");
            setDataUrl("");
            setLoading(false);
            return;
        }

        const loadFile = async () => {
            setLoading(true);
            try {
                let url = fileUrl;
                if (!url && fileId) {
                    const res = await previewTicketEvidenceAPI(fileId);
                    url = res?.data?.preview || res?.preview;
                    if (!url) throw new Error("No se recibió URL de vista previa.");
                }
                const response = await fetch(url);
                const blob = await response.blob();
                if (blob.size === 0) throw new Error("PDF vacío.");
                setBlobSizeKB((blob.size / 1024).toFixed(1));
                const objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);

                const reader = new FileReader();
                reader.onload = () => setDataUrl(String(reader.result));
                reader.readAsDataURL(blob);
                setViewer(VIEWERS.pdfjsCanvas);
            } catch (error) {
                console.error(error);
                handleApiError(error);
                onClose();
            } finally {
                setLoading(false);
            }
        };
        loadFile();
        return () => {
            if (blobUrl && blobUrl.startsWith("blob:")) window.URL.revokeObjectURL(blobUrl);
            setBlobUrl("");
            setDataUrl("");
        };
    }, [visible, fileId, fileUrl]);

    const renderPdf = useCallback(async () => {
        if (!visible || viewer !== VIEWERS.pdfjsCanvas || !blobUrl || !canvasWrapRef.current)
            return;
        const wrap = canvasWrapRef.current;
        wrap.innerHTML = "";

        try {
            const pdfjsLib = await ensurePdfJs();
            const ab = await (await fetch(blobUrl)).arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
            const containerWidth = wrap.clientWidth;

            let currentScale = scale;
            if (!manualZoom && pdf.numPages > 0) {
                const firstPage = await pdf.getPage(1);
                const viewport = firstPage.getViewport({ scale: 1 });
                currentScale = containerWidth / viewport.width;
                setScale(currentScale);
            }

            const dpr = window.devicePixelRatio || 1;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: currentScale * dpr });
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.width = `${viewport.width / dpr}px`;
                canvas.style.height = `${viewport.height / dpr}px`;
                canvas.style.display = "block";
                canvas.style.margin = "12px";
                canvas.style.background = "#fff";
                wrap.appendChild(canvas);
                await page.render({ canvasContext: ctx, viewport }).promise;
            }
        } catch (e) {
            console.error(e);
            if (dataUrl) setViewer(VIEWERS.embed);
        }
    }, [viewer, blobUrl, visible, dataUrl, scale, manualZoom]);

    useEffect(() => {
        renderPdf();
    }, [renderPdf, scale]);

    useEffect(() => {
        const handleResize = () => {
            if (!manualZoom) renderPdf();
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [renderPdf, manualZoom]);

    const download = async () => {
        setLoadingDown(true);
        try {
            if (fileId) {
                const { data } = await downloadTicketEvidenceAPI(fileId);
                const downloadUrl = data?.downloadUrl || data?.downloadURL || data?.url || data;
                if (!downloadUrl) throw new Error("No se recibió downloadUrl");
                window.open(downloadUrl, "_self");
            } else if (fileUrl) {
                const a = document.createElement("a");
                a.href = fileUrl;
                a.download = "INFORME DE ATENCIÓN DE INCIDENTE – TICKETS.pdf";
                document.body.appendChild(a);
                a.click();
                a.remove();
            }
        } catch (error) {
            handleApiError(error);
            onClose();
        } finally {
            setLoadingDown(false);
        }
    };

    const zoomOut = () => {
        setManualZoom(true);
        setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(2))));
    };
    const zoomIn = () => {
        setManualZoom(true);
        setScale((s) => Math.min(3.0, parseFloat((s + 0.1).toFixed(2))));
    };
    const zoom100 = () => {
        setManualZoom(true);
        setScale(1);
    };

    return (
        <Dialog
            maximizable
            draggable
            header={title}
            visible={visible}
            onHide={onClose}
            breakpoints={{ "1584px": "80vw", "960px": "60vw", "672px": "100vw" }}
            style={{ width: "70vw", padding: 0 }}
            contentStyle={{ padding: 0, overflow: "hidden" }}
            footer={null}
        >
            {loading ? (
                <div className="text-center p-4">
                    <ProgressSpinner />
                </div>
            ) : (
                <div style={{ position: "relative", height: "80vh" }}>
                    {viewer === VIEWERS.pdfjsCanvas ? (
                        <div
                            ref={canvasWrapRef}
                            style={{
                                width: "100%",
                                height: "calc(80vh - 60px)",
                                overflowY: "auto",
                                overflowX: "auto",
                                background: "#f3f3f5",
                                padding: 12,
                                paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
                            }}
                        />
                    ) : viewer === VIEWERS.embed && dataUrl ? (
                        <embed
                            src={dataUrl + "#view=FitH"}
                            type="application/pdf"
                            width="100%"
                            height="100%"
                            style={{ paddingBottom: 72 }}
                        />
                    ) : (
                        <div className="text-center p-4">No se pudo cargar la vista previa.</div>
                    )}

                    {/* Toolbar flotante de zoom */}
                    {viewer === VIEWERS.pdfjsCanvas && (
                        <div
                            style={{
                                position: "absolute",
                                top: 12,
                                right: 12,
                                display: "flex",
                                gap: 4,
                                background: "rgba(255,255,255,0.9)",
                                borderRadius: 4,
                                padding: "2px 4px",
                                zIndex: 20,
                                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                            }}
                        >
                            <Button label="−" className="p-button-text p-button-sm" onClick={zoomOut} />
                            <Button
                                label={`${Math.round(scale * 100)}%`}
                                className="p-button-text p-button-sm"
                                onClick={zoom100}
                            />
                            <Button label="+" className="p-button-text p-button-sm" onClick={zoomIn} />
                        </div>
                    )}

                    {/* Footer */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            width: "100%",
                            padding: "8px 12px",
                            background: "#fff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "nowrap",
                            boxShadow: "0 -2px 6px rgba(0,0,0,0.1)",
                            zIndex: 10,
                        }}
                    >
                        <div
                            className="flex align-items-center gap-2"
                            style={{
                                overflowX: "auto",
                                flexShrink: 1,
                                minWidth: 0,
                            }}
                        >
                            <span className="text-sm" style={{ flexShrink: 0, marginRight: 4 }}>
                                {blobSizeKB ? `${blobSizeKB} KB` : ""}
                            </span>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                            <Button
                                className="p-button-secondary"
                                label="Abrir en pestaña nueva"
                                disabled={!blobUrl}
                                onClick={() => blobUrl && window.open(blobUrl, "_blank")}
                                style={{ whiteSpace: "nowrap", minWidth: 110 }}
                            />
                            <Button
                                className="p-button-success"
                                label="Descargar"
                                disabled={!fileId && !fileUrl}
                                onClick={download}
                                loading={loadingDown}
                                style={{ whiteSpace: "nowrap", minWidth: 110 }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </Dialog>
    );
};
