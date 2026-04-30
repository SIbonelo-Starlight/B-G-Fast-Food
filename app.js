// Simple static menu + cart for B&G Fast Food
const menu = [
  {id:1, name:'Plate with Wors & Pap', desc:'Grilled wors served with pap and salad', price:85, category:'plates'},
  {id:2, name:'Pap & Steamed Bread', desc:'Pap served with homemade steamed bread and sauce', price:60, category:'plates'},
  {id:3, name:'Braai Beef Plate', desc:'Tender braaied beef with pap or rice and salad', price:120, category:'braai'},
  {id:4, name:'Braaied Chicken', desc:'Smoked chicken, choice of pap or rice', price:95, category:'chicken'},
  {id:5, name:'Pork Chops with Rice', desc:'Juicy pork chops served with seasoned rice', price:110, category:'pork'},
  {id:6, name:'Beef Steak Plate', desc:'Grilled beef steak with salad and choice of side', price:140, category:'beef'},
  {id:7, name:'Chicken Wings (6)', desc:'Spicy wings served with slaw', price:70, category:'chicken'},
  {id:8, name:'Mixed Braai (Small)', desc:'Assorted braaied meats — pork, beef & chicken with pap', price:180, category:'braai'},
  {id:9, name:'Salad Bowl', desc:'Fresh mixed salad with optional grilled chicken', price:55, category:'plates'}
];

// Additional plates (added 15 more)
menu.push(
  {id:10, name:'Spicy Beef & Pap', desc:'Sliced beef with spicy sauce and pap', price:95, category:'plates'},
  {id:11, name:'Lamb Chops Plate', desc:'Grilled lamb chops with pap and salad', price:150, category:'plates'},
  {id:12, name:'Boerewors Roll', desc:'Classic wors roll with onions and sauce', price:65, category:'plates'},
  {id:13, name:'Grilled Fish & Rice', desc:'Seasoned grilled fish served with rice', price:130, category:'plates'},
  {id:14, name:'Vegetarian Plate', desc:'Mixed vegetables with pap and steamed bread', price:75, category:'plates'},
  {id:15, name:'Shrimp & Rice', desc:'Pan-fried shrimp served with seasoned rice', price:145, category:'plates'},
  {id:16, name:'Oxtail Stew Plate', desc:'Slow-cooked oxtail with pap', price:160, category:'plates'},
  {id:17, name:'Sosaties Plate', desc:'Skewered meat with rice and salad', price:120, category:'plates'},
  {id:18, name:'Beef Potjie', desc:'Traditional potjie served with pap', price:135, category:'plates'},
  {id:19, name:'Mixed Veg & Chicken', desc:'Grilled chicken with mixed veg and pap', price:110, category:'plates'},
  {id:20, name:'Peri-Peri Chicken Plate', desc:'Spicy peri-peri chicken with rice', price:115, category:'plates'},
  {id:21, name:'Chakalaka & Samp', desc:'Local chakalaka served with samp and pap', price:70, category:'plates'},
  {id:22, name:'Prawn & Steamed Bread', desc:'Prawns served with steamed bread and salad', price:150, category:'plates'},
  {id:23, name:'Smoked T-Bone', desc:'Smoked T-bone steak with choice of side', price:190, category:'plates'},
  {id:24, name:'Breakfast Plate', desc:'Eggs, wors, toast and pap (daytime special)', price:85, category:'plates'}
);

const state = {cart:[]};

// localStorage key
const CART_KEY = 'bg_fastfood_cart_v1';

function saveCart(){
  try{localStorage.setItem(CART_KEY, JSON.stringify(state.cart))}catch(e){console.warn('Could not persist cart',e)}
}

function loadCart(){
  try{
    const raw = localStorage.getItem(CART_KEY);
    if(raw){ state.cart = JSON.parse(raw) || []; }
  }catch(e){console.warn('Could not load cart',e)}
}

function $(sel){return document.querySelector(sel)}
function $all(sel){return Array.from(document.querySelectorAll(sel))}

