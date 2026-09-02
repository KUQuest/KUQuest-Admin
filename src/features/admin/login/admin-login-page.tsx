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

import { adminApi } from "../api/admin-api";
import { isAdminApiEnabled } from "../api/admin-provider";
import { ADMIN_SESSION_KEY } from "../legacy/auth";

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
    document.body.classList.add("login-page");
    const initialLanguage = storedLanguage();
    setLanguage(initialLanguage);
    document.documentElement.lang = initialLanguage;
    document.documentElement.dataset.language = initialLanguage;
    emailInputRef.current?.focus();
    return () => document.body.classList.remove("login-page");
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
      : "Enter a valid Kasetsart University email ending in @ku.th.";
    const nextPasswordError = password.length >= 8
      ? ""
      : "Enter a password with at least 8 characters.";

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;

    if (!isAdminApiEnabled()) {
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ email: normalizedEmail, signedInAt: new Date().toISOString() }),
      );
      window.location.assign("/");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await adminApi.signInEmail(normalizedEmail, password);
      localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ email: session.user.email, signedInAt: new Date().toISOString() }),
      );
      window.location.assign("/");
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "Admin sign-in failed. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password]);

  return (
    <main className="login-shell" aria-labelledby="login-title">
      <section className="login-panel">
        <Link className="login-brand" href="/login" aria-label="KuQuest admin sign in">
          <Image src="/kuquest-logo.png?v=2" alt="" width={101} height={51} priority unoptimized />
          <span>KuQuest</span>
        </Link>
        <div className="login-copy">
          <h1 id="login-title">{text.signInToAdmin}</h1>
          <p>{text.accessCopy}</p>
        </div>
        <form noValidate onSubmit={submit}>
          <label htmlFor="admin-email">{text.email}</label>
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
            required
            ref={emailInputRef}
          />
          <p className="field-help" id="email-help">{text.emailHelp}</p>
          <p className="login-error" id="email-error" role="alert" hidden={!emailError}>{emailError}</p>
          <div className="password-label">
            <label htmlFor="admin-password">{text.password}</label>
            <button
              type="button"
              className="text-button"
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
            placeholder="Enter your password"
            aria-describedby="password-error"
            aria-invalid={Boolean(passwordError)}
            value={password}
            onChange={changePassword}
            required
          />
          <p className="login-error" id="password-error" role="alert" hidden={!passwordError}>{passwordError}</p>
          <p className="login-error" id="login-form-error" role="alert" hidden={!formError}>{formError}</p>
          <button className="btn primary login-submit" type="submit" disabled={isSubmitting}>{text.signIn}</button>
        </form>
        <div className="language-control login-language">
          <fieldset className="login-language-options" aria-label={text.languageOptions}>
            <legend className="language-control-label">{text.language}</legend>
            <div className="language-options">
            <button
              className="language-option"
              type="button"
              aria-pressed={language === "en"}
              onClick={showEnglish}
            >
              English
            </button>
            <button
              className="language-option"
              type="button"
              aria-pressed={language === "th"}
              onClick={showThai}
            >
              ไทย
            </button>
            </div>
          </fieldset>
        </div>
      </section>
    </main>
  );
}
