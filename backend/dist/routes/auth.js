"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const token_1 = __importDefault(require("../models/token"));
const mercadoLibre_1 = require("../lib/mercadoLibre");
const router = (0, express_1.Router)();
router.get('/login', (req, res) => {
    try {
        res.json({ url: (0, mercadoLibre_1.buildMercadoLivreAuthUrl)() });
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Unable to create the Mercado Livre authorization URL.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        res.status(400).json({ error: 'Authorization code was not provided by Mercado Livre.' });
        return;
    }
    try {
        const token = await (0, mercadoLibre_1.exchangeAuthCode)(code);
        const redirectUrl = (0, mercadoLibre_1.buildFrontendRedirectUrl)('success');
        console.log(`Mercado Livre seller authenticated successfully. Seller ID: ${token.user_id}`);
        if (redirectUrl) {
            res.redirect(redirectUrl);
            return;
        }
        res.send('Seller authenticated successfully. You can return to the frontend.');
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Authentication with Mercado Livre failed.');
        const redirectUrl = (0, mercadoLibre_1.buildFrontendRedirectUrl)('error', httpError.message);
        console.error('Mercado Livre authentication error:', httpError.details ?? httpError.message);
        if (redirectUrl) {
            res.redirect(redirectUrl);
            return;
        }
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.get('/status', async (req, res) => {
    try {
        const token = await (0, mercadoLibre_1.getValidToken)();
        const seller = await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'GET',
            url: '/users/me',
        });
        res.json({
            authenticated: true,
            expires_at: token.expires_at,
            seller: {
                id: seller.id,
                nickname: seller.nickname,
                email: seller.email ?? '',
                user_type: seller.user_type ?? 'seller',
                points: seller.points ?? 0,
            },
        });
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Unable to load the seller session.');
        if (httpError.status === 401) {
            res.json({ authenticated: false });
            return;
        }
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.get('/me', async (req, res) => {
    try {
        const token = await (0, mercadoLibre_1.getValidToken)();
        const seller = await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'GET',
            url: '/users/me',
        });
        res.json({
            message: 'Seller data loaded successfully.',
            expires_at: token.expires_at,
            profile: {
                id: seller.id,
                nickname: seller.nickname,
                email: seller.email ?? '',
                user_type: seller.user_type ?? 'seller',
                points: seller.points ?? 0,
            },
        });
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Unable to load the seller profile.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.delete('/session', async (req, res) => {
    await token_1.default.deleteMany({});
    res.status(204).send();
});
exports.default = router;
