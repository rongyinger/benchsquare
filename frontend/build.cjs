'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
for(const file of fs.readdirSync(__dirname).filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check',path.join(__dirname,file)]);
// Existing app is buildless. Package a deployable static copy without test artifacts.
fs.mkdirSync(path.join(out,'frontend'),{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./frontend/"><title>Benchsquare Demo</title><a href="./frontend/">打开 Benchsquare Demo</a></html>\n');
fs.writeFileSync(path.join(out,'.nojekyll'),'');
for(const file of fs.readdirSync(__dirname).filter(f=>/\.(html|css|js)$/.test(f)))fs.copyFileSync(path.join(__dirname,file),path.join(out,'frontend',file));
fs.cpSync(path.join(__dirname,'assets'),path.join(out,'frontend','assets'),{recursive:true});
fs.mkdirSync(path.join(out,'docs','architecture'),{recursive:true});
for(const font of ['noto-sans-sc-regular.ttf','roboto-regular.ttf'])fs.copyFileSync(path.join(root,'docs','architecture',font),path.join(out,'docs','architecture',font));
console.log('Build passed: JavaScript syntax checked; static application packaged in dist/frontend/.');
