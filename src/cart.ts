import mongoose, { Document, Schema } from "mongoose";
import {
  Product,
  SubVariant as ProductSubVariant,
  Variant as ProductVariant,
} from "./product"; // Import interfaces

// Define SubVariant interface and schema
interface ISubVariant {
  specification: string;
  value: string;
}

const subVariantSchema = new Schema<ISubVariant>({
  specification: { type: String },
  value: { type: String },
});

// Define Product interface for populated cart items
interface IProduct extends Product {}

// Define CartItem interface and schema
export interface ICartItem {
  productId: mongoose.Schema.Types.ObjectId;
  name: string;
  price: number;
  img: string;
  quantity: number;
  color: string;
  subVariant?: ISubVariant;
}

// Define a type for populated CartItem (where productId is a Product)
export interface IPopulatedCartItem extends Omit<ICartItem, "productId"> {
  productId: IProduct;
}

export interface ICart extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  items: ICartItem[];
}

// Define a type for the populated Cart
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
