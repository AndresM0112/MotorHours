export const config = {
    home: {
        homepage: {
            viewAll: null,
            onlyRead: null,
            create: null,
            edit: null,
            delete: null,
            manage: 25,
        },

        tickets: {
            create: 32,
            edit: 33,
            delete: 34,
            void: 35, // anular ticket
            reopen: 36,
            viewAll: 37,
            voidAll: 38,
            reopenAll: 39,
            autoAssign: 40,
            SoticketSolver:96, //Solucionador de tickets
            ticketSupervisor: 97, //supervisor de tickets
            
        },
    },
    management: {
        activitySession: {
            viewAll: null,
            onlyRead: null,
            create: 12, // Crear sesion actividad
            edit: 13, // Modificar sesion actividad
            delete: 14, // Eliminar sesion actividad
        },
        schedules: {
            viewAll: null,
            onlyRead: null,
            create: 15, // Crear horarios
            edit: 16, // Modificar horarios
            delete: 17, // Eliminar horarios
        },
        reasons: {
            viewAll: null,
            onlyRead: null,
            create: 18, // Crear Motivo
            edit: 19, // Modificar Motivo
            delete: 20, // Eliminar Motivo
        },
        areas: {
            viewAll: null,
            onlyRead: null,
            create: 26, // Crear area
            edit: 27, // Modificar area
            delete: 28, // Eliminar area
        },
        projects: {
            viewAll: null,
            onlyRead: null,
            create: 29, // Crear proyecto
            edit: 31, // Modificar proyecto
            delete: 30, // Eliminar proyecto
        },
        newness: {
            viewAll: null,
            onlyRead: null,
            create: 22, // Crear Motivo
            edit: 23, // Modificar Motivo
            delete: 24, // Eliminar Motivo
        },
    },
    managementRefunds: {
        refundableTypes: {
            viewAll: null,
            onlyRead: null,
            create: 42,
            edit: 43,
            delete: 44,
        },
        payrollNature: {
            viewAll: null,
            onlyRead: null,
            create: 45,
            edit: 46,
            delete: 47,
        },
        payrollConceptType: {
            viewAll: null,
            onlyRead: null,
            create: 48,
            edit: 49,
            delete: 50,
        },
        payrollConcept: {
            viewAll: null,
            onlyRead: null,
            create: 51,
            edit: 52,
            delete: 53,
        },
        insureTypes: {
            viewAll: null,
            onlyRead: null,
            create: 54,
            edit: 55,
            delete: 56,
        },
        insure: {
            viewAll: null,
            onlyRead: null,
            create: 57,
            edit: 58,
            delete: 59,
        },
        centerCost: {
            viewAll: null,
            onlyRead: null,
            create: 63,
            edit: 64,
            delete: 65,
        },
        position: {
            viewAll: null,
            onlyRead: null,
            create: 66,
            edit: 67,
            delete: 68,
        },
        management: {
            viewAll: null,
            onlyRead: null,
            create: 69,
            edit: 70,
            delete: 71,
        },
    },
    security: {
        profiles: {
            viewAll: null,
            onlyRead: null,
            create: 1, // Crear Perfil
            assignPermission: 3, // Asignar Permisos Perfil
            edit: 2, // Modificar Perfil
            delete: 4, // Eliminar Perfil
        },
        users: {
            viewAll: null,
            onlyRead: null,
            create: 5, // Crear Usuario
            assignPermission: 8, // Asignar Permisos Usuario
            edit: 6, // Modificar Usuario
            delete: 7, // Eliminar Usuario
        },
        clients: {
            viewAll: null,
            onlyRead: null,
            create: 60, // Crear Usuario
            assignPermission: null, // Asignar Permisos Usuario
            edit: 61, // Modificar Usuario
            delete: 62, // Eliminar Usuario
        },
        employees: {
            viewAll: null,
            onlyRead: null,
            create: 72, // Crear Usuario
            assignPermission: null, // Asignar Permisos Usuario
            edit: 73, // Modificar Usuario
            delete: 74, // Eliminar Usuario
        },
    },
};
