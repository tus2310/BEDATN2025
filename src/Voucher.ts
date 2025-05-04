import mongoose, { Schema, model, Document } from "mongoose";

interface IVoucher {
  _id: mongoose.Types.ObjectId;
  code: string;
  discountAmount: number;
  discountPercentage?: number;
  description?: string;
  expirationDate: Date;
  isActive: boolean;
  quantity: number;
  createdAt: Date;
  usedByOrders: mongoose.Types.ObjectId[];
}

const voucherSchema = new Schema<IVoucher>({
  code: { type: String, required: true, unique: true },
  discountAmount: { type: Number, required: true },
  discountPercentage: { type: Number }, // Tùy chọn phần trăm chiết khấu
  description: { type: String }, // Mô tả tùy chọn
  expirationDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  quantity: { type: Number, required: true, default: 1 },
  createdAt: { type: Date, default: Date.now },
  usedByOrders: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: [] },
  ], // Theo dõi các đơn hàng đã sử dụng phiếu giảm giá này
});

const Voucher = model<IVoucher>("Voucher", voucherSchema);

export { Voucher, IVoucher };
