const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// CORS simple allow (for local testing)
// Simple CORS allow for local testing. Adds allowed methods and headers for preflight responses.
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});

// Static files: only serve the public site files (never server.js, orders.json, etc.)
const PUBLIC_FILES = ['index.html','styles.css','app.js','admin.html','admin.js'];
app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));
PUBLIC_FILES.forEach(f=>app.get('/'+f,(req,res)=>res.sendFile(path.join(__dirname,f))));
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'admin.html')));
app.use('/assets', express.static(path.join(__dirname,'assets')));

// ---------------- Menu storage ----------------
const MENU_FILE = path.join(__dirname,'menu.json');
const CATEGORIES = ['plates','beef','pork','chicken','braai'];

function readMenu(){
  try{ return JSON.parse(fs.readFileSync(MENU_FILE,'utf8')||'[]') }catch(e){ return null }
}
function writeMenu(list){ fs.writeFileSync(MENU_FILE, JSON.stringify(list,null,2),'utf8') }

// Validate + normalise menu item input. Returns {item} or {error}
function cleanItem(b){
  if(!b || typeof b!=='object') return {error:'Invalid body'};
  const name = typeof b.name==='string' ? b.name.trim() : '';
  const desc = typeof b.desc==='string' ? b.desc.trim() : '';
  const price = Number(b.price);
  const category = typeof b.category==='string' ? b.category.trim().toLowerCase() : '';
  const emoji = typeof b.emoji==='string' ? b.emoji.trim().slice(0,8) : '';
  const imageUrl = typeof b.imageUrl==='string' ? b.imageUrl.trim() : '';
  if(!name || name.length>80) return {error:'Name is required (max 80 characters)'};
  if(desc.length>200) return {error:'Description too long (max 200 characters)'};
  if(!Number.isFinite(price) || price<=0 || price>10000) return {error:'Price must be a number between 0 and 10000'};
  if(!CATEGORIES.includes(category)) return {error:'Category must be one of: '+CATEGORIES.join(', ')};
  if(imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl) && !/^assets\/images\/[\w.-]+$/.test(imageUrl)) return {error:'Image URL must start with http(s)://'};
  return {item:{name,desc,price:Math.round(price*100)/100,category,emoji,imageUrl}};
}

// Public menu
app.get('/api/menu',(req,res)=>{
  const list = readMenu();
  if(!list) return res.status(500).json({error:'Menu unavailable'});
  res.json(list);
});

// ---------------- Admin auth ----------------
// Set ADMIN_USER / ADMIN_PASSWORD environment variables to change credentials.
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bg-admin-2025';
if(!process.env.ADMIN_PASSWORD) console.warn('WARNING: using the default admin password. Set ADMIN_PASSWORD before going live.');

const sessions = new Map(); // token -> expiry
const SESSION_MS = 2*60*60*1000;
const attempts = new Map(); // ip -> {count, until}

function safeEqual(a,b){
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha,hb);
}

app.post('/api/admin/login',(req,res)=>{
  const ip = req.ip;
  const rec = attempts.get(ip) || {count:0, until:0};
  if(rec.until > Date.now()) return res.status(429).json({error:'Too many attempts. Try again in a few minutes.'});
  const {username,password} = req.body || {};
  const ok = safeEqual(username||'',ADMIN_USER) & safeEqual(password||'',ADMIN_PASSWORD);
  if(!ok){
    rec.count++;
    if(rec.count>=5){ rec.until = Date.now()+5*60*1000; rec.count = 0; }
    attempts.set(ip,rec);
    return res.status(401).json({error:'Wrong username or password'});
  }
  attempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now()+SESSION_MS);
  res.json({token});
});

function requireAdmin(req,res,next){
  const m = /^Bearer (\w+)$/.exec(req.headers.authorization||'');
  const exp = m && sessions.get(m[1]);
  if(!exp || exp < Date.now()){ if(m) sessions.delete(m[1]); return res.status(401).json({error:'Not authorised'}); }
  req.token = m[1];
  next();
}

app.post('/api/admin/logout',requireAdmin,(req,res)=>{ sessions.delete(req.token); res.json({ok:true}); });
app.get('/api/admin/me',requireAdmin,(req,res)=>res.json({ok:true}));

// ---------------- Admin menu CRUD ----------------
app.post('/api/admin/menu',requireAdmin,(req,res)=>{
  const {item,error} = cleanItem(req.body);
  if(error) return res.status(400).json({error});
  const list = readMenu() || [];
  const id = list.reduce((m,i)=>Math.max(m,i.id),0)+1;
  const created = {id,...item};
  list.push(created);
  try{ writeMenu(list) }catch(e){ return res.status(500).json({error:'Could not save menu'}) }
  res.status(201).json(created);
});

