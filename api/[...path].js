// Vercel serverless entry: every /api/* request is handled by the same code as `npm run dev`.
module.exports=(req,res)=>require('../server.js').handler(req,res);
