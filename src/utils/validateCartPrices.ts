import Cart, {
  ICart,
  IPopulatedCart,
  ICartItem,
  IPopulatedCartItem,
} from "../cart";
import ProductModel from "../product"; // Import the Mongoose model (default export)
import { Product } from "../product"; // Import the Product interface (named export)

export const validateCartPrices = async (
  userId: string
): Promise<{
  hasPriceChanged: boolean;
  hasDeactivatedProducts: boolean;
  deactivatedProductNames: string[];
}> => {
  // Populate cart with product details, explicitly including status
  const cart = (await Cart.findOne({ userId })
    .populate<{ items: IPopulatedCartItem[] }>(
      "items.productId",
      "status name variants"
    )
    .lean()) as IPopulatedCart;

  if (!cart) throw new Error("Cart not found");

  let hasPriceChanged = false;
  let hasDeactivatedProducts = false;
  const deactivatedProductNames: string[] = [];
  const itemsToKeep: ICartItem[] = []; // Use ICartItem for items to save back to DB

  // Explicitly type the loop variable as IPopulatedCartItem
  for (const item of cart.items as IPopulatedCartItem[]) {
    const product = item.productId as Product; // Use the Product interface for type assertion
    if (!product) {
      hasDeactivatedProducts = true;
      deactivatedProductNames.push(item.name);
      continue;
    }

    // Check if the product is deactivated (status: false)
    if (product.status === false) {
      hasDeactivatedProducts = true;
      deactivatedProductNames.push(product.name);
      continue;
    }

    // Find the corresponding variant in the product by color
    const variant = product.variants.find((v) => v.color === item.color);

    if (!variant) {
      hasPriceChanged = true;
      break;
    }

    // Calculate total price based on whether subVariant exists
    let calculatedPrice = variant.basePrice;

    if (item.subVariant) {
      const subVariant = variant.subVariants.find(
        (sv) =>
          sv.specification === item.subVariant?.specification &&
          sv.value === item.subVariant?.value
      );

      if (!subVariant) {
        hasPriceChanged = true;
        break;
      }

      calculatedPrice += subVariant.additionalPrice || 0;
    }

    // Apply discount if it exists
    const discount = variant.discount || 0;
    calculatedPrice -= discount;

    // Compare calculated price with cart item's price
    if (calculatedPrice !== item.price) {
      hasPriceChanged = true;
      break;
    }

    // If the item passes all checks, keep it in the cart
    // Convert back to ICartItem by removing the populated productId
    const itemToKeep: ICartItem = {
      productId: (item.productId as any)._id, // Extract the ObjectId
      name: item.name,
      price: item.price,
      img: item.img,
      quantity: item.quantity,
      color: item.color,
      subVariant: item.subVariant,
    };
    itemsToKeep.push(itemToKeep);
  }

  // If there are deactivated products, update the cart to remove them
  if (hasDeactivatedProducts) {
    await Cart.updateOne({ userId }, { items: itemsToKeep });
  }

  return {
    hasPriceChanged,
    hasDeactivatedProducts,
    deactivatedProductNames,
  };
};
