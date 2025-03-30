import mongoose, { Schema, Document } from "mongoose";

export interface Comment extends Document {
  id?: number; // ID của bình luận (tùy chọn, nếu cần thiết)
  user: string; // Người dùng đã bình luận
  text: string; // Nội dung bình luận
  createdAt: Date; // Dấu thời gian khi bình luận được tạo
  productId: string; // ID của sản phẩm
  name: string; // Tên của người dùng
  rating?: number; // Đánh giá tùy chọn (1-5 sao)
}

const CommentModel = mongoose.model<Comment>("Comment", CommentSchema);

export default CommentModel;
