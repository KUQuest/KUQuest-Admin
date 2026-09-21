"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";

import { adminApiProvider } from "../api/admin-provider";
import { ADMIN_SESSION_KEY } from "../admin-auth";
import { isAdminMockEnabled } from "../../../lib/auth/admin-auth-mode";
import { ADMIN_MOCK_SESSION_COOKIE } from "../../../lib/auth/admin-session-policy";
import { Button } from "../../../components/ui";

type AdminLanguage = "en" | "th";

const copy = {
  en: {
    language: "Language",
    languageOptions: "Language options",
    email: "University email",
    password: "Password",
    signIn: "Sign in",
    signInToAdmin: "Sign in to admin",
    accessCopy: "Use your Kasetsart University email to access.",
    emailHelp: "Only @ku.th accounts can access this console.",
    emailError: "Enter a valid Kasetsart University email ending in @ku.th.",
    passwordError: "Enter a password with at least 8 characters.",
    signInFailed: "Admin sign-in failed. Try again.",
    passwordPlaceholder: "Enter your password",
    brandAria: "KuQuest admin sign in",
    show: "Show",
    hide: "Hide",
  },
  th: {
    language: "ภาษา",
    languageOptions: "ตัวเลือกภาษา",
    email: "อีเมลมหาวิทยาลัย",
    password: "รหัสผ่าน",
    signIn: "เข้าสู่ระบบ",
    signInToAdmin: "เข้าสู่ระบบผู้ดูแล",
    accessCopy: "ใช้อีเมล Kasetsart University เพื่อเข้าถึงระบบ",
    emailHelp: "เฉพาะบัญชี @ku.th เท่านั้นที่เข้าถึงระบบนี้ได้",
    emailError: "ระบุอีเมลมหาวิทยาลัยเกษตรศาสตร์ที่ถูกต้องและลงท้ายด้วย @ku.th",
    passwordError: "ระบุรหัสผ่านอย่างน้อย 8 ตัวอักษร",
    signInFailed: "เข้าสู่ระบบ Admin ไม่สำเร็จ ลองอีกครั้ง",
    passwordPlaceholder: "ระบุรหัสผ่าน",
    brandAria: "เข้าสู่ระบบ Admin ของ KuQuest",
    show: "แสดง",
    hide: "ซ่อน",
  },
} as const;

function storedLanguage(): AdminLanguage {
  try {
    return localStorage.getItem("kuquest-admin-language") === "th" ? "th" : "en";
  } catch {
    return "en";
  }
}

