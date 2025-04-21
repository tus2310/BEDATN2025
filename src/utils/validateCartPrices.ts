import Cart from "../cart";
import Product from "../product";

export const validateCartPrices = async (userId: string): Promise<boolean> => {
  // Điền thông tin chi tiết về sản phẩm vào giỏ hàng
  const cart = await Cart.findOne({ userId }).populate("items.productId");

  if (!cart) throw new Error("Cart not found");

  let hasPriceChanged = false;

  for (const item of cart.items) {
    const product = item.productId as any; // Khẳng định kiểu; cải thiện bằng cách nhập đúng
    if (!product) throw new Error(`Product not found: ${item.productId}`);

    // Tìm biến thể tương ứng trong sản phẩm theo màu
    const variant = product.variants.find((v: any) => v.color === item.color);

    if (!variant) {
      hasPriceChanged = true;
      break;
    }

    // Tính tổng giá dựa trên việc subVariant có tồn tại hay không
    let calculatedPrice = variant.basePrice;

    if (item.subVariant) {
      // Xử lý subVariant được định nghĩa một cách an toàn
      const subVariant = variant.subVariants.find(
        (sv: any) =>
          sv.specification === item.subVariant?.specification &&
          sv.value === item.subVariant?.value
      );

      if (!subVariant) {
        hasPriceChanged = true;
        break;
      }

      // Thêm additionalPrice từ subVariant
      calculatedPrice += subVariant.additionalPrice || 0;
    } else {
      // Nếu không có subVariant nào trong mục giỏ hàng, hãy đảm bảo biến thể sản phẩm không có giá subVariant nào ảnh hưởng đến nó
      // Giả sử basePrice là yếu tố giá duy nhất khi không chọn subVariant
    }

    // Áp dụng chiết khấu nếu có
    const discount = variant.discount || 0;
    calculatedPrice -= discount;

    // So sánh giá đã tính toán với giá của mục giỏ hàng
    if (calculatedPrice !== item.price) {
      hasPriceChanged = true;
      break;
    }
  }

  return hasPriceChanged;
};
