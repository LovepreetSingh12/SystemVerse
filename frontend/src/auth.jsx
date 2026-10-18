import React, { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, RecaptchaVerifier, signInWithPhoneNumber, signOut,
} from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const auth = Object.values(config).every(Boolean) ? getAuth(initializeApp(config)) : null;

export async function authHeaders(user) {
  if (auth?.currentUser !== user) throw Error("Please sign in again.");
  const token = await user.getIdToken();
  if (auth.currentUser !== user) throw Error("Your session changed.");
  return { Authorization: `Bearer ${token}` };
}
export const logout = () => signOut(auth);

const errors = {
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account already exists. Sign in or reset your password.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters).",
  "auth/password-does-not-meet-requirements": "Your password does not meet the account password policy.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/invalid-phone-number": "Use an international phone number, such as +919876543210.",
  "auth/invalid-verification-code": "That code is incorrect. Try again.",
  "auth/code-expired": "Your code expired. Request a new one.",
  "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
  "auth/popup-blocked": "Allow popups to sign in with Google.",
  "auth/network-request-failed": "Unable to connect. Check your internet connection.",
  "auth/operation-not-allowed": "This sign-in method has not been enabled by the site administrator.",
  "auth/unauthorized-domain": "This domain has not been authorized for sign-in.",
  "auth/quota-exceeded": "SMS is temporarily unavailable. Please use another sign-in method.",
  "auth/captcha-check-failed": "Verification failed. Please try again.",
  "auth/account-exists-with-different-credential": "Use the sign-in method you originally used for this email.",
};

export function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(auth));
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, value => { setUser(value); setLoading(false); });
  }, []);
  if (loading) return <main className="auth-shell" role="status">Loading your account…</main>;
  if (user) return children(user);
  return <Login />;
}

function Login() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const captcha = useRef(null);
  const captchaNode = useRef(null);
  useEffect(() => () => captcha.current?.clear(), []);
  const run = async action => {
    setBusy(true); setError(""); setMessage("");
    try { await action(); }
    catch (e) { setError(errors[e.code] || "Sign-in failed. Please try again or use another method."); }
    finally { setBusy(false); }
  };
  const switchMode = value => {
    setMode(value); setError(""); setMessage(""); setPassword("");
    setConfirmation(null); setCode("");
    captcha.current?.clear(); captcha.current = null;
  };
  const sendCode = async () => {
    captcha.current?.clear();
    captcha.current = new RecaptchaVerifier(auth, captchaNode.current, { size: "normal" });
    try {
      const result = await signInWithPhoneNumber(auth, phone, captcha.current);
      setConfirmation(result);
      setMessage("Code sent. Check your text messages.");
    } finally {
      captcha.current?.clear(); captcha.current = null;
    }
  };
  const submit = e => {
    e.preventDefault();
    run(async () => {
      if (mode === "phone") {
        if (confirmation) await confirmation.confirm(code);
        else await sendCode();
      } else if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setMessage("If an account exists for this email, you will receive a password reset link.");
      } else if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    });
  };
  return <main className="auth-shell"><section className="auth-card" aria-label="Sign in">
    <div className="overline">SYSTEMVERSE</div>
    <h1>Your learning, in one place.</h1>
    <p>Sign in to save your progress, notes, and Java solutions across devices.</p>
    {!auth ? <p role="status">Sign-in is not configured yet. The site administrator needs to connect Firebase Authentication.</p> : <>
      <button className="secondary" disabled={busy} onClick={() => run(() => signInWithPopup(auth, new GoogleAuthProvider()))}>Continue with Google</button>
      <div className="auth-tabs" aria-label="Sign-in method">
        <button disabled={busy} aria-pressed={mode !== "phone"} onClick={() => switchMode("signin")}>Email</button>
        <button disabled={busy} aria-pressed={mode === "phone"} onClick={() => switchMode("phone")}>Phone OTP</button>
      </div>
      <h2>{({ signin: "Sign in with email", signup: "Create your account", reset: "Reset your password", phone: "Sign in with your phone" })[mode]}</h2>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {mode === "phone" ? <>
            <label>Phone number<input type="tel" autoComplete="tel" required pattern="\+[1-9][0-9]{7,14}" placeholder="+919876543210" value={phone} disabled={Boolean(confirmation)} onChange={e => setPhone(e.target.value)} /></label>
            {confirmation && <label>Verification code<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} /></label>}
            <p className="auth-hint">By requesting a code, you agree to receive an SMS for sign-in. Your number is sent to Google for spam and abuse prevention. SMS rates may apply.</p>
          </> : <>
            <label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
            {mode !== "reset" && <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={mode === "signup" ? 8 : undefined} required value={password} onChange={e => setPassword(e.target.value)} /></label>}
          </>}
          <div ref={captchaNode} />
          <button className="primary" type="submit">{busy ? "Please wait…" : mode === "phone" ? confirmation ? "Verify and sign in" : "Send verification code" : mode === "signup" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</button>
        </fieldset>
      </form>
      {mode === "phone" && confirmation && <button disabled={busy} className="text-button" onClick={() => switchMode("phone")}>Change number or request a new code</button>}
      {mode !== "phone" && <div className="auth-links">
        <button disabled={busy} onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "Already have an account? Sign in" : "Create an account"}</button>
        <button disabled={busy} onClick={() => switchMode(mode === "reset" ? "signin" : "reset")}>{mode === "reset" ? "Back to sign in" : "Forgot password?"}</button>
      </div>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </>}
  </section></main>;
}
