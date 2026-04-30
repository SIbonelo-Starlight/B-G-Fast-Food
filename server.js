const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

// CORS simple allow (for local testing)
// Simple CORS allow for local testing. Adds allowed methods and headers for preflight responses.
app.use((req,res,next)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS') return res.sendStatus(200);
  next();
});

// Health endpoint
app.get('/', (req, res) => {
  res.send('<h2>B&G Fast Food API</h2><p>Use POST /order to submit orders. See README for details.</p>');
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
  if(!transporter){
    // transporter unavailable - return verification URL for demo
    console.warn('Transporter not ready, returning verification URL');
    return res.json({id, status:'received', total, verification:'none', verifyUrl});
  }

  const mail = {
    from: 'B&G Fast Food <no-reply@example.com>',
    to: order.email,
    subject: `Verify your B&G order ${id}`,
    text: `Thanks! Please verify your order by visiting ${verifyUrl}`,
    html: `<p>Thanks! Please verify your order by clicking <a href="${verifyUrl}">this link</a>.</p><p>Order total: R${total.toFixed(2)}</p>`
  };

  let responseSent = false;

  transporter.sendMail(mail, (err, info)=>{
    if(responseSent) return; // prevent duplicate response
    responseSent = true;

    if(err){
      console.error('Email send failed:', err.message);
      return res.status(500).json({id, status:'received', total, verification: 'failed', error: err.message});
    }

    try{
      const preview = nodemailer.getTestMessageUrl(info);
      console.log('Email sent successfully, preview:', preview);
      return res.json({id, status:'received', total, verification:'sent', preview});
    }catch(parseErr){
      console.error('Error generating preview URL:', parseErr.message);
      return res.json({id, status:'received', total, verification:'sent', preview: null});
    }
  });

  // Timeout: ensure response is always sent
  setTimeout(()=>{
    if(!responseSent){
      responseSent = true;
      console.warn('Email send timeout - sending fallback response');
      res.json({id, status:'received', total, verification:'timeout', verifyUrl});
    }
  }, 5000);
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
