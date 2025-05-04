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
import Cart, { ICartItem } from "./cart";
import product, { checkDuplicateVariants, Variant } from "./product";
import Order from "./order";
import Tintuc from "./posts";
import Comment from "./comment";
import crypto from "crypto";
import { createVNPayPaymentUrl, sortObject } from "./service/VNPay";
import qs from "qs";
import Product from "./product";

import ChangePassword from "./ChangePassword";
import { Socket } from "socket.io";
import DeactivationHistory from "./DeactivationHistory";
import { checkUserActiveStatus } from "./middleware/Kickuser";
import { Voucher } from "./Voucher";
import { validateCartItems } from "./utils/validateCartPrices";
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

app.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi lấy thông tin người dùng!",
    });
  }
});

app.get("/user/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId); // Fetch user by ID

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    res.json(user); // Respond with the user's data
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Error fetching user information!",
    });
  }
});
app.get("/usersaccount", async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi lấy thông tin người dùng!",
    });
  }
});

app.put("/user/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi cập nhật thông tin người dùng",
    });
  }
});

app.put("/admin/user/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedUser = await User.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi cập nhật thông tin người dùng",
    });
  }
});

app.put("/:id/cartupdate", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { productId, newQuantity } = req.body;

  if (!productId || newQuantity == null || newQuantity <= 0) {
    return res
      .status(400)
      .json({ message: "ID hoặc số lượng sản phẩm không hợp lệ" });
  }

  try {
    const cart = await Cart.findOne({ userId: id });

    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    const productIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (productIndex === -1) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    cart.items[productIndex].quantity = newQuantity;
    await cart.save();

    res.status(200).json(cart);
  } catch (error) {
    console.error("Lỗi cập nhật giỏ hàng:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

// app.post("/cart/add",checkUserActiveStatus,  async (req: Request, res: Response) => {
app.post("/cart/add", async (req: Request, res: Response) => {
  const { userId, items } = req.body;

  // Validate userId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid userId format" });
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Items array cannot be empty" });
  }

  // Destructure the first item (assuming single item addition)
  const { productId, name, price, img, quantity, color, subVariant } = items[0];

  // Validate productId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid productId format" });
  }

  // Validate quantity
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res
      .status(400)
      .json({ message: "Quantity must be a positive integer" });
  }

  // Validate required fields
  if (!name || !price || !img || !color) {
    return res
      .status(400)
      .json({ message: "Missing required fields: name, price, img, or color" });
  }

  // Validate subVariant if provided
  if (subVariant && (!subVariant.specification || !subVariant.value)) {
    return res.status(400).json({
      message: "SubVariant must include both specification and value",
    });
  }

  try {
    let cart = await Cart.findOne({ userId });

    if (cart) {
      // Check for existing item with same productId, color, and subVariant
      const productIndex = cart.items.findIndex((p) => {
        const sameProduct = p.productId.toString() === productId;
        const sameColor = p.color === color;
        const sameSubVariant =
          subVariant && p.subVariant
            ? p.subVariant.specification === subVariant.specification &&
              p.subVariant.value === subVariant.value
            : !subVariant && !p.subVariant; // Both null/undefined
        return sameProduct && sameColor && sameSubVariant;
      });

      if (productIndex > -1) {
        return res.status(400).json({
          message:
            "This product with the same color and sub-variant is already in the cart.",
        });
      } else {
        cart.items.push({
          productId,
          name,
          price,
          img,
          quantity,
          color,
          subVariant,
        });
      }

      cart = await cart.save();
      return res.status(200).json(cart);
    } else {
      // Create new cart if none exists
      const newCart = await Cart.create({
        userId,
        items: [{ productId, name, price, img, quantity, color, subVariant }],
      });

      return res.status(201).json(newCart);
    }
  } catch (error: any) {
    console.error("Error adding to cart:", error);
    res
      .status(500)
      .json({ message: "Error adding to cart", error: error.message });
  }
});

