import mongoose, { Schema, Document } from "mongoose";

export interface Comment extends Document {
  id?: number;
  user: string;
  text: string;
  createdAt: Date;
  productId: string;
  name: string;
  rating?: number;
}

const CommentSchema: Schema = new Schema({
  id: { type: Number, unique: true },
  user: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  productId: { type: String, required: true },
  name: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
});

const CommentModel = mongoose.model<Comment>("Comment", CommentSchema);

export default CommentModel;
