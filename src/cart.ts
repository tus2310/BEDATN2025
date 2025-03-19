import mongoose, { Document, Schema } from "mongoose";

// Define SubVariant interface and schema
interface ISubVariant {
  specification: string;
  value: string;
}

const subVariantSchema = new Schema<ISubVariant>({
  specification: { type: String },
  value: { type: String },
});

// Define CartItem interface and schema
export interface ICartItem {
  productId: mongoose.Schema.Types.ObjectId;
  name: string;
  price: number;
  img: string; // Changed from array to single string to match API
  quantity: number;
  color: string;
  subVariant?: ISubVariant;
}

export interface ICart extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  items: ICartItem[];
}

const cartSchema = new Schema<ICart>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      img: { type: String, required: true }, // Changed from array to single string
      quantity: { type: Number, required: true, min: 1 },
      color: { type: String, required: true },
      subVariant: { type: subVariantSchema, default: null },
    },
  ],
});

const Cart = mongoose.model<ICart>("Cart", cartSchema);

export default Cart;