const fs=require('fs'),path=require('path');let bad=0,n=0;
(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())w(p);else if(f.endsWith('.html')){const h=fs.readFileSync(p,'utf8');const re=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;let m;while((m=re.exec(h))){n++;try{JSON.parse(m[1])}catch(e){bad++;console.log('BAD',p,e.message)}}}}})(path.join(__dirname,'..','public'));
console.log(n,'blocks,',bad,'bad');