app.delete("/cart/remove", async (req: Request, res: Response) => {
  const { userId, productId, color, subVariant } = req.body;

  try {
    // Xác thực dữ liệu yêu cầu
    if (!userId || !productId || !color) {
      return res.status(400).json({
        message:
          "Thiếu các trường bắt buộc: userId, productId và color là bắt buộc",
      });
    }

    // Xác thực userId và productId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Định dạng userId không hợp lệ" });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ message: "Định dạng productId không hợp lệ" });
    }

    // Xác thực subVariant nếu được cung cấp
    if (subVariant && (!subVariant.specification || !subVariant.value)) {
      return res.status(400).json({
        message: "Biến thể phụ phải bao gồm cả thông số kỹ thuật và giá trị",
      });
    }

    // Lấy giỏ hàng của người dùng
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Không tìm thấy giỏ hàng" });
    }

    // Xác định mục cần xóa
    const itemKey = subVariant
      ? `${productId}-${color}-${subVariant.specification}-${subVariant.value}`
      : `${productId}-${color}`;

    // Lọc ra mục cần xóa
    const updatedItems = cart.items.filter((item: any) => {
      const cartItemKey = item.subVariant
        ? `${item.productId}-${item.color}-${item.subVariant.specification}-${item.subVariant.value}`
        : `${item.productId}-${item.color}`;
      return cartItemKey !== itemKey;
    });

    // Cập nhật giỏ hàng với các mục còn lại
    cart.items = updatedItems;
    await cart.save();

    res
      .status(200)
      .json({ message: "Mục đã xóa khỏi giỏ hàng thành công", cart });
  } catch (error: any) {
    console.error("Lỗi khi xóa mục khỏi giỏ hàng:", error);
    res.status(500).json({
      message: "Không xóa được mục khỏi giỏ hàng",
      error: error.message,
    });
  }
});

app.get("/cart/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Định dạng userId không hợp lệ" });
    }

    console.log(`Đang lấy giỏ hàng cho userId: ${id}`);
    const cart = await Cart.findOne({ userId: id }); // Removed .populate("items.productId")
    console.log(`Đã lấy giỏ hàng:`, cart);

    if (!cart) {
      return res.status(404).json({ message: "Giỏ hàng trống", isEmpty: true });
    }

    res.json(cart);
  } catch (error: any) {
    console.error("Lỗi khi lấy giỏ hàng:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ nội bộ", error: error.message });
  }
});

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
    const { status } = req.query;

    const query: any = {};
    if (status) {
      query.status = status; // Filter by status (e.g., "active" or "deactive")
    }

    const categories = await category.find(query);
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error retrieving categories:", error);
    res.status(500).json({ message: "Failed to retrieve categories", error });
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
// Vô hiệu hóa User
app.put("/user/deactivate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Lý do vô hiệu hóa là bắt buộc" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { active: false, reason },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    // Notify via WebSocket
    const socketId = userSockets[user._id];
    if (socketId) {
      io.to(socketId).emit("kicked", {
        message: "Tài khoản của bạn đã bị vô hiệu hóa.",
      });
      delete userSockets[user._id];
    }
    // Send response to frontend to clear session storage
    res.json({
      message: "Người dùng đã được vô hiệu hóa, vui lòng đăng nhập lại.",
      logout: true, // Thêm cờ để chỉ ra rằng người dùng nên đăng xuất
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    res.status(500).json({ message: "Lỗi khi vô hiệu hóa người dùng" });
  }
});

app.get("/user/deactivation-history", async (req: Request, res: Response) => {
  try {
    const history = await DeactivationHistory.find()
      .populate("userId deactivatedBy", "name email")
      .exec();
    res.json(history);
  } catch (error) {
    console.error("Error fetching deactivation history:", error);
    res.status(500).json({ message: "Lỗi khi lấy lịch sử vô hiệu hóa" });
  }
});
// Kích hoạt lại người dùng
app.put("/user/activate/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { active: true, reason: null }, // Xóa lý do khi kích hoạt
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy người dùng để kích hoạt lại." });
    }

    res.json({ message: "Người dùng đã được kích hoạt lại", user });
  } catch (error) {
    console.error("Error activating user:", error);
    res.status(500).json({ message: "Lỗi khi kích hoạt lại người dùng." });
  }
});

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

