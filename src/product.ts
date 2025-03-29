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

ProductSchema.index({ masp: 1, name: 1 }, { unique: true });
ProductSchema.plugin(mongoosePaginate);

const Product = mongoose.model<Product, mongoose.PaginateModel<Product>>(
  "Product",
  ProductSchema
);

export default Product;
