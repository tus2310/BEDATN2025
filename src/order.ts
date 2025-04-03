import mongoose, { Document, Schema } from "mongoose";
import { ICartItem } from "./cart";

// Define the interface for the order
export interface IOrder extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  items: ICartItem[];
  amount: number;
  status: string;
  paymentstatus: string;
  createdAt: Date;
  magiaodich: string;
  customerDetails: {
    name: string;
    phone: string;
    email: string;
    address: string;
    notes?: string;
  };
  cancelReason: {
    reason?: string; // Lý do hủy đơn
    canceledAt?: Date; // Thời điểm hủy
    canceledBy?: string; // Người thực hiện hủy
  };
  paymentMethod: string;
  confirmedAt?: Date; // Thời điểm xác nhận đơn hàng
  confirmedBy?: string; // Người xác nhận đơn hàng
  receivedAt?: Date; // Thời điểm nhận hàng
  receivedBy?: string; // Người xác nhận đã nhận
}

// Define the schema for the order
const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