app.get("/orders", async (req: Request, res: Response) => {
  const { userId } = req.query; // Optional query parameter to filter by userId

  try {
    // Find orders, optionally filter by userId if provided
    const query = userId ? { userId } : {};
    const orders = await Order.find(query)
      .populate("userId", "name email")
      .exec();

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to retrieve orders", error });
  }
});
router.post("/api/orders", async (req: Request, res: Response) => {
  const { userId, items, paymentMethod, amount, customerDetails } = req.body;

  // Validate request body
  if (!userId || !items || !paymentMethod || !amount || !customerDetails) {
    return res.status(400).json({ message: "Thiếu dữ liệu đơn hàng" });
  }

  try {
    // Check and update product quantities in stock
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          message: `Sản phẩm không tồn tại: ${item.productId}`,
        });
      }

      // Find the variant by color
      const variant = product.variants.find((v) => v.color === item.color);
      if (!variant) {
        return res.status(400).json({
          message: `Không tìm thấy biến thể ${item.color} cho sản phẩm ${item.name}`,
        });
      }

      // If subVariant is provided, check and update its quantity
      if (item.subVariant) {
        const subVariant = variant.subVariants.find(
          (sv) =>
            sv.specification === item.subVariant.specification &&
            sv.value === item.subVariant.value
        );
        if (!subVariant) {
          return res.status(400).json({
            message: `Không tìm thấy sub-variant ${item.subVariant.specification}: ${item.subVariant.value} cho sản phẩm ${item.name} (${item.color})`,
          });
        }

        if (subVariant.quantity < item.quantity) {
          return res.status(400).json({
            message: `Không đủ số lượng cho sản phẩm ${item.name} (${item.color}, ${item.subVariant.specification}: ${item.subVariant.value}) trong kho. Còn lại: ${subVariant.quantity}`,
          });
        }

        // Reduce the subVariant quantity
        subVariant.quantity -= item.quantity;
      } else {
        // If no subVariant is provided, assume the first subVariant (or handle as needed)
        if (variant.subVariants.length === 0) {
          return res.status(400).json({
            message: `Sản phẩm ${item.name} (${item.color}) không có sub-variant nào để cập nhật số lượng`,
          });
        }
        const subVariant = variant.subVariants[0]; // Default to first subVariant (adjust logic if needed)
        if (subVariant.quantity < item.quantity) {
          return res.status(400).json({
            message: `Không đủ số lượng cho sản phẩm ${item.name} (${item.color}) trong kho. Còn lại: ${subVariant.quantity}`,
          });
        }
        subVariant.quantity -= item.quantity;
      }

      // Save the updated product
      await product.save();
    }

    // Create the order
    const newOrder = new Order({
      userId,
      items,
      paymentMethod,
      amount,
      customerDetails,
      status: "pending", // Optional: add status if your schema supports it
      createdAt: new Date(),
    });

    await newOrder.save();

    res.status(201).json({ message: "Đặt hàng thành công", order: newOrder });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
});

app.get("/posts", async (req: Request, res: Response) => {
  try {
    const query = await Tintuc.find();

    if (query.length === 0) {
      return res.status(404).json({
        message: "Chưa có bài viết nào!",
      });
    }

    return res.status(200).json(query);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res
      .status(500)
      .json({ message: "Failed to retrieve orders", error });
  }
});
app.get("/post/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await Tintuc.findById(id); // Thay 'product' bằng 'Tintuc'

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    res.json(post);
  } catch (error) {
    console.error("Lỗi khi lấy bài viết:", error);
    res.status(500).json({ message: "Lỗi khi lấy thông tin tin tức" });
  }
});

