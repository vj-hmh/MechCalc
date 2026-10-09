/* Mechanical Calculation Toolkit — shared runtime (data store, nav, calc helpers, Mathcad-style report) */
const APP_VERSION='2.1.0 (US)';
const DATA_KEY='mct_data';
const PAGES=[
 {key:'project',   file:'project-info.html',        label:'Project Information'},
 {key:'bolt',      file:'bolt-preload.html',        label:'Bolt Preload and Torque'},
 {key:'tensile',   file:'tensile-stress.html',      label:'Tensile Stress'},
 {key:'thread',    file:'thread-shear.html',        label:'Thread Shear Stress'},
 {key:'bearing',   file:'bearing-stress.html',      label:'Bearing Stress'},
 {key:'membrane',  file:'membrane-stress.html',     label:'Membrane Stress'},
 {key:'hydraulic', file:'hydraulic-cylinder.html',  label:'Hydraulic Cylinder Force'},
 {key:'summary',   file:'utilization-summary.html', label:'Utilization Summary'},
 {key:'report',    file:'calculation-report.html',  label:'Calculation Report'}
];
/* ---------- shared calculation data store ---------- */
function loadData(){try{return JSON.parse(localStorage.getItem(DATA_KEY)||'null')||{project:{},results:{}}}catch(e){return{project:{},results:{}}}}
function saveData(d){localStorage.setItem(DATA_KEY,JSON.stringify(d))}
function saveModuleResult(key,data){const d=loadData();d.results=d.results||{};d.results[key]=data;saveData(d)}
function saveProjectField(id,value){const d=loadData();d.project=d.project||{};d.project[id]=value;saveData(d)}
function clearAllData(){localStorage.removeItem(DATA_KEY)}
/* ---------- JSON export / import of the whole project (project info + every module's inputs + results) ---------- */
function downloadJson(filename,obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}
function safeFileToken(s,fallback){const t=String(s||'').trim().replace(/[^a-z0-9_\-]+/gi,'_');return t||fallback}
function exportProjectJson(){
 const d=loadData();const p=d.project||{};
 const base=safeFileToken(p.p_number,'mechanical_calculation');
 const rev=safeFileToken(p.p_rev,'01');
 downloadJson(`${base}_${rev}_data.json`,d);
}
function validateImportedData(obj){
 if(!obj||typeof obj!=='object'||Array.isArray(obj))return 'The file does not contain a valid JSON object.';
 if(obj.project!==undefined&&(typeof obj.project!=='object'||Array.isArray(obj.project)))return 'The "project" section in the JSON is not valid.';
 if(obj.inputs!==undefined&&(typeof obj.inputs!=='object'||Array.isArray(obj.inputs)))return 'The "inputs" section in the JSON is not valid.';
 if(obj.results!==undefined&&(typeof obj.results!=='object'||Array.isArray(obj.results)))return 'The "results" section in the JSON is not valid.';
 return null;
}
async function importProjectJsonFile(file,statusElId){
 const statusEl=statusElId?document.getElementById(statusElId):null;
 try{
  const text=await file.text();
  const obj=JSON.parse(text);
  const err=validateImportedData(obj);
  if(err){if(statusEl)statusEl.textContent=err;return false}
  const data={project:obj.project||{},inputs:obj.inputs||{},results:obj.results||{}};
  saveData(data);
  if(statusEl)statusEl.textContent='Data imported. Open Project Information or any calculation page — fields and results are already filled in.';
  return true;
 }catch(e){
  console.error(e);
  if(statusEl)statusEl.textContent='Could not read that file. Make sure it is valid JSON exported from this toolkit.';
  return false;
 }
}
/* ---------- formatting / small helpers ---------- */
function fmt(v,d=3){return Number.isFinite(Number(v))&&v!==''?Number(v).toLocaleString(undefined,{maximumFractionDigits:d}):'—'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function status(uf){return Number.isFinite(uf)?(uf<=1?'PASS':'FAIL'):'NOT-EVALUATED'}
function statusLabel(s){return String(s||'').replace('-',' ')}
function box(label,value,unit=''){return `<div class="result"><b>${esc(label)}</b><span>${esc(value)}</span> <small>${esc(unit)}</small></div>`}
function sbox(s){return `<div class="result"><b>Status</b><span class="status ${s}">${statusLabel(s)}</span></div>`}
function ufGauge(uf){
 if(!Number.isFinite(uf))return '<div class="gauge"><div class="gauge-head"><span>Utilization</span><span class="gauge-val">Not evaluated</span></div><div class="gauge-track"><div class="gauge-marker" style="left:66.6%"></div></div><div class="gauge-scale"><span>0%</span><span>Allowable (100%)</span><span>150%+</span></div></div>';
 const pass=uf<=1;const pct=Math.max(0,Math.min(uf,1.5))/1.5*100;
 return `<div class="gauge"><div class="gauge-head"><span>Utilization vs. allowable</span><span class="gauge-val ${pass?'ok':'bad'}">${(uf*100).toFixed(1)}% ${pass?'— within limit':'— exceeds limit'}</span></div><div class="gauge-track"><div class="gauge-fill ${pass?'ok':'bad'}" style="width:${pct}%"></div><div class="gauge-marker" style="left:66.6%"></div></div><div class="gauge-scale"><span>0%</span><span>Allowable (100%)</span><span>150%+</span></div></div>`;
}
function miniGauge(uf){
 if(!Number.isFinite(uf))return '<span class="small">—</span>';
 const pass=uf<=1;const pct=Math.max(0,Math.min(uf,1.5))/1.5*100;
 return `<div class="mini-gauge"><div class="mini-gauge-track"><div class="mini-gauge-fill ${pass?'ok':'bad'}" style="width:${pct}%"></div><div class="mini-gauge-marker"></div></div></div>`;
}
function variable(symbol,name,value,unit='',group='input'){return{symbol,name,value,unit,group}}
function step(label,formula,substitution,result){return{label,formula,substitution,result}}
function showError(s){const box=document.getElementById('globalError');if(!box)return;box.style.display='block';box.textContent=s;window.scrollTo({top:0,behavior:'smooth'})}
function clearError(){const box=document.getElementById('globalError');if(box)box.style.display='none'}
function validPairs(pairs){const e=[];pairs.forEach(([id,label,rule])=>{const el=document.getElementById(id);const v=Number(el.value);if(!Number.isFinite(v)||(rule==='positive'&&v<=0)||(rule==='nonnegative'&&v<0))e.push(label)});if(e.length){showError('Provide valid values for: '+e.join(', '));return false}clearError();return true}
/* ---------- richer per-field validation with inline messages ----------
 rule: {id, label, required(bool, default true), integer(bool), min, max, exclusiveMin, exclusiveMax} */
function fieldWrap(id){const el=document.getElementById(id);return el?el.closest('.field'):null}
function markFieldError(id,msg){const wrap=fieldWrap(id);if(!wrap)return;wrap.classList.add('invalid');let err=wrap.querySelector('.field-err');if(!err){err=document.createElement('div');err.className='field-err';wrap.appendChild(err)}err.textContent=msg}
function clearFieldError(id){const wrap=fieldWrap(id);if(!wrap)return;wrap.classList.remove('invalid');const err=wrap.querySelector('.field-err');if(err)err.remove()}
function validateForm(rules){
 let ok=true;const messages=[];
 rules.forEach(r=>{
  clearFieldError(r.id);
  const el=document.getElementById(r.id);if(!el)return;
  const raw=String(el.value??'').trim();
  const required=r.required!==false;
  if(raw===''){if(required){markFieldError(r.id,`${r.label} is required.`);ok=false;messages.push(`${r.label} is required.`)}return}
  if(r.type==='text')return;
  const v=Number(raw);
  if(!Number.isFinite(v)){markFieldError(r.id,`${r.label} must be a number.`);ok=false;messages.push(`${r.label} must be a number.`);return}
  if(r.integer&&!Number.isInteger(v)){markFieldError(r.id,`${r.label} must be a whole number.`);ok=false;messages.push(`${r.label} must be a whole number.`);return}
  if(r.min!==undefined&&v<r.min){markFieldError(r.id,`${r.label} must be ≥ ${r.min}.`);ok=false;messages.push(`${r.label} must be ≥ ${r.min}.`);return}
  if(r.max!==undefined&&v>r.max){markFieldError(r.id,`${r.label} must be ≤ ${r.max}.`);ok=false;messages.push(`${r.label} must be ≤ ${r.max}.`);return}
  if(r.exclusiveMin!==undefined&&v<=r.exclusiveMin){markFieldError(r.id,`${r.label} must be greater than ${r.exclusiveMin}.`);ok=false;messages.push(`${r.label} must be greater than ${r.exclusiveMin}.`);return}
  if(r.exclusiveMax!==undefined&&v>=r.exclusiveMax){markFieldError(r.id,`${r.label} must be less than ${r.exclusiveMax}.`);ok=false;messages.push(`${r.label} must be less than ${r.exclusiveMax}.`);return}
 });
 if(ok)clearError();else showError(messages[0]+(messages.length>1?` (+${messages.length-1} more field${messages.length-1===1?'':'s'} below)`:''));
 return{ok,messages};
}
function markRequiredFields(rules){rules.forEach(r=>{if(r.required!==false){const wrap=fieldWrap(r.id);if(wrap)wrap.classList.add('required')}})}
function flashSaved(id){const el=document.getElementById(id);if(!el)return;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}
/* ---------- page chrome ---------- */
function renderChrome(activeKey){
 const header=document.getElementById('appHeader');
 if(header){header.innerHTML=`<div class="brand"><div><h1>Mechanical Calculation Toolkit</h1><p>Mathcad-style traceable calculations in US customary units</p></div></div>`;}
 const crumbs=document.getElementById('appNav');
 if(crumbs){crumbs.innerHTML='<a class="home" href="index.html">Dashboard</a>'+PAGES.map(p=>`<a href="${p.file}" class="${p.key===activeKey?'active':''}">${esc(p.label)}</a>`).join('');}
}

/* =====================================================================
   MATHCAD-STYLE WORKSHEET ENGINE
   Expressions are small JSON trees rendered to HTML (preview / print)
   and to native Word equations (Generate Word Report).
   ===================================================================== */
const mxArr=x=>Array.isArray(x)?x:[x];
function mxNum(x,d){
 const v=Number(x);if(x===''||x===undefined||x===null||!Number.isFinite(v))return '—';
 if(d===undefined)d=Math.abs(v)>=1000?1:Math.abs(v)>=1?4:5;
 return v.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:d});
}
const MX={
 v:(s,sub)=>({k:'v',s,sub}),                 // italic variable with optional subscript
 t:s=>({k:'t',s:String(s)}),                 // upright text
 n:(x,d)=>({k:'t',s:mxNum(x,d)}),            // number
 o:s=>({k:'o',s}),                           // operator
 u:s=>({k:'u',s}),                           // unit
 f:(n,d)=>({k:'f',n:mxArr(n),d:mxArr(d)}),   // stacked fraction
 r:c=>({k:'p',b:'round',c:mxArr(c)}),        // ( )
 s:c=>({k:'p',b:'square',c:mxArr(c)}),       // [ ]
 sq:c=>({k:'sup',c:mxArr(c),e:[{k:'t',s:'2'}]}) // squared
};
function mxHtml(n){
 if(Array.isArray(n))return n.map(mxHtml).join('');
 switch(n.k){
  case 'v':return `<span class="mv">${esc(n.s)}${n.sub?`<sub>${esc(n.sub)}</sub>`:''}</span>`;
  case 't':return `<span class="mt">${esc(n.s)}</span>`;
  case 'o':return `<span class="mop">${esc(n.s)}</span>`;
  case 'u':return `<span class="mu">${esc(n.s)}</span>`;
  case 'f':return `<span class="mfrac"><span class="num">${mxHtml(n.n)}</span><span class="den">${mxHtml(n.d)}</span></span>`;
  case 'p':return `<span class="mbr ${n.b}"><span class="l"></span><span class="in">${mxHtml(n.c)}</span><span class="r"></span></span>`;
  case 'sup':return `<span class="msup"><span>${mxHtml(n.c)}</span><span class="e">${mxHtml(n.e)}</span></span>`;
 }return '';
}
function mxDocx(n,D){
 if(Array.isArray(n))return n.flatMap(x=>mxDocx(x,D));
 switch(n.k){
  case 'v':return n.sub?[new D.MathSubScript({children:[new D.MathRun(n.s)],subScript:[new D.MathRun(n.sub)]})]:[new D.MathRun(n.s)];
  case 't':return [new D.MathRun(n.s)];
  case 'o':return [new D.MathRun(' '+n.s+' ')];
  case 'u':return [];
  case 'f':return [new D.MathFraction({numerator:mxDocx(n.n,D),denominator:mxDocx(n.d,D)})];
  case 'p':return [n.b==='square'?new D.MathSquareBrackets({children:mxDocx(n.c,D)}):new D.MathRoundBrackets({children:mxDocx(n.c,D)})];
  case 'sup':return [new D.MathSuperScript({children:mxDocx(n.c,D),superScript:mxDocx(n.e,D)})];
 }return [];
}
/* A worksheet line:  lhs := rhs[0] = rhs[1] = ... = result unit   (note above, desc/ref on the right) */
function wsLineHtml(L){
 if(L.text!==undefined)return `<div class="mc-line"><span class="mc-text"><b>${esc(L.label)}:</b> ${esc(L.text||'—')}</span></div>`;
 let s=L.note?`<div class="mc-note">${esc(L.note)}</div>`:'';
 let body=mxHtml(mxArr(L.lhs))+'<span class="mdef">:=</span>'+L.rhs.map((r,i)=>(i?'<span class="mop">=</span>':'')+mxHtml(mxArr(r))).join('');
 if(L.result!==undefined)body+=`<span class="mop">=</span><span class="mres">${esc(L.result)}${L.unit?`<span class="mu">${esc(L.unit)}</span>`:''}</span>`;
 else if(L.unit)body+=`<span class="mu">${esc(L.unit)}</span>`;
 if(L.status)body+=`<span class="mop">→</span><span class="status ${L.status}">${statusLabel(L.status)}</span>`;
 return s+`<div class="mc-line"><span class="mc-expr">${body}</span>${L.ref?`<span class="mc-ref">${esc(L.ref)}</span>`:''}</div>`;
}
function wsLineDocx(L,D){
 const out=[];
 if(L.text!==undefined){out.push(new D.Paragraph({indent:{left:360},spacing:{before:40,after:40},children:[new D.TextRun({text:L.label+': ',bold:true}),new D.TextRun(L.text||'—')]}));return out}
 if(L.note)out.push(new D.Paragraph({keepNext:true,spacing:{before:160,after:0},children:[new D.TextRun({text:L.note,italics:true,color:'4A6A8A',size:18})]}));
 const m=[...mxDocx(mxArr(L.lhs),D),new D.MathRun(' ≔ ')];
 L.rhs.forEach((r,i)=>{if(i)m.push(new D.MathRun(' = '));m.push(...mxDocx(mxArr(r),D))});
 if(L.result!==undefined)m.push(new D.MathRun(' = '+L.result));
 const kids=[new D.Math({children:m})];
 if(L.unit)kids.push(new D.TextRun({text:' '+L.unit,font:'Cambria Math'}));
 if(L.status)kids.push(new D.TextRun({text:'  → '+statusLabel(L.status),bold:true,color:L.status==='PASS'?'157A4A':L.status==='FAIL'?'B53228':'A8650A'}));
 if(L.ref)kids.push(new D.TextRun({text:'\t'+L.ref,color:'888888',size:18}));
 out.push(new D.Paragraph({indent:{left:360},spacing:{before:60,after:60},tabStops:[{type:D.TabStopType.RIGHT,position:9638}],children:kids}));
 return out;
}
/* ---------- worksheet builders for each module (built from the saved variables) ---------- */
function gv(r,sym){const v=(r.vars||[]).find(x=>x.symbol===sym);return v?v.value:undefined}
function isIn(r,sym){const v=(r.vars||[]).find(x=>x.symbol===sym);return !!v&&v.group==='input'}
function has(r,sym){return (r.vars||[]).some(x=>x.symbol===sym)}
const inp=(lhs,val,unit,desc,note)=>({note,lhs,rhs:[MX.n(val)],unit:unit==='-'?'':unit,ref:desc});
const {v:V,t:T,n:N,o:O,f:FR,r:RB,s:SB,sq:SQ}=MX;
const PI=T('π');
const SHEETS={
 bolt(r){
  const g=s=>gv(r,s);
  const D=g('D'),n=g('n'),P=g('P'),E=g('E'),f=g('f'),H=g('H'),K=g('K')??0.125,Sy=g('Sᵧ'),fr=g('%Sᵧ'),As=g('Aₛ'),sig=g('σ'),F=g('F'),tau=g('τ'),tauFt=g('τ_ft');
  const C=Math.cos(Math.PI/6),COS=[T('cos'),RB(FR(PI,T('6')))];
  const t1=F*E*(P+Math.PI*f*E/C)/(2*(Math.PI*E-P*f/C)),t2=F*f*((H+D+K)/4);
  const L=[
   inp(V('D'),D,'in','Thread major diameter','Input data'),
   inp(V('n'),n,'threads/in','Threads per inch'),
  ];
  if(isIn(r,'E'))L.push(inp(V('E'),E,'in','Pitch diameter of thread'));
  L.push(inp(V('f'),f,'','Friction coefficient'),
   inp(V('S','y'),Sy,'ksi','Yield strength'),
   inp(V('k','σ'),fr*100,'%','Target bolt stress, % of yield'),
   inp(V('K'),K,'in','Nut internal chamfer (API 6A Annex H)'));
  if(has(r,'nb'))L.push(inp(V('n','b'),g('nb'),'','Number of bolts'));
  L.push({note:'Thread pitch',lhs:V('P'),rhs:[FR(T('1'),V('n')),FR(T('1'),N(n))],result:mxNum(P,5),unit:'in'});
  if(!isIn(r,'E'))L.push({note:'Pitch diameter of thread (basic UN form)',lhs:V('E'),rhs:[[V('D'),O('−'),T('0.649519'),O('·'),V('P')],[N(D),O('−'),T('0.649519'),O('·'),N(P,5)]],result:mxNum(E,5),unit:'in'});
  L.push({note:'Hex size (nut)',lhs:V('H'),rhs:[[T('1.5'),O('·'),V('D'),O('+'),T('0.125')],[T('1.5'),O('·'),N(D),O('+'),T('0.125')]],result:mxNum(H,4),unit:'in',ref:'API 6A Annex H'});
  L.push({note:'Tensile stress area',lhs:V('A','s'),
   rhs:[[FR(T('1'),T('4')),O('·'),PI,O('·'),SQ(SB([V('D'),O('−'),RB([T('0.9743'),O('·'),V('P')])]))],
        [FR(T('1'),T('4')),O('·'),PI,O('·'),SQ(SB([N(D),O('−'),RB([T('0.9743'),O('·'),N(P,5)])]))]],
   result:mxNum(As,4),unit:'in²',ref:'API 6A Eq. (H.1)'});
  L.push({note:'Bolt stress',lhs:V('σ'),rhs:[[FR(V('k','σ'),T('100')),O('·'),V('S','y')],[FR(N(fr*100),T('100')),O('·'),N(Sy)]],result:mxNum(sig,3),unit:'ksi'});
  L.push({note:'Bolt load',lhs:V('F'),rhs:[[V('σ'),O('·'),V('A','s')],[N(sig*1000,1),O('·'),N(As,4)]],result:mxNum(F,0),unit:'lbf',ref:'API 6A Eq. (H.2)'});
  L.push({note:'Make-up torque',lhs:V('τ'),
   rhs:[[FR([V('F'),O('·'),V('E'),O('·'),SB([V('P'),O('+'),FR([PI,O('·'),V('f'),O('·'),V('E')],COS)])],
            [T('2'),O('·'),SB([PI,O('·'),V('E'),O('−'),FR([V('P'),O('·'),V('f')],COS)])]),
         O('+'),V('F'),O('·'),V('f'),O('·'),SB(FR([V('H'),O('+'),V('D'),O('+'),V('K')],T('4')))]],ref:'API 6A Eq. (H.3)'});
  L.push({lhs:V('τ'),
   rhs:[[FR([N(F,0),O('·'),N(E,5),O('·'),SB([N(P,5),O('+'),FR([PI,O('·'),N(f),O('·'),N(E,5)],COS)])],
            [T('2'),O('·'),SB([PI,O('·'),N(E,5),O('−'),FR([N(P,5),O('·'),N(f)],COS)])]),
         O('+'),N(F,0),O('·'),N(f),O('·'),SB(FR([N(H,4),O('+'),N(D),O('+'),N(K)],T('4')))]]});
  L.push({lhs:V('τ'),rhs:[[N(t1,1),O('+'),N(t2,1)]],result:mxNum(tau,1),unit:'lbf·in'});
  L.push({lhs:V('τ'),rhs:[FR(N(tau,1),T('12'))],result:mxNum(tauFt,1),unit:'ft·lbf'});
  if(has(r,'Ftotal'))L.push({note:'Total clamp load',lhs:V('F','total'),rhs:[[V('F'),O('·'),V('n','b')]],result:mxNum(g('Ftotal'),3),unit:'kip'});
  return L;
 },
 tensile(r){
  const g=s=>gv(r,s);const F=g('F'),k=g('k'),n=g('n'),A=g('Aₜ'),S=g('Sallow'),Fe=g('Fₑ'),st=g('σₜ'),uf=g('UF');
  return [
   inp(V('F'),F,'kip','Applied axial load','Input data'),inp(V('k'),k,'','Load distribution factor'),inp(V('n'),n,'','Load-sharing components'),
   inp(V('A','t'),A,'in²','Tensile area'),inp(V('S','allow'),S,'ksi','Allowable tensile stress'),
   {note:'Effective axial load',lhs:V('F','e'),rhs:[FR([V('F'),O('·'),V('k')],V('n')),FR([N(F),O('·'),N(k)],N(n))],result:mxNum(Fe,4),unit:'kip'},
   {note:'Tensile stress',lhs:V('σ','t'),rhs:[FR(V('F','e'),V('A','t')),FR(N(Fe,4),N(A))],result:mxNum(st,4),unit:'ksi'},
   {note:'Utilization factor',lhs:V('UF'),rhs:[FR(V('σ','t'),V('S','allow')),FR(N(st,4),N(S))],result:mxNum(uf,3),status:status(uf)}
  ];
 },
 thread(r){
  const g=s=>gv(r,s);const F=g('F'),Ae=g('Ase'),Ai=g('Asi'),Se=g('Sallow,e'),Si=g('Sallow,i'),te=g('τₑ'),ti=g('τᵢ'),ue=g('UFₑ'),ui=g('UFᵢ'),uf=g('UF');
  const L=[];
  if(g('Thread'))L.push({label:'Thread designation',text:g('Thread')});
  if(g('Source'))L.push({label:'Area equation / source',text:g('Source')});
  L.push(inp(V('F'),F,'kip','Applied axial load','Input data'),inp(V('A','s,e'),Ae,'in²','External thread shear area'),inp(V('A','s,i'),Ai,'in²','Internal thread shear area'),
   inp(V('S','allow,e'),Se,'ksi','External shear allowable'),inp(V('S','allow,i'),Si,'ksi','Internal shear allowable'));
  if(g('Lₑ')!==''&&g('Lₑ')!==undefined)L.push(inp(V('L','e'),g('Lₑ'),'in','Thread engagement length'));
  L.push({note:'External thread shear stress',lhs:V('τ','e'),rhs:[FR(V('F'),V('A','s,e')),FR(N(F),N(Ae))],result:mxNum(te,4),unit:'ksi'},
   {note:'Internal thread shear stress',lhs:V('τ','i'),rhs:[FR(V('F'),V('A','s,i')),FR(N(F),N(Ai))],result:mxNum(ti,4),unit:'ksi'},
   {note:'Utilization factors',lhs:V('UF','e'),rhs:[FR(V('τ','e'),V('S','allow,e')),FR(N(te,4),N(Se))],result:mxNum(ue,3)},
   {lhs:V('UF','i'),rhs:[FR(V('τ','i'),V('S','allow,i')),FR(N(ti,4),N(Si))],result:mxNum(ui,3)},
   {note:'Governing utilization',lhs:V('UF'),rhs:[[T('max'),RB([V('UF','e'),T(', '),V('UF','i')])],[T('max'),RB([N(ue,3),T(', '),N(ui,3)])]],result:mxNum(uf,3),status:status(uf)});
  return L;
 },
 bearing(r){
  const g=s=>gv(r,s);const F=g('F'),A=g('Aₚ'),S=g('Sallow'),sb=g('σb'),uf=g('UF');const L=[];
  if(g('Basis'))L.push({label:'Area basis',text:g('Basis')});
  L.push(inp(V('F'),F,'kip','Bearing / contact force','Input data'),inp(V('A','p'),A,'in²','Projected bearing area'),inp(V('S','allow'),S,'ksi','Allowable bearing stress'),
   {note:'Bearing stress',lhs:V('σ','b'),rhs:[FR(V('F'),V('A','p')),FR(N(F),N(A))],result:mxNum(sb,4),unit:'ksi'},
   {note:'Utilization factor',lhs:V('UF'),rhs:[FR(V('σ','b'),V('S','allow')),FR(N(sb,4),N(S))],result:mxNum(uf,3),status:status(uf)});
  return L;
 },
 membrane(r){
  const g=s=>gv(r,s);const S=g('Sallow'),uf=g('UF');const L=[];
  if(g('Reference'))L.push({label:'Method applicability / reference',text:g('Reference')});
  let sym,st;
  if(has(r,'σm')){
   const F=g('F'),A=g('A');st=g('σm');sym=V('σ','m');
   L.push(inp(V('F'),F,'kip','Axial force','Input data'),inp(V('A'),A,'in²','Effective area'),inp(V('S','allow'),S,'ksi','Allowable membrane stress'),
    {note:'Axial membrane stress',lhs:sym,rhs:[FR(V('F'),V('A')),FR(N(F),N(A))],result:mxNum(st,4),unit:'ksi'});
  }else{
   const hoop=has(r,'σh');const P=g('P'),D=g('D'),t=g('t'),c=g('c');st=g(hoop?'σh':'σl');sym=V('σ',hoop?'h':'l');
   L.push(inp(V('P'),P,'psi','Internal pressure','Input data'),inp(V('D'),D,'in','Diameter basis'),inp(V('t'),t,'in','Effective thickness'),inp(V('S','allow'),S,'ksi','Allowable membrane stress'),
    {note:hoop?'Hoop membrane stress (thin cylinder)':'Longitudinal membrane stress (thin cylinder)',lhs:sym,
     rhs:[FR([V('P'),O('·'),V('D')],[T(String(c)),O('·'),V('t')]),FR([N(P),O('·'),N(D)],[T(String(c)),O('·'),N(t)]),FR(N(st*1000,3),T('1000'))],result:mxNum(st,4),unit:'ksi'});
  }
  L.push({note:'Utilization factor',lhs:V('UF'),rhs:[FR(sym,V('S','allow')),FR(N(st,4),N(S))],result:mxNum(uf,3),status:status(uf)});
  return L;
 },
 hydraulic(r){
  const g=s=>gv(r,s);const D=g('D'),d=g('d'),Pc=g('Pcap'),Pr=g('Prod'),eta=g('η'),n=g('n'),req=g('Frequired'),Ac=g('Acap'),Aa=g('Aann'),Fc=g('Fcap'),Fr=g('Frod'),Fn=g('Fnet'),uf=g('UF');
  const L=[inp(V('D'),D,'in','Cylinder bore diameter','Input data'),inp(V('d'),d,'in','Rod diameter'),inp(V('P','cap'),Pc,'psi','Cap-side pressure'),inp(V('P','rod'),Pr,'psi','Rod-side pressure'),
   inp(V('η'),eta,'','Efficiency'),inp(V('n'),n,'','Number of cylinders')];
  if(req>0)L.push(inp(V('F','req'),req,'kip','Required force'));
  L.push({note:'Cap-end piston area',lhs:V('A','cap'),rhs:[FR([PI,O('·'),SQ(V('D'))],T('4')),FR([PI,O('·'),SQ(N(D))],T('4'))],result:mxNum(Ac,4),unit:'in²'},
   {note:'Rod-side annular area',lhs:V('A','ann'),rhs:[FR([PI,O('·'),RB([SQ(V('D')),O('−'),SQ(V('d'))])],T('4')),FR([PI,O('·'),RB([SQ(N(D)),O('−'),SQ(N(d))])],T('4'))],result:mxNum(Aa,4),unit:'in²'},
   {note:'Hydraulic forces',lhs:V('F','cap'),rhs:[[V('P','cap'),O('·'),V('A','cap')],[N(Pc),O('·'),N(Ac,4)]],result:mxNum(Fc,1),unit:'lbf'},
   {lhs:V('F','rod'),rhs:[[V('P','rod'),O('·'),V('A','ann')],[N(Pr),O('·'),N(Aa,4)]],result:mxNum(Fr,1),unit:'lbf'},
   {note:'Net available force',lhs:V('F','net'),rhs:[FR([RB([V('F','cap'),O('−'),V('F','rod')]),O('·'),V('η'),O('·'),V('n')],T('1000')),FR([RB([N(Fc,1),O('−'),N(Fr,1)]),O('·'),N(eta),O('·'),N(n)],T('1000'))],result:mxNum(Fn,4),unit:'kip'});
  if(req>0)L.push({note:'Capacity utilization',lhs:V('UF'),rhs:[FR(V('F','req'),V('F','net')),FR(N(req),N(Fn,4))],result:mxNum(uf,3),status:status(uf)});
  return L;
 }
};
/* fallback for any module without a dedicated builder: steps flow as single-line equations, no step numbers */
function genericSheet(r){
 const L=[];let first=true;
 (r.vars||[]).filter(v=>v.group==='input').forEach(v=>{
  if(typeof v.value==='string'&&v.value!==''&&!Number.isFinite(Number(v.value))){L.push({label:v.name,text:v.value});return}
  L.push(inp(T(v.symbol),v.value,v.unit,v.name,first?'Input data':undefined));first=false});
 (r.steps||[]).forEach(s=>{
  const split=x=>{const i=String(x||'').indexOf('=');return i<0?['',String(x||'')]:[String(x).slice(0,i).trim(),String(x).slice(i+1).trim()]};
  const [lhs,fx]=split(s.formula),[,sx]=split(s.substitution),[,rx]=split(s.result);
  L.push({note:s.label,lhs:T(lhs),rhs:[T(fx)].concat(sx?[T(sx)]:[]),result:rx||undefined});
 });
 return L;
}
function worksheet(key,r){try{return SHEETS[key]?SHEETS[key](r):genericSheet(r)}catch(e){console.error(e);return genericSheet(r)}}

