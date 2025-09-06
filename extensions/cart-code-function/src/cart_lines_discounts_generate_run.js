import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from '../generated/api';

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * Expected discount metafield JSON (namespace: "promo", key: "config"):
 * {
 *   "codes": {
 *     "SAVE10": { "type": "order", "percent": 10, "message": "10% off order" },
 *     "SHOES20": {
 *       "type": "product",
 *       "percent": 20,
 *       "productIds": ["gid://shopify/Product/123", "gid://shopify/Product/456"],
 *       "message": "20% off selected products"
 *     }
 *   }
 * }
 */

/**
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const cart = input?.cart;
  const lines = cart?.lines ?? [];
  if (!lines.length) return { operations: [] };

  // Which classes is this discount allowed to emit?
  const classes = input?.discount?.discountClasses ?? [];
  const allowOrder   = classes.includes(DiscountClass.Order);
  const allowProduct = classes.includes(DiscountClass.Product);

  // Read code from cart attribute (defined in input query)
  const codeRaw = cart?.attribute?.value ?? '';
  const code = String(codeRaw).trim().toUpperCase();
  if (!code) return { operations: [] };

  // Read JSON config from the discount metafield (defined in input query)
  let cfg = {};
  try {
    const raw = input?.discount?.metafield?.value;
    cfg = raw ? JSON.parse(raw) : {};
  } catch (_) { /* ignore */ }

  // Fallback rules if metafield not set (edit/remove as you like)
  const fallback = {
    codes: {
      SAVE10: { type: 'order',   percent: 10, message: '10% off order' },
      TOP20:  { type: 'product', percent: 20, message: '20% off top item' }
    }
  };

  const rule = (cfg?.codes && cfg.codes[code]) || fallback.codes[code];
  if (!rule) return { operations: [] };

  // Sanitize percent (the scaffolded types accept a percent number like 10 = 10%)
  const percent = Math.max(0, Math.min(100, Number(rule.percent || 0)));
  if (percent <= 0) return { operations: [] };

  const ops = [];

  // PRODUCT discount: apply to configured products; if none configured, fall back to ALL lines.
  if (rule.type === 'product' && allowProduct) {
    /** @type {string[]|undefined} */
    const allowIds = rule.productIds && Array.isArray(rule.productIds) ? rule.productIds : undefined;

    /** @type {{cartLine:{id:string}}[]} */
    const targets = [];

    for (const line of lines) {
      // Input query should include merchandise -> ProductVariant -> product { id }
      const productId = line?.merchandise?.product?.id;
      // If a list was provided, only include those; otherwise include all lines
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
          selectionStrategy: ProductDiscountSelectionStrategy.First
        }
      });
    }
  }

  // ORDER discount: percentage off order subtotal (if allowed)
  if (rule.type === 'order' && allowOrder) {
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
        selectionStrategy: OrderDiscountSelectionStrategy.First
      }
    });
  }

  return { operations: ops };
}
