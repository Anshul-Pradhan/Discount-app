// node_modules/@shopify/shopify_function/run.ts
function run_default(userfunction) {
  try {
    ShopifyFunction;
  } catch (e) {
    throw new Error(
      "ShopifyFunction is not defined. Please rebuild your function using the latest version of Shopify CLI."
    );
  }
  const input_obj = ShopifyFunction.readInput();
  const output_obj = userfunction(input_obj);
  ShopifyFunction.writeOutput(output_obj);
}

// extensions/cart-code-function/src/cart_lines_discounts_generate_run.js
function cartLinesDiscountsGenerateRun(input) {
  const cart = input?.cart;
  const lines = cart?.lines ?? [];
  if (!lines.length) return { operations: [] };
  const classes = input?.discount?.discountClasses ?? [];
  const allowOrder = classes.includes("ORDER" /* Order */);
  const allowProduct = classes.includes("PRODUCT" /* Product */);
  const codeRaw = cart?.attribute?.value ?? "";
  const code = String(codeRaw).trim().toUpperCase();
  if (!code) return { operations: [] };
  let cfg = {};
  try {
    const raw = input?.discount?.metafield?.value;
    cfg = raw ? JSON.parse(raw) : {};
  } catch (_) {
  }
  const fallback = {
    codes: {
      SAVE10: { type: "order", percent: 10, message: "10% off order" },
      TOP20: { type: "product", percent: 20, message: "20% off top item" }
    }
  };
  const rule = cfg?.codes && cfg.codes[code] || fallback.codes[code];
  if (!rule) return { operations: [] };
  const percent = Math.max(0, Math.min(100, Number(rule.percent || 0)));
  if (percent <= 0) return { operations: [] };
  const ops = [];
  if (rule.type === "product" && allowProduct) {
    const allowIds = rule.productIds && Array.isArray(rule.productIds) ? rule.productIds : void 0;
    const targets = [];
    for (const line of lines) {
      const productId = line?.merchandise?.product?.id;
      const include = allowIds ? allowIds.includes(productId) : true;
      if (include) {
        targets.push({ cartLine: { id: line.id } });
      }
    }
    if (targets.length > 0) {
      ops.push({
        productDiscountsAdd: {
          candidates: [
            {
              message: rule.message || code,
              targets,
              value: {
                percentage: { value: percent }
              }
            }
          ],
          // Apply the single candidate we provided (which already contains all target lines)
          selectionStrategy: "FIRST" /* First */
        }
      });
    }
  }
  if (rule.type === "order" && allowOrder) {
    ops.push({
      orderDiscountsAdd: {
        candidates: [
          {
            message: rule.message || code,
            targets: [
              { orderSubtotal: { excludedCartLineIds: [] } }
            ],
            value: {
              percentage: { value: percent }
            }
          }
        ],
        selectionStrategy: "FIRST" /* First */
      }
    });
  }
  return { operations: ops };
}

// extensions/cart-code-function/src/cart_delivery_options_discounts_generate_run.js
function cartDeliveryOptionsDiscountsGenerateRun(input) {
  const firstDeliveryGroup = input.cart.deliveryGroups[0];
  if (!firstDeliveryGroup) {
    throw new Error("No delivery groups found");
  }
  const hasShippingDiscountClass = input.discount.discountClasses.includes(
    "SHIPPING" /* Shipping */
  );
  if (!hasShippingDiscountClass) {
    return { operations: [] };
  }
  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates: [
            {
              message: "FREE DELIVERY",
              targets: [
                {
                  deliveryGroup: {
                    id: firstDeliveryGroup.id
                  }
                }
              ],
              value: {
                percentage: {
                  value: 100
                }
              }
            }
          ],
          selectionStrategy: "ALL" /* All */
        }
      }
    ]
  };
}

// <stdin>
function cartLinesDiscountsGenerateRun2() {
  return run_default(cartLinesDiscountsGenerateRun);
}
function cartDeliveryOptionsDiscountsGenerateRun2() {
  return run_default(cartDeliveryOptionsDiscountsGenerateRun);
}
export {
  cartDeliveryOptionsDiscountsGenerateRun2 as cartDeliveryOptionsDiscountsGenerateRun,
  cartLinesDiscountsGenerateRun2 as cartLinesDiscountsGenerateRun
};
