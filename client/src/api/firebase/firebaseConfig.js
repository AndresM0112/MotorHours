import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Configuración de tu proyecto de Firebase
const firebaseConfig = {
    apiKey: process.env.REACT_APP_API_KEY,
    databaseURL: process.env.REACT_APP_DATABASE_URL,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_TU_PROJECT_ID,
    storageBucket: process.env.REACT_APP_TU_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_TU_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_TU_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Obtener referencia al almacenamiento
const storage = getStorage(app);

export { storage };
