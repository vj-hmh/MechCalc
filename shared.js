/* Mechanical Calculation Toolkit — shared runtime (data store, nav, calc helpers, Mathcad-style equations) */
const APP_VERSION='3.0.0 (US)';
const DATA_KEY='mct_data';
const PAGES=[
 {key:'project',   file:'project-info.html',        label:'Project Information'},
 {key:'bolt',      file:'bolt-preload.html',        label:'Bolt Preload and Torque'},
 {key:'thread',    file:'thread-shear.html',        label:'Thread Shear Stress'},
 {key:'bearing',   file:'bearing-stress.html',      label:'Bearing Stress'},
 {key:'membrane',  file:'membrane-stress.html',     label:'Membrane Stress'},
 {key:'hydraulic', file:'hydraulic-cylinder.html',  label:'Hydraulic Cylinder Force'},
 {key:'summary',   file:'utilization-summary.html', label:'Utilization Summary'},
 {key:'report',    file:'calculation-report.html',  label:'Calculation Report'}
];
const RETIRED_MODULES=['tensile'];
/* ---------- shared calculation data store ---------- */
function loadData(){
 let d;
 try{d=JSON.parse(localStorage.getItem(DATA_KEY)||'null')||{project:{},results:{}}}catch(e){d={project:{},results:{}}}
 if(d.results){
  RETIRED_MODULES.forEach(k=>{delete d.results[k]});
  /* results saved by older versions (flat text formulas) are dropped so the report stays fully Mathcad-style; re-run those pages */
  Object.keys(d.results).forEach(k=>{const st=(d.results[k].steps||[])[0];if(st&&st.eq===undefined)delete d.results[k]});
 }
 return d;
}
function saveData(d){localStorage.setItem(DATA_KEY,JSON.stringify(d))}
function saveModuleResult(key,data){const d=loadData();d.results=d.results||{};d.results[key]=data;saveData(d)}
function saveProjectField(id,value){const d=loadData();d.project=d.project||{};d.project[id]=value;saveData(d)}
function clearAllData(){localStorage.removeItem(DATA_KEY)}
/* ---------- JSON export / import ---------- */
function downloadJson(filename,obj){
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}
function safeFileToken(s,fallback){const t=String(s||'').trim().replace(/[^a-z0-9_\-]+/gi,'_');return t||fallback}
function exportProjectJson(){
 const d=loadData();const p=d.project||{};
 downloadJson(`${safeFileToken(p.p_number,'mechanical_calculation')}_${safeFileToken(p.p_rev,'01')}_data.json`,d);
}
function validateImportedData(obj){
 if(!obj||typeof obj!=='object'||Array.isArray(obj))return 'The file does not contain a valid JSON object.';
 for(const k of ['project','inputs','results'])if(obj[k]!==undefined&&(typeof obj[k]!=='object'||Array.isArray(obj[k])))return `The "${k}" section in the JSON is not valid.`;
 return null;
}
async function importProjectJsonFile(file,statusElId){
 const statusEl=statusElId?document.getElementById(statusElId):null;
 try{
  const obj=JSON.parse(await file.text());
  const err=validateImportedData(obj);
  if(err){if(statusEl)statusEl.textContent=err;return false}
  saveData({project:obj.project||{},inputs:obj.inputs||{},results:obj.results||{}});
  saveData(loadData());
  if(statusEl)statusEl.textContent='Data imported. Open Project Information or any calculation page — fields and results are already filled in.';
  return true;
 }catch(e){
  console.error(e);
  if(statusEl)statusEl.textContent='Could not read that file. Make sure it is valid JSON exported from this toolkit.';
  return false;
 }
}
/* ---------- formatting / small helpers ---------- */
function fmt(v,d=3){return v!==''&&v!==null&&Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:d}):'—'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function status(uf){return Number.isFinite(uf)?(uf<=1?'PASS':'FAIL'):'NOT-EVALUATED'}
function box(label,value,unit=''){return `<div class="result"><b>${esc(label)}</b><span>${esc(value)}</span> <small>${esc(unit)}</small></div>`}
function sbox(s){return `<div class="result"><b>Status</b><span class="status ${s}">${s.replace('-',' ')}</span></div>`}
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
function showError(s){const box=document.getElementById('globalError');if(!box)return;box.style.display='block';box.textContent=s;window.scrollTo({top:0,behavior:'smooth'})}
function clearError(){const box=document.getElementById('globalError');if(box)box.style.display='none'}
/* ---------- per-field validation ---------- */
function fieldWrap(id){const el=document.getElementById(id);return el&&el.closest?el.closest('.field'):null}
function markFieldError(id,msg){const wrap=fieldWrap(id);if(!wrap)return;wrap.classList.add('invalid');let err=wrap.querySelector('.field-err');if(!err){err=document.createElement('div');err.className='field-err';wrap.appendChild(err)}err.textContent=msg}
function clearFieldError(id){const wrap=fieldWrap(id);if(!wrap)return;wrap.classList.remove('invalid');const err=wrap.querySelector('.field-err');if(err)err.remove()}
function validateForm(rules){
 let ok=true;const messages=[];
 const fail=(id,m)=>{markFieldError(id,m);ok=false;messages.push(m)};
 rules.forEach(r=>{
  clearFieldError(r.id);
  const el=document.getElementById(r.id);if(!el)return;
  const raw=String(el.value??'').trim();
  if(raw===''){if(r.required!==false)fail(r.id,`${r.label} is required.`);return}
  if(r.type==='text')return;
  const v=Number(raw);
  if(!Number.isFinite(v))return fail(r.id,`${r.label} must be a number.`);
  if(r.integer&&!Number.isInteger(v))return fail(r.id,`${r.label} must be a whole number.`);
  if(r.min!==undefined&&v<r.min)return fail(r.id,`${r.label} must be ≥ ${r.min}.`);
  if(r.max!==undefined&&v>r.max)return fail(r.id,`${r.label} must be ≤ ${r.max}.`);
  if(r.exclusiveMin!==undefined&&v<=r.exclusiveMin)return fail(r.id,`${r.label} must be greater than ${r.exclusiveMin}.`);
  if(r.exclusiveMax!==undefined&&v>=r.exclusiveMax)return fail(r.id,`${r.label} must be less than ${r.exclusiveMax}.`);
 });
 if(ok)clearError();else showError(messages[0]+(messages.length>1?` (+${messages.length-1} more field${messages.length-1===1?'':'s'} below)`:''));
 return{ok,messages};
}
function markRequiredFields(rules){rules.forEach(r=>{if(r.required!==false){const wrap=fieldWrap(r.id);if(wrap)wrap.classList.add('required')}})}
function flashSaved(id){const el=document.getElementById(id);if(!el)return;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}
/* ---------- page chrome ---------- */
function renderChrome(activeKey){
 const header=document.getElementById('appHeader');
 if(header)header.innerHTML=`<div class="brand"><div><h1>Mechanical Calculation Toolkit</h1><p>Mathcad-style traceable calculations in US customary units</p></div></div>`;
 const crumbs=document.getElementById('appNav');
 if(crumbs)crumbs.innerHTML='<a class="home" href="index.html">Dashboard</a>'+PAGES.map(p=>`<a href="${p.file}" class="${p.key===activeKey?'active':''}">${esc(p.label)}</a>`).join('');
}
/* =====================================================================
   MATHCAD-STYLE EQUATION ENGINE
   Equations are built once as a small expression tree (M.*) and rendered:
     - on screen / print / PDF  -> MathML (stacked fractions, brackets, sub/superscripts)
     - in the Word report       -> native Word (OMML) equation objects
   ===================================================================== */
