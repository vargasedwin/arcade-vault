export type User = { name: string };

const USER_KEY = "av_user";

// Respaldo en memoria si localStorage no está disponible (modo privado, etc.).
let memoryUser: User | null = null;

export async function getSession(): Promise<User | null> {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.name === "string") return { name: parsed.name };
    }
    return null;
  } catch {
    return memoryUser;
  }
}

// user = null → invitado (sin sesión).
export async function signIn(user: User | null): Promise<void> {
  memoryUser = user;
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // La sesión vive solo en memoria.
  }
}

export async function signOut(): Promise<void> {
  memoryUser = null;
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // Nada que borrar.
  }
}
