// ==========================================
// إدارة مصادقة Firebase (واجهة تسجيل الدخول)
// ==========================================

import { initializeApp } from '../app/init.js';
import { getElement } from '../core/utils.js';
import { FirebaseHelper } from '../services/firebase-helper.js';
import { hideModal, showModal, showNotification } from '../ui/notifications.js';

export function showFirebaseAuthModal() {
    getElement("firebase-modal").style.display = "flex";
}

export function hideFirebaseAuthModal() {
    getElement("firebase-modal").style.display = "none";
}

export async function signInWithGoogle() {
    await FirebaseHelper.signInWithGoogle();
    hideFirebaseAuthModal();
}

export async function signInWithEmail() {
    showModal({
        title: "تسجيل الدخول بالبريد الإلكتروني",
        message: "أدخل بيانات حسابك للمتابعة",
        customHTML: `
            <input type="email" id="email-input" placeholder="البريد الإلكتروني" style="margin-bottom: 15px;">
            <div class="password-wrapper">
                <input type="password" id="password-input" placeholder="كلمة المرور">
                <i class="fas fa-eye password-toggle-icon" data-action="toggle-password" data-target="password-input"></i>
            </div>
        `,
        confirmText: "تسجيل الدخول",
        onConfirm: async () => {
            const email = getElement("email-input").value;
            const password = getElement("password-input").value;
            if (!email || !password) {
                return showNotification("الرجاء ملء جميع الحقول", "error");
            }
            // إخفاء النافذة العامة أولاً
            hideModal(); 
            // محاولة تسجيل الدخول
            await FirebaseHelper.signInWithEmail(email, password);
            // إغلاق نافذة السحابة الخلفية
            hideFirebaseAuthModal();
        }
    });
}

export async function signUpWithEmail() {
    showModal({
        title: "إنشاء حساب جديد",
        message: "يرجى تعيين كلمة مرور قوية (6 أحرف على الأقل)",
        customHTML: `
            <input type="email" id="new-email-input" placeholder="البريد الإلكتروني" style="margin-bottom: 15px;">
            <div class="password-wrapper">
                <input type="password" id="new-password-input" placeholder="كلمة المرور (6 أحرف على الأقل)">
                <i class="fas fa-eye password-toggle-icon" data-action="toggle-password" data-target="new-password-input"></i>
            </div>
        `,
        confirmText: "إنشاء حساب",
        onConfirm: async () => {
            const email = getElement("new-email-input").value;
            const password = getElement("new-password-input").value;
            if (!email || !password) {
                return showNotification("الرجاء ملء جميع الحقول", "error");
            }
            if (password.length < 6) {
                return showNotification("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error");
            }
            // إخفاء النافذة العامة أولاً
            hideModal();
            // محاولة إنشاء الحساب
            await FirebaseHelper.signUpWithEmail(email, password);
            // إغلاق نافذة السحابة الخلفية
            hideFirebaseAuthModal();
        }
    });
}

export async function skipLogin() {
    hideFirebaseAuthModal();
    showNotification("يتم الآن العمل محلياً بدون مزامنة سحابية", "info");
    getElement("main-app-content").classList.remove("app-hidden");
    initializeApp();
}

export async function signOut() {
    await FirebaseHelper.signOut();
}

// ==========================================
// دالة تأكيد الخروج
// ==========================================
export function confirmSignOut() {
    showModal({
        title: "تسجيل الخروج",
        message: "هل أنت متأكد أنك تريد تسجيل الخروج؟ سيتم إيقاف المزامنة السحابية.",
        confirmText: "نعم، خروج",
        onConfirm: async () => {
            hideModal();
            await FirebaseHelper.signOut();
        },
        cancelText: "تراجع"
    });
}