app.put('/api/admin/menu/:id',requireAdmin,(req,res)=>{
  const {item,error} = cleanItem(req.body);
  if(error) return res.status(400).json({error});
  const list = readMenu() || [];
  const idx = list.findIndex(i=>String(i.id)===req.params.id);
  if(idx<0) return res.status(404).json({error:'Item not found'});
  list[idx] = {id:list[idx].id,...item};
  try{ writeMenu(list) }catch(e){ return res.status(500).json({error:'Could not save menu'}) }
  res.json(list[idx]);
});

app.delete('/api/admin/menu/:id',requireAdmin,(req,res)=>{
  const list = readMenu() || [];
  const next = list.filter(i=>String(i.id)!==req.params.id);
  if(next.length===list.length) return res.status(404).json({error:'Item not found'});
  try{ writeMenu(next) }catch(e){ return res.status(500).json({error:'Could not save menu'}) }
  res.json({ok:true});
});

app.get('/api/admin/orders',requireAdmin,(req,res)=>{
  let list = [];
  try{ list = JSON.parse(fs.readFileSync(path.join(__dirname,'orders.json'),'utf8')||'[]') }catch(e){}
  res.json(list.slice().reverse().map(o=>({id:o.id,email:o.email,total:o.total,verified:o.verified,createdAt:o.createdAt,items:o.items.map(i=>`${i.qty}x ${i.name}`)})));
});

// Convenience: GET /order explains the correct usage (server expects POST)
app.get('/order', (req, res) => {
  res.status(200).send('This endpoint accepts POST requests with JSON order payloads. Use POST /order to submit an order.');
});

const ORDERS_FILE = path.join(__dirname,'orders.json');

function saveOrder(order){
  let list = [];
  try{ if(fs.existsSync(ORDERS_FILE)){ list = JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8')||'[]') } }catch(e){console.warn('orders read failed',e)}
  list.push(order);
  try{ fs.writeFileSync(ORDERS_FILE, JSON.stringify(list,null,2),'utf8') }catch(e){console.warn('orders write failed',e)}
}

let transporter = null; // will be set after test account creation

(async ()=>{
  try{
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    console.log('Nodemailer test account created; preview emails at https://ethereal.email/messages');
  }catch(err){
    console.warn('Could not create test email account',err);
  }

  // start server after transporter readiness (or attempt)
  const port = process.env.PORT || 3000;
  app.listen(port,()=>console.log('Server listening on',port));
})();

app.post('/order',(req,res)=>{
  const order = req.body;
  if(!order || !order.items || !Array.isArray(order.items) || order.items.length===0){
    return res.status(400).json({error:'Invalid order: items required'});
  }
  if(!order.email) return res.status(400).json({error:'Email required for order verification'});
  // Basic validation: each item must have name and qty
  for(const it of order.items){
    if(!it.name || !it.qty) return res.status(400).json({error:'Invalid item in order'});
  }

  const id = uuidv4();
  const total = order.items.reduce((s,i)=>s+(i.price||0)*i.qty,0);
  const token = uuidv4();
  const stored = { id, items: order.items, email: order.email, total, payment: order.payment||{}, verified:false, token, createdAt: new Date().toISOString() };
  saveOrder(stored);

  // send verification email (using test account if available)
  const verifyUrl = `http://localhost:3000/verify?token=${token}`;
  if(transporter){
    const mail = {
      from: 'B&G Fast Food <no-reply@example.com>',
      to: order.email,
      subject: `Verify your B&G order ${id}`,
      text: `Thanks! Please verify your order by visiting ${verifyUrl}`,
      html: `<p>Thanks! Please verify your order by clicking <a href="${verifyUrl}">this link</a>.</p><p>Order total: R${total.toFixed(2)}</p>`
    };
    transporter.sendMail(mail, (err, info)=>{
      if(err){
        console.warn('email send failed',err);
        return res.json({id, status:'received', total, verification: 'pending', note:'email_failed'});
      }
      const preview = nodemailer.getTestMessageUrl(info);
      return res.json({id, status:'received', total, verification:'sent', preview});
    });
  }else{
    // transporter unavailable - return verification URL for demo
    return res.json({id, status:'received', total, verification:'none', verifyUrl});
  }
});

// verify endpoint
app.get('/verify',(req,res)=>{
  const token = req.query.token;
  if(!token) return res.status(400).send('Missing token');
  let list = [];
  try{ if(fs.existsSync(ORDERS_FILE)){ list = JSON.parse(fs.readFileSync(ORDERS_FILE,'utf8')||'[]') } }catch(e){console.warn('orders read failed',e)}
  const ord = list.find(o=>o.token===token);
  if(!ord) return res.status(404).send('Order not found');
  ord.verified = true;
  try{ fs.writeFileSync(ORDERS_FILE, JSON.stringify(list,null,2),'utf8') }catch(e){console.warn('orders write failed',e)}
  return res.send(`<h2>Order ${ord.id} verified</h2><p>Thank you ${ord.email}. Total: R${ord.total.toFixed(2)}</p>`);
});
