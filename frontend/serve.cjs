const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.ttf':'font/ttf','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}if(pathname==='/'){res.writeHead(302,{Location:'/frontend/'});res.end();return;}if(pathname.endsWith('/'))pathname+='index.html';const file=path.resolve(root,'.'+pathname);const relative=path.relative(root,file);if(relative.startsWith('..')||path.isAbsolute(relative)||(!relative.startsWith('frontend'+path.sep)&&!['docs/architecture/noto-sans-sc-regular.ttf','docs/architecture/roboto-regular.ttf'].includes(relative.replaceAll(path.sep,'/')))||!types[path.extname(file)]){res.writeHead(403);res.end('Forbidden');return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(data);});});
server.listen(4173,'127.0.0.1',()=>console.log('benchsquare preview: http://127.0.0.1:4173/frontend/'));