const M={
 v:(b,s)=>({t:'v',b,s}),                       // italic variable, optional subscript
 n:(x,d=4)=>({t:'n',x:typeof x==='number'?fmt(x,d):String(x)}), // number
 o:s=>({t:'o',s}),                             // operator
 u:s=>({t:'u',s}),                             // unit (upright)
 c:s=>({t:'c',s}),                             // upright constant e.g. π
 tx:s=>({t:'tx',s}),                           // upright text
 r:(...c)=>({t:'r',c}),                        // row
 f:(a,b)=>({t:'f',a,b}),                       // stacked fraction
 p:(x,e)=>({t:'p',x,e}),                       // power
 sqrt:x=>({t:'sqrt',x}),
 br:(x,k='(')=>({t:'br',x,k}),                 // brackets ( [ {
 fn:(name,x)=>({t:'fn',name,x}),               // function: cos(x), max(a,b)
 q:(x,unit,d=4)=>({t:'r',c:[M.n(x,d),...(unit&&unit!=='-'?[M.u(unit)]:[])]}) // quantity
};
M.pi=M.c('π');
const M_OPS=new Set(['+','−','-','×','·','÷','=',':=','≥','≤','>','<',',','→']);
function mNorm(x){
 if(x===null||x===undefined)return M.tx('');
 if(typeof x==='number')return M.n(x);
 if(typeof x==='string'){if(M_OPS.has(x))return M.o(x==='-'?'−':x);if(/^[0-9.]+$/.test(x))return M.n(x);return M.tx(x)}
 return x;
}
/* ---------- MathML renderer ---------- */
function mmlTok(tag,txt,attr=''){return `<${tag}${attr}>${esc(txt)}</${tag}>`}
function mmlId(s){return s.length>1?mmlTok('mi',s,' class="mv"'):mmlTok('mi',s)}
function toMML(x){
 x=mNorm(x);
 switch(x.t){
  case 'v':return x.s?`<msub>${mmlId(x.b)}${mmlTok('mi',x.s,' class="msb"')}</msub>`:mmlId(x.b);
  case 'n':return mmlTok('mn',x.x);
  case 'o':return mmlTok('mo',x.s);
  case 'u':return `<mspace width="0.25em"></mspace>${mmlTok('mi',x.s,' mathvariant="normal" class="mu"')}`;
  case 'c':return mmlTok('mi',x.s,' mathvariant="normal"');
  case 'tx':return mmlTok('mtext',x.s);
  case 'r':return `<mrow>${x.c.map(toMML).join('')}</mrow>`;
  case 'f':return `<mfrac><mstyle displaystyle="true">${toMML(x.a)}</mstyle><mstyle displaystyle="true">${toMML(x.b)}</mstyle></mfrac>`;
  case 'p':return `<msup><mrow>${toMML(x.x)}</mrow><mrow>${toMML(x.e)}</mrow></msup>`;
  case 'sqrt':return `<msqrt>${toMML(x.x)}</msqrt>`;
  case 'br':{const R={'(':')','[':']','{':'}'}[x.k];return `<mrow><mo fence="true" stretchy="true">${esc(x.k)}</mo>${toMML(x.x)}<mo fence="true" stretchy="true">${esc(R)}</mo></mrow>`}
  case 'fn':return `<mrow><mi mathvariant="normal">${esc(x.name)}</mi><mo>&#x2061;</mo>${toMML(M.br(x.x))}</mrow>`;
 }
 return '';
}
function mathHtml(x){return `<math display="inline"><mstyle displaystyle="true">${toMML(x)}</mstyle></math>`}
/* Equation line helpers: definition  lhs := rhs ;  evaluation  lhs = rhs */
function defLine(lhs,rhs){return lhs?M.r(lhs,M.o(':='),rhs):rhs}
function evalLine(lhs,rhs){return lhs?M.r(lhs,M.o('='),rhs):rhs}
/* Formula box on input pages: list of {lhs, eq, ref} */
function renderFormulaBox(elId,list){
 const el=document.getElementById(elId);if(!el)return;
 el.classList.add('mc-formula');
 el.innerHTML=list.map(e=>`<div class="mc-line"><span class="mc-expr">${mathHtml(defLine(e.lhs,e.eq))}</span>${e.ref?`<span class="mc-ref">${esc(e.ref)}</span>`:''}</div>`).join('');
}
/* ---------- data model ---------- */
/* variable(key, name, value, unit, group, sym) — sym is the display symbol (M.v(...)) */
function variable(symbol,name,value,unit='',group='input',sym){return{symbol,name,value,unit,group,sym:sym||null}}
/* step(label, lhs, eq, sub, res, ref)
   lhs  : symbol being defined (M.v) or null for checks
   eq   : governing equation (right-hand side)
   sub  : equation with numerical values substituted
   res  : result value with unit                                  */
