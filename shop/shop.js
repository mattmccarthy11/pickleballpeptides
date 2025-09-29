// ========================================
// SHOPIFY CONFIGURATION
// ========================================

// TODO: Replace these with your actual Shopify credentials
// Get these from: Shopify Admin > Apps > Create a custom app > Storefront API
const SHOPIFY_CONFIG = {
    domain: 'your-store.myshopify.com', // Replace with your Shopify domain
    storefrontAccessToken: 'YOUR_STOREFRONT_ACCESS_TOKEN', // Replace with your token
    apiVersion: '2024-01'
};

// ========================================
// CART STATE MANAGEMENT
// ========================================
let cart = {
    items: [],
    subtotal: 0,
    total: 0
};

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('pickleballpeptides_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartUI();
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('pickleballpeptides_cart', JSON.stringify(cart));
    updateCartUI();
}

// ========================================
// SHOPIFY INTEGRATION
// ========================================

// Initialize Shopify Buy Button SDK
function initializeShopify() {
    // Check if Shopify SDK is available and configured
    if (typeof ShopifyBuy === 'undefined') {
        console.warn('Shopify SDK not loaded. Using manual product display.');
        showManualProducts();
        return;
    }

    // Check if configuration is set
    if (SHOPIFY_CONFIG.storefrontAccessToken === 'YOUR_STOREFRONT_ACCESS_TOKEN') {
        console.warn('Shopify not configured. Using manual product display.');
        showManualProducts();
        return;
    }

    try {
        // Initialize Shopify client
        const client = ShopifyBuy.buildClient({
            domain: SHOPIFY_CONFIG.domain,
            storefrontAccessToken: SHOPIFY_CONFIG.storefrontAccessToken
        });

        // Fetch products
        client.product.fetchAll().then((products) => {
            if (products.length > 0) {
                displayShopifyProducts(products);
            } else {
                showManualProducts();
            }
        }).catch((error) => {
            console.error('Error fetching Shopify products:', error);
            showManualProducts();
        });
    } catch (error) {
        console.error('Error initializing Shopify:', error);
        showManualProducts();
    }
}

// Display Shopify products
function displayShopifyProducts(products) {
    const shopGrid = document.getElementById('shopGrid');
    shopGrid.innerHTML = '';

    products.forEach(product => {
        const productCard = createShopifyProductCard(product);
        shopGrid.appendChild(productCard);
    });
}

// Create Shopify product card
function createShopifyProductCard(product) {
    const card = document.createElement('div');
    card.className = 'shop-product-card';

    const variant = product.variants[0];
    const price = parseFloat(variant.price);

    card.innerHTML = `
        <div class="shop-product-image">
            ${product.images[0] ?
                `<img src="${product.images[0].src}" alt="${product.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--border-radius);">` :
                '<span class="molecule-icon-shop">🧬</span>'
            }
        </div>
        <div class="shop-product-info">
            <h3>${product.title}</h3>
            <p class="product-subtitle-shop">${product.productType || 'Research Peptide'}</p>
            <div class="product-details-shop">
                <p>${product.description}</p>
            </div>
            <div class="product-footer-shop">
                <div class="price-info">
                    <span class="price-label">Price:</span>
                    <span class="price-amount">$${price.toFixed(2)}</span>
                </div>
                <div class="quantity-selector">
                    <label>Qty:</label>
                    <input type="number" min="1" max="10" value="1" class="qty-input" data-product-id="${product.id}">
                </div>
                <button class="btn-primary btn-add-cart" data-product-id="${product.id}" data-variant-id="${variant.id}">
                    Add to Cart
                </button>
            </div>
        </div>
    `;

    // Add event listener to add to cart button
    const addToCartBtn = card.querySelector('.btn-add-cart');
    addToCartBtn.addEventListener('click', () => {
        const qty = card.querySelector('.qty-input').value;
        addToCartShopify(product, variant, parseInt(qty));
    });

    return card;
}