export function AdminLoginPage() {
  const [language, setLanguage] = useState<AdminLanguage>("en");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const text = copy[language];

  useEffect(() => {
    const initialLanguage = storedLanguage();
    setLanguage(initialLanguage);
    document.documentElement.lang = initialLanguage;
    document.documentElement.dataset.language = initialLanguage;
    emailInputRef.current?.focus();
  }, []);

  const selectLanguage = useCallback((nextLanguage: AdminLanguage) => {
    setLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
    document.documentElement.dataset.language = nextLanguage;
    try {
      localStorage.setItem("kuquest-admin-language", nextLanguage);
    } catch {
      // Keep the selected language for this page when storage is unavailable.
    }
  }, []);

  const showEnglish = useCallback(() => selectLanguage("en"), [selectLanguage]);
  const showThai = useCallback(() => selectLanguage("th"), [selectLanguage]);
  const togglePasswordVisibility = useCallback(
    () => setPasswordVisible((visible) => !visible),
    [],
  );
  const changeEmail = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value),
    [],
  );
  const changePassword = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value),
    [],
  );

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const normalizedEmail = email.trim().toLowerCase();
    const nextEmailError = /^[^\s@]+@ku\.th$/i.test(normalizedEmail)
      ? ""
      : copy[language].emailError;
    const nextPasswordError = password.length >= 8
      ? ""
      : copy[language].passwordError;

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;

    if (isAdminMockEnabled()) {
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ email: normalizedEmail, signedInAt: new Date().toISOString() }),
      );
      document.cookie = `${ADMIN_MOCK_SESSION_COOKIE}=1; Path=/; SameSite=Lax`;
      window.location.assign("/overview");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await adminApiProvider.auth.signInEmail(normalizedEmail, password);
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ email: session.user.email, signedInAt: new Date().toISOString() }),
      );
      window.location.assign("/overview");
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : copy[language].signInFailed);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, language, password]);

  return (
    <main className="min-h-screen w-full bg-[#e7f1f7] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,var(--border)_32px)] px-5 py-12 max-[760px]:px-[18px] max-[760px]:py-9" aria-labelledby="login-title">
      <section className="mx-auto grid w-full max-w-[420px] content-center rounded-xl border border-admin-border bg-admin-surface p-8 shadow-admin-card max-[760px]:p-6">
        <Link className="inline-flex w-full flex-col items-center gap-1.5 text-center text-2xl font-bold leading-none text-admin-text no-underline" href="/login" aria-label={text.brandAria}>
          <Image className="block size-[90px] shrink-0 object-contain" src="/kuquest-logo.png?v=2" alt="" width={101} height={51} priority unoptimized />
          <span>KuQuest</span>
        </Link>
        <div className="mb-7 mt-10 max-[760px]:mt-8">
          <h1 className="m-0 text-[26px] leading-[1.25] tracking-[-.025em] text-admin-success" id="login-title">{text.signInToAdmin}</h1>
          <p className="mt-2 max-w-[38ch] text-admin-muted">{text.accessCopy}</p>
        </div>
        <form className="grid gap-2" noValidate onSubmit={submit}>
          <label className="text-sm font-semibold" htmlFor="admin-email">{text.email}</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@ku.th"
            aria-describedby="email-help email-error"
            aria-invalid={Boolean(emailError)}
            value={email}
            onChange={changeEmail}
            className="h-[42px] w-full rounded-lg border border-admin-border-strong bg-admin-surface px-3 text-admin-text outline-none focus:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-accent/20"
            required
            ref={emailInputRef}
          />
          <p className="-mt-0.5 mb-2.5 block text-sm text-admin-muted" id="email-help">{text.emailHelp}</p>
          <p className="-mt-px mb-1.5 text-sm font-semibold text-admin-danger" id="email-error" role="alert" hidden={!emailError}>{emailError}</p>
          <div className="mt-1 flex items-center justify-between">
            <label className="text-sm font-semibold" htmlFor="admin-password">{text.password}</label>
            <button
              type="button"
              className="min-h-0 border-0 bg-transparent p-0 text-sm font-semibold text-admin-accent hover:text-admin-accent-strong hover:underline hover:underline-offset-4"
              aria-controls="admin-password"
              onClick={togglePasswordVisibility}
            >
              {passwordVisible ? text.hide : text.show}
            </button>
          </div>
          <input
            id="admin-password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            placeholder={text.passwordPlaceholder}
            aria-describedby="password-error"
            aria-invalid={Boolean(passwordError)}
            value={password}
            onChange={changePassword}
            className="h-[42px] w-full rounded-lg border border-admin-border-strong bg-admin-surface px-3 text-admin-text outline-none focus:border-admin-accent focus-visible:ring-2 focus-visible:ring-admin-accent/20"
            required
          />
          <p className="-mt-px mb-1.5 text-sm font-semibold text-admin-danger" id="password-error" role="alert" hidden={!passwordError}>{passwordError}</p>
          <p className="-mt-px mb-1.5 text-sm font-semibold text-admin-danger" id="login-form-error" role="alert" hidden={!formError}>{formError}</p>
          <Button variant="primary" className="mt-3 min-h-[42px] w-full" type="submit" disabled={isSubmitting}>{text.signIn}</Button>
        </form>
        <div className="mt-6 border-t border-admin-border pt-4">
          <fieldset className="m-0 grid min-w-0 gap-1 border-0 p-0" aria-label={text.languageOptions}>
            <legend className="mb-1.5 block text-xs font-bold uppercase tracking-[0.07em] text-admin-muted">{text.language}</legend>
            <div className="grid grid-cols-2 gap-1">
            <Button
              variant="outline"
              size="sm"
              className="min-h-9 bg-admin-soft px-2 py-1.5 text-xs text-admin-muted aria-pressed:border-admin-accent aria-pressed:bg-admin-accent-soft aria-pressed:text-admin-accent"
              type="button"
              aria-pressed={language === "en"}
              onClick={showEnglish}
            >English</Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-9 bg-admin-soft px-2 py-1.5 text-xs text-admin-muted aria-pressed:border-admin-accent aria-pressed:bg-admin-accent-soft aria-pressed:text-admin-accent"
              type="button"
              aria-pressed={language === "th"}
              onClick={showThai}
            >ไทย</Button>
            </div>
          </fieldset>
        </div>
      </section>
    </main>
  );
}
