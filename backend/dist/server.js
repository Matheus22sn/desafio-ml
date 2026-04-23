"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const Ads_1 = __importDefault(require("./routes/Ads"));
const auth_1 = __importDefault(require("./routes/auth"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true;
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/desafio_ml';
app.use((0, cors_1.default)({ origin: corsOrigin }));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/ads', Ads_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'desafio-ml-backend',
        timestamp: new Date().toISOString(),
    });
});
app.get('/', (req, res) => {
    res.send('Desafio ML backend is online.');
});
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => {
    console.log('Connected to MongoDB successfully.');
    app.listen(PORT, () => {
        console.log(`Backend listening on http://localhost:${PORT}`);
    });
})
    .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
});