// Add Shopify product to cart
function addToCartShopify(product, variant, quantity) {
    const item = {
        id: variant.id,
        productId: product.id,
        name: product.title,
        price: parseFloat(variant.price),
        quantity: quantity,
        image: product.images[0]?.src || null
    };

    addToCart(item);
}

// ========================================
// MANUAL PRODUCT DISPLAY (Fallback)
// ========================================

function showManualProducts() {
    const shopGrid = document.getElementById('shopGrid');
    const manualProducts = document.getElementById('manualProducts');

    shopGrid.style.display = 'none';
    manualProducts.style.display = 'grid';

    // Add event listeners to manual add-to-cart buttons
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.shop-product-card');
            const productId = this.dataset.productId;
            const productName = card.querySelector('h3').textContent;
            const productPrice = parseFloat(card.dataset.price);
            const quantity = parseInt(card.querySelector('.qty-input').value);

            const item = {
                id: productId,
                productId: productId,
                name: productName,
                price: productPrice,
                quantity: quantity,
                image: null
            };

            addToCart(item);
        });
    });
}

// ========================================
// CART FUNCTIONS
// ========================================

function addToCart(item) {
    // Check if item already exists in cart
    const existingItem = cart.items.find(i => i.id === item.id);

    if (existingItem) {
        existingItem.quantity += item.quantity;
    } else {
        cart.items.push(item);
    }

    calculateCartTotals();
    saveCart();
    showCartModal();

    // Show success notification
    showNotification(`${item.name} added to cart!`);
}

function removeFromCart(itemId) {
    cart.items = cart.items.filter(item => item.id !== itemId);
    calculateCartTotals();
    saveCart();
}

function updateCartItemQuantity(itemId, quantity) {
    const item = cart.items.find(i => i.id === itemId);
    if (item) {
        item.quantity = quantity;
        if (item.quantity <= 0) {
            removeFromCart(itemId);
        } else {
            calculateCartTotals();
            saveCart();
        }
    }
}

function calculateCartTotals() {
    cart.subtotal = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);

    cart.total = cart.subtotal; // Add shipping/taxes here if needed
}

function updateCartUI() {
    // Update cart count
    const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartCount').textContent = `${cartCount} item${cartCount !== 1 ? 's' : ''}`;

    // Update cart modal
    const cartBody = document.getElementById('cartBody');
    const emptyCart = document.getElementById('emptyCart');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');

    if (cart.items.length === 0) {
        emptyCart.style.display = 'block';
        cartItems.style.display = 'none';
        cartFooter.style.display = 'none';
    } else {
        emptyCart.style.display = 'none';
        cartItems.style.display = 'block';
        cartFooter.style.display = 'block';

        // Render cart items
        cartItems.innerHTML = cart.items.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-image">
                    ${item.image ?
                        `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: var(--border-radius);">` :
                        '🧬'
                    }
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn qty-decrease" data-item-id="${item.id}">-</button>
                        <input type="number" value="${item.quantity}" min="1" class="qty-input-cart" data-item-id="${item.id}">
                        <button class="qty-btn qty-increase" data-item-id="${item.id}">+</button>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-item-total">$${(item.price * item.quantity).toFixed(2)}</div>
                    <button class="btn-remove" data-item-id="${item.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        // Update totals
        document.getElementById('cartSubtotal').textContent = `$${cart.subtotal.toFixed(2)}`;
        document.getElementById('cartTotal').textContent = `$${cart.total.toFixed(2)}`;

        // Add event listeners
        addCartItemListeners();
    }
}

