(function(root){
  'use strict';
  const blocked=new Set(['__proto__','constructor','prototype']);
  function safeTree(value,depth=0,budget={nodes:0}){
    if(depth>32||++budget.nodes>300000)return false;
    if(value===null||typeof value==='boolean')return true;
    if(typeof value==='string')return value.length<=10000;
    if(typeof value==='number')return Number.isFinite(value)&&Math.abs(value)<=Number.MAX_SAFE_INTEGER;
    if(typeof value!=='object')return false;
    if(Array.isArray(value))return value.length<=50000&&value.every(v=>safeTree(v,depth+1,budget));
    const entries=Object.entries(value);
    return entries.length<=50000&&entries.every(([k,v])=>k.length<=250&&!blocked.has(k)&&safeTree(v,depth+1,budget));
  }
  function validState(s){
    try{
      const money=v=>Number.isSafeInteger(v)&&v>=0&&v<=99999999900;
      const ids=list=>Array.isArray(list)&&new Set(list.map(e=>e.id)).size===list.length&&list.every(e=>typeof e.id==='string'&&e.id.length>0&&e.id.length<=120&&!blocked.has(e.id));
      return safeTree(s)&&JSON.stringify(s).length<=5000000&&ids(s.entries)&&s.entries.every(e=>money(e.value)&&e.value>0&&e.name.trim().length>0&&e.category.trim().length>0&&e.category.length<=60)&&ids(s.goals)&&s.goals.length<=500&&s.goals.every(g=>money(g.target)&&money(g.saved))&&['funds','debts','transfers'].every(k=>s[k]===undefined||ids(s[k]))&&CategoryCatalog.valid(s)&&(s.appearance===undefined||typeof AppearanceModel!=='undefined'&&AppearanceModel.valid(s.appearance));
    }catch(_){return false}
  }
  function owner(user){return !!user?.id&&user.app_metadata?.vertice_owner===true}
  function csvCell(value){let s=String(value);if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  root.VerticeSecurity={safeTree,validState,owner,csvCell};
})(typeof window!=='undefined'?window:globalThis);
