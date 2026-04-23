import mongoose, { Schema } from 'mongoose';

const AdSchema: Schema = new Schema(
  {
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
  },
  { timestamps: true }
);

export default mongoose.model('Ad', AdSchema);
