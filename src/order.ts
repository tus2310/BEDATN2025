import mongoose, { Schema, Document } from "mongoose";

// Interface for the Order document
interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  items: {
    productId: mongoose.Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    color?: string;
    subVariant?: {
      specification: string;
      value: string;
    };
  }[];
  amount: number;
  status: string;
  paymentstatus: string;
  paymentMethod: string;
  customerDetails: {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes?: string;
  };
  voucher?: mongoose.Types.ObjectId;
  cancelReason?: {
    reason: string;
    canceledAt: Date;
    canceledBy: string;
  };
  confirmedAt?: Date;
  confirmedBy?: string;
  receivedAt?: Date;
  receivedBy?: string;
  shipperId?: string; // Replace shipper subdocument with shipperId
  createdAt: Date;
}

// Define the Order schema
const orderSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        color: { type: String },
        subVariant: {
          specification: { type: String },
          value: { type: String },
        },
      },
    ],
    amount: { type: Number, required: true },
    status: { type: String, default: "pending" },
    paymentstatus: { type: String, default: "chưa thanh toán" },
    paymentMethod: { type: String, required: true },
    customerDetails: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
      notes: { type: String },
    },
    voucher: { type: Schema.Types.ObjectId, ref: "Voucher" },
    cancelReason: {
      reason: { type: String },
      canceledAt: { type: Date },
      canceledBy: { type: String },
    },
    confirmedAt: { type: Date },
    confirmedBy: { type: String },
    receivedAt: { type: Date },
    receivedBy: { type: String },
    shipperId: { type: String }, // Simplified to a single ID field
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Create and export the Order model
const Order = mongoose.model<IOrder>("Order", orderSchema);
export default Order;
