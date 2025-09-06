import { extension, Banner, Link } from '@shopify/ui-extensions/checkout';

export default extension('purchase.checkout.block.render', (root, api) => {
  const { discountCodes, applyDiscountCodeChange, attributes, applyAttributeChange } = api;

  const ALWAYS_REMOVE_ON_CHECKOUT = false;

  const info = (text) => root.createComponent(Banner, { status: 'info' }, text);
  const warn = (text) => root.createComponent(Banner, { status: 'warning' }, text);
  const crit = (text) => root.createComponent(Banner, { status: 'critical' }, text);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  async function clearFlag() {
    try {
      await applyAttributeChange({ type: 'updateAttribute', key: 'rm_discount_all', value: '' });
      await applyAttributeChange({ type: 'updateAttribute', key: 'rm_discount_ts',  value: '' });
    } catch {}
  }

  async function removeAllCodesStrong(timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    let lastCount = -1;

    while (Date.now() < deadline) {
      const codesNow = (discountCodes?.current || []).map(c => c.code);
      if (!codesNow.length) return true;

      try {
        await applyDiscountCodeChange({ type: 'replaceDiscountCodes', codes: [] });
      } catch {}

      for (const code of (discountCodes?.current || []).map(c => c.code)) {
        try {
          const res = await applyDiscountCodeChange({ type: 'removeDiscountCode', code });
        } catch {}
      }

      await delay(150);
      const nowCount = (discountCodes?.current || []).length;
      if (nowCount === 0) return true;
      if (nowCount === lastCount) await delay(200);
      lastCount = nowCount;
    }
    return (discountCodes?.current || []).length === 0;
  }

  async function autoRemoveIfNeeded() {
    const attrs = attributes?.current || [];
    const flag  = attrs.find(a => a.key === 'rm_discount_all')?.value;

    if (ALWAYS_REMOVE_ON_CHECKOUT || flag === '1') {
      root.removeChildren();
      root.appendChild(info('Removing discount…'));
      const ok = await removeAllCodesStrong();
      await clearFlag();
      root.removeChildren();
      if (!ok) {
        root.appendChild(warn('Tried to remove discount code(s). If a discount still shows with no code listed, it is likely an automatic discount configured in Admin.'));
      }
      render();
    }
  }

  async function onRemoveClick() {
    root.removeChildren();
    root.appendChild(info('Removing discount…'));
    const ok = await removeAllCodesStrong();
    root.removeChildren();
    if (!ok) {
      root.appendChild(crit('Could not fully remove discount code(s). If a discount persists with no code shown, it is an automatic discount (Admin › Discounts).'));
    }
    render();
  }

  function render() {
    root.removeChildren();
    const codes = discountCodes?.current || [];
    if (codes.length) {
      const text = `Discount applied: ${codes.map(c => c.code).join(', ')}. `;
      const removeLink = root.createComponent(Link, { onPress: onRemoveClick }, 'Remove');
      root.appendChild(root.createComponent(Banner, { status: 'info' }, text, removeLink));
    }
  }

  // First: try auto-remove, then render current state
  autoRemoveIfNeeded().then(render).catch(() => render());

  // Keep UI in sync
  discountCodes?.subscribe(render);
  attributes?.subscribe(autoRemoveIfNeeded);
});
