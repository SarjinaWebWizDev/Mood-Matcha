// Test helper: runs the exported serverless handler the way Vercel does (body pre-parsed into req.body, stream consumed).
const http=require('http'),{handler}=require('../server.js');
http.createServer((req,res)=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{if(b){try{req.body=JSON.parse(b)}catch(e){req.body=b}}handler(req,res)})}).listen(+process.env.PORT,()=>console.log('harness running at '+process.env.PORT));
