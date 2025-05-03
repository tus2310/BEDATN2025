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
  active: boolean;
  reason: string;
  deActivate: boolean;
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
    active: { type: Boolean, default: true },
    deActivate: { type: Boolean, default: false }, // ✅ thêm dòng này
    reason: { type: String, default: null },
    deactivationHistory: [
      {
        reason: { type: String, required: true },
        date: { type: Date, default: Date.now },
        // adminId hoặc thông tin khác có thể được thêm tại đây nếu cần
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<User>("User", UserSchema);
