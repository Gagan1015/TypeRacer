import { randomUUID } from "node:crypto";
import { env } from "../../config/env.js";
import { UserModel } from "../../db/models/user.model.js";
import { ProfileModel } from "../../db/models/profile.model.js";
import { HttpError } from "../../utils/http-error.js";
import { signAccessToken, signRefreshToken } from "../../utils/jwt.js";

// ───────────────────────────── Types ──────────────────────────────

type OAuthProvider = "google" | "github";

type OAuthProfile = {
    provider: OAuthProvider;
    providerId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
};

type OAuthResult = {
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
};

// ─────────────────────── Helpers ──────────────────────────────────

function parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const amountPart = match[1];
    const unitPart = match[2];
    if (!amountPart || !unitPart) return 7 * 24 * 60 * 60 * 1000;
    const amount = Number(amountPart);
    const multiplier =
        unitPart === "s"
            ? 1000
            : unitPart === "m"
                ? 60 * 1000
                : unitPart === "h"
                    ? 60 * 60 * 1000
                    : 24 * 60 * 60 * 1000;
    return amount * multiplier;
}

function sessionExpiresAt(): Date {
    const ttl = parseDurationMs(env.REFRESH_TOKEN_TTL);
    return new Date(Date.now() + ttl);
}

function requireOAuthConfig(provider: OAuthProvider): void {
    if (provider === "google") {
        if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
            throw new HttpError(501, "OAUTH_NOT_CONFIGURED", "Google OAuth is not configured");
        }
    } else {
        if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
            throw new HttpError(501, "OAUTH_NOT_CONFIGURED", "GitHub OAuth is not configured");
        }
    }
}

/** Generate a username from an email by stripping the domain and appending random suffix */
function generateUsername(email: string, name?: string): string {
    const base = (name ?? email.split("@")[0] ?? "user")
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 16);
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base || "user"}_${suffix}`;
}

// ─────────────────── Google OAuth ────────────────────────────────

export function getGoogleAuthUrl(): string {
    requireOAuthConfig("google");
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "consent"
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function handleGoogleCallback(code: string): Promise<OAuthResult> {
    requireOAuthConfig("google");

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env.GOOGLE_CALLBACK_URL,
            grant_type: "authorization_code"
        })
    });

    if (!tokenRes.ok) {
        const body = await tokenRes.text();
        console.error("[OAuth/Google] token exchange failed:", body);
        throw new HttpError(401, "OAUTH_FAILED", "Google authentication failed");
    }

    const tokens = (await tokenRes.json()) as { access_token: string; id_token?: string };

    // Fetch user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!profileRes.ok) {
        throw new HttpError(401, "OAUTH_FAILED", "Failed to fetch Google profile");
    }

    const gProfile = (await profileRes.json()) as {
        id: string;
        email: string;
        name?: string;
        picture?: string;
    };

    return upsertOAuthUser({
        provider: "google",
        providerId: gProfile.id,
        email: gProfile.email,
        name: gProfile.name ?? gProfile.email.split("@")[0] ?? "Google User",
        avatarUrl: gProfile.picture ?? null
    });
}

// ─────────────────── GitHub OAuth ────────────────────────────────

export function getGithubAuthUrl(): string {
    requireOAuthConfig("github");
    const params = new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID!,
        redirect_uri: env.GITHUB_CALLBACK_URL,
        scope: "read:user user:email"
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function handleGithubCallback(code: string): Promise<OAuthResult> {
    requireOAuthConfig("github");

    // Exchange code for token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: env.GITHUB_CALLBACK_URL
        })
    });

    if (!tokenRes.ok) {
        throw new HttpError(401, "OAUTH_FAILED", "GitHub authentication failed");
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
        console.error("[OAuth/GitHub] token error:", tokenData.error);
        throw new HttpError(401, "OAUTH_FAILED", "GitHub authentication failed");
    }

    // Fetch user profile
    const profileRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!profileRes.ok) {
        throw new HttpError(401, "OAUTH_FAILED", "Failed to fetch GitHub profile");
    }

    const ghUser = (await profileRes.json()) as {
        id: number;
        login: string;
        name?: string;
        avatar_url?: string;
        email?: string;
    };

    // If email is not public, fetch from /user/emails
    let email = ghUser.email;
    if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        if (emailsRes.ok) {
            const emails = (await emailsRes.json()) as Array<{
                email: string;
                primary: boolean;
                verified: boolean;
            }>;
            const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
            email = primary?.email;
        }
    }

    if (!email) {
        throw new HttpError(401, "OAUTH_FAILED", "Could not retrieve email from GitHub. Make sure your GitHub email is verified.");
    }

    return upsertOAuthUser({
        provider: "github",
        providerId: String(ghUser.id),
        email,
        name: ghUser.name ?? ghUser.login,
        avatarUrl: ghUser.avatar_url ?? null
    });
}

// ──────────── Shared upsert / account-linking logic ─────────────

async function upsertOAuthUser(profile: OAuthProfile): Promise<OAuthResult> {
    // 1. Check if user already exists by (provider, providerId)
    let user = await UserModel.findOne({
        provider: profile.provider,
        providerId: profile.providerId
    });

    let isNewUser = false;

    if (!user) {
        // 2. Check if user exists by email (account linking)
        const existingByEmail = await UserModel.findOne({ email: profile.email });

        if (existingByEmail) {
            // Link this OAuth provider to the existing account
            existingByEmail.provider = profile.provider;
            existingByEmail.providerId = profile.providerId;
            if (!existingByEmail.avatarUrl && profile.avatarUrl) {
                existingByEmail.avatarUrl = profile.avatarUrl;
            }
            await existingByEmail.save();
            user = existingByEmail;
        } else {
            // 3. Create brand-new user
            const username = await findAvailableUsername(profile.email, profile.name);
            user = await UserModel.create({
                email: profile.email,
                username,
                passwordHash: null,
                provider: profile.provider,
                providerId: profile.providerId,
                avatarUrl: profile.avatarUrl,
                role: "user",
                sessions: []
            });

            await ProfileModel.create({
                userId: user._id,
                displayName: profile.name,
                bio: "",
                avatarUrl: profile.avatarUrl ?? "",
                keyboardLayout: "qwerty"
            });

            isNewUser = true;
        }
    } else {
        // Update avatar if changed
        if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
            user.avatarUrl = profile.avatarUrl;
            await user.save();
        }
    }

    if (user.isBanned) {
        throw new HttpError(403, "ACCOUNT_BANNED", "Account is banned");
    }

    // Create session
    const sid = randomUUID();
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString(), sid });

    await UserModel.updateOne(
        { _id: user._id },
        { $push: { sessions: { sid, expiresAt: sessionExpiresAt() } } }
    );

    return { accessToken, refreshToken, isNewUser };
}

async function findAvailableUsername(email: string, name?: string): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const candidate = generateUsername(email, name);
        const taken = await UserModel.findOne({ username: candidate });
        if (!taken) return candidate;
    }
    // Fallback with UUID
    return `user_${randomUUID().slice(0, 8)}`;
}