app.post("/posts/create", async (req: Request, res: Response) => {
  const { title, content, descriptions, img } = req.body;
  try {
    if (title.length === 0) {
      return res.status(403).json({
        message: "Tiêu đề bài viết không được để trống",
      });
    }

    if (content.length === 0) {
      return res.status(403).json({
        message: "Nội dung bài viết không được để trống",
      });
    }

    // Xử lí ảnh bài viết

    // -------------------

    const newTintuc = await Tintuc.create({
      title,
      content,
      descriptions,
      img,
    });

    if (!newTintuc) {
      return res.status(403).json({
        message: "Thêm bài viết không thành công!",
      });
    }

    return res.status(200).json({
      data: newTintuc,
      message: "Thêm bài viết thành công!",
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res
      .status(500)
      .json({ message: "Failed to retrieve orders", error });
  }
});
app.delete("/posts/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Tìm và xóa bài viết theo ID
    const deletedPost = await Tintuc.findByIdAndDelete(id);

    if (!deletedPost) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    res.status(200).json({
      message: "Xóa bài viết thành công",
      deletedPost,
    });
  } catch (error) {
    console.error("Lỗi khi xóa bài viết:", error);
    res.status(500).json({ message: "Lỗi máy chủ", error });
  }
});
app.put("/updatePost/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    // Tiến hành cập nhật
    const updatedPost = await Tintuc.findByIdAndUpdate(
      id,
      req.body, // Dữ liệu cần cập nhật
      { new: true, runValidators: true } // Tùy chọn trả về tài liệu mới và xác thực
    );

    // Kiểm tra nếu không tìm thấy bài viết
    if (!updatedPost) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Lỗi khi cập nhật bài viết:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật bài viết." });
  }
});

app.get("/orders-list", async (req: Request, res: Response) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name email")
      .populate("items.productId", "name price img")
      .exec();

    if (orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to retrieve orders", error });
  }
});

app.get("/orders/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res
        .status(400)
        .json({ message: "Định dạng ID người dùng không hợp lệ" });
    }

    const orders = await Order.find({ userId })
      .populate("items.productId", "name price")
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const totalOrders = await Order.countDocuments({ userId });

    res.status(200).json({
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / +limit),
      currentPage: +page,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Không thể tìm đơn đặt hàng", error });
  }
});

app.put("/orders-list/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const { status, paymentstatus } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (status === "failed") {
      const updatePromises = order.items.map((item) =>
        Product.findByIdAndUpdate(
          item.productId,
          { $inc: { quantity: item.quantity } },
          { new: true }
        )
      );

      await Promise.all(updatePromises);
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status, paymentstatus },
      { new: true }
    );

    if (updatedOrder) {
      res.status(200).json(updatedOrder);
    } else {
      res
        .status(404)
        .json({ message: "Không tìm thấy đơn hàng sau khi cập nhật" });
    }
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});
app.get("/orders/:orderId", async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }

    const order = await Order.findById(orderId)
      .populate("items.productId", "name price img")
      .exec();

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order detail:", error);
    res.status(500).json({ message: "Failed to fetch order detail", error });
  }
});
app.get("/api/stats", async (req, res) => {
  try {
    // Product Statistics
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: true });
    const productAggregation = await Product.aggregate([
      { $unwind: "$variants" },
      { $unwind: "$variants.subVariants" },
      {
        $group: {
          _id: null,
          totalVariants: { $sum: 1 },
          totalStock: { $sum: "$variants.subVariants.quantity" },
        },
      },
    ]);
    const totalVariants = productAggregation[0]?.totalVariants || 0;
    const totalStock = productAggregation[0]?.totalStock || 0;

    // Order Statistics
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const packagingOrders = await Order.countDocuments({ status: "packaging" }); // Added for your current data
    const completedOrders = await Order.countDocuments({
      status: "confirm-receive",
    }); // Adjust if different
    const canceledOrders = await Order.countDocuments({
      "cancelReason.canceledAt": { $exists: true },
    }); // Fallback to cancelReason

    // Debug: Get all unique statuses
    const uniqueStatuses = await Order.distinct("status");
    console.log("Unique Order Statuses:", uniqueStatuses);

    // Revenue Statistics (only from completed orders)
    const revenueAggregation = await Order.aggregate([
      { $match: { status: "confirm-receive" } }, // Adjust if completion is different
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          orderCount: { $sum: 1 },
        },
      },
    ]);
    const totalRevenue = revenueAggregation[0]?.totalRevenue || 0;
    const completedOrderCount = revenueAggregation[0]?.orderCount || 0;
    const averageOrderValue =
      completedOrderCount > 0 ? totalRevenue / completedOrderCount : 0;

    const stats = {
      products: {
        totalProducts,
        activeProducts,
        totalVariants,
        totalStock,
      },
      orders: {
        totalOrders,
        pendingOrders,
        packagingOrders, // Added for visibility
        completedOrders,
        canceledOrders,
      },
      revenue: {
        totalRevenue,
        averageOrderValue,
      },
    };

    console.log("Stats:", stats); // Debug log
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//vnpay

