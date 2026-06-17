 /* =========================================================
   VAL STORE - Cart + Filters + Live Chat Checkout
   ========================================================= */

/* -------- 1. CART STATE (saved in localStorage) -------- */
const CART_KEY = 'val_cart_v1';

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartUI();
}

function addToCart(product) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    saveCart(cart);
    flashAdded();
}

function removeFromCart(id) {
    const cart = getCart().filter(item => item.id !== id);
    saveCart(cart);
}

function changeQty(id, delta) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        saveCart(cart.filter(i => i.id !== id));
    } else {
        saveCart(cart);
    }
}

function cartTotal() {
    return getCart().reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function cartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/* -------- 2. CART UI -------- */
function formatPrice(n) {
    return '$' + n.toLocaleString();
}

function updateCartUI() {
    const cart = getCart();
    const itemsEl = document.getElementById('cartItems');
    const totalEl = document.getElementById('cartTotal');
    const countEl = document.getElementById('cartCount');

    if (countEl) countEl.textContent = cartCount();

    if (!itemsEl) return;

    if (cart.length === 0) {
        itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
        totalEl.textContent = formatPrice(0);
        return;
    }

    itemsEl.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.img}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p class="cart-item-price">${formatPrice(item.price)}</p>
                <div class="qty-controls">
                    <button data-action="dec" data-id="${item.id}">−</button>
                    <span>${item.qty}</span>
                    <button data-action="inc" data-id="${item.id}">+</button>
                    <button class="remove" data-action="remove" data-id="${item.id}">Remove</button>
                </div>
            </div>
        </div>
    `).join('');

    totalEl.textContent = formatPrice(cartTotal());
}

function openCart() {
    document.getElementById('cartDrawer').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
}

function closeCart() {
    document.getElementById('cartDrawer').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
}

function flashAdded() {
    const btn = document.getElementById('cartToggle');
    if (!btn) return;
    btn.classList.add('bump');
    setTimeout(() => btn.classList.remove('bump'), 300);
}

/* -------- 3. LIVE CHAT CHECKOUT -------- */
/* Builds the order summary message and opens the chat widget.
   Works with Tawk.to, Crisp, Tidio, LiveChat, Intercom, etc.
   Replace the openChatWidget() function with your provider's API call. */

function buildOrderMessage() {
    const cart = getCart();
    if (cart.length === 0) return null;

    const lines = cart.map(i =>
        `• ${i.name} (x${i.qty}) — ${formatPrice(i.price * i.qty)}`
    ).join('\n');

    return `🛒 *Val Store Order Request*\n\n${lines}\n\n*Total: ${formatPrice(cartTotal())}*\n\nPlease send me a secure payment link in live chat. After payment, I will send a screenshot confirmation and delivery details (state, phone number, address, email). Please arrange delivery within 3 days.`;
}

function openChatWidget(message) {
    // Try to wait for Tawk API to be ready
    const tryTawk = () => {
        if (window.Tawk_API && window.Tawk_API.onLoad) {
            if (message && typeof Tawk_API.setAttributes === 'function') {
                Tawk_API.setAttributes({ order: message, source: 'Cart Checkout' }, function(){});
            }
            if (message && typeof Tawk_API.addEvent === 'function') {
                Tawk_API.addEvent('Order from cart', { order: message });
            }
            if (typeof Tawk_API.maximize === 'function') {
                setTimeout(() => Tawk_API.maximize(), 500);
            }
            return true;
        }
        return false;
    };

    // ===== TAWK.TO =====
    if (tryTawk()) return true;

    // Retry after a short delay if not loaded yet
    setTimeout(() => {
        if (window.Tawk_API && !window.tawkRetried) {
            window.tawkRetried = true;
            tryTawk();
        }
    }, 1000);

    // ===== CRISP =====
    if (window.$crisp) {
        if (message) {
            $crisp.push(['set:message:prefill', message]);
        }
        $crisp.push(['do:chat:open']);
        return true;
    }

    // ===== TIDIO =====
    if (window.tidioChatApi) {
        if (message) {
            tidioChatApi.setVisitorData({ order: message });
        }
        tidioChatApi.open();
        return true;
    }

    // ===== LIVECHAT =====
    if (window.LC_API && typeof LC_API.open_chat_window === 'function') {
        if (message && typeof LC_API.set_custom_variables === 'function') {
            LC_API.set_custom_variables([{ name: 'order', value: message }]);
        }
        LC_API.open_chat_window();
        return true;
    }

    // ===== INTERCOM =====
    if (window.Intercom) {
        if (message) {
            Intercom('update', { order: message });
        }
        Intercom('show');
        return true;
    }

    // ===== FALLBACK: Show customer details modal =====
    showCheckoutModal(message);
    return false;
}

function showCheckoutModal(orderMessage) {
    // Create modal HTML
    const modal = document.createElement('div');
    modal.id = 'checkoutModal';
    modal.className = 'checkout-modal';
    modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>Complete Your Order</h2>
                <div>
                    <button class="modal-copy">Copy Order</button>
                    <button class="modal-close" aria-label="Close">&times;</button>
                </div>
            </div>
            <div class="modal-body">
                <div class="order-summary">
                    <h3>Order Summary</h3>
                    <p id="orderPreview" style="white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 8px; font-size: 13px; max-height: 200px; overflow-y: auto;">${escapeHtml(orderMessage)}</p>
                </div>
                
                <form id="checkoutForm" style="margin-top: 20px;">
                    <h3>Your Details</h3>
                    <div class="form-group">
                        <label>Name *</label>
                        <input type="text" name="name" placeholder="Your full name" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" placeholder="your@email.com" required>
                    </div>
                    <div class="form-group">
                        <label>Phone Number *</label>
                        <input type="tel" name="phone" placeholder="+234 xxx xxxx xxxx" required>
                    </div>
                    <div class="form-group">
                        <label>State *</label>
                        <input type="text" name="state" placeholder="e.g. Lagos, Abuja" required>
                    </div>
                    <div class="form-group">
                        <label>Address *</label>
                        <textarea name="address" placeholder="Full delivery address" rows="3" required></textarea>
                    </div>
                    <button type="submit" class="btn" style="width: 100%; margin-top: 16px;">Send Details to Live Chat</button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-backdrop').addEventListener('click', () => modal.remove());
    
    // Handle form submit
    modal.querySelector('#checkoutForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const details = Object.fromEntries(formData);
        
        const fullMessage = orderMessage + 
            `\n\n---\nCustomer Details:\nName: ${details.name}\nEmail: ${details.email}\nPhone: ${details.phone}\nState: ${details.state}\nAddress: ${details.address}`;
        
        console.log('Order submitted:', fullMessage);
        alert('Thank you! Your order details have been recorded. Our team will contact you shortly at ' + details.phone + ' with a secure payment link.');
        localStorage.setItem('val_last_order_details', JSON.stringify({ orderMessage, ...details }));
        modal.remove();
    });

    // Copy button inside modal
    const copyBtn = modal.querySelector('.modal-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            copyTextToClipboard(orderMessage).then(() => {
                showToast('Order copied to clipboard');
            }).catch(() => {
                alert('Copy failed. Please select and copy the text manually.');
            });
        });
    }
}

// Copy helper & toast
function copyTextToClipboard(text) {
    if (!text) return Promise.reject('No text');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        try {
            document.execCommand('copy');
            resolve(true);
        } catch (e) { reject(e); }
        ta.remove();
    });
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast-msg';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('visible'), 10);
    setTimeout(() => t.classList.remove('visible'), 2200);
    setTimeout(() => t.remove(), 2600);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function checkout() {
    const message = buildOrderMessage();
    if (!message) {
        alert('Your cart is empty.');
        return;
    }
    const opened = openChatWidget(message);
    if (opened) {
        closeCart();
    } else {
        console.log('Order message:', message);
    }
    localStorage.setItem('val_last_order', message);
}

/* -------- 4. EVENT WIRING -------- */
document.addEventListener('DOMContentLoaded', () => {

    // Year in footer
    const y = document.getElementById('y');
    if (y) y.textContent = new Date().getFullYear();

    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const card = btn.closest('[data-id]');
            if (!card) return;
            addToCart({
                id: card.dataset.id,
                name: card.dataset.name,
                price: parseFloat(card.dataset.price),
                img: card.dataset.img || card.querySelector('img')?.src || ''
            });
            openCart();
        });
    });

    // Cart open/close
    const toggle = document.getElementById('cartToggle');
    const close = document.getElementById('cartClose');
    const overlay = document.getElementById('cartOverlay');
    if (toggle) toggle.addEventListener('click', openCart);
    if (close) close.addEventListener('click', closeCart);
    if (overlay) overlay.addEventListener('click', closeCart);

    // Cart item actions (delegation)
    const itemsEl = document.getElementById('cartItems');
    if (itemsEl) {
        itemsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === 'inc') changeQty(id, 1);
            if (action === 'dec') changeQty(id, -1);
            if (action === 'remove') removeFromCart(id);
        });
    }

    // Checkout
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkout);

    // Copy order text button (copies order summary to clipboard and opens chat)
    const copyBtnMain = document.getElementById('copyOrderBtn');
    if (copyBtnMain) {
        copyBtnMain.addEventListener('click', async () => {
            const msg = buildOrderMessage();
            if (!msg) { alert('Your cart is empty.'); return; }
            try {
                await copyTextToClipboard(msg);
                showToast('Order copied to clipboard');
                // Open chat so user can paste the copied message
                openChatWidget();
                closeCart();
            } catch (e) {
                alert('Unable to copy automatically. Please select and copy the order text manually.');
            }
        });
    }

    // Initial render
    updateCartUI();

    /* -------- 5. SHOP FILTERS / SEARCH / SORT (shop.html) -------- */
    const grid = document.getElementById('grid');
    if (grid) {
        const search = document.getElementById('search');
        const sort = document.querySelector('select[aria-label="Sort"]');
        const applyBtn = document.getElementById('applyFilters');

        function getActiveCats() {
            return [...document.querySelectorAll('input[name="cat"]:checked')].map(c => c.value);
        }
        function getActivePrice() {
            return (document.querySelector('input[name="price"]:checked') || {}).value || 'all';
        }

        function applyAll() {
            const q = (search?.value || '').toLowerCase().trim();
            const cats = getActiveCats();
            const priceRange = getActivePrice();
            const cards = [...grid.querySelectorAll('.card')];

            cards.forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                const cat = card.dataset.cat || '';
                const price = parseFloat(card.dataset.price) || 0;

                const matchesQ = !q || name.includes(q);
                const matchesCat = cats.length === 0 || cats.includes(cat);

                let matchesPrice = true;
                if (priceRange !== 'all') {
                    const [min, max] = priceRange.split('-').map(Number);
                    matchesPrice = price >= min && price <= max;
                }

                card.style.display = (matchesQ && matchesCat && matchesPrice) ? '' : 'none';
            });

            // Sort
            const sortVal = sort?.value || 'featured';
            const visible = cards.filter(c => c.style.display !== 'none');
            visible.sort((a, b) => {
                const pa = parseFloat(a.dataset.price);
                const pb = parseFloat(b.dataset.price);
                const na = a.dataset.name;
                const nb = b.dataset.name;
                if (sortVal === 'price-asc') return pa - pb;
                if (sortVal === 'price-desc') return pb - pa;
                if (sortVal === 'name-asc') return na.localeCompare(nb);
                return 0;
            });
            visible.forEach(c => grid.appendChild(c));
        }

        search?.addEventListener('input', applyAll);
        sort?.addEventListener('change', applyAll);
        applyBtn?.addEventListener('click', applyAll);
        document.querySelectorAll('input[name="cat"], input[name="price"]').forEach(i => {
            i.addEventListener('change', applyAll);
        });
    }
});
