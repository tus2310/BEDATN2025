import mongoose, { Schema, Document } from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

export interface SubVariant {
  specification: string; // e.g., "128GB", "8GB RAM"
  value: string; // e.g., "Storage", "Memory"
  additionalPrice: number;
  quantity: number;
}

export interface Variant {
  color: string;
  basePrice: number;
  discount: number;
  quantity: number;
  subVariants: SubVariant[];
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

const SubVariantSchema: Schema = new Schema({
  specification: { type: String, required: true },
  value: { type: String, required: true },
  additionalPrice: { type: Number, required: true, default: 0 },
  quantity: { type: Number, required: true }
});

const VariantSchema: Schema = new Schema({
  
  color: { type: String, required: true },
  basePrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  quantity: { type: Number, required: true },
  subVariants: [SubVariantSchema]
});

const ProductSchema: Schema = new Schema(
  {
    masp: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    img: [{ type: String }],
    moTa: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    status: { type: Boolean, required: true },
    variants: [VariantSchema],
  },
  { timestamps: true }
);

export function checkDuplicateVariants(variants: Variant[]): Error | null {
  const variantSet = new Set();
  for (const variant of variants) {
    const variantKey = `${variant.color}`;
    if (variantSet.has(variantKey)) {
      return new Error(
        `Có biến thể trùng lặp trong sản phẩm: Color: ${variant.color}`
      );
    }
    variantSet.add(variantKey);

    // Check subVariants
    const subVariantSet = new Set();
    for (const subVariant of variant.subVariants) {
      const subKey = `${subVariant.specification}-${subVariant.value}`;
      if (subVariantSet.has(subKey)) {
        return new Error(
          `Có sub-variant trùng lặp trong ${variant.color}: ${subVariant.specification}-${subVariant.value}`
        );
      }
      subVariantSet.add(subKey);
    }
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
