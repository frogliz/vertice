(function(root){
  'use strict';
  const palette=['#358268','#5d7cd4','#c58b42','#a26eae','#548eaf','#c87070'];
  const key=s=>s.normalize('NFKC').trim().toLocaleLowerCase('pt-BR');
  const defaults=['Moradia','Alimentação','Transporte','Saúde','Educação','Lazer','Assinaturas','Receitas','Outros'];
  function migrate(s){
    if(Array.isArray(s.categories))return s.categories.map(c=>({...c}));
    const names=[...defaults,...s.entries.flatMap(e=>[e.category,...(e.revisions||[]).map(r=>r.category)]),...Object.values(s.overrides||{}).map(e=>e.category),...(s.shared?.items||[]).map(e=>e.category),...((s.debts||[]).length?['Parcelas']:[])];
    const seen=new Set();
    return names.filter(n=>typeof n==='string'&&n.trim()&&!seen.has(key(n))&&seen.add(key(n))).slice(0,200).map((name,i)=>({id:'cat-'+i,name:name.trim(),type:name==='Receitas'?'income':defaults.includes(name)&&name!=='Outros'?'expense':'both',color:palette[i%palette.length],archived:false}));
  }
  function valid(s){
    if(s.categories===undefined)return true;if(!Array.isArray(s.categories)||s.categories.some(c=>!c||typeof c.name!=='string'))return false;
    return Array.isArray(s.categories)&&s.categories.length<=200&&new Set(s.categories.map(c=>c.id)).size===s.categories.length&&new Set(s.categories.map(c=>key(c.name))).size===s.categories.length&&s.categories.every(c=>typeof c.id==='string'&&/^[\w-]{1,80}$/.test(c.id)&&typeof c.name==='string'&&c.name.trim().length>0&&c.name.length<=60&&['income','expense','both'].includes(c.type)&&/^#[0-9a-f]{6}$/i.test(c.color)&&typeof c.archived==='boolean');
  }
  function rename(s,oldName,newName){
    const update=e=>{if(e.category===oldName)e.category=newName};
    s.entries.forEach(e=>{update(e);(e.revisions||[]).forEach(update)});
    Object.values(s.overrides||{}).forEach(update);
    (s.shared?.items||[]).forEach(update);
  }
  function used(s,name){return s.entries.some(e=>e.category===name||(e.revisions||[]).some(r=>r.category===name))||Object.values(s.overrides||{}).some(e=>e.category===name)||(s.shared?.items||[]).some(e=>e.category===name)||name==='Parcelas'&&(s.debts||[]).length>0}
  root.CategoryCatalog={key,palette,migrate,valid,rename,used};
})(typeof window!=='undefined'?window:globalThis);
