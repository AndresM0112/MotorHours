import React, { useEffect, useState } from "react";
import { getAllAreasAPI, getAreasManagersByIdAPI } from "@api/requests/areasApi";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";
import "@styles/venpermisos.css";

const AreasTab = () => {
    const [areas, setAreas] = useState([]);
    const [filteredAreas, setFilteredAreas] = useState([]);
    const [managersByArea, setManagersByArea] = useState({}); 
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [areaUserMap, setAreaUserMap] = useState({}); 

    useEffect(() => {
        getAllAreasAPI()
            .then((res) => {
                const data = res.data || [];
                setAreas(data);
                setFilteredAreas(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error al obtener áreas:", err);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        const filtered = areas.filter((area) =>
            area.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredAreas(filtered);
    }, [searchTerm, areas]);

    const toggleSelectArea = async (areaId) => {
        const isSelected = selectedAreas.includes(areaId);
        const updatedSelection = isSelected
            ? selectedAreas.filter((id) => id !== areaId)
            : [...selectedAreas, areaId];

        setSelectedAreas(updatedSelection);

        if (!isSelected && !managersByArea[areaId]) {
            try {
                const res = await getAreasManagersByIdAPI(areaId);
                const managersRaw = res.data || [];

                
                const managers = managersRaw.map((m) => ({
                    id: m.encargadoId,
                    nombre: m.encargadoNombre,
                }));

                setManagersByArea((prev) => ({
                    ...prev,
                    [areaId]: managers
                }));
            } catch (err) {
                console.error(`Error al obtener managers del área ${areaId}:`, err);
            }
        }
    };

    const handleUserChange = (areaId, userId) => {
        setAreaUserMap((prev) => ({
            ...prev,
            [areaId]: userId
        }));
    };

    return (
        <div className="permisos-tab" style={{ width: "100%", marginBottom: "60px" }}>
            {loading ? (
                <div className="loader-container">
                    <span className="loader-5"></span>
                    <strong>Obteniendo áreas ...</strong>
                </div>
            ) : filteredAreas.length === 0 ? (
                <div className="text-center">
                    <img src={`${process.env.PUBLIC_URL}/images/nodata.svg`} alt="nodata" />
                    <h4>No hay áreas registradas</h4>
                </div>
            ) : (
                <>
                    <div className="mb-2" style={{ background: "white", position: "sticky", top: 0, zIndex: 10 }}>
                        <span className="p-inputgroup-addon">
                            <i className="pi pi-search"></i>
                        </span>
                        <InputText
                            placeholder="Buscar área"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="p-inputtext p-component"
                            style={{ width: "100%", marginTop: "8px" }}
                        />
                    </div>

                    {filteredAreas.map((area) => (
                        <div
                            key={area.id}
                            className="permission-item p-d-flex p-ai-center p-jc-between mb-3"
                            style={{ alignItems: "center" }}
                        >
                            <div className="p-d-flex p-ai-center">
                                <Checkbox
                                    inputId={`check-${area.id}`}
                                    checked={selectedAreas.includes(area.id)}
                                    onChange={() => toggleSelectArea(area.id)}
                                />
                                <label htmlFor={`check-${area.id}`} className="p-ml-2">
                                    <strong>{area.nombre}</strong>
                                </label>
                            </div>

                            <Dropdown
                                value={areaUserMap[area.id] || null}
                                options={managersByArea[area.id] || []}
                                onChange={(e) => handleUserChange(area.id, e.value)}
                                optionLabel="nombre"
                                optionValue="id"
                                placeholder="Asignar encargado"
                                style={{ width: "200px" }}
                                disabled={!selectedAreas.includes(area.id)}
                            />
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export default AreasTab;
