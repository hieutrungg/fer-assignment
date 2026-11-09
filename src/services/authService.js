import { get, list, requireRule } from "./api";

const sessionKey = "wordquest.session";

export function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(sessionKey));
    if (session?.role === "teacher" && typeof session.id === "string") return session;
    if (session?.role === "learner" && typeof session.id === "string" &&
        typeof session.learnerId === "string") return session;
  } catch {
    // A corrupt demo session can be replaced at the next sign-in.
  }
  return null;
}

export async function signIn(email, password) {
  const accounts = await list("accounts");
  const account = accounts.find((item) =>
    item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password
  );
  requireRule(account, "Email hoặc mật khẩu không đúng.");
  const { id, role, learnerId, displayName } = account;
  const session = role === "learner"
    ? { id, role, learnerId, displayName: (await get("learners", learnerId)).displayName }
    : { id, role, displayName };
  localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

export function signOut() {
  localStorage.removeItem(sessionKey);
}
