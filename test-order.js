const http = require('http');
const payload = JSON.stringify({items:[{name:'Plate with Wors & Pap', qty:1, price:85}]});
const options = {hostname:'localhost',port:3000,path:'/order',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}};
const req = http.request(options,res=>{
  let data='';res.on('data',c=>data+=c);res.on('end',()=>{console.log('Status',res.statusCode);console.log('Body',data)})
});
req.on('error',e=>{console.error('Error',e)});
req.write(payload);req.end();
