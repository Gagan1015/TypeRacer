import { Router, type Router as RouterType, type Request, type Response } from "express";
import { env } from "../../config/env.js";
import {
    getGoogleAuthUrl,
    handleGoogleCallback,
    getGithubAuthUrl,
    handleGithubCallback
} from "./oauth.service.js";

export const oauthRouter: RouterType = Router();

// ── Cookie helper (same logic as auth.controller) ─────────────

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const common = {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/"
    };
    res.cookie("accessToken", accessToken, { ...common, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

// ── Google ─────────────────────────────────────────────────────

oauthRouter.get("/google", (_req: Request, res: Response) => {
    try {
        const url = getGoogleAuthUrl();
        res.redirect(url);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "OAuth not configured";
        res.status(501).json({ success: false, error: { code: "OAUTH_NOT_CONFIGURED", message: msg } });
    }
});

oauthRouter.get("/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    if (!code) {
        return res.redirect(`${env.OAUTH_FRONTEND_URL}/login?error=oauth_denied`);
    }

    try {
        const result = await handleGoogleCallback(code);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        const redirectUrl = result.isNewUser
            ? `${env.OAUTH_FRONTEND_URL}/auth/callback?new=1`
            : `${env.OAUTH_FRONTEND_URL}/auth/callback`;
        return res.redirect(redirectUrl);
    } catch (err: unknown) {
        console.error("[OAuth/Google] callback error:", err);
        const msg = err instanceof Error ? encodeURIComponent(err.message) : "oauth_failed";
        return res.redirect(`${env.OAUTH_FRONTEND_URL}/login?error=${msg}`);
    }
});

// ── GitHub ─────────────────────────────────────────────────────

oauthRouter.get("/github", (_req: Request, res: Response) => {
    try {
        const url = getGithubAuthUrl();
        res.redirect(url);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "OAuth not configured";
        res.status(501).json({ success: false, error: { code: "OAUTH_NOT_CONFIGURED", message: msg } });
    }
});

oauthRouter.get("/github/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    if (!code) {
        return res.redirect(`${env.OAUTH_FRONTEND_URL}/login?error=oauth_denied`);
    }

    try {
        const result = await handleGithubCallback(code);
        setAuthCookies(res, result.accessToken, result.refreshToken);
        const redirectUrl = result.isNewUser
            ? `${env.OAUTH_FRONTEND_URL}/auth/callback?new=1`
            : `${env.OAUTH_FRONTEND_URL}/auth/callback`;
        return res.redirect(redirectUrl);
    } catch (err: unknown) {
        console.error("[OAuth/GitHub] callback error:", err);
        const msg = err instanceof Error ? encodeURIComponent(err.message) : "oauth_failed";
        return res.redirect(`${env.OAUTH_FRONTEND_URL}/login?error=${msg}`);
    }
});
