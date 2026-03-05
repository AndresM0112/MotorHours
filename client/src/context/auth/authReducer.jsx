export const authReducer = (state, action) => {
    switch (action.type) {
        case "login":
            return {
                ...state,
                autentificado: action.payload.autentificado,
                usuFoto: action.payload.usuFoto,
                idusuario: action.payload.usuId,
                nombreusuario: action.payload.nombre,
                correo: action.payload.correo,
                documento: action.payload.documento,
                telefono: action.payload.telefono,
                perfil: action.payload.perfil,
                agenda: action.payload.agenda,
                instructor: action.payload.instructor,
                permisos: action.payload.permisos,
                cambioclave: action.payload.cambioclave,
            };

        case "logout":
            return {
                ...state,
                autentificado: false,
                usuFoto: null,
                idusuario: null,
                nombreusuario: null,
                perfil: null,
                agenda: null,
                instructor: null,
                permisos: [],
            };

        case "setPermisos":
            return {
                ...state,
                permisos: action.payload,
            };

        case "setVentanas":
            return {
                ...state,
                ventanas: action.payload,
            };
        case "setStores":
            return { ...state, stores: action.payload };
        case "setSelectedStore":
            return { ...state, selectedStore: action.payload };

        default:
            return state;
    }
};
