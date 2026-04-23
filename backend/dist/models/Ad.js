"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const AdSchema = new mongoose_1.Schema({
    ml_id: { type: String, required: true, unique: true },
    site_id: { type: String, default: 'MLB' },
    category_id: { type: String },
    listing_type_id: { type: String },
    currency_id: { type: String, default: 'BRL' },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    available_quantity: { type: Number, required: true },
    sold_quantity: { type: Number, default: 0 },
    condition: { type: String, default: 'new' },
    thumbnail: { type: String },
    permalink: { type: String },
    status: { type: String, default: 'unknown' },
    sync_state: { type: String, default: 'synced' },
    last_error: { type: String, default: '' },
    last_sync: { type: Date, default: Date.now },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Ad', AdSchema);