app.post("/create-payment", async (req: Request, res: Response) => {
  const { userId, amount, paymentMethod, bankCode, customerDetails, Items } =
    req.body;
  console.log("Payload received:", req.body);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log("Invalid orderId format");
    return res.status(400).json({ message: "Invalid orderId format" });
  }

  try {
    // const order = await Order.create({
    //   userId: req.body.userId,
    //   items: req.body.items,
    //   amount: Number(req.body.amount) / 100,
    //   customerDetails: req.body.customerDetails,
    //   paymentMethod: req.body.paymentMethod,
    // });
    // console.log(order, "order");

    const paymentUrl = createVNPayPaymentUrl({
      Id: userId,
      customerDetails: customerDetails,
      items: Items,
      amount: amount,
      bankCode,
      req,
    });
    console.log("Payment URL generated:", paymentUrl);

    return res.status(200).json({ paymentUrl });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại" });
  }
});

const vnp_TmnCode = process.env.VNP_TMNCODE || "6KV33Z7O";
const vnp_HashSecret =
  process.env.VNP_HASHSECRET || "HID072I1H7DJ6HO5O92JMV2WX2HMDQRD";
let vnp_Url: any =
  process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const vnp_ReturnUrl =
  process.env.VNP_RETURNURL || "http://localhost:3000/success";

app.get("/vnpay_return", function (req, res, next) {
  let vnp_Params = req.query;

  let secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  let config = require("config");
  let tmnCode = vnp_TmnCode;
  let secretKey = vnp_TmnCode;

  let querystring = require("qs");
  let signData = querystring.stringify(vnp_Params, { encode: false });
  let crypto = require("crypto");
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
  console.log("tsest vpay", vnp_Params["vnp_ResponseCode"]);

  if (secureHash === signed) {
    res.render("success", { code: vnp_Params["vnp_ResponseCode"] });
  } else {
    res.render("success", { code: "97" });
  }
});

app.post("/order/confirm", async (req: Request, res: Response) => {
  const { userId, items, amount, paymentMethod, customerDetails } = req.body;

  try {
    // Validate request data
    if (!userId || !items || !amount || !paymentMethod || !customerDetails) {
      return res.status(400).json({ message: "Missing order data" });
    }

    // Create a new order document
    const order = new Order({
      userId: userId,
      items,
      amount,
      paymentMethod,
      status: "pending",
      createdAt: new Date(),
      customerDetails,
    });

    await order.save();
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res.status(201).json({
      message: "Order confirmed and cart reset",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Order confirmation error:", error);
    res.status(500).json({ message: "Order confirmation failed", error });
  }
});

app.post("/order/confirmvnpay", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      vnp_Amount,
      vnp_OrderInfo,
      vnp_ResponseCode,
      vnp_TransactionNo,
      paymentMethod,
    } = req.body;

    if (
      !userId ||
      !vnp_Amount ||
      !vnp_ResponseCode ||
      !vnp_TransactionNo ||
      !paymentMethod
    ) {
      return res.status(400).json({ message: "thiếu thông tin" });
    }

    if (vnp_ResponseCode !== "00") {
      // const updatedOrder = await Order.findOneAndUpdate(
      //   { userId, status: "pending" },
      //   {paymentMethod: "Thanh toán khi nhận hàng"},
      //   { paymentstatus: "Chưa Thanh toán", magiaodich: vnp_TransactionNo },
      //   { new: true, sort: { createdAt: -1 } }
      // );
      return res.status(400).json({ message: "thanh toán thất bại" });
    }

    const cartUpdate = await Cart.findOneAndUpdate({ userId }, { items: [] });
    if (!cartUpdate) {
      return res.status(404).json({ message: "không tìm thấy giỏ hàng" });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { userId, status: "pending" },
      { paymentstatus: "Đã Thanh toán", magiaodich: vnp_TransactionNo },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Đơn hàng ko tồn tại." });
    }

    return res
      .status(201)
      .json({ message: "Đơn hàng đặt thành công.", order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    return res
      .status(500)
      .json({ message: "Failed to update the order.", error });
  }
});

app.post("/api/orders/:orderId/cancel", async (req, res) => {
  const { orderId } = req.params;
  const { reason, canceledBy } = req.body; // Lấy lý do hủy và người thực hiện từ body

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled." });
    }

    // Cập nhật trạng thái hủy đơn và thông tin chi tiết hủy
    order.status = "cancelled";
    order.cancelReason = {
      reason: reason || "No reason provided", // Lý do hủy
      canceledAt: new Date(), // Thời điểm hủy
      canceledBy: canceledBy || "Unknown", // Người thực hiện hủy
    };

    // Cập nhật số lượng sản phẩm trong kho
    const updatePromises = order.items.map((item) => {
      return Product.findByIdAndUpdate(
        item.productId,
        { $inc: { soLuong: item.quantity } },
        { new: true }
      );
    });

    await Promise.all(updatePromises);
    await order.save();

    res.json({ message: "Order cancelled successfully", order });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Failed to cancel order." });
  }
});
app.post(
  "/api/orders/:orderId/confirm",
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const { confirmedBy } = req.body; // Lấy thông tin người xác nhận từ body

    try {
      // Tìm đơn hàng theo ID
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found." });
      }

      // Kiểm tra trạng thái của đơn hàng
      if (order.status === "cancelled") {
        return res
          .status(400)
          .json({ message: "Order is cancelled and cannot be confirmed." });
      }

      // Cập nhật trạng thái đơn hàng và thời điểm xác nhận
      order.status = "confirmed"; // Thay đổi trạng thái của đơn hàng
      order.confirmedAt = new Date(); // Cập nhật thời điểm xác nhận
      order.confirmedBy = confirmedBy || "System"; // Người xác nhận (nếu không có thì mặc định là 'System')

      // Lưu thông tin vào cơ sở dữ liệu
      await order.save();

      // Trả về phản hồi thành công
      res.status(200).json({ message: "Order confirmed successfully", order });
    } catch (error) {
      console.error("Error confirming order:", error);
      res.status(500).json({ message: "Failed to confirm order." });
    }
  }
);

