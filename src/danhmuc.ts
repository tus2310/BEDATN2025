import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  _id: number;
  name: string;
  status: "active" | "deactive"; // Trường status có thể là 'active' hoặc 'deactive'
}

export default mongoose.model<ICategory>("Category", CategorySchema);
