"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Ad_1 = __importDefault(require("../models/Ad"));
const mercadoLibre_1 = require("../lib/mercadoLibre");
const router = (0, express_1.Router)();
const parseText = (value, fieldName) => {
    if (typeof value !== 'string' || !value.trim()) {
        throw new mercadoLibre_1.HttpError(400, `Field "${fieldName}" is required.`);
    }
    return value.trim();
};
const parseNumber = (value, fieldName, allowZero = false) => {
    const parsedValue = typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
            ? Number(value)
            : Number.NaN;
    if (!Number.isFinite(parsedValue) || (!allowZero && parsedValue <= 0) || (allowZero && parsedValue < 0)) {
        throw new mercadoLibre_1.HttpError(400, `Field "${fieldName}" must be a valid number.`);
    }
    return parsedValue;
};
const parseInteger = (value, fieldName, allowZero = false) => {
    const parsedValue = parseNumber(value, fieldName, allowZero);
    if (!Number.isInteger(parsedValue)) {
        throw new mercadoLibre_1.HttpError(400, `Field "${fieldName}" must be an integer.`);
    }
    return parsedValue;
};
const toPictureArray = (value) => {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const pictures = value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
        .map((source) => ({ source }));
    return pictures.length > 0 ? pictures : undefined;
};
const normalizeAttributesInput = (value) => {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const attributes = value
        .map((item) => {
        if (!item || typeof item !== 'object') {
            return null;
        }
        const candidate = item;
        if (typeof candidate.id !== 'string' || !candidate.id.trim()) {
            return null;
        }
        const normalized = {
            id: candidate.id.trim(),
        };
        if (typeof candidate.value_id === 'string' && candidate.value_id.trim()) {
            normalized.value_id = candidate.value_id.trim();
        }
        if (typeof candidate.value_name === 'string' && candidate.value_name.trim()) {
            normalized.value_name = candidate.value_name.trim();
        }
        if (candidate.value_struct && typeof candidate.value_struct === 'object') {
            const parsedNumber = parseNumber(candidate.value_struct.number, `${candidate.id}.value_struct.number`, true);
            const unit = typeof candidate.value_struct.unit === 'string' && candidate.value_struct.unit.trim()
                ? candidate.value_struct.unit.trim()
                : '';
            if (!unit) {
                throw new mercadoLibre_1.HttpError(400, `Field "${candidate.id}.value_struct.unit" is required.`);
            }
            normalized.value_struct = {
                number: parsedNumber,
                unit,
            };
        }
        if (normalized.value_id === undefined &&
            normalized.value_name === undefined &&
            normalized.value_struct === undefined) {
            return null;
        }
        return normalized;
    })
        .filter(Boolean);
    return attributes.length > 0 ? attributes : undefined;
};
const buildPublicationPayload = (body) => {
    return {
        title: parseText(body.title, 'title'),
        category_id: parseText(body.category_id, 'category_id'),
        price: parseNumber(body.price, 'price'),
        currency_id: typeof body.currency_id === 'string' && body.currency_id.trim() ? body.currency_id.trim() : 'BRL',
        available_quantity: parseInteger(body.available_quantity, 'available_quantity'),
        buying_mode: typeof body.buying_mode === 'string' && body.buying_mode.trim() ? body.buying_mode.trim() : 'buy_it_now',
        listing_type_id: parseText(body.listing_type_id, 'listing_type_id'),
        condition: typeof body.condition === 'string' && body.condition.trim() ? body.condition.trim() : 'new',
        pictures: toPictureArray(body.pictures),
        attributes: normalizeAttributesInput(body.attributes),
    };
};
const mapRemoteItemToLocal = (item) => ({
    ml_id: item.id,
    site_id: item.site_id ?? 'MLB',
    category_id: item.category_id ?? '',
    listing_type_id: item.listing_type_id ?? '',
    currency_id: item.currency_id ?? 'BRL',
    title: item.title ?? 'Untitled item',
    price: item.price ?? 0,
    available_quantity: item.available_quantity ?? 0,
    sold_quantity: item.sold_quantity ?? 0,
    condition: item.condition ?? 'new',
    thumbnail: item.thumbnail ?? '',
    permalink: item.permalink ?? '',
    status: item.status ?? 'unknown',
    sync_state: 'synced',
    last_error: '',
    last_sync: new Date(),
});
const persistRemoteItem = async (item) => {
    return Ad_1.default.findOneAndUpdate({ ml_id: item.id }, mapRemoteItemToLocal(item), {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
    });
};
const buildSummary = (items) => {
    const total = items.length;
    const active = items.filter((item) => item.status === 'active').length;
    const paused = items.filter((item) => item.status === 'paused').length;
    const lowStock = items.filter((item) => item.available_quantity > 0 && item.available_quantity <= 5).length;
    const unsynced = items.filter((item) => item.sync_state !== 'synced').length;
    const inventoryValue = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.available_quantity || 0), 0);
    return {
        total,
        active,
        paused,
        lowStock,
        unsynced,
        inventoryValue,
    };
};
const fetchLocalAds = async (req) => {
    const query = {};
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const syncState = typeof req.query.sync_state === 'string' ? req.query.sync_state.trim() : '';
    const stock = typeof req.query.stock === 'string' ? req.query.stock.trim() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'updated_desc';
    if (search) {
        query.title = { $regex: search, $options: 'i' };
    }
    if (status && status !== 'all') {
        query.status = status;
    }
    if (syncState && syncState !== 'all') {
        query.sync_state = syncState;
    }
    if (stock === 'low') {
        query.available_quantity = { $lte: 5, $gt: 0 };
    }
    else if (stock === 'empty') {
        query.available_quantity = 0;
    }
    const sortMap = {
        updated_desc: { updatedAt: -1 },
        updated_asc: { updatedAt: 1 },
        price_desc: { price: -1 },
        price_asc: { price: 1 },
        stock_desc: { available_quantity: -1 },
        stock_asc: { available_quantity: 1 },
        title_asc: { title: 1 },
    };
    const items = await Ad_1.default.find(query).sort(sortMap[sort] ?? sortMap.updated_desc);
    return {
        items,
        summary: buildSummary(items),
    };
};
const syncSellerAds = async () => {
    const token = await (0, mercadoLibre_1.getValidToken)();
    const warnings = [];
    const searchResult = await (0, mercadoLibre_1.mercadoLivreRequest)({
        method: 'GET',
        url: `/users/${token.user_id}/items/search`,
    });
    const ids = Array.isArray(searchResult.results) ? searchResult.results : [];
    const syncedAt = new Date();
    if (ids.length > 0) {
        const detailedItems = await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'GET',
            url: '/items',
            params: {
                ids: ids.join(','),
            },
        });
        const persistenceQueue = detailedItems.map(async (entry) => {
            if (entry.code !== 200 || !entry.body?.id) {
                warnings.push(entry.error || 'One item could not be synchronized from Mercado Livre.');
                return null;
            }
            return persistRemoteItem(entry.body);
        });
        await Promise.all(persistenceQueue);
    }
    await Ad_1.default.updateMany(ids.length > 0 ? { ml_id: { $nin: ids } } : {}, {
        $set: {
            sync_state: 'missing_remote',
            last_sync: syncedAt,
        },
    });
    const items = await Ad_1.default.find().sort({ updatedAt: -1 });
    return {
        items,
        warnings,
        syncedAt,
        summary: buildSummary(items),
    };
};
const handleSync = async (req, res) => {
    try {
        const response = await syncSellerAds();
        res.json(response);
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Failed to synchronize ads with Mercado Livre.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
};
router.get('/', async (req, res) => {
    try {
        const response = await fetchLocalAds(req);
        res.json(response);
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Failed to load local ads.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.get('/sync', handleSync);
router.post('/sync', handleSync);
router.get('/category-predictor', async (req, res) => {
    const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    if (title.length < 3) {
        res.status(400).json({ error: 'The title query parameter must have at least 3 characters.' });
        return;
    }
    try {
        const items = await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'GET',
            url: '/sites/MLB/domain_discovery/search',
            params: {
                q: title,
                limit: 6,
            },
        });
        res.json({
            items: items.map((item) => ({
                category_id: item.category_id ?? '',
                category_name: item.category_name ?? '',
                domain_id: item.domain_id ?? '',
                domain_name: item.domain_name ?? '',
            })),
        });
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Failed to predict categories for the provided title.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.get('/category-context', async (req, res) => {
    const categoryId = typeof req.query.category_id === 'string' ? req.query.category_id.trim() : '';
    if (!categoryId) {
        res.status(400).json({ error: 'The category_id query parameter is required.' });
        return;
    }
    try {
        const token = await (0, mercadoLibre_1.getValidToken)();
        const [listingTypesResponse, attributesResponse, categoryResponse] = await Promise.all([
            (0, mercadoLibre_1.mercadoLivreRequest)({
                method: 'GET',
                url: `/users/${token.user_id}/available_listing_types`,
                params: {
                    category_id: categoryId,
                },
            }),
            (0, mercadoLibre_1.mercadoLivreRequest)({
                method: 'GET',
                url: `/categories/${categoryId}/attributes`,
            }),
            (0, mercadoLibre_1.mercadoLivreRequest)({
                method: 'GET',
                url: `/categories/${categoryId}`,
            }),
        ]);
        res.json({
            category: {
                id: categoryResponse.id,
                name: categoryResponse.name,
                path_from_root: categoryResponse.path_from_root ?? [],
            },
            listingTypes: listingTypesResponse.available ?? [],
            attributes: attributesResponse.map((attribute) => ({
                id: attribute.id,
                name: attribute.name,
                value_type: attribute.value_type ?? 'string',
                value_max_length: attribute.value_max_length ?? null,
                tooltip: attribute.tooltip ?? '',
                attribute_group_id: attribute.attribute_group_id ?? '',
                attribute_group_name: attribute.attribute_group_name ?? '',
                required: Boolean(attribute.tags?.required || attribute.tags?.catalog_required),
                hidden: Boolean(attribute.tags?.hidden),
                fixed: Boolean(attribute.tags?.fixed),
                values: (attribute.values ?? []).map((value) => ({
                    id: value.id ?? '',
                    name: value.name ?? '',
                })),
                allowed_units: (attribute.allowed_units ?? []).map((unit) => ({
                    id: unit.id ?? '',
                    name: unit.name ?? '',
                })),
                default_unit: attribute.default_unit ?? '',
            })),
        });
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Failed to load the category context.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.get('/listing-types', async (req, res) => {
    const categoryId = typeof req.query.category_id === 'string' ? req.query.category_id.trim() : '';
    if (!categoryId) {
        res.status(400).json({ error: 'The category_id query parameter is required.' });
        return;
    }
    try {
        const token = await (0, mercadoLibre_1.getValidToken)();
        const listingTypesResponse = await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'GET',
            url: `/users/${token.user_id}/available_listing_types`,
            params: {
                category_id: categoryId,
            },
        });
        res.json({ items: listingTypesResponse.available ?? [] });
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Failed to load listing types.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.post('/validate', async (req, res) => {
    try {
        const payload = buildPublicationPayload(req.body);
        const response = await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'POST',
            url: '/items/validate',
            data: payload,
        });
        res.json({
            valid: true,
            status: response.status ?? 'ok',
            issues: Array.isArray(response.cause) ? response.cause : [],
        });
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Failed to validate the ad payload.');
        if (httpError.status === 400) {
            const details = httpError.details && typeof httpError.details === 'object' ? httpError.details : {};
            res.status(400).json({
                valid: false,
                error: httpError.message,
                issues: Array.isArray(details.cause) ? details.cause : [],
                details: httpError.details,
            });
            return;
        }
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.post('/', async (req, res) => {
    try {
        const payload = buildPublicationPayload(req.body);
        const createdItem = await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'POST',
            url: '/items',
            data: payload,
        });
        const storedItem = await persistRemoteItem(createdItem);
        res.status(201).json(storedItem);
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Failed to create the ad on Mercado Livre.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const updates = {};
        if (req.body.title !== undefined) {
            updates.title = parseText(req.body.title, 'title');
        }
        if (req.body.price !== undefined) {
            updates.price = parseNumber(req.body.price, 'price');
        }
        if (req.body.available_quantity !== undefined) {
            updates.available_quantity = parseInteger(req.body.available_quantity, 'available_quantity', true);
        }
        if (Object.keys(updates).length === 0) {
            throw new mercadoLibre_1.HttpError(400, 'At least one editable field must be provided.');
        }
        await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'PUT',
            url: `/items/${req.params.id}`,
            data: updates,
        });
        const refreshedItem = await (0, mercadoLibre_1.mercadoLivreRequest)({
            method: 'GET',
            url: `/items/${req.params.id}`,
        });
        const storedItem = await persistRemoteItem(refreshedItem);
        res.json(storedItem);
    }
    catch (error) {
        const httpError = (0, mercadoLibre_1.toHttpError)(error, 'Failed to update the ad on Mercado Livre.');
        res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
    }
});
exports.default = router;
