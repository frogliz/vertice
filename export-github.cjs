const fs=require('node:fs'),path=require('node:path');
const root=__dirname,out=path.join(root,'entrega','vertice-github');
fs.mkdirSync(out,{recursive:true});
const files=['index.html','style.css','growth.css','web.css','monthly.css','auth.css','engine.js','growth.js','monthly.js','theme.js','cloud-store.js','auth.js','app.js','config.js','config.example.js','favicon.svg','build-web.cjs','tests.cjs','tests-theme.cjs','tests-cloud.cjs','tests-auth.cjs','README.md','PUBLICAR-GITHUB.md','LEIA-ME.md','.gitignore','export-github.cjs'];
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const dir of ['vendor','database','.github'])fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
console.log('Pasta pronta para seu GitHub: '+out);
