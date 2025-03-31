// src/index.ts
import express, { Request, Response, Router } from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import User from "./user";
// import upload from "./upload";
import { Uploadfile } from "./upload";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import category from "./danhmuc";
import Tintuc from "./posts";
import Comment from "./comment";
import product, { checkDuplicateVariants, Variant } from "./product";

import qs from "qs";
import Product from "./product";

import { Socket } from "socket.io";
const http = require("http");
const socketIo = require("socket.io");

var cors = require("cors");
const fs = require("fs");
require("dotenv").config();
//nodemailer
const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const app = express();
//socketIo
const server = http.createServer(app);
const io = socketIo(server);
const { uploadPhoto } = require("./middleware/uploadImage.js");
const PORT = process.env.PORT || 28017;
const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("./utils/Cloudinary");
const JWT_SECRET = process.env.JWT_SECRET as string;
const router = Router();
mongoose
  .connect(
    // "mongodb+srv://ungductrungtrung:Jerry2912@cluster0.4or3syc.mongodb.net/",
    "mongodb+srv://fptdatn2025:fptdatn2025@cluster0.selo8.mongodb.net/",
    {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    }
  )
  .then(() => console.log("DB connection successful"))
  .catch((err) => console.log(err));

app.use(cors());
app.use(bodyParser.json());

// Định nghĩa kiểu cho userSockets
interface UserSockets {
  [userId: string]: string; // userId  tới socket.id
}

const userSockets: UserSockets = {};

io.on("connection", (socket: Socket) => {
  console.log("A user connected:", socket.id);

  // Lắng nghe sự kiện đăng nhập của người dùng
  socket.on("userLogin", (userId: string) => {
    userSockets[userId] = socket.id;
    console.log("User logged in:", userId);
  });

  // Lắng nghe sự kiện ngắt kết nối
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Xóa socket khỏi danh sách khi người dùng ngắt kết nối
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        console.log(userSockets[userId]);
        delete userSockets[userId];
        break;
      }
    }
  });
});

app.post(
  "/upload",
  uploadPhoto.array("images", 10),
  async (req: any, res: any) => {
    console.log("Files received in backend:", req.files);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    try {
      const uploader = (path: any) => cloudinaryUploadImg(path);
      const urls = [];
      for (const file of req.files) {
        const { path } = file;
        const newpath = await uploader(path);
        urls.push(newpath);
        fs.unlinkSync(path); // Remove file after upload
      }

      res.status(201).json({
        payload: urls,
        status: 200,
      });
    } catch (error: any) {
      console.error("Upload error:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// Login
app.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message: "Account is disabled. Please contact support.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password!" });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: process.env.EXPIRES_TOKEN,
    });

    if (user.role === "admin") {
      res.json({
        message: "Welcome Admin!",
        id: user._id,
        info: {
          email: user.email,
          role: user.role,
          name: user.name,
        },
        token: token,
        expiresIn: process.env.EXPIRES_TOKEN,
      });
    } else if (user.role === "shipper") {
      res.json({
        message: "Welcome Shipper!",
        id: user._id,
        info: {
          email: user.email,
          role: user.role,
          name: user.name,
        },
        token: token,
        expiresIn: process.env.EXPIRES_TOKEN,
      });
    } else {
      res.json({
        message: "Welcome User!",
        id: user._id,
        info: {
          email: user.email,
          role: user.role,
          name: user.name,
        },
        token: token,
        expiresIn: process.env.EXPIRES_TOKEN,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in!" });
  }
});

app.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({
      message: "Thêm người dùng thành công",
      user: newUser,
      status: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi tạo người dùng mới" });
  }
});

