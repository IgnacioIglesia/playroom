import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyACf2R-YML-VIa5zF-bX-FVjhDOocnErd4",
  authDomain: "playhub-3dfe7.firebaseapp.com",
  projectId: "playhub-3dfe7",
  storageBucket: "playhub-3dfe7.firebasestorage.app",
  messagingSenderId: "779394189297",
  appId: "1:779394189297:web:daa3be34ceb937834ce650"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)