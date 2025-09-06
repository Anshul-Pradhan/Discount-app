# README  

## Overview  
This project implements a **promo code input system** on the cart page, allowing customers to apply and remove discount codes.  

Store Password: test.
Testing Promo Code: Save 10%.

The project went through two stages:  
1. **Static JSON-based setup** → Initial version where discount codes and their rules were hardcoded in a JSON structure.  
2. **Shopify Admin-based setup** → Final version where discounts were created directly in Shopify Admin and validated dynamically when customers enter them.  

---

## Approach  

### Stage 1: Static JSON Configuration  
- At first, I defined discount codes in a JSON metafield.  
- Each code had properties like type (`order` or `product`), discount percent, and product IDs (for product-level discounts).  
- The cart page logic checked the entered code against this JSON and applied the discount if it matched.  
- Example:  

```json
{
  "codes": {
    "SAVE10": { 
      "type": "order", 
      "percent": 10, 
      "message": "10% off your entire order" 
    },
    "SHOES20": {
      "type": "product",
      "percent": 20,
      "productIds": ["gid://shopify/Product/123", "gid://shopify/Product/456"],
      "message": "20% off selected shoes"
    }
  }
}
```  

This worked for testing, but had limitations (manual updates, no native Shopify tracking).  

---

### Stage 2: Shopify Admin Cart Discounts  
- For the final implementation, I created discount codes directly in **Shopify Admin** (e.g., `SAVE 10%`).  
- The cart page input field takes user input and checks it against the existing Admin-created discount codes.  
- If valid, the discount is applied to the cart using Shopify’s native discount system.  
- Customers can also remove the discount, and the cart updates instantly.  

This approach is **more reliable**, since:  
- Discounts are managed in Shopify Admin (no manual JSON editing).  
- Expiry dates, usage limits, and advanced conditions are supported natively.  
- Tracking and reporting for discounts is handled by Shopify.  

---

## Assumptions  
- All discount codes are **created and managed in Shopify Admin**.  
- The input field on the cart page passes the code to Shopify’s discount system.  
- Customers can only apply one discount at a time.  
- Storefront API and permissions are properly enabled to support discount application.  

---

## Limitations  
- The current system doesn’t support multiple stacked discounts.  
- If the entered code doesn’t exist in Admin, the customer only sees a basic error message.  
- Advanced logic (e.g., “buy one get one free” or product bundles) relies entirely on Shopify Admin setup, not custom code.  
- Any API errors (e.g., 401 Unauthorized, CORS issues) may block the discount application unless fixed at the store configuration level.  

---

## Future Improvements  
- Support applying/removing multiple discount codes if Shopify adds support.  
- Better error messages (e.g., “This code is expired” instead of just “Invalid”).  
- Enhanced UI feedback (badges, banners, animations when codes are applied).  
- Analytics tracking for which codes are applied most often.  

---

## Conclusion  
- The initial static JSON setup was useful for testing logic and UI flow.  
- The final implementation uses **Shopify Admin-created cart discounts**, making it more scalable, reliable, and aligned with Shopify’s ecosystem.  
- Customers get a simple input field to enter promo codes, and merchants get the full flexibility of Shopify’s discount engine.  