function step(label,lhs,eq,sub,res,ref=''){return{label,lhs,eq,sub,res,ref}}
function stepLines(st){
 if(st.eq!==undefined)return[defLine(st.lhs,st.eq),evalLine(st.lhs,st.sub),evalLine(st.lhs,st.res)];
 return[M.tx(st.formula||''),M.tx(st.substitution||''),M.tx(st.result||'')]; // legacy saved data
}
function symOf(v){return v.sym||M.tx(v.symbol)}
function inputValueNode(v){
 if(v.value===''||v.value===null||v.value===undefined)return M.tx('—');
 const n=Number(v.value);
 const numeric=typeof v.value==='number'||(String(v.value).trim()!==''&&Number.isFinite(n));
 return numeric?M.q(n,v.unit,5):M.tx('"'+v.value+'"');
}
/* ---------- report building ---------- */
function resultTable(results){const rows=Object.values(results||{});return rows.length?`<table><tr><th>Calculation</th><th class="right">Demand</th><th class="right">Allowable / Capacity</th><th class="right">UF</th><th>Margin</th><th>Status</th></tr>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td class="right">${fmt(r.demand)} ${esc(r.unit)}</td><td class="right">${fmt(r.allowable)} ${esc(r.unit)}</td><td class="right">${fmt(r.uf)}</td><td>${miniGauge(r.uf)}</td><td>${esc(r.status)}</td></tr>`).join('')}</table>`:'<p>No completed calculations.</p>'}
function detailedSection(key,r){
 const inputVars=(r.vars||[]).filter(v=>(v.group||'input')==='input'&&v.value!==''&&v.value!==null&&v.value!==undefined);
 const inputs=inputVars.map(v=>`<div class="mc-line"><span class="mc-expr">${mathHtml(M.r(symOf(v),M.o(':='),inputValueNode(v)))}</span><span class="mc-ref">${esc(v.name)}</span></div>`).join('');
 const steps=(r.steps||[]).map(st=>{const[a,b,c]=stepLines(st);return `<div class="mc-block"><div class="mc-note">${esc(st.label)}${st.ref?`<span class="mc-ref">${esc(st.ref)}</span>`:''}</div>
