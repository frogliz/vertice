(function(root){
  'use strict';
  const defaults=Object.freeze({version:2,style:'fluid',mode:'dark',accent:'mint',custom:'#c5f58a',density:'comfortable',motion:true,privateStart:false});
  const styles=Object.freeze({fluid:{name:'Fluido',description:'Luz, profundidade e um ritmo mais leve.'},editorial:{name:'Editorial',description:'Texturas suaves. Espaço para o essencial.'},precision:{name:'Precisão',description:'Linhas nítidas e informação em foco.'}});
  const colors=Object.freeze({mono:null,mint:'#c5f58a',blue:'#87b9ff',violet:'#c3a7ff',amber:'#f0c38c'});
  const legacy=p=>!!p&&typeof p==='object'&&['dark','light','system'].includes(p.mode)&&Object.keys(colors).concat('custom').includes(p.accent)&&/^#[0-9a-f]{6}$/i.test(p.custom);
  function valid(p){return legacy(p)&&p.version===2&&Object.hasOwn(styles,p.style)&&['comfortable','compact'].includes(p.density)&&typeof p.motion==='boolean'&&typeof p.privateStart==='boolean'&&Object.keys(p).every(k=>Object.hasOwn(defaults,k))}
  function normalize(p){if(valid(p))return {...p};if(legacy(p)&&p.version===undefined)return {...defaults,mode:p.mode,accent:p.accent,custom:p.custom};return {...defaults}}
  root.AppearanceModel={defaults,styles,colors,valid,normalize};
})(typeof window!=='undefined'?window:globalThis);
