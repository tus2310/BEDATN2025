import express, { Request, Response } from "express";
import Cart, { ICartItem, IPopulatedCart, IPopulatedCartItem } from "./cart";
import Product from "./product"; // Adjust the import path as necessary
// Define interfaces for better type safety
interface Variant {
  color: string;
  basePrice: number;
  discount?: number;
  subVariants: SubVariant[];
}

interface SubVariant {
  specification: string;
  value: string;
  additionalPrice: number;
  quantity: number;
}

interface IProduct {
  _id: string;
  name: string;
  status: "active" | "deactive";
  variants: Variant[];
}

// Utility function to calculate item price
export const calculateItemPrice = (
  variant: Variant,
  subVariant?: SubVariant
): number => {
  let price = Number(variant.basePrice) || 0;
  if (isNaN(price)) {
    console.log(`Invalid basePrice for variant: ${JSON.stringify(variant)}`);
    price = 0;
  }

  if (subVariant) {
    const additionalPrice = Number(subVariant.additionalPrice) || 0;
    if (isNaN(additionalPrice)) {
      console.log(
        `Invalid additionalPrice for subVariant: ${JSON.stringify(subVariant)}`
      );
    } else {
      price += additionalPrice;
    }
  }

  const discount = Number(variant.discount) || 0;
  if (isNaN(discount)) {
    console.log(`Invalid discount for variant: ${JSON.stringify(variant)}`);
  } else {
    price -= discount;
  }

  console.log(
    `Calculated price: ${price}, Base: ${
      variant.basePrice
    }, SubVariant Additional: ${
      subVariant?.additionalPrice || 0
    }, Discount: ${discount}`
  );
  return price;
};

// Utility function to validate cart items
export const validateCartItems = async (
  userId: string
): Promise<{ hasChanged: boolean; reason: string }> => {
  console.log(`Fetching cart for userId: ${userId}`);
  const cart = await Cart.findOne({ userId });
  console.log(`Cart fetched: ${JSON.stringify(cart, null, 2)}`);

  if (!cart) {
    console.log("Cart not found for userId:", userId);
    return { hasChanged: false, reason: "Cart not found" };
  }

  let cartChanged = false;
  const removedProducts: string[] = [];
  const updatedItems: ICartItem[] = [];

  // Check each item in the cart
  for (const item of cart.items as ICartItem[]) {
    // Fetch the product directly
    const product = (await Product.findById(item.productId)) as IProduct | null;
    console.log(
      `Product for item ${item.productId}: ${JSON.stringify(product, null, 2)}`
    );
    if (!product) {
      console.log(`Product not found for productId: ${item.productId}`);
      removedProducts.push(item.name);
      cartChanged = true;
      continue; // Skip this item since the product is missing
    }

    // Check product status
    console.log(
      `Checking status for productId ${item.productId}: Status = ${product.status}`
    );
    if (product.status === "deactive") {
      console.log(`Product ${product.name} is deactive, removing from cart`);
      removedProducts.push(product.name);
      cartChanged = true;
      continue; // Skip this item since it’s deactive
    }

    // If the product is active, keep it in the cart
    updatedItems.push(item);

    // Existing checks (price and variant name)
    const variant = product.variants.find(
      (v: Variant) => v.color === item.color
    );

    if (!variant) {
      console.log(
        `Variant not found for productId: ${item.productId}, color: ${item.color}`
      );
      return {
        hasChanged: true,
        reason: `Variant not found for product: ${item.productId}`,
      };
    }

    // --- Check Price Change ---
    let calculatedPrice = calculateItemPrice(
      variant,
      item.subVariant
        ? variant.subVariants.find(
            (sv: SubVariant) =>
              sv.specification === item.subVariant?.specification &&
              sv.value === item.subVariant?.value
          )
        : undefined
    );

    console.log(
      `Comparing prices for productId ${item.productId}: Cart Price = ${item.price}, Calculated Price = ${calculatedPrice}`
    );
    if (calculatedPrice !== item.price) {
      console.log(
        `Price mismatch detected: ${item.price} (cart) != ${calculatedPrice} (calculated)`
      );
      return {
        hasChanged: true,
        reason: "Product prices have changed. The cart has been reset.",
      };
    }

    // --- Check Variant Name Change ---
    const cartVariantName = item.subVariant
      ? `${item.subVariant.specification}: ${item.subVariant.value}`
      : item.color;

    const currentSubVariant = item.subVariant
      ? variant.subVariants.find(
          (sv: SubVariant) =>
            sv.specification === item.subVariant?.specification &&
            sv.value === item.subVariant?.value
        )
      : null;

    const currentVariantName = currentSubVariant
      ? `${currentSubVariant.specification}: ${currentSubVariant.value}`
      : variant.color;

    console.log(
      `Comparing variant names for productId ${item.productId}: Cart Variant = ${cartVariantName}, Current Variant = ${currentVariantName}`
    );
    if (cartVariantName !== currentVariantName) {
      console.log(
        `Variant name mismatch detected: ${cartVariantName} (cart) != ${currentVariantName} (current)`
      );
      return {
        hasChanged: true,
        reason: "Variant names have changed. The cart has been reset.",
      };
    }
  }

  // If any products were removed, update the cart
  if (cartChanged) {
    cart.items = updatedItems;
    await cart.save();
    console.log(
      `Updated cart after removing inactive products: ${JSON.stringify(
        cart,
        null,
        2
      )}`
    );
    const reason =
      removedProducts.length > 0
        ? `The following products have been removed from your cart because they are no longer active: ${removedProducts.join(
            ", "
          )}.`
        : "Some products were removed from your cart because they no longer exist.";
    return { hasChanged: true, reason };
  }

  console.log("No changes detected in cart items");
  return { hasChanged: false, reason: "" };
};
