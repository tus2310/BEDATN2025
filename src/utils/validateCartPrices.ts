import express, { Request, Response } from "express";
import Cart from "../cart";

// Utility function to validate cart items (price and name)
export const validateCartItems = async (
  userId: string
): Promise<{ hasChanged: boolean; reason: string }> => {
  // Populate cart with product details
  const cart = await Cart.findOne({ userId }).populate("items.productId");

  if (!cart) {
    return { hasChanged: false, reason: "Cart not found" };
  }

  for (const item of cart.items) {
    const product = item.productId as any; // Type assertion; improve with proper typing
    if (!product) {
      return {
        hasChanged: true,
        reason: `Product not found: ${item.productId}`,
      };
    }

    // Find the corresponding variant in the product by color
    const variant = product.variants.find((v: any) => v.color === item.color);

    // --- Check Price Change ---
    // Calculate total price based on whether subVariant exists
    let calculatedPrice = variant.basePrice;

    if (item.subVariant) {
      // Safely handle subVariant being defined
      const subVariant = variant.subVariants.find(
        (sv: any) =>
          sv.specification === item.subVariant?.specification &&
          sv.value === item.subVariant?.value
      );

      if (!subVariant) {
        return {
          hasChanged: true,
          reason: "Sub-variant not found. The cart has been reset.",
        };
      }
      if (!subVariant) {
        return {
          hasChanged: true,
          reason: "Sub-variant not found. t.",
        };
      }

      // Add additionalPrice from subVariant
      calculatedPrice += subVariant.additionalPrice || 0;
    }

    // Apply discount if it exists
    const discount = variant.discount || 0;
    calculatedPrice -= discount;

    // Compare calculated price with cart item's price
    if (calculatedPrice !== item.price) {
      return {
        hasChanged: true,
        reason: "Product prices have changed. The cart has been reset.",
      };
    }

    // --- Check Variant Name Change ---
    // Construct the variant name in the cart
    const cartVariantName = item.subVariant
      ? `${item.subVariant.specification}: ${item.subVariant.value}`
      : item.color;

    // Construct the current variant name from the product data
    const currentSubVariant = item.subVariant
      ? variant.subVariants.find(
          (sv: any) =>
            sv.specification === item.subVariant?.specification &&
            sv.value === item.subVariant?.value
        )
      : null;

    const currentVariantName = currentSubVariant
      ? `${currentSubVariant.specification}: ${currentSubVariant.value}`
      : variant.color;

    // Compare the variant names
    if (cartVariantName !== currentVariantName) {
      return {
        hasChanged: true,
        reason: "Variant names have changed. The cart has been reset.",
      };
    }
    if (cartVariantName !== currentVariantName) {
      return {
        hasChanged: true,
        reason: "Variant names have changed. The cart has been reset.",
      };
    }
  }

  return { hasChanged: false, reason: "" };
};
export const calculateItemPrice = (variant: any, subVariant?: any): number => {
  let price = Number(variant.basePrice) || 0;
  if (subVariant) {
    price += Number(subVariant.additionalPrice) || 0;
  }
  const discount = Number(variant.discount) || 0;
  price -= discount;
  return price;
};

// /checkout endpoint
