/* Product and category photos use raster assets from assets/images/categories. */
const CATEGORY_IMAGE_BY_TYPE = {
  keyboard: 'keyboards.png',
  mouse: 'mouse.png',
  headset: 'headset.png',
  monitor: 'monitor.png',
  pad: 'pad.png',
  chair: 'desk.png'
};

function productImage(product, loading = 'lazy') {
  const image = product.image || `assets/images/categories/${CATEGORY_IMAGE_BY_TYPE[product.type] || CATEGORY_IMAGE_BY_TYPE.keyboard}`;
  return `<img class="nexa-product-img" src="${esc(image)}" loading="${loading}" decoding="async" alt="${esc(product.name)}">`;
}
