import mongoose, { Document, Schema } from "mongoose";
import {
  Product,
  SubVariant as ProductSubVariant,
  Variant as ProductVariant,
} from "./product"; // Import interfaces

// Xác định giao diện và lược đồ SubVariant
interface ISubVariant {
  specification: string;
  value: string;
}

const subVariantSchema = new Schema<ISubVariant>({
  specification: { type: String },
  value: { type: String },
});

// Xác định giao diện Sản phẩm cho các mục giỏ hàng đã điền
interface IProduct extends Product {}

// Xác định giao diện và lược đồ CartItem
export interface ICartItem {
  productId: mongoose.Schema.Types.ObjectId;
  name: string;
  price: number;
  img: string;
  quantity: number;
  color: string;
  subVariant?: ISubVariant;
}

// Xác định loại cho CartItem đã điền (trong đó productId là Sản phẩm)
export interface IPopulatedCartItem extends Omit<ICartItem, "productId"> {
  productId: IProduct;
}

export interface ICart extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  items: ICartItem[];
}

// Xác định kiểu cho Giỏ hàng đã điền
export interface IPopulatedCart extends Omit<ICart, "items"> {
  items: IPopulatedCartItem[];
}

const cartSchema = new Schema<ICart>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      img: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      color: { type: String, required: true },
      subVariant: { type: subVariantSchema, default: null },
    },
  ],
});

const Cart = mongoose.model<ICart>("Cart", cartSchema);

export default Cart;
