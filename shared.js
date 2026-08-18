/* Mechanical Calculation Toolkit — shared runtime (auth, data store, nav, calc helpers) */
const APP_VERSION='2.0.0 (US)';
const SESSION_KEY='mct_session';
const USERS_KEY='mct_users_db';
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

/* ---------- auth ---------- */
function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
function requireAuth(){const s=getSession();if(!s||!s.username){window.location.href='login.html';return null}return s}
function logout(){localStorage.removeItem(SESSION_KEY);window.location.href='login.html'}
function getUsersDb(){try{return JSON.parse(localStorage.getItem(USERS_KEY)||'null')}catch(e){return null}}

/* ---------- shared calculation data store ---------- */
function loadData(){try{return JSON.parse(localStorage.getItem(DATA_KEY)||'null')||{project:{},results:{}}}catch(e){return{project:{},results:{}}}}
function saveData(d){localStorage.setItem(DATA_KEY,JSON.stringify(d))}
function saveModuleResult(key,data){const d=loadData();d.results=d.results||{};d.results[key]=data;saveData(d)}
function saveProjectField(id,value){const d=loadData();d.project=d.project||{};d.project[id]=value;saveData(d)}
function clearAllData(){localStorage.removeItem(DATA_KEY)}

/* ---------- formatting / small helpers ---------- */
function fmt(v,d=3){return Number.isFinite(Number(v))&&v!==''?Number(v).toLocaleString(undefined,{maximumFractionDigits:d}):'—'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function status(uf){return Number.isFinite(uf)?(uf<=1?'PASS':'FAIL'):'NOT-EVALUATED'}
function box(label,value,unit=''){return `<div class="result"><b>${esc(label)}</b><span>${esc(value)}</span> <small>${esc(unit)}</small></div>`}
function sbox(s){return `<div class="result"><b>Status</b><span class="status ${s}">${s.replace('-',' ')}</span></div>`}
function variable(symbol,name,value,unit='',group='input'){return{symbol,name,value,unit,group}}
function step(label,formula,substitution,result){return{label,formula,substitution,result}}
function showError(s){const box=document.getElementById('globalError');if(!box)return;box.style.display='block';box.textContent=s;window.scrollTo({top:0,behavior:'smooth'})}
function clearError(){const box=document.getElementById('globalError');if(box)box.style.display='none'}
function validPairs(pairs){const e=[];pairs.forEach(([id,label,rule])=>{const el=document.getElementById(id);const v=Number(el.value);if(!Number.isFinite(v)||(rule==='positive'&&v<=0)||(rule==='nonnegative'&&v<0))e.push(label)});if(e.length){showError('Provide valid values for: '+e.join(', '));return false}clearError();return true}
function flashSaved(id){const el=document.getElementById(id);if(!el)return;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}

/* ---------- page chrome ---------- */
function renderChrome(activeKey){
 const s=requireAuth();if(!s)return null;
 const header=document.getElementById('appHeader');
 if(header){header.innerHTML=`<div class="brand"><div><h1>Mechanical Calculation Toolkit</h1><p>Mathcad-style traceable calculations in US customary units</p></div><div class="session"><span class="who">Signed in: ${esc(s.username)}</span><button class="ghost" onclick="logout()">Log out</button></div></div>`;}
 const crumbs=document.getElementById('appNav');
 if(crumbs){crumbs.innerHTML='<a class="home" href="index.html">Dashboard</a>'+PAGES.map(p=>`<a href="${p.file}" class="${p.key===activeKey?'active':''}">${esc(p.label)}</a>`).join('');}
 return s;
}

/* ---------- report building (used by utilization-summary.html and calculation-report.html) ---------- */
function resultTable(results){const rows=Object.values(results||{});return rows.length?`<table><tr><th>Calculation</th><th>Demand</th><th>Allowable / Capacity</th><th>UF</th><th>Status</th></tr>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${fmt(r.demand)} ${esc(r.unit)}</td><td>${fmt(r.allowable)} ${esc(r.unit)}</td><td>${fmt(r.uf)}</td><td>${esc(r.status)}</td></tr>`).join('')}</table>`:'<p>No completed calculations.</p>'}
function detailedSection(key,r){const allVars=r.vars||[],inputVars=allVars.filter(v=>(v.group||'input')==='input'),calculatedVars=allVars.filter(v=>v.group==='calculated');const renderVars=list=>list.map(v=>`<div class="var-item"><div><span class="var-symbol">${esc(v.symbol)}</span> = ${esc(v.name)}</div><div class="var-value">${esc(v.value===''?'—':fmt(v.value,4))} ${esc(v.unit||'')}</div></div>`).join('');const vars=`<div class="var-group">Input Variables</div>${renderVars(inputVars)||'<p class="small">No input variables recorded.</p>'}<div class="var-group">Calculated Variables</div>${renderVars(calculatedVars)||'<p class="small">No calculated variables recorded.</p>'}`;const steps=(r.steps||[]).map((st,i)=>`<div class="step"><span class="stepno">Step ${i+1}: ${esc(st.label)}</span><br><b>Formula:</b> ${esc(st.formula)}<br><b>Substitution:</b> ${esc(st.substitution)}<br><b>Result:</b> ${esc(st.result)}</div>`).join('');return `<section id="report-${key}" class="report-module"><h3>${esc(r.name)}</h3><div class="details-row"><div class="details-left"><div class="formula-title">Formula and step-by-step calculation</div><div class="formula">${esc(r.steps?.[0]?.formula||'Formula not recorded')}</div>${steps||'<p>No steps recorded.</p>'}</div><aside class="details-right"><h4>Variable Register</h4>${vars}</aside></div></section>`}
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
 <h2>1. Purpose and Scope</h2><p>This report records the completed mechanical calculations using US customary units. Each calculation contains a variable register, governing formula, numerical substitution, arithmetic progression and final result.</p>
 <h2>2. Design Basis and References</h2><p><b>Design standard / basis:</b> ${esc(p.p_standard)}</p><p><b>References:</b><br>${esc(p.p_refs||'').replace(/\n/g,'<br>')}</p>
 <h2>3. Assumptions and Limitations</h2><p>${esc(p.p_assumptions||'').replace(/\n/g,'<br>')}</p>
 <h2>4. Results Summary</h2>${resultTable(results)}
 <h2>5. Detailed Calculations</h2>${rows.map(([k,r])=>detailedSection(k,r)).join('')||'<p>No completed calculations.</p>'}
 <h2>6. Conclusion</h2><p>${governing?`The governing utilization factor is <b>${fmt(governing.uf)}</b> for <b>${esc(governing.name)}</b> under load case <b>${esc(p.p_loadcase)}</b>.`:'No evaluated utilization factor is available.'} Final acceptance is subject to independent engineering review and approval.</p>
 <p class="muted"><small>Generated by Mechanical Calculation Toolkit v${APP_VERSION} on ${esc(new Date().toLocaleString())}.</small></p></div>`;
}
const WORD_STYLE=`body{font-family:Segoe UI,Arial,sans-serif;color:#1f2933}h1{border-bottom:2px solid #1677a8;padding-bottom:8px;color:#11324a}h2{color:#11324a;margin-top:22px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #cbd5df;padding:6px 8px;font-size:12px;text-align:left}th{background:#eaf2f7;color:#17384b}.formula{font-family:Consolas,monospace;background:#f1f7fa;border-left:4px solid #1677a8;padding:10px;margin:10px 0}.step{font-family:Consolas,monospace;background:#f8fbfd;border-left:3px solid #bad7e6;padding:8px;margin-bottom:6px;font-size:12px}.stepno{font-family:Segoe UI,Arial,sans-serif;color:#526474;font-weight:700}.var-item{display:flex;justify-content:space-between;border-bottom:1px dashed #dbe7ee;padding:4px 0;font-size:12px}.var-group{margin:10px 0 4px;padding:5px 7px;background:#eaf2f7;font-size:11px;font-weight:800;color:#17384b;text-transform:uppercase}.report-sheet{padding:10px}.muted{color:#687985}`;
function generateWord(){
 const body=`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${WORD_STYLE}@page{size:A4;margin:20mm}</style></head><body>${reportHtml()}</body></html>`;
 const blob=new Blob(['\ufeff',body],{type:'application/msword'});
 const d=loadData(),p=d.project||{};
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${(p.p_number||'Mechanical_Calculation')}_${(p.p_rev||'01')}_Report_US.doc`;a.click();URL.revokeObjectURL(a.href);
}