const fs=require('fs'),path=require('path');const PUB=path.join(__dirname,'..','public');let bad=0,n=0;const ext=new Set();
function files(d,a=[]){for(const f of fs.readdirSync(d)){const p=path.join(d,f);fs.statSync(p).isDirectory()?files(p,a):a.push(p)}return a}
function exists(u){let p=u.split('#')[0].split('?')[0];if(!p||p==='/')return true;if(p.startsWith('/go/')||p.startsWith('/api/'))return true;
  const c=path.join(PUB,p);return fs.existsSync(c)&&fs.statSync(c).isFile()||fs.existsSync(c+'.html')||fs.existsSync(path.join(c,'index.html'))}
for(const f of files(PUB).filter(f=>f.endsWith('.html'))){const h=fs.readFileSync(f,'utf8');const dir='/'+path.relative(PUB,path.dirname(f));
  for(const m of h.matchAll(/(?:href|src)="([^"]+)"/g)){let u=m[1];if(/^(mailto:|tel:|data:|javascript:|#)/.test(u))continue;if(/^https?:/.test(u)){ext.add(u);continue}
    if(!u.startsWith('/'))u=path.posix.join(dir==='/.'?'/':dir,u);n++;if(!exists(u)){bad++;console.log('BROKEN',path.relative(PUB,f),'->',m[1])}}}
console.log(n,'internal refs,',bad,'broken');fs.writeFileSync(process.argv[2]||'/dev/null',[...ext].join('\n'));