<div class="mc-line"><span class="mc-expr">${mathHtml(a)}</span></div>
<div class="mc-line"><span class="mc-expr">${mathHtml(b)}</span></div>
<div class="mc-line"><span class="mc-expr mres">${mathHtml(c)}</span></div></div>`}).join('');
 const evaluated=Number.isFinite(r.uf);
 return `<section id="report-${key}" class="report-module"><div class="report-module-head"><h3>${esc(r.name)}</h3>${evaluated?`<span class="status ${r.status}">${r.status.replace('-',' ')}</span>`:''}</div>
<div class="mc-sheet"><div class="mc-note mc-section">Input Data</div>${inputs||'<p class="small">No input data recorded.</p>'}
<div class="mc-note mc-section">Calculation</div>${steps||'<p>No calculation steps recorded.</p>'}</div></section>`;
}
function reportHtml(){
 const d=loadData(),p=d.project||{},results=d.results||{};
 const rows=Object.entries(results);
 const governing=Object.values(results).filter(r=>Number.isFinite(r.uf)).sort((a,b)=>b.uf-a.uf)[0];
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
 <h2>6. Conclusion</h2><p>${esc(conclusionText(governing,p))}</p>
 <p class="muted"><small>Generated by Mechanical Calculation Toolkit v${APP_VERSION} on ${esc(new Date().toLocaleString())}.</small></p></div>`;
}
const PURPOSE_TEXT='This report records the completed mechanical calculations using US customary units. Each calculation lists its input data first, followed by the governing equation, numerical substitution and result.';
function conclusionText(g,p){return (g?`The governing utilization factor is ${fmt(g.uf)} for ${g.name} under load case ${p.p_loadcase||'—'}.`:'No evaluated utilization factor is available.')+' Final acceptance is subject to independent engineering review and approval.'}
const MC_STYLE=`math{font-family:"Cambria Math","STIX Two Math","Latin Modern Math","DejaVu Math TeX Gyre",math,serif;font-size:1.12em}
math mfrac>*{math-depth:inherit!important;math-style:normal!important}math msub>:last-child,math msup>:last-child{math-depth:add(1)}
math .mv{font-style:italic}math .msb{font-style:italic}math .mu{color:#11507a}
.mc-sheet,.mc-formula{background:#fff;color:#111;border:1px solid #d5e2ea;border-radius:6px;padding:12px 22px 16px;margin:10px 0 18px;overflow-x:auto}
.mc-formula{border-left:4px solid #1677a8}
.mc-note{font-family:Segoe UI,Arial,sans-serif;font-size:12.5px;font-weight:700;color:#11507a;margin:16px 0 4px;display:flex}
.mc-section{font-size:13px;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #d5e2ea;padding-bottom:4px;margin-top:14px}
.mc-line{display:flex;align-items:center;gap:18px;margin:6px 0 6px 22px;min-height:28px}
.mc-expr{display:inline-flex;align-items:center}
.mc-ref{margin-left:auto;font-family:Segoe UI,Arial,sans-serif;font-size:12px;font-weight:400;color:#687985;white-space:nowrap;padding-left:16px}
.mres{background:#e3f0f7;border-radius:4px;padding:2px 8px}
.mc-block{break-inside:avoid}
@media print{.mc-sheet{border:none;padding:0}.mc-line{break-inside:avoid}}`;
(function injectMcStyle(){if(typeof document==='undefined'||!document.head)return;const s=document.createElement('style');s.textContent=MC_STYLE;document.head.appendChild(s)})();

