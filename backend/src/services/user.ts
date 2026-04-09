export type UserProvider = "email" | "google" | "facebook" | "unknown";

export interface UserSyncInput {
  email: string;
  name?: string;
  provider?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  provider: UserProvider;
  createdAt: string;
  updatedAt: string;
}

const usersByEmail = new Map<string, UserRecord>();

function normalizeProvider(provider?: string): UserProvider {
  if (provider === "email" || provider === "google" || provider === "facebook") {
    return provider;
  }
  return "unknown";
}

export async function getOrCreateUser(input: UserSyncInput): Promise<UserRecord> {
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const existing = usersByEmail.get(email);

  if (existing) {
    const updated: UserRecord = {
      ...existing,
      name: input.name?.trim() || existing.name,
      provider: normalizeProvider(input.provider),
      updatedAt: now,
    };
    usersByEmail.set(email, updated);
    return updated;
  }

  const created: UserRecord = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    email,
    name: input.name?.trim() || "Utilisateur",
    provider: normalizeProvider(input.provider),
    createdAt: now,
    updatedAt: now,
  };

  usersByEmail.set(email, created);
  return created;
}
