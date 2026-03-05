import { useState, useEffect } from "react";
import useHandleApiError from "./useHandleApiError";

const usePaginationData = (
    initialFiltros,
    fetchDataFunction,
    setLoading,
    sortField,
    shouldFetchData = () => false,
    isPagination = true
) => {
    const handleApiError = useHandleApiError();
    const [reloadFlag, setReloadFlag] = useState(false);
    const [filtros, setFiltros] = useState(initialFiltros);
    const [datos, setDatos] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pagination, setPagination] = useState({
        rows: 50,
        first: 0,
        sortField: sortField,
        sortOrder: -1,
    });

    const onCustomPage = (event) => {
        setPagination({
            ...pagination,
            rows: event.rows,
            first: event.first,
        });
    };

    const reloadData = () => {
        setReloadFlag((prevFlag) => !prevFlag);
    };

    useEffect(() => {
        if (!shouldFetchData()) return;

        const abortController = new AbortController();
        setLoading((prevLoading) => ({ ...prevLoading, table: true }));
        const fetchData = async () => {
            try {
                let params;
                isPagination
                    ? (params = { ...filtros, ...pagination, isPagination })
                    : (params = { ...filtros, isPagination });

                const { data } = await fetchDataFunction(params);

                setDatos(data.results);
                if (isPagination) {
                    setTotalRecords(data.total);
                }
            } catch (error) {
                handleApiError(error);
            } finally {
                setLoading((prevLoading) => ({ ...prevLoading, table: false }));
            }
        };

        fetchData();

        return () => abortController.abort();
        // eslint-disable-next-line
    }, [filtros, pagination, reloadFlag]);

    return {
        filtros,
        datos,
        totalRecords,
        pagination,
        reloadData,
        setFiltros,
        setDatos,
        setTotalRecords,
        setPagination,
        onCustomPage,
    };
};

export default usePaginationData;