/* ---------- Word (.docx) report with native, editable Word equations ---------- */
function toOMML(x,D){
 x=mNorm(x);
 const run=t=>new D.MathRun(t);
 const up=t=>new D.BuilderElement({name:'m:r',children:[new D.BuilderElement({name:'m:rPr',children:[new D.BuilderElement({name:'m:sty',attributes:{v:{key:'m:val',value:'p'}}})]}),new D.BuilderElement({name:'m:t',attributes:{s:{key:'xml:space',value:'preserve'}},children:[t]})]});
 const nor=t=>new D.BuilderElement({name:'m:r',children:[new D.BuilderElement({name:'m:rPr',children:[new D.BuilderElement({name:'m:nor'})]}),new D.BuilderElement({name:'w:rPr',children:[new D.BuilderElement({name:'w:rFonts',attributes:{a:{key:'w:ascii',value:'Cambria Math'},h:{key:'w:hAnsi',value:'Cambria Math'}}})]}),new D.BuilderElement({name:'m:t',attributes:{s:{key:'xml:space',value:'preserve'}},children:[t]})]});
 const all=a=>toOMML(a,D);
 switch(x.t){
  case 'v':return x.s?[new D.MathSubScript({children:[run(x.b)],subScript:[run(x.s)]})]:[run(x.b)];
  case 'n':return[run(x.x)];
  case 'o':return[up(x.s===':='?' := ':x.s==='='?' = ':x.s)];
  case 'u':return[nor('\u2009'+x.s)];
  case 'c':return[up(x.s)];
  case 'tx':return[nor(x.s)];
  case 'r':return x.c.flatMap(all);
  case 'f':return[new D.MathFraction({numerator:all(x.a),denominator:all(x.b)})];
  case 'p':return[new D.MathSuperScript({children:all(x.x),superScript:all(x.e)})];
  case 'sqrt':return[new D.MathRadical({children:all(x.x)})];
  case 'br':{const C=x.k==='['?D.MathSquareBrackets:x.k==='{'?D.MathCurlyBrackets:D.MathRoundBrackets;return[new C({children:all(x.x)})]}
  case 'fn':return[new D.MathFunction({name:[up(x.name)],children:[new D.MathRoundBrackets({children:all(x.x)})]})];
 }
 return[];
}
function buildDocx(D){
 const d=loadData(),p=d.project||{},results=d.results||{};
 const governing=Object.values(results).filter(r=>Number.isFinite(r.uf)).sort((a,b)=>b.uf-a.uf)[0];
 const TW=9638; // A4 text width (twips) with 20 mm margins
 const txt=(t,o={})=>new D.TextRun({text:String(t??''),font:'Segoe UI',size:20,...o});
 const para=(t,o={})=>new D.Paragraph({children:[txt(t,o.run||{})],spacing:{after:120},...(o.p||{})});
 const head=(t,lvl)=>new D.Paragraph({heading:lvl,children:[new D.TextRun({text:t,font:'Segoe UI',bold:true,color:'11324A',size:lvl===D.HeadingLevel.HEADING_1?28:24})],spacing:{before:240,after:120}});
 const border={style:D.BorderStyle.SINGLE,size:4,color:'CBD5DF'};
 const borders={top:border,bottom:border,left:border,right:border};
 const cell=(t,o={})=>new D.TableCell({borders,width:{size:o.w||1000,type:D.WidthType.DXA},shading:o.th?{fill:'EAF2F7',type:D.ShadingType.CLEAR,color:'auto'}:undefined,margins:{top:60,bottom:60,left:100,right:100},children:[new D.Paragraph({alignment:o.right?D.AlignmentType.RIGHT:D.AlignmentType.LEFT,children:[txt(t,{bold:!!o.th,size:18,color:o.th?'17384B':undefined})]})]});
 const mathPara=(node,o={})=>new D.Paragraph({indent:{left:o.indent??567},spacing:{before:60,after:60},tabStops:[{type:D.TabStopType.RIGHT,position:TW}],shading:o.hl?{fill:'E3F0F7',type:D.ShadingType.CLEAR,color:'auto'}:undefined,children:[new D.Math({children:toOMML(node,D)}),...(o.note?[txt('\t'+o.note,{size:18,color:'687985'})]:[])]});
 const label=(t,ref)=>new D.Paragraph({keepNext:true,spacing:{before:200,after:40},indent:{left:284},tabStops:[{type:D.TabStopType.RIGHT,position:TW}],children:[txt(t,{bold:true,color:'11507A',size:20}),...(ref?[txt('\t'+ref,{size:18,color:'687985',italics:true})]:[])]});
 const sub=t=>new D.Paragraph({keepNext:true,spacing:{before:200,after:80},border:{bottom:{style:D.BorderStyle.SINGLE,size:4,color:'D5E2EA',space:2}},children:[txt(t.toUpperCase(),{bold:true,color:'11507A',size:18})]});

 const pw=[1700,3119,1500,3319];
 const proj=[['Calculation No.',p.p_number,'Revision',p.p_rev],['Project',p.p_project,'Date',p.p_date],['Equipment',p.p_equipment,'Component',p.p_component],['Drawing',p.p_drawing,'Load case',p.p_loadcase],['Prepared by',p.p_prepared,'Checked by',p.p_checked]];
 const projTable=new D.Table({width:{size:TW,type:D.WidthType.DXA},columnWidths:pw,rows:proj.map(r=>new D.TableRow({children:r.map((c,i)=>cell(c,{w:pw[i],th:i%2===0}))}))});
 const rw=[3638,1600,1800,1000,1600];
 const resRows=Object.values(results);
 const resTable=resRows.length?new D.Table({width:{size:TW,type:D.WidthType.DXA},columnWidths:rw,rows:[new D.TableRow({tableHeader:true,children:['Calculation','Demand','Allowable / Capacity','UF','Status'].map((h,i)=>cell(h,{w:rw[i],th:true,right:i>0&&i<4}))}),...resRows.map(r=>new D.TableRow({children:[cell(r.name,{w:rw[0]}),cell(`${fmt(r.demand)} ${r.unit}`,{w:rw[1],right:true}),cell(`${fmt(r.allowable)} ${r.unit}`,{w:rw[2],right:true}),cell(fmt(r.uf),{w:rw[3],right:true}),cell(r.status.replace('-',' '),{w:rw[4]})]}))]}):para('No completed calculations.');

 const detail=[];
 Object.values(results).forEach(r=>{
  detail.push(head(r.name+(Number.isFinite(r.uf)?`  —  ${r.status.replace('-',' ')}`:''),D.HeadingLevel.HEADING_2));
  detail.push(sub('Input Data'));
  (r.vars||[]).filter(v=>(v.group||'input')==='input'&&v.value!==''&&v.value!==null&&v.value!==undefined)
   .forEach(v=>detail.push(mathPara(M.r(symOf(v),M.o(':='),inputValueNode(v)),{note:v.name,indent:284})));
  detail.push(sub('Calculation'));
  (r.steps||[]).forEach(st=>{const[a,b,c]=stepLines(st);detail.push(label(st.label,st.ref),mathPara(a),mathPara(b),mathPara(c,{hl:true}))});
 });
 const lines=s=>String(s||'').split('\n').map(l=>para(l));
 return new D.Document({
  styles:{default:{document:{run:{font:'Segoe UI',size:20}}}},
  sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},
   footers:{default:new D.Footer({children:[new D.Paragraph({alignment:D.AlignmentType.RIGHT,children:[txt(`${p.p_number||''} Rev ${p.p_rev||''}   Page `,{size:16,color:'687985'}),new D.TextRun({children:[D.PageNumber.CURRENT],size:16,color:'687985'})]})]})},
   children:[
    new D.Paragraph({spacing:{after:200},border:{bottom:{style:D.BorderStyle.SINGLE,size:12,color:'1677A8',space:4}},children:[new D.TextRun({text:p.p_title||'Mechanical Calculation Report',font:'Segoe UI',bold:true,size:36,color:'11324A'})]}),
    projTable,
    head('1. Purpose and Scope',D.HeadingLevel.HEADING_1),para(PURPOSE_TEXT),
    head('2. Design Basis and References',D.HeadingLevel.HEADING_1),
    new D.Paragraph({spacing:{after:120},children:[txt('Design standard / basis: ',{bold:true}),txt(p.p_standard)]}),
    new D.Paragraph({spacing:{after:60},children:[txt('References:',{bold:true})]}),...lines(p.p_refs),
    head('3. Assumptions and Limitations',D.HeadingLevel.HEADING_1),...lines(p.p_assumptions),
    head('4. Results Summary',D.HeadingLevel.HEADING_1),resTable,
    head('5. Detailed Calculations',D.HeadingLevel.HEADING_1),...(detail.length?detail:[para('No completed calculations.')]),
    head('6. Conclusion',D.HeadingLevel.HEADING_1),para(conclusionText(governing,p)),
    para(`Generated by Mechanical Calculation Toolkit v${APP_VERSION} on ${new Date().toLocaleString()}.`,{run:{size:16,color:'687985'}})
   ]}]
 });
}
async function generateWord(){
 const D=window.docx;
 if(!D||!D.Math)throw new Error('Word library (docx.iife.js) is not loaded. Keep docx.iife.js in the same folder as the toolkit.');
 const blob=await D.Packer.toBlob(buildDocx(D));
 const p=loadData().project||{};
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${safeFileToken(p.p_number,'Mechanical_Calculation')}_${safeFileToken(p.p_rev,'01')}_Report_US.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