// Thêm sản phẩm
app.post("/product/add", async (req: Request, res: Response) => {
  try {
    const { masp, name, img, moTa, brand, categoryID, status, variants } =
      req.body;

    // Input validation
    if (
      !masp ||
      !name ||
      !moTa ||
      !brand ||
      !categoryID ||
      typeof status !== "boolean" ||
      !variants
    ) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    // Check for existing product by masp or name
    const existingProductByMasp = await Product.findOne({ masp });
    if (existingProductByMasp) {
      return res.status(400).json({ message: "Mã sản phẩm đã tồn tại" });
    }

    const existingProductByName = await Product.findOne({ name });
    if (existingProductByName) {
      return res.status(400).json({ message: "Tên sản phẩm đã tồn tại" });
    }

    // Validate category
    const Category = await category.findById(categoryID);
    if (!Category) {
      return res.status(404).json({ message: "Không tìm thấy danh mục" });
    }

    // Check for duplicate variants
    const duplicateError = checkDuplicateVariants(variants as Variant[]);
    if (duplicateError) {
      return res.status(400).json({ message: duplicateError.message });
    }

    // Ensure img is an array and has at least one entry (optional, based on your needs)
    if (!Array.isArray(img) || img.length === 0) {
      return res.status(400).json({ message: "Cần ít nhất một hình ảnh" });
    }

    const newProduct = new Product({
      masp,
      name,
      img,
      moTa,
      brand,
      category: categoryID,
      status,
      variants,
    });

    await newProduct.save();
    res.status(201).json({
      message: "Thêm sản phẩm thành công",
      product: newProduct,
      status: 200, // Note: status 200 in response body seems unusual; consider removing or aligning with HTTP status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi thêm mới", error });
  }
});

// Lấy tất cả sản phẩm
app.get("/products", async (req: Request, res: Response) => {
  try {
    const products = await Product.find().populate("category material");
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi lấy danh sách sản phẩm" });
  }
});

app.get("/product-test", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: Number(page),
      limit: Number(limit),
      populate: "category",
    };

    const products = await Product.paginate({}, options);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve products", error });
  }
});
// Lấy một sản phẩm theo ID
app.get("/product/:id", async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi lấy sản phẩm" });
  }
});

// Update a product by ID
app.put("/product/:id", async (req: Request, res: Response) => {
  try {
    const { masp, name, img, moTa, categoryID, materialID, status, variants } =
      req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        masp,
        name,
        img,
        moTa,
        category: categoryID,
        material: materialID,
        status,
        variants,
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    res.status(200).json({
      message: "Cập nhật sản phẩm thành công",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi cập nhật sản phẩm" });
  }
});

app.put("/updatecategory/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateCategory = await category.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updateCategory);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi cập nhật Danh mục" });
  }
});

app.delete("/product/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const test = await product.findByIdAndDelete(id);

    res.json({
      message: "Sản phẩm đã được xóa thành công",
      id: id,
      test: test,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "lỗi khi xóa sản phẩm" });
  }
});

// active product
app.put("/product/:id", async (req: Request, res: Response) => {
  try {
    const { masp, name, img, moTa, brand, categoryID, status, variants } =
      req.body;

    // Check if product exists
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    // Input validation (optional fields can be omitted in update)
    if (masp && typeof masp !== "string") {
      return res.status(400).json({ message: "Mã sản phẩm không hợp lệ" });
    }
    if (name && typeof name !== "string") {
      return res.status(400).json({ message: "Tên sản phẩm không hợp lệ" });
    }
    if (categoryID) {
      const Category = await category.findById(categoryID);
      if (!Category) {
        return res.status(404).json({ message: "Không tìm thấy danh mục" });
      }
    }

    // Check for duplicate masp or name if provided (excluding current product)
    if (masp && masp !== existingProduct.masp) {
      const existingByMasp = await Product.findOne({ masp });
      if (existingByMasp) {
        return res.status(400).json({ message: "Mã sản phẩm đã tồn tại" });
      }
    }
    if (name && name !== existingProduct.name) {
      const existingByName = await Product.findOne({ name });
      if (existingByName) {
        return res.status(400).json({ message: "Tên sản phẩm đã tồn tại" });
      }
    }

    // Check duplicate variants if provided
    if (variants) {
      const duplicateError = checkDuplicateVariants(variants as Variant[]);
      if (duplicateError) {
        return res.status(400).json({ message: duplicateError.message });
      }
    }

    // Ensure img is an array if provided (optional constraint)
    if (img && (!Array.isArray(img) || img.length === 0)) {
      return res.status(400).json({ message: "Cần ít nhất một hình ảnh" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      {
        masp: masp ?? existingProduct.masp,
        name: name ?? existingProduct.name,
        img: img ?? existingProduct.img,
        moTa: moTa ?? existingProduct.moTa,
        brand: brand ?? existingProduct.brand,
        category: categoryID ?? existingProduct.category,
        status: status ?? existingProduct.status,
        variants: variants ?? existingProduct.variants,
      },
      { new: true, runValidators: true } // runValidators ensures schema rules are enforced
    );

    res.status(200).json({
      message: "Cập nhật sản phẩm thành công",
      product: updatedProduct,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi cập nhật sản phẩm", error });
  }
});

// deactive product
app.put("/product/activate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productToUpdate = await product.findByIdAndUpdate(
      id,
      { status: true },
      { new: true }
    );

    if (!productToUpdate) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sản phẩm để kích hoạt lại" });
    }

    res.json({
      message: "Sản phẩm đã được kích hoạt lại",
      product: productToUpdate,
    });
  } catch (error) {
    console.error("Error activating product:", error);
    res.status(500).json({ message: "Lỗi khi kích hoạt lại sản phẩm" });
  }
});

