const fs=require('node:fs'),path=require('node:path');
const root=__dirname,dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
for(const file of ['appearance-model.js','avunara.js','avunara.css','font.css','catalog.js','security.js','experience.js','premium.css','_headers','index.html','shared-engine.js','shared.js','shared.css','style.css','growth.css','web.css','monthly.css','monthly.js','auth.css','config.js','cloud-store.js','auth-errors.js','auth.js','engine.js','growth.js','app.js','theme.js','favicon.svg'])fs.copyFileSync(path.join(root,file),path.join(dist,file));
if(fs.existsSync(path.join(root,'assets')))fs.cpSync(path.join(root,'assets'),path.join(dist,'assets'),{recursive:true});
fs.cpSync(path.join(root,'vendor'),path.join(dist,'vendor'),{recursive:true});
console.log('Site estático pronto em dist/.');