// POST để thêm mới bình luận
app.post("/comments", async (req, res) => {
  try {
    const newComment = new Comment(req.body);
    await newComment.save();
    res.status(201).json(newComment);
  } catch (error) {
    res.status(400).json({ message: "Lỗi Bạn không thể bình luận !!!" });
  }
});

// GET để truy xuất nhận xét cho một sản phẩm cụ thể
app.get("/comments/:productId", async (req, res) => {
  try {
    const comments = await Comment.find({ productId: req.params.productId });
    res.status(200).json(comments);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Lỗi Bạn không thể truy xuất bình luận !!!" });
  }
});
app.get("/api/products/:productId", async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.put("/api/cart/:userId", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const item = cart.items.find(
      (item) => item.productId.toString() === productId
    );
    if (!item) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    item.quantity = quantity;
    await cart.save();
    res.status(200).json({ message: "Cart updated successfully" });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/api/products-pay/:productId", async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const product = await Product.findById(productId); // Lấy sản phẩm theo ID
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.put("/api/products/:productId", async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { quantity, color, subVariant } = req.body;

  // Validate inputs
  if (quantity === undefined || !Number.isInteger(quantity) || quantity < 0) {
    return res
      .status(400)
      .json({ message: "Số lượng không hợp lệ, phải là số nguyên không âm" });
  }
  if (!color) {
    return res.status(400).json({ message: "Màu sắc là bắt buộc" });
  }
  if (!subVariant || !subVariant.specification || !subVariant.value) {
    return res
      .status(400)
      .json({ message: "SubVariant phải bao gồm specification và value" });
  }

  try {
    // Retrieve product from the database
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }
    console.log("Product fetched:", JSON.stringify(product, null, 2));

    // Find the variant by color
    const variant = product.variants.find((v) => v.color === color);
    if (!variant) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy biến thể cho màu ${color}` });
    }
    console.log("Variant found:", JSON.stringify(variant, null, 2));

    // Find the subVariant
    const subVar = variant.subVariants.find(
      (sv) =>
        sv.specification === subVariant.specification &&
        sv.value === subVariant.value
    );
    if (!subVar) {
      return res.status(404).json({
        message: `Không tìm thấy subVariant ${subVariant.specification}: ${subVariant.value}`,
      });
    }
    console.log("SubVariant found:", JSON.stringify(subVar, null, 2));

    // Check current quantity (for debugging)
    console.log(`Current subVariant quantity: ${subVar.quantity}`);

    // Update the subVariant quantity
    subVar.quantity = quantity;
    console.log(
      `Updated subVariant quantity to ${subVar.quantity} for ${subVariant.specification}: ${subVariant.value}`
    );

    // Save changes to the database
    await product.save();
    console.log("Product saved successfully");

    res.status(200).json({
      message: "Cập nhật số lượng sản phẩm thành công",
      product: {
        _id: product._id,
        name: product.name,
        variants: product.variants.map((v) => ({
          color: v.color,
          basePrice: v.basePrice,
          discount: v.discount,
          subVariants: v.subVariants.map((sv) => ({
            specification: sv.specification,
            value: sv.value,
            additionalPrice: sv.additionalPrice,
            quantity: sv.quantity,
          })),
        })),
      },
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật sản phẩm:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ khi cập nhật số lượng sản phẩm", error });
  }
});

app.put("/change-password/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { oldPassword, newPassword, changedBy } = req.body;

  try {
    // Kiểm tra ID người dùng
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Tìm người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Mã hóa mật khẩu mới
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu trong tài liệu người dùng
    user.password = hashedNewPassword;
    await user.save();

    // Ghi lại lịch sử thay đổi mật khẩu
    const changeLog = new ChangePassword({
      userId,
      oldPassword, // Có thể không lưu mật khẩu cũ để bảo mật
      newPassword: hashedNewPassword,
      changedBy,
    });
    await changeLog.save();

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/updateProfile/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, dob, gender, address, phone, img } = req.body;

  try {
    // Validate required fields (optional based on your needs)
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update the user in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          ...(img && { img }),
          ...(name && { name }),
          ...(dob && { dob }),
          ...(gender && { gender }),
          ...(address && { address }),
          ...(phone && { phone }),
        },
      },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/api/orders/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Send the order data as a response
    res.json(order);
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res
      .status(500)
      .json({ message: "Could not fetch the order. Please try again later." });
  }
});

app.put("/api/orders/:id/confirm-receive", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body; // Giả sử bạn gửi userId trong body để xác định người xác nhận

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      {
        status: "Đã giao", // Cập nhật trạng thái thành 'received'
        receivedAt: new Date(), // Ghi lại thời điểm nhận hàng
        receivedBy: userId, // Ghi lại người xác nhận
      },
      { new: true }
    );

    if (!order) return res.status(404).send("Đơn hàng không được tìm thấy.");
    res.send(order);
  } catch (error) {
    res.status(500).send("Có lỗi xảy ra.");
  }
});
app.put("/orders-list/:orderId/received", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body; // Get the status from the request body

  try {
    // Find the order by ID and update its status
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: status }, // Update the status to "Thành công"
      { new: true } // Return the updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.put("/api/orders/:id/complete", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      {
        status: "Hoàn thành",
        receivedAt: new Date(),
        receivedBy: userId,
      },
      { new: true }
    );

    if (!order) return res.status(404).send("Đơn hàng không được tìm thấy.");
    res.send(order);
  } catch (error) {
    res.status(500).send("Có lỗi xảy ra.");
  }
});

app.post("/vouchers/add", async (req: Request, res: Response) => {
  const { code, discountAmount, expirationDate, isActive, quantity } = req.body;

  try {
    const voucher = new Voucher({
      code,
      discountAmount,
      expirationDate,
      isActive,
      quantity,
    });
    await voucher.save();
    res
      .status(201)
      .json({ message: "Phiếu mua hàng đã được tạo thành công", voucher });
  } catch (error) {
    res.status(400).json({ message: "Lỗi khi tạo phiếu giảm giá", error });
  }
});

app.get("/vouchers", async (req: Request, res: Response) => {
  try {
    const vouchers = await Voucher.find();
    res.json(vouchers);
  } catch (error) {
    console.error("Lỗi khi tải phiếu giảm giá:", error);
    res.status(500).json({ message: "Không lấy được phiếu giảm giá" });
  }
});

app.get("/vouchers/:id", async (req: Request, res: Response) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher)
      return res.status(404).json({ message: "Không tìm thấy phiếu giảm giá" });
    res.status(200).json(voucher);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tải phiếu giảm giá", error });
  }
});

app.put("/vouchers/:id", async (req, res) => {
  const { id } = req.params;
  const { code, discountAmount, expirationDate, quantity, isActive } = req.body; // Get updated data from the request body

  try {
    const updatedVoucher = await Voucher.findByIdAndUpdate(
      id,
      { code, discountAmount, expirationDate, quantity, isActive },
      { new: true }
    );

    if (!updatedVoucher) {
      return res.status(404).json({ message: "Không tìm thấy phiếu giảm giá" });
    }

    res.json(updatedVoucher);
  } catch (error) {
    console.error("Lỗi khi cập nhật phiếu giảm giá:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật phiếu giảm giá" });
  }
});

app.delete("/vouchers/:id", async (req: Request, res: Response) => {
  try {
    const deletedVoucher = await Voucher.findByIdAndDelete(req.params.id);
    if (!deletedVoucher)
      return res.status(404).json({ message: "Không tìm thấy phiếu giảm giá" });
    res
      .status(200)
      .json({ message: "Đã xóa phiếu giảm giá thành công", deletedVoucher });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa phiếu giảm giá", error });
  }
});

app.put("/vouchers/:id/toggle", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({ message: "Không tìm thấy phiếu giảm giá" });
    }

    voucher.isActive = !voucher.isActive;
    await voucher.save();

    res
      .status(200)
      .json({ message: "Trạng thái phiếu giảm giá đã cập nhật", voucher });
  } catch (error) {
    console.error("Lỗi khi chuyển đổi trạng thái phiếu giảm giá:", error);
    res.status(500).json({ message: "Lỗi máy chủ" });
  }
});

app.post("/voucher/apply", async (req: Request, res: Response) => {
  const { code } = req.body;

  try {
    // Xác thực dữ liệu yêu cầu
    if (!code) {
      return res.status(400).json({ message: "Cần có mã phiếu giảm giá" });
    }

    // Tìm phiếu giảm giá theo mã
    const voucher = await Voucher.findOne({ code });
    if (!voucher) {
      return res.status(404).json({ message: "Không tìm thấy phiếu giảm giá" });
    }

    // Kiểm tra xem phiếu giảm giá có hoạt động và chưa hết hạn không
    if (!voucher.isActive || voucher.expirationDate < new Date()) {
      return res
        .status(400)
        .json({ message: "Phiếu giảm giá không có hiệu lực hoặc đã hết hạn" });
    }

    // Kiểm tra xem phiếu giảm giá còn số lượng không
    if (voucher.quantity <= 0) {
      return res.status(400).json({ message: "Phiếu giảm giá đã hết hàng" });
    }

    // Trả lại số tiền giảm giá
    res.status(200).json({
      discountAmount: voucher.discountAmount,
      discountPercentage: voucher.discountPercentage || undefined,
      description: voucher.description || undefined,
    });
  } catch (error) {
    console.error("Lỗi khi áp dụng phiếu giảm giá:", error);
    res
      .status(500)
      .json({ message: "Không áp dụng được phiếu giảm giá", error });
  }
});

app.post("/checkout", async (req, res) => {
  const { userId } = req.body;

  try {
    const hasPriceChanged = await validateCartItems(userId);

    if (hasPriceChanged) {
      await Cart.updateOne({ userId }, { items: [] });

      return res.status(400).json({
        message: "Product prices have changed. The cart has been reset.",
      });
    }

    res.status(200).json({ message: "Checkout successful!" });
  } catch (error) {
    res.status(500).json({ message: error });
  }
});

app.get("/user/:id/status", async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("active reason");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ active: user.active, reason: user.reason });
  } catch (error) {
    console.error("Error checking user status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại cổng: ${PORT}`);
});

// Ngân hàng	NCB
// Số thẻ	9704198526191432198
// Tên chủ thẻ	NGUYEN VAN A
// Ngày phát hành	07/15
// Mật khẩu OTP	123456