function formatPrice(v){return `R${v.toFixed(2)}`}

function renderMenu(items){
  const grid = $('#menu-grid'); grid.innerHTML='';
  const tmpl = document.getElementById('menu-card-template');
  items.forEach(it=>{
    const node = tmpl.content.cloneNode(true);
    node.querySelector('.card-title').textContent = it.name;
    node.querySelector('.card-desc').textContent = it.desc;
    node.querySelector('.price').textContent = formatPrice(it.price);
    const img = node.querySelector('.card-img');
    // category badge
    const badge = node.querySelector('.card-badge');
    badge.textContent = it.category;
    // try local asset first
    const slug = it.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const assetPath = `assets/images/${slug}.svg`;
    // set background: prefer local asset but verify by setting url; we'll just use asset path — browser will show if present
    img.style.backgroundImage = `linear-gradient(135deg, rgba(215,38,49,0.12), rgba(0,0,0,0.35)), url('${assetPath}'), url('data:image/svg+xml;utf8,${encodeURIComponent(generateSVG(it.name))}')`;
    const addBtn = node.querySelector('.add-btn');
    addBtn.addEventListener('click',()=>addToCart(it));
    grid.appendChild(node);
  })
}

function generateSVG(text){
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='600' height='300'>
    <rect width='100%' height='100%' fill='%23222222' />
    <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-size='28' font-family='Arial'>${text}</text>
  </svg>`;
  return svg;
}

function addToCart(item){
  // If item is a plate, open customization modal
  if(item.category === 'plates'){
    openCustomization(item);
    return;
  }
  const found = state.cart.find(c=>c.id===item.id && !c.custom);
  if(found) found.qty++;
  else state.cart.push({...item, qty:1});
  renderCart();
  showSnackbar(`${item.name} added to cart`);
  pulseCardByName(item.name);
}

// ----- Customization modal logic -----
const modal = document.getElementById('custom-modal');
const customForm = document.getElementById('custom-form');
let customTarget = null; // menu item being customized

function openCustomization(item){
  customTarget = item;
  document.getElementById('modal-title').textContent = `Customize: ${item.name}`;
  // reset form
  customForm.reset();
  // disable submit until valid
  document.getElementById('save-custom').setAttribute('disabled','');
  // ensure hint and state
  modal.setAttribute('aria-hidden','false');
}

function closeCustomization(){
  modal.setAttribute('aria-hidden','true');
  customTarget = null;
}

// cancel
document.getElementById('cancel-custom').addEventListener('click',()=>{
  closeCustomization();
});

customForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  // ensure a side selected
  const side = customForm.elements['side'].value;
  // collect salads
  const salads = Array.from(customForm.querySelectorAll('input[name="salad"]:checked')).map(i=>i.value);
  if(!side){alert('Please choose a side (pap, rice, or steamed bread).');return}
  if(salads.length !== 2){alert('Please select exactly two salads.');return}

  // create a unique cart entry with custom choices
  const entry = {
    id: `${customTarget.id}-custom-${Date.now()}`,
    name: customTarget.name,
    desc: `${customTarget.desc} — Side: ${side}; Salads: ${salads.join(', ')}`,
    price: customTarget.price,
    category: customTarget.category,
    qty: 1,
    custom: {side,salads}
  };

  state.cart.push(entry);
  renderCart();
  closeCustomization();
  showSnackbar(`${entry.name} (${entry.custom.side}) added to cart`);
  pulseCardByName(entry.name);
});

// inline validation: enable save when side selected and exactly two salads are checked
function validateCustomForm(){
  const side = customForm.elements['side'].value;
  const salads = Array.from(customForm.querySelectorAll('input[name="salad"]:checked'));
  const btn = document.getElementById('save-custom');
  if(side && salads.length===2){ btn.removeAttribute('disabled'); }
  else { btn.setAttribute('disabled',''); }
}

customForm.addEventListener('change', validateCustomForm);
// also validate on open (in case some UA preserved state)
customForm.addEventListener('reset', validateCustomForm);

function renderCart(){
  const container = $('#cart-items'); container.innerHTML='';
  const tmpl = document.getElementById('cart-item-template');
  state.cart.forEach((ci, idx)=>{
    const node = tmpl.content.cloneNode(true);
    node.querySelector('.cart-item-name').textContent = ci.name;
    node.querySelector('.cart-item-desc').textContent = ci.desc || '';
    node.querySelector('.cart-qty').textContent = ci.qty;
    node.querySelector('.cart-item-price').textContent = formatPrice(ci.price*ci.qty);

    // handlers
    node.querySelector('.qty-inc').addEventListener('click',()=>{
      ci.qty++; saveCart(); renderCart();
    });
    node.querySelector('.qty-dec').addEventListener('click',()=>{
      if(ci.qty>1){ ci.qty--; } else { state.cart.splice(idx,1); }
      saveCart(); renderCart();
    });
    node.querySelector('.qty-remove').addEventListener('click',()=>{
      state.cart.splice(idx,1); saveCart(); renderCart();
    });

    container.appendChild(node);
  });
  const subtotal = state.cart.reduce((s,i)=>s+i.price*i.qty,0);
  // delivery fee based on selected delivery option (R15 for delivery)
  const deliverySel = document.querySelector('input[name="delivery"]:checked');
  const deliveryMode = deliverySel ? deliverySel.value : 'delivery';
  const deliveryFee = deliveryMode === 'delivery' ? 15 : 0;
  $('#cart-count').textContent = state.cart.reduce((s,i)=>s+i.qty,0);
  $('#cart-delivery').textContent = formatPrice(deliveryFee);
  $('#cart-total').textContent = formatPrice(subtotal + deliveryFee);
  saveCart();
}

// Snackbar helper
function showSnackbar(msg, ms=3000){
  const el = document.getElementById('snackbar');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), ms);
}

// Pulse card by name for visual feedback
function pulseCardByName(name){
  // find card title and its ancestor card
  const titles = Array.from(document.querySelectorAll('.card-title'));
  for(const t of titles){
    if(t.textContent === name){
      const c = t.closest('.card');
      if(c){
        c.classList.add('added');
        setTimeout(()=>c.classList.remove('added'),450);
      }
      break;
    }
  }
}

function setup(){
  loadCart();
  renderMenu(menu);
  renderCart();
  $('#year').textContent = new Date().getFullYear();

  $all('.category-btn').forEach(btn=>btn.addEventListener('click',()=>{
    $all('.category-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    const filtered = cat==='all'?menu:menu.filter(m=>m.category===cat);
    renderMenu(filtered);
  }));

  $('#search').addEventListener('input',(e)=>{
    const q = e.target.value.trim().toLowerCase();
    const filtered = menu.filter(m=>m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q));
    renderMenu(filtered);
  });

  $('#cart-btn').addEventListener('click',()=>{
    const cartEl = document.getElementById('cart');
    cartEl.style.display = cartEl.style.display==='block' ? 'none' : 'block';
  });

  // Checkout opens a modal to collect email and payment
  $('#checkout').addEventListener('click',()=>{
    if(state.cart.length===0){ showSnackbar('Cart is empty'); return }
    openCheckout();
  });

  // Checkout modal handlers
  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutForm = document.getElementById('checkout-form');
  const cancelCheckout = document.getElementById('cancel-checkout');
  const cardFields = document.getElementById('card-fields');

  function openCheckout(){
    checkoutForm.reset();
    checkoutModal.setAttribute('aria-hidden','false');
    // default show card fields
    cardFields.style.display = 'block';
  }
  function closeCheckout(){ checkoutModal.setAttribute('aria-hidden','true'); }
  cancelCheckout.addEventListener('click',()=>closeCheckout());

  // toggle card fields based on payment method
  Array.from(checkoutForm.elements['payment-method']).forEach(r=>r.addEventListener('change',()=>{
    const v = checkoutForm.elements['payment-method'].value;
    cardFields.style.display = v==='card' ? 'block' : 'none';
  }));

  checkoutForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    const name = checkoutForm.elements['customer-name']?.value || '';
    const phone = checkoutForm.elements['customer-phone']?.value || '';
    const pickupTimeField = checkoutForm.elements['pickup-time'];
    const pickupTime = pickupTimeField ? pickupTimeField.value : '';
    const email = checkoutForm.elements['order-email']?.value || checkoutForm.elements['email']?.value;
    const method = checkoutForm.elements['payment-method'].value;
    if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
      showSnackbar('Please provide a valid email'); return;
    }
    if(!name){ showSnackbar('Please provide your name'); return; }
    if(!phone){ showSnackbar('Please provide a phone number'); return; }
    // simple mock payment handling
    const payment = { method };
    if(method==='card'){
      payment.card = { last4: (checkoutForm.elements['card-number'].value || '').slice(-4) || '4242' };
    }

    // delivery option and fee (R15 for delivery)
    const deliveryMode = (document.querySelector('input[name="delivery"]:checked')||{}).value || 'delivery';
    const deliveryFee = deliveryMode === 'delivery' ? 15 : 0;

    const subtotal = state.cart.reduce((s,i)=>s + (i.price * i.qty), 0);
    const total = subtotal + deliveryFee;

    // snapshot cart (so we can clear state after notification)
    const cartSnapshot = JSON.parse(JSON.stringify(state.cart));

    // send order to server (include delivery info and customer details)
    const payload = { items: cartSnapshot, email, payment, delivery: deliveryMode, deliveryFee, total, customerName: name, customerPhone: phone, pickupTime };
    fetch('http://localhost:3000/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(r=>r.json())
      .then(j=>{
        // Order received - now send EmailJS notification
        console.log('Order response:', j);
        const orderNumber = j.id || `BG-${Date.now()}`;
        const orderDate = new Date().toLocaleString();
        const items_list = cartSnapshot.map(it => `${it.qty}x ${it.name} - R${(it.price*it.qty).toFixed(2)}${it.custom? ' (Side: '+ (it.custom.side || '') + (it.custom.salads? ', ' + it.custom.salads.join(', ') : '') + ')' : ''}`).join('\n');
        
        const templateParams = {
          order_number: orderNumber,
          order_date: orderDate,
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          delivery_mode: deliveryMode === 'pickup' ? 'Pickup' : 'Delivery',
          pickup_time: pickupTime || 'ASAP',
          item_count: cartSnapshot.reduce((s,i)=>s+i.qty,0),
          items_list,
          delivery_fee: formatPrice(deliveryFee),
          total_amount: formatPrice(total),
          special_instructions: 'Thank you for your order!',
          verify_url: j.verifyUrl || 'N/A'
        };

        // Send email via EmailJS
        if(window.emailjs){
          emailjs.send('service_e1uom2e', 'template_bzrmcoi', templateParams)
            .then(()=>{
              console.log('Order confirmation email sent successfully');
              showSnackbar(`✓ Order placed! Confirmation email sent to ${email}`, 8000);
            })
            .catch(err=>{
              console.error('EmailJS send failed:', err);
              showSnackbar(`Order placed but email failed. Check your order at: ${j.verifyUrl || 'your email'}`, 8000);
            });
        } else {
          showSnackbar(`Order placed (${j.id}). Please check your email.`, 8000);
        }

        // clear cart and update UI
        state.cart = [];
        renderCart();
        closeCheckout();
      })
      .catch(err=>{
        console.warn('Order submit failed',err);
        showSnackbar('Order failed to submit — try again later');
      });
  });

  // populate popular
  const pop = document.getElementById('popular-list');
  const popular = menu.slice(0,3);
  popular.forEach(p=>{const li=document.createElement('li');li.textContent=p.name;pop.appendChild(li)})
}

window.addEventListener('DOMContentLoaded',setup);
