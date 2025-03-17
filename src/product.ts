import mongoose, { Schema, Document } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface Variant {
  size: string;
  color: string; // Added color field
  quantity: number;
  price: number;
  discount: number;
}

export interface Product extends Document {
  masp: string;
  name: string;
  img: string[];
  moTa: string;
  brand: string;
  category: mongoose.Schema.Types.ObjectId;
  status: boolean;
  variants: Variant[];
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema: Schema = new Schema(
  {
    size: { type: String, required: true },
    color: { type: String, required: true }, // Added color field
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ProductSchema: Schema = new Schema(
  {
    masp: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    img: [{ type: String }],
    moTa: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    status: { type: Boolean, required: true },
    variants: [
      {
        size: { type: String, required: true },
        color: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        discount: { type: Number, default: 0 },
      },
      { timestamps: true },
    ],
  },
  { timestamps: true }
);

export function checkDuplicateVariants(variants: Variant[]): Error | null {
  const variantSet = new Set();
  for (const variant of variants) {
    const key = `${variant.size}-${variant.color}`;
    if (variantSet.has(key)) {
      return new Error(
        `Có biến thể trùng lặp trong sản phẩm: Size: ${variant.size}, Color: ${variant.color}`
      );
    }
    variantSet.add(key);
  }
  return null;
}

ProductSchema.index({ masp: 1, name: 1 }, { unique: true });
ProductSchema.plugin(mongoosePaginate);

const Product = mongoose.model<Product, mongoose.PaginateModel<Product>>(
  "Product",
  ProductSchema
);

export default Product;