//  Categoty : Get
app.get("/category", async (req: Request, res: Response) => {
  try {
    const categories = await category.find();
    res.json(categories);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi lấy thông tin danh mục" });
  }
});
app.get("/category/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const Category = await category.findById(id);
    res.json(Category);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi lấy thông tin danh mục" });
  }
});

//  Categoty : Post
app.post("/addcategory", async (req: Request, res: Response) => {
  try {
    const newCategory = new category(req.body);
    await newCategory.save();
    res.status(201).json({
      massege: "Thêm Category thành công",
      category: newCategory,
      status: 200,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi thêm mới danh mục" });
  }
});

//  Categoty : Delete
app.delete("/category/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = await category.findByIdAndDelete(id);
    res.json({
      message: "Danh mục đã xoá thành công",
      id: id,
      test: del,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi xóa danh mục" });
  }
});

app.delete("/product/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = await product.findByIdAndDelete(id);
    res.json({
      message: "Sp đã xoá thành công",
      id: id,
      test: del,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi xóa SP" });
  }
});

// gui mail

// Vô hiệu hóa User

// Kích hoạt lại người dùng

// Thêm danh mục
app.post("/addcategory", async (req: Request, res: Response) => {
  try {
    const newCategory = new category({ ...req.body, status: "active" });
    await newCategory.save();
    res.status(201).json({
      message: "Thêm Category thành công",
      category: newCategory,
      status: 200,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi thêm mới danh mục" });
  }
});

// Vô hiệu hóa danh mục
app.put("/category/deactivate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Deactivate the category
    const categoryToUpdate = await category.findByIdAndUpdate(
      id,
      { status: "deactive" },
      { new: true }
    );

    if (!categoryToUpdate) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy danh mục để vô hiệu hóa" });
    }

    // Deactivate all products in the category
    const updatedProducts = await product.updateMany(
      { category: id }, // Tìm tất cả sản phẩm có category trùng với id danh mục
      { status: false } // Đặt trạng thái của sản phẩm thành 'false'
    );

    res.json({
      message: "Danh mục và các sản phẩm liên quan đã được vô hiệu hóa",
      category: categoryToUpdate,
    });
  } catch (error) {
    console.error("Error deactivating category:", error);
    res.status(500).json({ message: "Lỗi khi vô hiệu hóa danh mục" });
  }
});

// Kích hoạt lại danh mục
app.put("/category/activate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Activate the category
    const categoryToUpdate = await category.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true }
    );

    if (!categoryToUpdate) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy danh mục để kích hoạt lại" });
    }

    // Activate all products in the category
    const updatedProducts = await product.updateMany(
      { category: id }, // Tìm tất cả sản phẩm có category trùng với id danh mục
      { status: true } // Đặt trạng thái của sản phẩm thành 'true'
    );

    res.json({
      message: "Danh mục và các sản phẩm liên quan đã được kích hoạt lại",
      category: categoryToUpdate,
    });
  } catch (error) {
    console.error("Error activating category:", error);
    res.status(500).json({ message: "Lỗi khi kích hoạt lại danh mục" });
  }
});

// Lấy danh mục
app.get("/category", async (req: Request, res: Response) => {
  try {
    const categories = await category.find({ status: "active" }); // Chỉ lấy danh mục hoạt động
    res.json(categories);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi lấy thông tin danh mục" });
  }
});

app.get("/deactive/:id", (req, res) => {
  const itemId = req.params.id;
  // Gọi hàm để deactive item với id là itemId
  res.send(`Deactivating item with ID ${itemId}`);
});

app.put("/product/deactivate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productToUpdate = await product.findByIdAndUpdate(
      id,
      { status: false },
      { new: true }
    );

    if (!productToUpdate) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sản phẩm để vô hiệu hóa" });
    }

    res.json({
      message: "Sản phẩm đã được vô hiệu hóa",
      product: productToUpdate,
    });
  } catch (error) {
    console.error("Error deactivating product:", error);
    res.status(500).json({ message: "Lỗi khi vô hiệu hóa sản phẩm" });
  }
});

app.put("/product/activate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productToUpdate = await product.findByIdAndUpdate(
      id,
      { status: true },
      { new: true }
    );

    if (!productToUpdate) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sản phẩm để kích hoạt lại" });
    }

    res.json({
      message: "Sản phẩm đã được kích hoạt lại",
      product: productToUpdate,
    });
  } catch (error) {
    console.error("Error activating product:", error);
    res.status(500).json({ message: "Lỗi khi kích hoạt lại sản phẩm" });
  }
});

app.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại cổng ${PORT}`);
});

// Ngân hàng	NCB
// Số thẻ	9704198526191432198
// Tên chủ thẻ	NGUYEN VAN A
// Ngày phát hành	07/15
// Mật khẩu OTP	123456
