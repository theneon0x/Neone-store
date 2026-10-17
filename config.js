// Neone store settings.
// When you want to change something (like the category order), change it here.

const NEONE_CONFIG = {
  // These two are safe to keep in a website. They are not secret.
  supabaseUrl: 'https://fxmaantivabhhmxbdnac.supabase.co',
  supabaseKey: 'sb_publishable_z2gDUK1qzPGyEB566cFfHg_c-DRJXHv',

  // The WhatsApp number that receives orders. Digits only, with the country code and no + sign.
  // Example: 2348012345678
  // Until you replace this, the "Send order" button will tell you the number is not set.
  whatsappNumber: '2348058602764',

  // Google Analytics: your Measurement ID, which looks like G-ABC123XYZ.
  // Analytics only load after a visitor taps Accept on the cookie banner.
  gaMeasurementId: 'G-QMJ6QFYN7C',

  // The message a customer sends when they ask to join your WhatsApp updates.
  // Their name goes after "My name is:". Each \n is a line break.
  updatesMessage: 'Hi Neone, please add me to your Broadcast for new arrivals.\n\nMy name is: ',

  // Change this date whenever you change the Terms or the Delivery and Returns policy.
  // Customers who agreed before will then be asked to agree again on their next order.
  termsVersion: '2026-10-15',

  // The most items a customer can put on one order.
  orderCap: 15,

  // The order the category buttons appear in on the shop page.
  // A category only shows when it has at least one active product.
  categories: {
    men: ['Tops', 'Bottoms', 'Shoes', 'Slides', 'Headwear', 'Accessories', 'Others'],
    women: ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Bags', 'Accessories', 'Others']
  }
};
