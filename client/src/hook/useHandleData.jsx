import { useReducer, useCallback } from "react";

const initialState = {
    datos: [],
    totalRecords: 0,
};

function cleanData(obj) {
    if (typeof obj === "object" && obj !== null) {
        for (let key in obj) {
            if (typeof obj[key] === "string") {
                obj[key] = obj[key].trim().replace(/\s+/g, " "); // Elimina espacios adicionales
            } else if (typeof obj[key] === "object") {
                cleanData(obj[key]); // Llamada recursiva para objetos anidados
            }
        }
    }
    return obj;
}

function reducer(state, action) {
    switch (action.type) {
        case "SET_INITIAL_STATE":
            return {
                ...state,
                datos: action.payload.datos,
                totalRecords: action.payload.totalRecords,
            };
        case "SET_DATA":
            return { ...state, datos: action.payload };
        case "SET_TOTAL_RECORDS":
            return { ...state, totalRecords: action.payload };
        case "ADD_ITEM":
            return {
                ...state,
                datos: [cleanData(action.payload), ...state.datos],
                totalRecords: state.totalRecords + 1,
            };
        case "UPDATE_ITEM":
            return {
                ...state,
                datos: state.datos.map((item) =>
                    String(item[action.payload.idField]) ===
                    String(action.payload[action.payload.idField])
                        ? cleanData(action.payload)
                        : item
                ),
            };
        case "DELETE_ITEM":
            return {
                ...state,
                datos: state.datos.filter(
                    (item) => String(item[action.payload.idField]) !== String(action.payload.id)
                ),
                totalRecords: state.totalRecords - 1,
            };
        default:
            return state;
    }
}

function useHandleData() {
    const [state, dispatch] = useReducer(reducer, initialState);

    const setInitialState = useCallback((datos, totalRecords) => {
        dispatch({ type: "SET_INITIAL_STATE", payload: { datos, totalRecords } });
    }, []);

    const setData = useCallback((datos) => {
        dispatch({ type: "SET_DATA", payload: datos });
    }, []);

    const setTotalRecords = useCallback((totalRecords) => {
        dispatch({ type: "SET_TOTAL_RECORDS", payload: totalRecords });
    }, []);

    const deleteItem = useCallback((item) => {
        dispatch({ type: "DELETE_ITEM", payload: item });
    }, []);

    const addItem = useCallback((item) => {
        dispatch({ type: "ADD_ITEM", payload: cleanData(item) });
    }, []);

    const updateItem = useCallback((item) => {
        dispatch({ type: "UPDATE_ITEM", payload: cleanData(item) });
    }, []);

    return {
        state,
        setInitialState,
        setData,
        setTotalRecords,
        deleteItem,
        addItem,
        updateItem,
    };
}

export default useHandleData;
