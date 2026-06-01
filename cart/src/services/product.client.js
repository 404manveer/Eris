const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002/api/products';

export async function getProductPricing({ productId, authHeader }) {
  const response = await fetch(`${PRODUCT_SERVICE_URL}/${productId}`, {
    method: 'GET',
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Product service responded with status ${response.status}`);
  }

  const payload = await response.json();
  const amount = Number(payload?.data?.product?.price?.amount);
  const currency = payload?.data?.product?.price?.currency || 'INR';

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Invalid product price payload');
  }

  return { amount, currency };
}

export default {
  getProductPricing,
};
