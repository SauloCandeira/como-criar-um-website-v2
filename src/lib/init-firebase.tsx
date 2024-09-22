// src/lib/init-firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCrDK_6XXOwHAkoqmyGS278jAY6krq0JJM",
    authDomain: "counter-9d5a3.firebaseapp.com",
    projectId: "counter-9d5a3",
    storageBucket: "counter-9d5a3.appspot.com",
    messagingSenderId: "155109266468",
    appId: "1:155109266468:web:d0311261320237fc7f74b1",
    measurementId: "G-H8LLDYRMJ5"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Inicializar a autenticação
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Exportar auth e provider
export { auth, provider };
