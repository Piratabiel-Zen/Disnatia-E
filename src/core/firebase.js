import { initializeApp } from "firebase/app";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
const firebaseConfig={apiKey:"AIzaSyAnaJjwoJ6YgGrR5pIoPrTIj7PculaIfyA",authDomain:"dinastia-e-a4b28.firebaseapp.com",projectId:"dinastia-e-a4b28",storageBucket:"dinastia-e-a4b28.firebasestorage.app",messagingSenderId:"855332392669",appId:"1:855332392669:web:9fc06c8f633bb8cce89534"};
export const firebaseApp=initializeApp(firebaseConfig);export const db=getFirestore(firebaseApp);
enableMultiTabIndexedDbPersistence(db).catch(err=>{if(err?.code!=='failed-precondition'&&err?.code!=='unimplemented')console.warn('Persistência offline indisponível:',err)});