/* ---------- report building (used by utilization-summary.html and calculation-report.html) ---------- */
function hasUF(r){return r&&!r.noUF}
function resultTable(results){const rows=Object.values(results||{}).filter(hasUF);return rows.length?`<table><tr><th>Calculation</th><th class="right">Demand</th><th class="right">Allowable / Capacity</th><th class="right">UF</th><th>Margin</th><th>Status</th></tr>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td class="right">${fmt(r.demand)} ${esc(r.unit)}</td><td class="right">${fmt(r.allowable)} ${esc(r.unit)}</td><td class="right">${fmt(r.uf)}</td><td>${miniGauge(r.uf)}</td><td>${esc(statusLabel(r.status))}</td></tr>`).join('')}</table>`:'<p>No completed utilization checks.</p>'}
function detailedSection(key,r){
 const badge=hasUF(r)&&r.status?`<span class="status ${r.status}">${statusLabel(r.status)}</span>`:'';
 return `<section id="report-${key}" class="report-module"><div class="report-module-head"><h3>${esc(r.name)}</h3>${badge}</div><div class="mc-sheet">${worksheet(key,r).map(wsLineHtml).join('')}</div></section>`;
}
function reportHtml(){
 const d=loadData(),p=d.project||{},results=d.results||{};
 const rows=Object.entries(results).filter(([,r])=>r&&r.vars);
 const governing=Object.values(results).filter(r=>hasUF(r)&&Number.isFinite(r.uf)).sort((a,b)=>b.uf-a.uf)[0];
 return `<div class="report-sheet"><h1>${esc(p.p_title||'Mechanical Calculation Report')}</h1>
 <table><tr><th>Calculation No.</th><td>${esc(p.p_number)}</td><th>Revision</th><td>${esc(p.p_rev)}</td></tr>
 <tr><th>Project</th><td>${esc(p.p_project)}</td><th>Date</th><td>${esc(p.p_date)}</td></tr>
 <tr><th>Equipment</th><td>${esc(p.p_equipment)}</td><th>Component</th><td>${esc(p.p_component)}</td></tr>
 <tr><th>Drawing</th><td>${esc(p.p_drawing)}</td><th>Load case</th><td>${esc(p.p_loadcase)}</td></tr>
 <tr><th>Prepared by</th><td>${esc(p.p_prepared)}</td><th>Checked by</th><td>${esc(p.p_checked)}</td></tr></table>
 <h2>1. Purpose and Scope</h2><p>${esc(PURPOSE_TEXT)}</p>
 <h2>2. Design Basis and References</h2><p><b>Design standard / basis:</b> ${esc(p.p_standard)}</p><p><b>References:</b><br>${esc(p.p_refs||'').replace(/\n/g,'<br>')}</p>
 <h2>3. Assumptions and Limitations</h2><p>${esc(p.p_assumptions||'').replace(/\n/g,'<br>')}</p>
 <h2>4. Results Summary</h2>${resultTable(results)}
 <h2>5. Detailed Calculations</h2>${rows.map(([k,r])=>detailedSection(k,r)).join('')||'<p>No completed calculations.</p>'}
 <h2>6. Conclusion</h2><p>${conclusionText(governing,p)}</p>
 <p class="muted"><small>Generated by Mechanical Calculation Toolkit v${APP_VERSION} on ${esc(new Date().toLocaleString())}.</small></p></div>`;
}
const PURPOSE_TEXT='This report records the completed mechanical calculations using US customary units. Each calculation is presented as a continuous worksheet: input definitions, governing equations, numerical substitution and results.';
function conclusionText(governing,p,plain){
 const b=s=>plain?s:`<b>${esc(s)}</b>`;
 return (governing?`The governing utilization factor is ${b(fmt(governing.uf))} for ${b(governing.name)} under load case ${b(p.p_loadcase||'')}.`:'No evaluated utilization factor is available.')+' Final acceptance is subject to independent engineering review and approval.';
}
/* ---------- Word report (.docx with native, editable Word equations) ---------- */
async function generateWord(){
 const D=window.docx;
 if(!D||!D.Math){generateWordHtml();return}
 const d=loadData(),p=d.project||{},results=d.results||{};
 const W=9638,bd={style:D.BorderStyle.SINGLE,size:4,color:'B7C6D1'},borders={top:bd,bottom:bd,left:bd,right:bd};
 const cell=(text,w,head)=>new D.TableCell({borders,width:{size:w,type:D.WidthType.DXA},margins:{top:60,bottom:60,left:100,right:100},
   shading:head?{fill:'E3EEF3',type:D.ShadingType.CLEAR}:undefined,children:[new D.Paragraph({children:[new D.TextRun({text:String(text??''),bold:!!head,size:18})]})]});
 const table=(cols,rows)=>new D.Table({width:{size:W,type:D.WidthType.DXA},columnWidths:cols,rows:rows.map(r=>new D.TableRow({children:r.map((c,i)=>(c&&typeof c==="object")?cell(c.t,cols[i],c.h):cell(c??"",cols[i],false))}))});
 const para=t=>new D.Paragraph({spacing:{after:120},children:[new D.TextRun(t)]});
 const lines=t=>String(t||'').split('\n').map(x=>para(x));
 const H=(lvl,t)=>new D.Paragraph({heading:lvl,children:[new D.TextRun(t)]});
 const c4=[2100,2719,2100,2719],h=t=>({t,h:true});
 const kids=[H(D.HeadingLevel.HEADING_1,p.p_title||'Mechanical Calculation Report'),
  table(c4,[[h('Calculation No.'),p.p_number,h('Revision'),p.p_rev],[h('Project'),p.p_project,h('Date'),p.p_date],[h('Equipment'),p.p_equipment,h('Component'),p.p_component],[h('Drawing'),p.p_drawing,h('Load case'),p.p_loadcase],[h('Prepared by'),p.p_prepared,h('Checked by'),p.p_checked]]),
  H(D.HeadingLevel.HEADING_2,'1. Purpose and Scope'),para(PURPOSE_TEXT),
  H(D.HeadingLevel.HEADING_2,'2. Design Basis and References'),new D.Paragraph({spacing:{after:120},children:[new D.TextRun({text:'Design standard / basis: ',bold:true}),new D.TextRun(p.p_standard||'')]}),
  new D.Paragraph({children:[new D.TextRun({text:'References:',bold:true})]}),...lines(p.p_refs),
  H(D.HeadingLevel.HEADING_2,'3. Assumptions and Limitations'),...lines(p.p_assumptions),
  H(D.HeadingLevel.HEADING_2,'4. Results Summary')];
 const ufRows=Object.values(results).filter(hasUF);
 if(ufRows.length){const cs=[3238,1700,1900,1100,1700];kids.push(table(cs,[[h('Calculation'),h('Demand'),h('Allowable / Capacity'),h('UF'),h('Status')],...ufRows.map(r=>[r.name,`${fmt(r.demand)} ${r.unit||''}`,`${fmt(r.allowable)} ${r.unit||''}`,fmt(r.uf),statusLabel(r.status)])]))}
 else kids.push(para('No completed utilization checks.'));
 kids.push(H(D.HeadingLevel.HEADING_2,'5. Detailed Calculations'));
 Object.entries(results).filter(([,r])=>r&&r.vars).forEach(([k,r])=>{kids.push(H(D.HeadingLevel.HEADING_3,r.name||k));worksheet(k,r).forEach(L=>kids.push(...wsLineDocx(L,D)))});
 const governing=ufRows.filter(r=>Number.isFinite(r.uf)).sort((a,b)=>b.uf-a.uf)[0];
 kids.push(H(D.HeadingLevel.HEADING_2,'6. Conclusion'),para(conclusionText(governing,p,true)),
  new D.Paragraph({spacing:{before:240},children:[new D.TextRun({text:`Generated by Mechanical Calculation Toolkit v${APP_VERSION} on ${new Date().toLocaleString()}.`,italics:true,size:16,color:'687985'})]}));
 const hs=(id,name,size,before,lvl)=>({id,name,basedOn:'Normal',next:'Normal',quickFormat:true,run:{size,bold:true,color:'0D2B40'},paragraph:{spacing:{before,after:120},outlineLevel:lvl,keepNext:true}});
 const doc=new D.Document({
  styles:{default:{document:{run:{font:'Arial',size:20}}},paragraphStyles:[hs('Heading1','Heading 1',32,0,0),hs('Heading2','Heading 2',26,300,1),hs('Heading3','Heading 3',22,240,2)]},
  sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,right:1134,bottom:1134,left:1134}}},
   footers:{default:new D.Footer({children:[new D.Paragraph({alignment:D.AlignmentType.RIGHT,children:[new D.TextRun({text:'Page ',size:16}),new D.TextRun({children:[D.PageNumber.CURRENT],size:16})]})]})},
   children:kids}]
 });
 const blob=await D.Packer.toBlob(doc);
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${(p.p_number||'Mechanical_Calculation')}_${(p.p_rev||'01')}_Report_US.docx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
/* fallback if docx.iife.js is not available: Word-compatible HTML (.doc); fractions are shown inline */
const WORD_STYLE=`body{font-family:Segoe UI,Arial,sans-serif;color:#1f2933}h1{border-bottom:2px solid #1677a8;padding-bottom:8px;color:#11324a}h2{color:#11324a;margin-top:22px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #cbd5df;padding:6px 8px;font-size:12px;text-align:left}th{background:#eaf2f7;color:#17384b}.mc-note{color:#4a6a8a;font-size:11px;margin-top:10px}.mc-line{margin:4px 0 4px 18px;font-family:'Cambria Math',Cambria,serif}.mfrac .num:after{content:' / '}.mres{font-weight:bold}.mc-ref{color:#888;font-size:10px;margin-left:20px}.muted{color:#687985}`;
function generateWordHtml(){
 const body=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${WORD_STYLE}@page{size:A4;margin:20mm}</style></head><body>${reportHtml()}</body></html>`;
 const blob=new Blob(['\ufeff',body],{type:'application/msword'});
 const d=loadData(),p=d.project||{};
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${(p.p_number||'Mechanical_Calculation')}_${(p.p_rev||'01')}_Report_US.doc`;a.click();URL.revokeObjectURL(a.href);
}
