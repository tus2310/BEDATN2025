import mongoose, { Schema, Document } from "mongoose";

export interface User extends Document {
  _id: string;
  img: string;
  name: string;
  email: string;
  dob: Date;
  gender: string;
  address: string;
  phone: string;
  password: string;
  role: string;
}

const UserSchema: Schema = new Schema(
  {
    img: { type: String, required: false },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dob: { type: Date, required: false },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: false },
    address: { type: String, required: false },
    phone: { type: String, required: false },

    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin", "shipper"],
      default: "user",
    },
  },
  { timestamps: true } // Thêm timestamps
);

export default mongoose.model<User>("User", UserSchema);