function addCartItemListeners() {
    // Remove buttons
    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            removeFromCart(itemId);
        });
    });

    // Quantity buttons
    document.querySelectorAll('.qty-decrease').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            const item = cart.items.find(i => i.id === itemId);
            if (item) {
                updateCartItemQuantity(itemId, item.quantity - 1);
            }
        });
    });

    document.querySelectorAll('.qty-increase').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.dataset.itemId;
            const item = cart.items.find(i => i.id === itemId);
            if (item) {
                updateCartItemQuantity(itemId, item.quantity + 1);
            }
        });
    });

    document.querySelectorAll('.qty-input-cart').forEach(input => {
        input.addEventListener('change', function() {
            const itemId = this.dataset.itemId;
            const newQty = parseInt(this.value);
            if (newQty > 0) {
                updateCartItemQuantity(itemId, newQty);
            }
        });
    });
}

// ========================================
// CART MODAL
// ========================================

function showCartModal() {
    const cartModal = document.getElementById('cartModal');
    cartModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideCartModal() {
    const cartModal = document.getElementById('cartModal');
    cartModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ========================================
// CHECKOUT
// ========================================

function proceedToCheckout() {
    if (cart.items.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // If Shopify is configured, redirect to Shopify checkout
    if (SHOPIFY_CONFIG.storefrontAccessToken !== 'YOUR_STOREFRONT_ACCESS_TOKEN') {
        // Create Shopify checkout
        alert('Redirecting to secure checkout... (Shopify integration pending)');
        // Implement actual Shopify checkout here
    } else {
        // Show placeholder checkout message
        alert('Checkout functionality coming soon! Contact us at orders@pickleballpeptides.com to complete your order.');
    }
}

// ========================================
// NOTIFICATIONS
// ========================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background-color: var(--secondary-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 10000;
        animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100px); opacity: 0; }
    }
    .qty-btn {
        width: 30px;
        height: 30px;
        border: 2px solid var(--light);
        border-radius: var(--border-radius);
        background-color: var(--white);
        cursor: pointer;
        font-weight: bold;
        transition: var(--transition);
    }
    .qty-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
    }
    .qty-input-cart {
        width: 50px;
        text-align: center;
        border: 2px solid var(--light);
        border-radius: var(--border-radius);
        padding: 0.25rem;
    }
    .cart-item-total {
        font-weight: bold;
        color: var(--primary-color);
        font-size: 1.125rem;
    }
`;
document.head.appendChild(style);

// ========================================
// SORTING AND FILTERING
// ========================================

function sortProducts(sortBy) {
    const productsContainer = document.querySelector('.manual-products');
    if (!productsContainer || productsContainer.style.display === 'none') return;

    const products = Array.from(productsContainer.querySelectorAll('.shop-product-card'));

    products.sort((a, b) => {
        switch (sortBy) {
            case 'price-low':
                return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
            case 'price-high':
                return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
            case 'name':
                return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
            default: // featured
                return 0;
        }
    });

    products.forEach(product => productsContainer.appendChild(product));
}

// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Load cart from storage
    loadCart();

    // Initialize Shopify or show manual products
    initializeShopify();

    // View cart button
    document.getElementById('viewCartBtn').addEventListener('click', showCartModal);

    // Cart close buttons
    document.getElementById('cartClose').addEventListener('click', hideCartModal);
    document.getElementById('cartOverlay').addEventListener('click', hideCartModal);
    document.getElementById('continueShopping').addEventListener('click', hideCartModal);
    document.getElementById('continueShoppingFooter').addEventListener('click', hideCartModal);

    // Checkout button
    document.getElementById('checkoutBtn').addEventListener('click', proceedToCheckout);

    // Sort filter
    document.getElementById('sortFilter').addEventListener('change', (e) => {
        sortProducts(e.target.value);
    });

    // Mobile navigation
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');

    mobileToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close cart with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideCartModal();
        }
    });
});

// ========================================
// CONSOLE MESSAGE
// ========================================
console.log('%c🛒 Shop Page Loaded', 'font-size: 16px; font-weight: bold; color: #2563eb;');
console.log('%cTo configure Shopify integration, update SHOPIFY_CONFIG in shop.js', 'font-size: 12px; color: #666;');