import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export const registerEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const loginEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const loginGoogle = () => signInWithPopup(auth, googleProvider);

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

export const logout = () => signOut(auth);

// แปลง error ของ Firebase เป็นข้อความไทย
export function authErrorMessage(code: string) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    case "auth/email-already-in-use":
      return "อีเมลนี้ถูกใช้สมัครแล้ว";
    case "auth/weak-password":
      return "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร";
    case "auth/invalid-email":
      return "รูปแบบอีเมลไม่ถูกต้อง";
    case "auth/popup-closed-by-user":
      return "ปิดหน้าต่างล็อกอินก่อนเสร็จ";
    case "auth/too-many-requests":
      return "ลองหลายครั้งเกินไป กรุณารอสักครู่";
    default:
      return "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
  }
}