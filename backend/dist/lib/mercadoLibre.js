"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFrontendRedirectUrl = exports.decodeFrontendState = exports.encodeFrontendState = exports.buildMercadoLivreAuthUrlWithState = exports.buildMercadoLivreAuthUrl = exports.mercadoLivreRequest = exports.getValidToken = exports.refreshAccessToken = exports.exchangeAuthCode = exports.toHttpError = exports.HttpError = void 0;
const axios_1 = __importDefault(require("axios"));
const token_1 = __importDefault(require("../models/token"));
const ML_API_BASE_URL = 'https://api.mercadolibre.com';
const TOKEN_REFRESH_THRESHOLD_MS = 60_000;
class HttpError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.details = details;
    }
}
exports.HttpError = HttpError;
const requireEnv = (key) => {
    const value = process.env[key];
    if (!value) {
        throw new HttpError(500, `Missing required environment variable: ${key}`);
    }
    return value;
};
const buildTokenExpiry = (expiresIn) => {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
    return expiresAt;
};
const extractErrorMessage = (details) => {
    if (!details) {
        return undefined;
    }
    if (typeof details === 'string') {
        return details;
    }
    if (typeof details === 'object') {
        const maybeDetails = details;
        if (typeof maybeDetails.message === 'string' && maybeDetails.message.trim()) {
            return maybeDetails.message;
        }
        if (typeof maybeDetails.error === 'string' && maybeDetails.error.trim()) {
            return maybeDetails.error;
        }
        if (Array.isArray(maybeDetails.cause) && maybeDetails.cause.length > 0) {
            const firstCause = maybeDetails.cause[0];
            if (typeof firstCause?.message === 'string' && firstCause.message.trim()) {
                return firstCause.message;
            }
        }
    }
    return undefined;
};
const toHttpError = (error, fallbackMessage = 'Unexpected error while communicating with Mercado Livre.') => {
    if (error instanceof HttpError) {
        return error;
    }
    if (axios_1.default.isAxiosError(error)) {
        const status = error.response?.status ?? 500;
        const details = error.response?.data ?? error.message;
        const message = extractErrorMessage(details) ?? fallbackMessage;
        return new HttpError(status, message, details);
    }
    if (error instanceof Error) {
        return new HttpError(500, error.message);
    }
    return new HttpError(500, fallbackMessage);
};
exports.toHttpError = toHttpError;
const getStoredToken = async () => {
    const token = await token_1.default.findOne().sort({ updatedAt: -1 });
    if (!token) {
        throw new HttpError(401, 'Authenticate a seller account before using Mercado Livre features.');
    }
    return token;
};
const shouldRefreshToken = (token) => {
    return token.expires_at.getTime() - Date.now() <= TOKEN_REFRESH_THRESHOLD_MS;
};
const persistToken = async (payload) => {
    const userId = String(payload.user_id);
    const expiresAt = buildTokenExpiry(payload.expires_in);
    const token = await token_1.default.findOneAndUpdate({ user_id: userId }, {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_at: expiresAt,
        user_id: userId,
    }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
    });
    if (!token) {
        throw new HttpError(500, 'Unable to persist Mercado Livre token.');
    }
    return token;
};
const exchangeAuthCode = async (code) => {
    try {
        const payload = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: requireEnv('ML_APP_ID'),
            client_secret: requireEnv('ML_SECRET_KEY'),
            code,
            redirect_uri: requireEnv('ML_REDIRECT_URI'),
        });
        const response = await axios_1.default.post(`${ML_API_BASE_URL}/oauth/token`, payload.toString(), {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return persistToken(response.data);
    }
    catch (error) {
        throw (0, exports.toHttpError)(error, 'Unable to exchange the authorization code.');
    }
};
exports.exchangeAuthCode = exchangeAuthCode;
const refreshAccessToken = async (token) => {
    try {
        const payload = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: requireEnv('ML_APP_ID'),
            client_secret: requireEnv('ML_SECRET_KEY'),
            refresh_token: token.refresh_token,
        });
        const response = await axios_1.default.post(`${ML_API_BASE_URL}/oauth/token`, payload.toString(), {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        return persistToken(response.data);
    }
    catch (error) {
        throw (0, exports.toHttpError)(error, 'Unable to refresh the seller session.');
    }
};
exports.refreshAccessToken = refreshAccessToken;
const getValidToken = async () => {
    const token = await getStoredToken();
    if (!shouldRefreshToken(token)) {
        return token;
    }
    return (0, exports.refreshAccessToken)(token);
};
exports.getValidToken = getValidToken;
const mercadoLivreRequest = async (config) => {
    const token = await (0, exports.getValidToken)();
    try {
        const response = await axios_1.default.request({
            ...config,
            baseURL: ML_API_BASE_URL,
            headers: {
                Accept: 'application/json',
                ...config.headers,
                Authorization: `Bearer ${token.access_token}`,
            },
        });
        return response.data;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error) && error.response?.status === 401) {
            const refreshedToken = await (0, exports.refreshAccessToken)(token);
            const retriedResponse = await axios_1.default.request({
                ...config,
                baseURL: ML_API_BASE_URL,
                headers: {
                    Accept: 'application/json',
                    ...config.headers,
                    Authorization: `Bearer ${refreshedToken.access_token}`,
                },
            });
            return retriedResponse.data;
        }
        throw (0, exports.toHttpError)(error);
    }
};
exports.mercadoLivreRequest = mercadoLivreRequest;
const buildMercadoLivreAuthUrl = () => {
    const redirectUri = encodeURIComponent(requireEnv('ML_REDIRECT_URI'));
    const appId = requireEnv('ML_APP_ID');
    return `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${redirectUri}`;
};
exports.buildMercadoLivreAuthUrl = buildMercadoLivreAuthUrl;
const buildMercadoLivreAuthUrlWithState = (state) => {
    const baseUrl = (0, exports.buildMercadoLivreAuthUrl)();
    if (!state) {
        return baseUrl;
    }
    return `${baseUrl}&state=${encodeURIComponent(state)}`;
};
exports.buildMercadoLivreAuthUrlWithState = buildMercadoLivreAuthUrlWithState;
const encodeFrontendState = (frontendUrl) => {
    return Buffer.from(JSON.stringify({ frontendUrl }), 'utf-8').toString('base64url');
};
exports.encodeFrontendState = encodeFrontendState;
const decodeFrontendState = (state) => {
    if (!state) {
        return null;
    }
    try {
        const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'));
        if (typeof parsedState.frontendUrl === 'string' && parsedState.frontendUrl.trim()) {
            return parsedState.frontendUrl.trim();
        }
    }
    catch {
        return null;
    }
    return null;
};
exports.decodeFrontendState = decodeFrontendState;
const buildFrontendRedirectUrl = (status, message, frontendUrlOverride) => {
    const frontendUrl = frontendUrlOverride || process.env.FRONTEND_URL || 'http://localhost:5173';
    if (!frontendUrl) {
        return null;
    }
    try {
        const redirectUrl = new URL(frontendUrl);
        redirectUrl.searchParams.set('auth', status);
        if (message) {
            redirectUrl.searchParams.set('message', message);
        }
        return redirectUrl.toString();
    }
    catch {
        return null;
    }
};
exports.buildFrontendRedirectUrl = buildFrontendRedirectUrl;
