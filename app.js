// ── CONSTANTS ─────────────────────────────────────────────────
const STEPS=[
  {tag:'Etapa 1 de 6',title:'Dados da Incorporadora',desc:'Empresa, responsável e localização.'},
  {tag:'Etapa 2 de 6',title:'Histórico de Vendas',desc:'VGV realizado e metas de crescimento.'},
  {tag:'Etapa 3 de 6',title:'Estrutura Comercial',desc:'Canais, equipe e organograma atual.'},
  {tag:'Etapa 4 de 6',title:'Tecnologia e Ferramentas',desc:'Ferramentas em uso no canal de parceiros e seus custos.'},
  {tag:'Etapa 5 de 6',title:'Dores e Desafios',desc:'Obstáculos no canal de parcerias.'},
  {tag:'Etapa 6 de 6',title:'Tabela Zero e Observações',desc:'Pré-lançamento e contexto adicional.'}
];
const CHAL_LABELS={
  engagement:'Baixo engajamento de corretores',
  visibility:'Falta de visibilidade das ações',
  exec_mgmt:'Falta de gestão dos executivos de parceria',
  build_team:'Construir e treinar time de parcerias',
  high_demand:'Alta demanda de solicitações dos corretores',
  turnover:'Alto giro de corretores',
  training:'Falta de capacitação dos corretores',
  competition:'Concorrência com outras incorporadoras',
  product:'Corretores não conhecem o produto',
  crm:'Sem gestão de carteira (Ouro/Prata/Bronze)',
  data_loss:'Histórico perdido quando executivo sai'
};
const RPT_LABELS={
  engagement:'Engajamento por corretor/imobiliária',
  exec_kpi:'KPIs por executivo de parceria',
  vgv_exec:'VGV por executivo/gerente',
  portfolio:'Carteira Ouro/Prata/Bronze',
  other:'Outro'
};
const TZ_LABELS={
  house:'Canal House',
  parcerias:'House + Parcerias',
  imobiliarias:'Imobiliárias parceiras selecionadas',
  todos:'Todos ao mesmo tempo'
};
const TOOLS_DEF=[
  {k:'toolsWhatsapp',   l:'WhatsApp pessoal / grupos avulsos',      hint:'Sem API, sem rastreamento de leitura'},
  {k:'toolsWhatsappBiz',l:'WhatsApp Business sem API oficial',       hint:'Risco de banimento do número'},
  {k:'toolsEmail',      l:'E-mail marketing',                        hint:'Sem taxa de abertura rastreada'},
  {k:'toolsDrive',      l:'Google Drive',                            hint:'Sem rastreamento de acesso por corretor'},
  {k:'toolsIntranet',   l:'Intranet / portal próprio',               hint:'Sem monitoramento de acesso individual'},
  {k:'toolsExcel',      l:'Planilhas Excel / Google Sheets',         hint:'Sem visão consolidada de carteira'},
  {k:'toolsOfficialCRM',l:'CRM focado em contratos',                hint:'Não gerencia relacionamento com corretores'},
  {k:'toolsUnofficial', l:'Apps/ferramentas não homologadas',        hint:'Software não autorizado, risco de vazamento de dados'}
];

// Plano Operadora DWV
const PLANO_ANUAL  = 57295.20;
const PLANO_MENSAL = 4774.60;

// ── STORAGE ───────────────────────────────────────────────────
const DB_KEY='dwv_diagnosticos_v1';
function loadDB(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'[]');}catch{return[];}}
function saveDB(arr){try{localStorage.setItem(DB_KEY,JSON.stringify(arr));}catch{}}
function addToDB(record){const arr=loadDB();arr.push({...record,id:Date.now(),date:new Date().toISOString()});saveDB(arr);}

// ── HELPERS ────────────────────────────────────────────────────
const fmt=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:0}).format(v||0);
const fmtN=v=>new Intl.NumberFormat('pt-BR').format(Math.round(v||0));
const fmtP=v=>(v||0).toFixed(1)+'%';
const parseCur=s=>Number(String(s).replace(/\D/g,''))||0;
const fmtCI=v=>{const n=String(v).replace(/\D/g,'');return n?parseInt(n).toLocaleString('pt-BR'):'';}

// ── STATE ──────────────────────────────────────────────────────
let D={};
let isSim=false;
let currentStep=0;

function resetD(){
  D={
    consultantName:'',
    companyName:'',location:'',responsibleName:'',responsibleRole:'',
    totalVGV:0,vgvGoal:0,avgTicket:0,
    totalBrokers:0,activeBrokers:0,brokersExclusivity:'',
    hasHouse:false,hasParc:true,hasImob:false,
    parcManagers:0,parcExecutives:0,houseManagers:0,houseBrokers:0,
    hasCRM:false,crmName:'',toolCosts:{},
    meetingGoals:'',challenges:[],challengesText:'',
    testedActions:false,testedResults:'',
    brokerSegmentation:'',brokerSegCRM:'',
    desiredReports:[],desiredReportsOther:'',
    tabelaZero:false,tabelaZeroAccess:[],tabelaZeroObs:'',
    observations:''
  };
  TOOLS_DEF.forEach(t=>D[t.k]=false);
}
resetD();

// ── NAV HELPERS ──────────────────────────────────────────────
function hideAll(){
  document.getElementById('startScreen').style.display='none';
  document.getElementById('formWrap').style.display='none';
  document.getElementById('results').style.display='none';
  document.getElementById('dashboard').style.display='none';
  document.getElementById('diagList').style.display='none';
}
function showNav(activeId){
  const nav=document.getElementById('bottomNav');
  nav.style.display='flex';
  document.querySelectorAll('.bnav-item').forEach(b=>b.classList.remove('active'));
  const el=document.getElementById(activeId);
  if(el)el.classList.add('active');
}
function hideNav(){document.getElementById('bottomNav').style.display='none';}

// ── START ──────────────────────────────────────────────────────
function showStart(){
  hideAll();
  document.getElementById('startScreen').style.display='block';
  showNav('navHome');
  const db=loadDB();
  const realCount=db.filter(r=>!r.isSim).length;
  document.getElementById('startScreen').innerHTML=`
    <div class="start">
      <h1>Diagnóstico Comercial</h1>
      <p>Aplique a Fórmula de Aceleração DWV para mapear a situação atual da incorporadora, calcular o gap de engajamento e apresentar as 3 rotas estratégicas.</p>
      <div class="start-btns">
        <button class="btn-start btn-real" onclick="startDiag(false)">Iniciar Diagnóstico Real</button>
        <button class="btn-start btn-sim" onclick="startDiag(true)">▷ Simulação com dados não reais</button>
      </div>
      ${db.length>0?`<div style="margin-top:24px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="dash-link" onclick="showDiagList()">&#9776; ${db.length} Diagnóstico${db.length>1?'s':''} realizados</button>
        ${realCount>0?`<button class="dash-link" onclick="showDashboard()">&#9636; BI · ${realCount} incorporadora${realCount>1?'s':''}</button>`:''}
      </div>`:''}
    </div>`;
}

function startDiag(sim){
  resetD();isSim=sim;currentStep=0;
  if(sim){
    D.consultantName='Simulacao DWV';
    D.companyName='Vertice Incorporadora';D.location='Florianópolis, SC';
    D.responsibleName='Ricardo Menezes';D.responsibleRole='Diretor de Parcerias';
    D.totalVGV=48000000;D.vgvGoal=80000000;D.avgTicket=620000;
    D.totalBrokers=420;D.activeBrokers=58;D.brokersExclusivity='non-exclusive';
    D.hasHouse=true;D.hasParc=true;D.parcManagers=3;D.parcExecutives=6;D.houseManagers=2;D.houseBrokers=8;
    D.hasCRM=false;D.toolsWhatsapp=true;D.toolsEmail=true;D.toolsDrive=true;D.toolsExcel=true;
    D.toolCosts={toolsEmail:350,toolsDrive:200};
    D.meetingGoals='partial';D.challenges=['engagement','visibility','exec_mgmt','crm'];
    D.challengesText='Executivos não conseguem rastrear quais corretores estão próximos de fechar.';
    D.testedActions=true;D.testedResults='Grupos de WhatsApp por empreendimento, sem controle de leitura.';
    D.brokerSegmentation='none';D.desiredReports=['engagement','exec_kpi','portfolio'];
    D.tabelaZero=true;D.tabelaZeroAccess=['parcerias'];D.tabelaZeroObs='Apenas corretores Ouro.';
  }
  hideAll();
  document.getElementById('formWrap').style.display='block';
  document.getElementById('simBadge').style.display=sim?'flex':'none';
  hideNav();
  render();
}

// ── PILLS ─────────────────────────────────────────────────────
function pills(){
  document.getElementById('pills').innerHTML=STEPS.map((s,i)=>{
    const n=s.tag.split(' ')[1];
    const c=i===currentStep?'active':i<currentStep?'done':'';
    return`<div class="pill ${c}" onclick="${i<currentStep?'goStep('+i+')':''}">${n}</div>`;
  }).join('');
  document.getElementById('prog').style.width=(((currentStep+1)/STEPS.length)*100)+'%';
}

// ── SAVE ──────────────────────────────────────────────────────
function save(){
  const g=id=>{const e=document.getElementById(id);return e?e.value:''};
  const gc=id=>{const e=document.getElementById(id);return e?e.checked:false};
  const gr=name=>{const e=document.querySelector(`input[name=${name}]:checked`);return e?e.value:''};
  const gca=name=>Array.from(document.querySelectorAll(`input[name=${name}]:checked`)).map(e=>e.value);
  if(currentStep===0){D.consultantName=g('consultant');D.companyName=g('cN');D.location=g('loc');D.responsibleName=g('rN');D.responsibleRole=g('rR');}
  else if(currentStep===1){D.totalVGV=parseCur(g('tVGV'));D.vgvGoal=parseCur(g('vGoal'));D.avgTicket=parseCur(g('avgT'));}
  else if(currentStep===2){
    D.totalBrokers=parseInt(g('tBr'))||0;D.activeBrokers=parseInt(g('aBr'))||0;
    D.brokersExclusivity=g('bExcl');
    D.hasHouse=gc('chHouse');D.hasParc=gc('chParc');D.hasImob=gc('chImob');
    D.parcManagers=parseInt(g('pMgr'))||0;D.parcExecutives=parseInt(g('pExec'))||0;
    D.houseManagers=parseInt(g('hMgr'))||0;D.houseBrokers=parseInt(g('hBr'))||0;
  }
  else if(currentStep===3){
    D.hasCRM=gr('hasCRM')==='yes';D.crmName=g('crmName');
    TOOLS_DEF.forEach(t=>{D[t.k]=gc(t.k);const v=g('cost_'+t.k);if(v)D.toolCosts[t.k]=parseCur(v);else delete D.toolCosts[t.k];});
  }
  else if(currentStep===4){
    D.meetingGoals=gr('mGoals');D.challenges=gca('chal');D.challengesText=g('chalText');
    D.testedActions=gr('tested')==='yes';D.testedResults=g('testRes');
    D.brokerSegmentation=gr('bSeg');D.brokerSegCRM=g('bSegCRM');
    D.desiredReports=gca('reports');D.desiredReportsOther=g('repOther');
  }
  else if(currentStep===5){
    D.tabelaZero=gr('tz')==='yes';D.tabelaZeroAccess=gca('tzAccess');
    D.tabelaZeroObs=g('tzObs');D.observations=g('obs');
  }
}

function canNext(){
  if(currentStep===0)return !!(document.getElementById('consultant')?.value && document.getElementById('cN')?.value);
  if(currentStep===1)return parseCur(document.getElementById('tVGV')?.value||'')>0&&parseCur(document.getElementById('vGoal')?.value||'')>0;
  if(currentStep===2)return (parseInt(document.getElementById('tBr')?.value)||0)>0&&(parseInt(document.getElementById('aBr')?.value)||0)>0;
  return true;
}

function goStep(i){save();currentStep=i;render();}
function prev(){if(currentStep===0)return;save();currentStep--;render();window.scrollTo({top:0,behavior:'smooth'});}
function next(){
  save();
  if(currentStep<STEPS.length-1){currentStep++;render();window.scrollTo({top:0,behavior:'smooth'});}
  else showResults();
}

function updateConditionals(){
  const crmYes=document.querySelector('input[name=hasCRM][value=yes]')?.checked;
  const crmF=document.getElementById('crmNameField');if(crmF)crmF.style.display=crmYes?'block':'none';
  const tested=document.querySelector('input[name=tested][value=yes]')?.checked;
  const tF=document.getElementById('testResField');if(tF)tF.style.display=tested?'block':'none';
  const tzYes=document.querySelector('input[name=tz][value=yes]')?.checked;
  const tzF=document.getElementById('tzAccessField');if(tzF)tzF.style.display=tzYes?'block':'none';
  const segSys=document.querySelector('input[name=bSeg][value=system]')?.checked;
  const segF=document.getElementById('segCRMField');if(segF)segF.style.display=segSys?'block':'none';
  const repO=document.querySelector('input[name=reports][value=other]')?.checked;
  const repF=document.getElementById('repOtherField');if(repF)repF.style.display=repO?'block':'none';
  TOOLS_DEF.forEach(t=>{
    const cb=document.getElementById(t.k);
    const row=document.getElementById('costrow_'+t.k);
    if(cb&&row)row.style.display=cb.checked?'flex':'none';
  });
  const nb=document.getElementById('nextBtn');if(nb)nb.disabled=!canNext();
}

function render(){
  pills();
  const s=STEPS[currentStep];
  const isLast=currentStep===STEPS.length-1;
  document.getElementById('form-area').innerHTML=`
    <div class="stag">${s.tag}</div>
    <div class="stitle">${s.title}</div>
    <div class="sdesc">${s.desc}</div>
    ${body()}
    <div class="nav">
      <button class="btn btng ${currentStep===0?'invis':''}" onclick="prev()">← Anterior</button>
      <button id="nextBtn" class="btn btnp" onclick="next()" ${!canNext()?'disabled':''}>
        ${isLast?'Ver Diagnóstico →':'Avançar →'}
      </button>
    </div>`;
  restore();
  document.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('input',updateConditionals);
    el.addEventListener('change',updateConditionals);
  });
  updateConditionals();
}

// ── STEP BODIES ───────────────────────────────────────────────
function body(){
  if(currentStep===0)return`
    <div class="field"><label>Consultor DWV responsavel <span class="req">*</span></label>
      <input type="text" id="consultant" placeholder="Seu nome (quem aplica o diagnostico)"/></div>
    <div style="border-top:.5px solid var(--b);margin:8px 0 20px"></div>
    <div class="field"><label>Nome da Incorporadora <span class="req">*</span></label>
      <input type="text" id="cN" placeholder="Ex: Incorporadora Valor S.A."/></div>
    <div class="g2">
      <div class="field"><label>Responsável <span class="req">*</span></label>
        <input type="text" id="rN" placeholder="Nome completo"/></div>
      <div class="field"><label>Cargo</label>
        <input type="text" id="rR" placeholder="Ex: Diretor Comercial"/></div>
    </div>
    <div class="field"><label>Cidade / Estado <span class="req">*</span></label>
      <input type="text" id="loc" placeholder="Ex: Florianópolis, SC"/></div>`;

  if(currentStep===1)return`
    <div class="field"><label>VGV vendido nos últimos 12 meses (R$) <span class="req">*</span></label>
      <input type="text" id="tVGV" placeholder="0" oninput="this.value=fmtCI(this.value)"/>
      <div class="hint">Total de vendas pelo canal de parcerias nos últimos 12 meses.</div></div>
    <div class="field"><label>Meta de VGV anual (R$) <span class="req">*</span></label>
      <input type="text" id="vGoal" placeholder="0" oninput="this.value=fmtCI(this.value)"/></div>
    <div class="field"><label>Ticket médio por unidade (R$)</label>
      <input type="text" id="avgT" placeholder="0" oninput="this.value=fmtCI(this.value)"/>
      <div class="hint">Valor médio por unidade — usado para estimar volume necessário.</div></div>`;

  if(currentStep===2)return`
    <div class="g2">
      <div class="field"><label>Total de corretores na base <span class="req">*</span></label>
        <input type="number" id="tBr" placeholder="0" min="0"/></div>
      <div class="field"><label>Corretores que venderam nos últimos 12m <span class="req">*</span></label>
        <input type="number" id="aBr" placeholder="0" min="0"/></div>
    </div>
    <div class="field"><label>Modelo de exclusividade dos corretores</label>
      <select id="bExcl">
        <option value="">Selecione uma opção</option>
        <option value="exclusive">Exclusivos — trabalham só com esta incorporadora</option>
        <option value="non-exclusive">Não exclusivos — trabalham com várias incorporadoras</option>
        <option value="mixed">Modelo misto — parte exclusiva, parte não</option>
      </select></div>
    <div class="field"><label>Canais comerciais ativos</label>
      <div class="rg h" style="margin-top:8px">
        <label class="co"><input type="checkbox" id="chHouse"/> Canal House (equipe interna)</label>
        <label class="co"><input type="checkbox" id="chParc"/> Canal Parcerias</label>
        <label class="co"><input type="checkbox" id="chImob"/> Imobiliária(s) parceiras</label>
      </div></div>
    <div class="subbox">
      <div class="subbox-tag">Organograma · Canal Parcerias</div>
      <div class="g2">
        <div class="field"><label>Gerentes de Parceria</label><input type="number" id="pMgr" placeholder="0" min="0"/></div>
        <div class="field"><label>Executivos de Parceria</label><input type="number" id="pExec" placeholder="0" min="0"/></div>
      </div>
      <div class="g2">
        <div class="field"><label>Gerentes House</label><input type="number" id="hMgr" placeholder="0" min="0"/></div>
        <div class="field"><label>Corretores internos (House)</label><input type="number" id="hBr" placeholder="0" min="0"/></div>
      </div>
    </div>`;

  if(currentStep===3)return`
    <div class="field"><label>A incorporadora usa um CRM voltado para parceiros?</label>
      <div class="rg h" style="margin-top:8px">
        <label class="ro"><input type="radio" name="hasCRM" value="yes"/> Sim</label>
        <label class="ro"><input type="radio" name="hasCRM" value="no"/> Não</label>
      </div></div>
    <div id="crmNameField" style="display:none" class="field"><label>Qual CRM é utilizado?</label>
      <input type="text" id="crmName" placeholder="Ex: HubSpot, Salesforce, CRM próprio..."/></div>
    <div class="field">
      <label>Ferramentas utilizadas para comunicação e gestão de corretores</label>
      <div class="hint" style="margin-bottom:12px">Selecione as que utiliza e informe o custo mensal de cada uma quando aplicável.</div>
      ${TOOLS_DEF.map(t=>`
        <div class="tool-row">
          <label class="tool-check"><input type="checkbox" id="${t.k}"/>
            <div><div style="font-size:13px">${t.l}</div><div style="font-size:11px;color:var(--mu);margin-top:1px">${t.hint}</div></div>
          </label>
          <div id="costrow_${t.k}" style="display:none;align-items:center">
            <div class="tool-cost-pfx"><span>R$</span>
              <input type="text" id="cost_${t.k}" placeholder="0/mês" oninput="this.value=fmtCI(this.value)" style="width:120px;font-size:13px;padding:7px 10px 7px 28px"/>
            </div>
          </div>
        </div>`).join('')}
    </div>`;

  if(currentStep===4)return`
    <div class="field"><label>A incorporadora está batendo as metas de VGV?</label>
      <div class="rg" style="margin-top:8px">
        <label class="ro"><input type="radio" name="mGoals" value="yes"/> Sim, consistentemente</label>
        <label class="ro"><input type="radio" name="mGoals" value="partial"/> Parcialmente — alguns meses sim, outros não</label>
        <label class="ro"><input type="radio" name="mGoals" value="no"/> Não, abaixo da meta</label>
      </div></div>
    <div class="field"><label>Principais desafios no canal de parcerias</label>
      <div class="cg" style="margin-top:8px">
        ${Object.entries(CHAL_LABELS).map(([k,l])=>`<label class="co"><input type="checkbox" name="chal" value="${k}"/> ${l}</label>`).join('')}
      </div></div>
    <div class="field"><label>Existe alguma segmentação dos corretores da base?</label>
      <div class="rg" style="margin-top:8px">
        <label class="ro"><input type="radio" name="bSeg" value="none"/> Não — todos tratados da mesma forma</label>
        <label class="ro"><input type="radio" name="bSeg" value="manual"/> Sim, manualmente (planilha ou memória)</label>
        <label class="ro"><input type="radio" name="bSeg" value="system"/> Sim, por sistema (CRM ou plataforma)</label>
      </div></div>
    <div id="segCRMField" style="display:none" class="field"><label>Qual CRM ou plataforma utiliza para segmentação?</label>
      <input type="text" id="bSegCRM" placeholder="Ex: HubSpot, RD Station, sistema próprio..."/></div>
    <div class="field"><label>Quais relatórios você mais gostaria de ter sobre o canal de parcerias?</label>
      <div class="cg" style="margin-top:8px">
        ${Object.entries(RPT_LABELS).map(([k,l])=>`<label class="co"><input type="checkbox" name="reports" value="${k}"/> ${l}</label>`).join('')}
      </div></div>
    <div id="repOtherField" style="display:none" class="field"><label>Qual outro relatório?</label>
      <input type="text" id="repOther" placeholder="Descreva..."/></div>
    <div class="field"><label>Descrição dos obstáculos comerciais</label>
      <textarea id="chalText" placeholder="Conte mais sobre o que trava o crescimento do canal de parcerias..."></textarea></div>
    <div class="field"><label>Já testaram ações para engajar mais corretores?</label>
      <div class="rg h" style="margin-top:8px">
        <label class="ro"><input type="radio" name="tested" value="yes"/> Sim</label>
        <label class="ro"><input type="radio" name="tested" value="no"/> Não</label>
      </div></div>
    <div id="testResField" style="display:none" class="field"><label>Quais foram os resultados?</label>
      <textarea id="testRes" placeholder="Descreva as ações e os resultados..."></textarea></div>`;

  if(currentStep===5)return`
    <div class="field"><label>Trabalha com Tabela Zero (pré-lançamento)?</label>
      <div class="rg h" style="margin-top:8px">
        <label class="ro"><input type="radio" name="tz" value="yes"/> Sim</label>
        <label class="ro"><input type="radio" name="tz" value="no"/> Não</label>
      </div></div>
    <div id="tzAccessField" style="display:none">
      <div class="field"><label>Quem tem acesso à Tabela Zero antes de todos?</label>
        <div class="rg" style="margin-top:8px">
          ${Object.entries(TZ_LABELS).map(([k,l])=>`<label class="co"><input type="checkbox" name="tzAccess" value="${k}"/> ${l}</label>`).join('')}
        </div></div>
      <div class="field"><label>Observações sobre a Tabela Zero</label>
        <textarea id="tzObs" placeholder="Ex: só corretores Ouro têm acesso, parceiros recebem 48h antes..."></textarea></div>
    </div>
    <div class="field"><label>Observações gerais</label>
      <textarea id="obs" placeholder="Qualquer contexto adicional sobre o modelo comercial..."></textarea></div>`;
  return '';
}

// ── RESTORE ───────────────────────────────────────────────────
function restore(){
  const s=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
  const sc=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=v;};
  const sr=(name,v)=>{if(!v)return;const e=document.querySelector(`input[name=${name}][value="${v}"]`);if(e)e.checked=true;};
  const sca=(name,arr)=>(arr||[]).forEach(v=>{const e=document.querySelector(`input[name=${name}][value="${v}"]`);if(e)e.checked=true;});
  if(currentStep===0){s('consultant',D.consultantName);s('cN',D.companyName);s('rN',D.responsibleName);s('rR',D.responsibleRole);s('loc',D.location);}
  else if(currentStep===1){
    s('tVGV',D.totalVGV?D.totalVGV.toLocaleString('pt-BR'):'');
    s('vGoal',D.vgvGoal?D.vgvGoal.toLocaleString('pt-BR'):'');
    s('avgT',D.avgTicket?D.avgTicket.toLocaleString('pt-BR'):'');
  }
  else if(currentStep===2){
    s('tBr',D.totalBrokers||'');s('aBr',D.activeBrokers||'');s('bExcl',D.brokersExclusivity);
    sc('chHouse',D.hasHouse);sc('chParc',D.hasParc);sc('chImob',D.hasImob);
    s('pMgr',D.parcManagers||'');s('pExec',D.parcExecutives||'');
    s('hMgr',D.houseManagers||'');s('hBr',D.houseBrokers||'');
  }
  else if(currentStep===3){
    sr('hasCRM',D.hasCRM?'yes':'no');s('crmName',D.crmName);
    TOOLS_DEF.forEach(t=>{sc(t.k,D[t.k]);if(D.toolCosts[t.k])s('cost_'+t.k,D.toolCosts[t.k].toLocaleString('pt-BR'));});
  }
  else if(currentStep===4){
    sr('mGoals',D.meetingGoals);sca('chal',D.challenges);s('chalText',D.challengesText);
    sr('tested',D.testedActions?'yes':'no');s('testRes',D.testedResults);
    sr('bSeg',D.brokerSegmentation);s('bSegCRM',D.brokerSegCRM);
    sca('reports',D.desiredReports);s('repOther',D.desiredReportsOther);
  }
  else if(currentStep===5){
    sr('tz',D.tabelaZero?'yes':'no');sca('tzAccess',D.tabelaZeroAccess);
    s('tzObs',D.tabelaZeroObs);s('obs',D.observations);
  }
}

// ── CALC ─────────────────────────────────────────────────────
function calc(data){
  const d=data||D;
  const te=d.totalBrokers>0?(d.activeBrokers/d.totalBrokers)*100:0;
  const dc=d.totalVGV>0?d.activeBrokers/(d.totalVGV/1e6):0;
  const nc=d.vgvGoal>0?dc*(d.vgvGoal/1e6):0;
  const nct=te>0?nc/(te/100):0;
  const nteNeeded=d.totalBrokers>0?(nc/d.totalBrokers)*100:0;
  const dcNovo=d.vgvGoal>0&&d.activeBrokers>0?1e6/(d.vgvGoal/d.activeBrokers):0;
  const gap=d.vgvGoal-d.totalVGV;

  // VGV médio por corretor ativo (produtividade atual)
  const vgvPorCorretor=d.activeBrokers>0?d.totalVGV/d.activeBrokers:0;

  // Corretores adicionais necessários (meta = atingir NC total)
  const corretoresAdicionar=Math.max(0,Math.ceil(nc-d.activeBrokers));

  // Plano DWV com Operadora
  const planoAnual=PLANO_ANUAL;
  const planoMensal=PLANO_MENSAL;

  // Retorno por corretor ativado (em R$)
  const retornoPorCorretor=vgvPorCorretor;

  // Quantos corretores mínimos para pagar o plano anual
  const corretoresParaPagarPlano=vgvPorCorretor>0?Math.ceil(planoAnual/vgvPorCorretor):null;

  // Retorno total se conseguir todos os corretores necessários
  const retornoTotal=corretoresAdicionar*vgvPorCorretor;

  // Custo ferramentas
  const totalToolCost=Object.values(d.toolCosts||{}).reduce((a,b)=>a+(b||0),0)*12;
  const nTools=TOOLS_DEF.filter(t=>d[t.k]).length+(!d.hasCRM?1:0);
  const unids=d.avgTicket>0?Math.ceil(gap/d.avgTicket):null;

  return{
    te,dc,nc,nct,nteNeeded,dcNovo,gap,
    vgvPorCorretor,corretoresAdicionar,
    planoAnual,planoMensal,
    retornoPorCorretor,corretoresParaPagarPlano,retornoTotal,
    totalToolCost,nTools,unids
  };
}

// ── RESULTS ───────────────────────────────────────────────────
function showResults(){
  const r=calc();
  if(!isSim) addToDB({...D,results:r,isSim:false});
  hideAll();
  document.getElementById('results').style.display='block';
  showNav('navHome');

  const teColor=r.te<15?'r':r.te<30?'a':'g';
  const teLabel=r.te<15?'Crítica':r.te<30?'Regular':'Boa';
  const chalLabels=D.challenges.map(k=>CHAL_LABELS[k]||k);
  const rptLabels=D.desiredReports.map(k=>RPT_LABELS[k]||k);
  const toolBadges=TOOLS_DEF.filter(t=>D[t.k]).map(t=>`<div class="badge hi">${t.l}${D.toolCosts[t.k]?' · '+fmt(D.toolCosts[t.k]*12)+'/ano':''}</div>`).join('');
  const allToolBadges=toolBadges+(!D.hasCRM?'<div class="badge hi">Sem CRM de parceiros</div>':'');
  const tzTxt=D.tabelaZeroAccess.map(k=>TZ_LABELS[k]||k).join(', ');

  // Organograma — apenas Canal Parcerias
  const parcBoxes=Array(Math.max(D.parcManagers,0)).fill(0).map((_,i)=>
    `<div class="ob hi">Ger. Parceria ${D.parcManagers>1?i+1:''}</div>`).join('');
  const execBoxes=Array(Math.min(D.parcExecutives,8)).fill(0).map((_,i)=>
    `<div class="ob">Exec. ${i+1}</div>`).join('')+
    (D.parcExecutives>8?`<div class="ob" style="color:var(--mu)">+${D.parcExecutives-8}</div>`:'');

  // ROI — narrativa em corretores
  const corMinTxt=r.corretoresParaPagarPlano!==null
    ? (r.corretoresParaPagarPlano===1
        ? 'Com apenas <strong>1 corretor</strong> ativado pela DWV o investimento anual já se paga.'
        : `Com apenas <strong>${r.corretoresParaPagarPlano} corretores</strong> ativados o investimento anual já se paga.`)
    : '';
  const retornoTotalTxt=r.retornoTotal>0
    ? `Se a DWV conseguir ativar todos os <strong>${fmtN(r.corretoresAdicionar)} corretores necessários</strong>, o retorno potencial é de <strong>${fmt(r.retornoTotal)}</strong> em VGV adicional.`
    : '';

  document.getElementById('results').innerHTML=`
    ${isSim?`<div class="sim-warn">⚠ Simulação com dados não reais — este diagnóstico não representa uma incorporadora real.</div>`:''}

    <!-- RESUMO EXECUTIVO -->
    <div class="exec-card">
      <div class="exec-lbl">Resumo Executivo · ${D.companyName||'Incorporadora'} · ${D.location||''}</div>
      <div class="kpis">
        <div class="kpi"><div class="kl">VGV Atual (12m)</div><div class="kv">${fmt(D.totalVGV)}</div><div class="ks">Canal parcerias</div></div>
        <div class="kpi"><div class="kl">Meta de VGV</div><div class="kv r">${fmt(D.vgvGoal)}</div><div class="ks">Gap de ${fmt(r.gap)}</div></div>
        <div class="kpi"><div class="kl">Taxa de Engajamento</div><div class="kv ${teColor}">${fmtP(r.te)}</div><div class="ks">${teLabel} · ${fmtN(D.activeBrokers)} de ${fmtN(D.totalBrokers)}</div></div>
        <div class="kpi"><div class="kl">Corretores a Ativar</div><div class="kv r">${fmtN(r.corretoresAdicionar)}</div><div class="ks">Meta da DWV</div></div>
      </div>
      <div class="verdict">
        A <strong>${D.companyName||'incorporadora'}</strong> tem <strong>${fmtN(D.totalBrokers)} corretores</strong> cadastrados, mas apenas <strong>${fmtN(D.activeBrokers)} (${fmtP(r.te)})</strong> venderam — engajamento <strong>${teLabel.toLowerCase()}</strong>. Para atingir <strong>${fmt(D.vgvGoal)}</strong>, a DWV precisa ativar mais <strong>${fmtN(r.corretoresAdicionar)} corretores</strong>. Cada corretor ativado representa em média <strong>${fmt(r.vgvPorCorretor)}</strong> em VGV.${chalLabels.length>0?` Principais desafios: <strong>${chalLabels.slice(0,3).join(', ')}</strong>.`:''}
      </div>
    </div>

    <!-- 1: TE -->
    <div class="db"><div class="dh" onclick="tog(this)"><h3>1 · Taxa de Engajamento (TE)</h3><div class="dhr"><span class="dtag ${teColor}">${teLabel} · ${fmtP(r.te)}</span><span class="chev">▾</span></div></div>
      <div class="dbody">
        <div class="fm">TE = (${fmtN(D.activeBrokers)} / ${fmtN(D.totalBrokers)}) × 100 = ${fmtP(r.te)}</div>
        <div class="cl">Apenas ${fmtP(r.te)} da base vendeu nos últimos 12 meses. ${r.te<15?'Nível crítico — a maioria da base está inativa.':r.te<30?'Nível regular — há espaço para ativar inativos.':'Bom engajamento — foco em crescimento de base.'}</div>
      </div>
    </div>

    <!-- 2: DC -->
    <div class="db"><div class="dh" onclick="tog(this)"><h3>2 · Delta de Corretores por Milhão (DC)</h3><div class="dhr"><span class="dtag">${r.dc.toFixed(2)} corretores/M</span><span class="chev">▾</span></div></div>
      <div class="dbody">
        <div class="fm">DC = ${fmtN(D.activeBrokers)} / (${fmt(D.totalVGV)} / 1M) = ${r.dc.toFixed(2)} corretores/M</div>
        <div class="cl">São necessários ${r.dc.toFixed(2)} corretores ativos para gerar R$ 1 milhão em VGV. Cada corretor ativado vale em média <strong>${fmt(r.vgvPorCorretor)}</strong>.</div>
      </div>
    </div>

    <!-- 3: NC -->
    <div class="db"><div class="dh" onclick="tog(this)"><h3>3 · Corretores Necessários para a Meta</h3><div class="dhr"><span class="dtag">${fmtN(r.nc)} corretores ativos</span><span class="chev">▾</span></div></div>
      <div class="dbody">
        <div class="fm">NC = (${fmt(D.vgvGoal)} / 1M) × ${r.dc.toFixed(2)} = ${fmtN(r.nc)} corretores ativos</div>
        <div class="cl">Para atingir ${fmt(D.vgvGoal)}, a incorporadora precisa de <strong>${fmtN(r.nc)} corretores engajados</strong>. Hoje tem ${fmtN(D.activeBrokers)} — a DWV precisa ativar mais <strong>${fmtN(r.corretoresAdicionar)}</strong>.</div>
      </div>
    </div>

    <!-- 4: ROTAS -->
    <div class="db"><div class="dh" onclick="tog(this)"><h3>4 · 3 Rotas Estratégicas</h3><div class="dhr"><span class="dtag">Como atingir a meta</span><span class="chev">▾</span></div></div>
      <div class="dbody">
        <div class="routes">
          <div class="rc"><div class="rcn">Rota A</div><div class="rct">Aumentar Engajamento</div><div class="rcv">${fmtP(r.nteNeeded)}</div><div class="rcd">Nova TE mantendo base de ${fmtN(D.totalBrokers)}. Hoje: ${fmtP(r.te)}.</div></div>
          <div class="rc"><div class="rcn">Rota B</div><div class="rct">Crescer a Base</div><div class="rcv">${fmtN(r.nct)}</div><div class="rcd">Total necessário mantendo TE atual. Hoje: ${fmtN(D.totalBrokers)}.</div></div>
          <div class="rc"><div class="rcn">Rota C</div><div class="rct">Aumentar Produtividade</div><div class="rcv">${r.dcNovo.toFixed(2)}/M</div><div class="rcd">DC necessário com base e TE atuais. Hoje: ${r.dc.toFixed(2)}/M.</div></div>
        </div>
        <div class="cl" style="margin-top:12px">A DWV atua nas 3 rotas: ativa inativos via WhatsApp API + campanhas (A), expande base via Meta Ads (B) e aumenta produtividade com CRM, Tabela Zero e treinamento (C).</div>
      </div>
    </div>

    <!-- 5: ORGANOGRAMA — só Canal Parcerias -->
    <div class="db"><div class="dh" onclick="tog(this)"><h3>5 · Organograma e Fluxos · Canal Parcerias</h3><div class="dhr"><span class="dtag">Sem DWV vs. Com DWV</span><span class="chev">▾</span></div></div>
      <div class="dbody">

        <div style="font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Organograma atual — sem DWV</div>
        <div class="org">
          <div class="ol"><div class="olab">Direção</div>
            <div class="obs-boxes"><div class="ob hi">Dir. de Parceria</div></div>
          </div>
          <div class="oarr">↓</div>
          <div class="ol"><div class="olab">Gerência</div>
            <div class="obs-boxes">${parcBoxes||'<div class="ob hi" style="color:var(--mu)">Não informado</div>'}</div>
          </div>
          ${D.parcExecutives>0?`
          <div class="oarr">↓</div>
          <div class="ol"><div class="olab">Executivos de Parceria</div>
            <div class="obs-boxes">${execBoxes}</div>
          </div>`:''}
          <div class="oarr">↓</div>
          <div class="ol"><div class="olab">Base de Corretores</div>
            <div class="obs-boxes">
              <div class="ob">${fmtN(D.totalBrokers)} cadastrados</div>
              <div class="ob hi">${fmtN(D.activeBrokers)} ativos (${fmtP(r.te)})</div>
              ${D.hasImob?'<div class="ob">Imobiliárias parceiras</div>':''}
            </div>
          </div>
        </div>

        <div style="font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.07em;margin:20px 0 10px">Fluxo atual — canal cego</div>
        <div class="flow">
          <div class="fs red"><div class="ft">Captação</div><div class="fd">Manual. Sem rastreio de origem.</div></div><div class="farr">→</div>
          <div class="fs red"><div class="ft">Cadastro</div><div class="fd">Planilha. Sem segmentação.</div></div><div class="farr">→</div>
          <div class="fs red"><div class="ft">Comunicação</div><div class="fd">WhatsApp pessoal. Sem rastreio.</div></div><div class="farr">→</div>
          <div class="fs red"><div class="ft">Proposta</div><div class="fd">Sem visibilidade do gerente.</div></div><div class="farr">→</div>
          <div class="fs red"><div class="ft">Resultado</div><div class="fd">Gerente vê só na mesa de propostas.</div></div>
        </div>

        <div style="font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.07em;margin:20px 0 10px">Organograma com Operadora DWV</div>
        <div class="org">
          <div class="ol"><div class="olab">Direção</div>
            <div class="obs-boxes"><div class="ob hi">Dir. de Parceria</div></div>
          </div>
          <div class="oarr">↓</div>
          <div class="ol"><div class="olab">Gerência · Operadora DWV (lateral)</div>
            <div class="obs-boxes">
              ${parcBoxes||''}
              <div class="ob gn">Operadora DWV ↔ Gerentes</div>
            </div>
          </div>
          ${D.parcExecutives>0?`
          <div class="oarr">↓</div>
          <div class="ol"><div class="olab">Executivos de Parceria · Suporte Operadora</div>
            <div class="obs-boxes">${execBoxes}<div class="ob gn">Suporte Op.</div></div>
          </div>`:''}
          <div class="oarr">↓</div>
          <div class="ol"><div class="olab">Base Segmentada pela DWV</div>
            <div class="obs-boxes">
              <div class="ob go">Ouro — já venderam</div>
              <div class="ob si">Prata — engajados</div>
              <div class="ob br">Bronze — inativos</div>
            </div>
          </div>
        </div>

        <div style="font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.07em;margin:20px 0 10px">Fluxo com Operadora DWV</div>
        <div class="flow">
          <div class="fs hi"><div class="ft">Captação</div><div class="fd">Meta Ads → CRM DWV. Rastreada.</div></div><div class="farr">→</div>
          <div class="fs hi"><div class="ft">Classificação</div><div class="fd">Bronze/Prata/Ouro automático.</div></div><div class="farr">→</div>
          <div class="fs hi"><div class="ft">Ativação</div><div class="fd">WhatsApp API + e-mail + Stories.</div></div><div class="farr">→</div>
          <div class="fs hi"><div class="ft">Proposta</div><div class="fd">Rastreada em tempo real.</div></div><div class="farr">→</div>
          <div class="fs hi"><div class="ft">BI Completo</div><div class="fd">Exec / Gerente / Diretoria.</div></div>
        </div>

        <div class="cl" style="margin-top:14px">A Operadora DWV não é subordinada — atua <strong>lateralmente</strong> com gerentes e diretores, entregando inteligência de dados que hoje não existe no canal.</div>
      </div>
    </div>

    <!-- 6: FERRAMENTAS -->
    <div class="db"><div class="dh" onclick="tog(this)"><h3>6 · Tecnologia e Ferramentas</h3><div class="dhr"><span class="dtag">${r.nTools} desconectadas</span><span class="chev">▾</span></div></div>
      <div class="dbody">
        ${!D.hasCRM?'<div class="cl" style="margin-bottom:12px">Sem CRM voltado para parceiros. Canal opera sem rastreamento de ações por corretor.</div>':`<div style="font-size:13px;color:var(--mu);margin-bottom:12px">CRM em uso: <strong style="color:#fff">${D.crmName||'não especificado'}</strong> — focado em contratos, não em gestão de corretores.</div>`}
        <div class="badges">${allToolBadges}</div>
        ${r.totalToolCost>0?`<div style="font-size:13px;color:var(--mu);margin-top:12px">Custo anual estimado com essas ferramentas: <strong style="color:#fff">${fmt(r.totalToolCost)}</strong></div>`:''}
        <div class="cl" style="margin-top:12px">A DWV substitui <strong>${r.nTools} ferramentas desconectadas</strong> em um único ambiente integrado — WhatsApp API, e-mail com rastreio, CRM de parceiros, eventos com QR, tráfego pago e BI completo.</div>
      </div>
    </div>

    <!-- 7: ROI — lógica de corretores -->
    <div class="db"><div class="dh" onclick="tog(this)"><h3>7 · Retorno sobre Investimento DWV</h3><div class="dhr"><span class="dtag g">${fmtN(r.corretoresAdicionar)} corretores · ${fmt(r.retornoTotal)}</span><span class="chev">▾</span></div></div>
      <div class="dbody">

        <div class="g2" style="margin-bottom:16px">
          <div>
            <div style="font-size:11px;color:var(--mu);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Plano com Operadora DWV</div>
            <div style="font-size:22px;font-weight:500">${fmt(r.planoAnual)}<span style="font-size:13px;color:var(--mu);font-weight:400">/ano</span></div>
            <div style="font-size:13px;color:var(--mu);margin-top:3px">12x ${fmt(r.planoMensal)}/mês</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--mu);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">VGV por corretor ativado</div>
            <div style="font-size:22px;font-weight:500;color:var(--red)">${fmt(r.vgvPorCorretor)}</div>
            <div style="font-size:13px;color:var(--mu);margin-top:3px">produtividade média atual</div>
          </div>
        </div>

        <div style="background:var(--s);border:.5px solid var(--b);border-radius:10px;padding:16px 18px;margin-bottom:14px">
          <div style="font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">Meta da DWV — corretores a ativar</div>
          <div style="font-size:13px;line-height:1.8;color:rgba(255,255,255,0.85)">
            A incorporadora precisa ativar <strong>${fmtN(r.corretoresAdicionar)} corretores</strong> para atingir a meta de VGV.<br/>
            Cada corretor ativado gera em média <strong>${fmt(r.vgvPorCorretor)}</strong> em VGV.<br/>
            ${corMinTxt}<br/>
            ${retornoTotalTxt}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:var(--s2);border:.5px solid var(--b);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:11px;color:var(--mu);margin-bottom:6px">Corretores p/ pagar o plano</div>
            <div style="font-size:26px;font-weight:500;color:var(--red)">${r.corretoresParaPagarPlano!==null?r.corretoresParaPagarPlano:'—'}</div>
            <div style="font-size:11px;color:var(--mu);margin-top:4px">ponto de equilíbrio</div>
          </div>
          <div style="background:var(--s2);border:.5px solid var(--b);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:11px;color:var(--mu);margin-bottom:6px">Meta de ativações DWV</div>
            <div style="font-size:26px;font-weight:500;color:var(--am)">${fmtN(r.corretoresAdicionar)}</div>
            <div style="font-size:11px;color:var(--mu);margin-top:4px">corretores a engajar</div>
          </div>
          <div style="background:var(--s2);border:.5px solid var(--b);border-radius:10px;padding:14px;text-align:center">
            <div style="font-size:11px;color:var(--mu);margin-bottom:6px">Retorno se meta atingida</div>
            <div style="font-size:18px;font-weight:500;color:var(--gr)">${fmt(r.retornoTotal)}</div>
            <div style="font-size:11px;color:var(--mu);margin-top:4px">em VGV adicional</div>
          </div>
        </div>

        ${r.totalToolCost>0?`<div style="font-size:13px;color:var(--mu);padding:10px 13px;background:rgba(58,184,122,0.06);border:.5px solid rgba(58,184,122,0.15);border-radius:8px;margin-bottom:12px">Economia adicional ao consolidar ${r.nTools} ferramentas na DWV: <strong style="color:var(--gr)">${fmt(r.totalToolCost)}/ano</strong></div>`:''}

        <div class="cl g">
          ${rptLabels.length>0?`Relatórios desejados pelo cliente — <strong>${rptLabels.join(', ')}</strong> — todos disponíveis na plataforma DWV.<br/><br/>`:''}
          ${D.tabelaZero?`Com <strong>Tabela Zero</strong> (acesso: ${tzTxt}), a DWV potencializa a fidelização dos corretores Ouro, que têm acesso antecipado ao produto — aumentando a produtividade por corretor ativo.`:''}
        </div>
      </div>
    </div>

    <div class="acts">
      <button class="bto" onclick="showStart()">← Início</button>
      <button class="bto" onclick="copyPipefy()">Copiar para Pipefy</button>
      <button class="bto" onclick="openAll()">Expandir Tudo</button>
      <button class="btr" onclick="generatePDF()">⬇ Baixar PDF</button>
    </div>`;

  document.querySelector('#results .dbody').classList.add('open');
  window.scrollTo({top:0,behavior:'smooth'});
}

function tog(h){const b=h.nextElementSibling;const c=h.querySelector('.chev');const o=b.classList.contains('open');b.classList.toggle('open',!o);if(c)c.classList.toggle('o',!o);}
function openAll(){document.querySelectorAll('.dbody').forEach(b=>b.classList.add('open'));}

// ── DASHBOARD ─────────────────────────────────────────────────
function showDashboard(){
  hideAll();
  const dash=document.getElementById('dashboard');
  dash.style.display='block';
  showNav('navBI');
  const records=loadDB().filter(r=>!r.isSim);
  if(records.length===0){
    dash.innerHTML=`
      <div style="font-size:20px;font-weight:500;margin-bottom:20px">BI · Painel Consolidado</div>
      <div class="dash-card"><div class="empty-state">Nenhum diagnostico real salvo ainda.<br/><span style="font-size:12px">Complete um diagnostico real para ve-lo aqui.</span></div></div>`;
    return;
  }
  const N=records.length;
  const avgTE=records.reduce((a,r)=>a+(r.results?.te||0),0)/N;
  const avgDC=records.reduce((a,r)=>a+(r.results?.dc||0),0)/N;
  const withTZ=records.filter(r=>r.tabelaZero).length;
  const withCRM=records.filter(r=>r.hasCRM).length;
  const withHouse=records.filter(r=>r.hasHouse).length;
  const totalGap=records.reduce((a,r)=>a+(r.results?.gap||0),0);
  const toolFreq={};TOOLS_DEF.forEach(t=>{toolFreq[t.k]=records.filter(r=>r[t.k]).length;});
  const topTools=TOOLS_DEF.map(t=>({l:t.l,n:toolFreq[t.k]})).sort((a,b)=>b.n-a.n).filter(t=>t.n>0);
  const chalFreq={};Object.keys(CHAL_LABELS).forEach(k=>{chalFreq[k]=records.filter(r=>(r.challenges||[]).includes(k)).length;});
  const topChals=Object.entries(chalFreq).map(([k,n])=>({l:CHAL_LABELS[k],n})).sort((a,b)=>b.n-a.n).filter(t=>t.n>0).slice(0,8);
  const tzAccess={house:0,parcerias:0,imobiliarias:0,todos:0};
  records.filter(r=>r.tabelaZero).forEach(r=>(r.tabelaZeroAccess||[]).forEach(k=>{if(tzAccess[k]!==undefined)tzAccess[k]++;}));

  dash.innerHTML=`
    <div style="font-size:20px;font-weight:500;margin-bottom:20px">BI · Painel Consolidado · ${N} Incorporadora${N>1?'s':''}</div>
    <div class="agg-grid">
      <div class="agg-card"><div class="agg-l">TE Média</div><div class="agg-v" style="color:${avgTE<15?'var(--red)':avgTE<30?'var(--am)':'var(--gr)'}">${fmtP(avgTE)}</div></div>
      <div class="agg-card"><div class="agg-l">DC Médio</div><div class="agg-v">${avgDC.toFixed(2)}/M</div></div>
      <div class="agg-card"><div class="agg-l">Com Tabela Zero</div><div class="agg-v">${withTZ} / ${N}</div></div>
      <div class="agg-card"><div class="agg-l">Com CRM parceiros</div><div class="agg-v">${withCRM} / ${N}</div></div>
      <div class="agg-card"><div class="agg-l">Com Canal House</div><div class="agg-v">${withHouse} / ${N}</div></div>
      <div class="agg-card"><div class="agg-l">Gap total de VGV</div><div class="agg-v" style="font-size:14px;color:var(--red)">${fmt(totalGap)}</div></div>
    </div>
    <div class="dash-card">
      <h3>Incorporadoras diagnosticadas</h3>
      <div style="overflow-x:auto">
      <table class="dt">
        <thead><tr><th>Empresa</th><th>Local</th><th>Consultor</th><th>TE</th><th>DC/M</th><th>Ativos/Total</th><th>Gap VGV</th><th>House</th><th>Tab. Zero</th><th>CRM</th></tr></thead>
        <tbody>${records.map(r=>{
          const te=r.results?.te||0;const tc=te<15?'r':te<30?'a':'g';
          const tzA=(r.tabelaZeroAccess||[]).map(k=>({house:'House',parcerias:'H+P',imobiliarias:'Imob.',todos:'Todos'}[k]||k)).join(', ');
          return`<tr>
            <td><div class="co-name">${r.companyName||'—'}</div><div class="co-sub">${r.responsibleName||''}</div></td>
            <td style="font-size:11px;color:var(--mu)">${r.location||'—'}</td>
            <td style="font-size:11px;color:var(--mu)">${r.consultantName||'—'}</td>
            <td><span class="te-pill ${tc}">${fmtP(te)}</span></td>
            <td style="font-size:12px">${(r.results?.dc||0).toFixed(2)}</td>
            <td style="font-size:12px">${fmtN(r.activeBrokers)} / ${fmtN(r.totalBrokers)}<div class="bar-wrap"><div class="bar-fill" style="width:${Math.min(te,100)}%;background:${te<15?'var(--red)':te<30?'var(--am)':'var(--gr)'}"></div></div></td>
            <td style="font-size:12px;color:var(--red)">${fmt(r.results?.gap||0)}</td>
            <td style="font-size:11px">${r.hasHouse?'✓':'—'}</td>
            <td style="font-size:11px">${r.tabelaZero?'✓ '+tzA:'—'}</td>
            <td style="font-size:11px">${r.hasCRM?r.crmName||'Sim':'—'}</td>
          </tr>`;}).join('')}
        </tbody>
      </table>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="dash-card"><h3>Ferramentas mais utilizadas</h3>
        <div class="tool-rank">${topTools.map(t=>`
          <div class="tool-row-d">
            <div class="tool-label">${t.l}</div>
            <div class="tool-bar-wrap"><div class="tool-bar" style="width:${Math.round(t.n/N*100)}%"></div></div>
            <div class="tool-count">${t.n}/${N}</div>
          </div>`).join('')}</div>
      </div>
      <div class="dash-card"><h3>Principais desafios declarados</h3>
        <div class="chal-grid">${topChals.map(c=>`
          <div class="chal-row">
            <div class="chal-label">${c.l}</div>
            <div class="chal-bar-wrap"><div class="chal-bar" style="width:${Math.round(c.n/N*100)}%"></div></div>
            <div class="chal-count">${c.n}</div>
          </div>`).join('')}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="dash-card"><h3>Segmentação de corretores</h3>
        <div class="seg-grid">
          <div class="seg-card"><div class="seg-v" style="color:var(--red)">${records.filter(r=>r.brokerSegmentation==='none').length}</div><div class="seg-l">Não segmentam</div></div>
          <div class="seg-card"><div class="seg-v" style="color:var(--am)">${records.filter(r=>r.brokerSegmentation==='manual').length}</div><div class="seg-l">Manual</div></div>
          <div class="seg-card"><div class="seg-v" style="color:var(--gr)">${records.filter(r=>r.brokerSegmentation==='system').length}</div><div class="seg-l">Por sistema</div></div>
        </div>
      </div>
      <div class="dash-card"><h3>Tabela Zero · quem absorve</h3>
        <div class="tz-rows">${Object.entries(TZ_LABELS).map(([k,l])=>`
          <div class="tz-row">
            <div class="tz-label">${l}</div>
            <div class="tz-bar-wrap"><div class="tz-bar" style="width:${withTZ>0?Math.round((tzAccess[k]||0)/withTZ*100):0}%"></div></div>
            <div class="tz-count">${tzAccess[k]||0}/${withTZ}</div>
          </div>`).join('')}</div>
      </div>
    </div>

    <!-- BI EXTRAS -->
    <div class="bi-section-title">Distribuicao por Estado</div>
    <div class="dash-card" style="margin-bottom:14px">
      <div>${(()=>{
        const states={};
        records.forEach(r=>{const loc=r.location||'';const parts=loc.split(',');const uf=(parts[parts.length-1]||'').trim().toUpperCase().substring(0,2)||'N/I';states[uf]=(states[uf]||0)+1;});
        const sorted=Object.entries(states).sort((a,b)=>b[1]-a[1]);
        return sorted.map(([uf,n])=>'<div class="state-row"><div class="state-label">'+uf+'</div><div class="state-bar-wrap"><div class="state-bar" style="width:'+Math.round(n/N*100)+'%"></div></div><div class="state-count">'+n+'</div></div>').join('');
      })()}</div>
    </div>

    <div class="bi-section-title">Indicadores adicionais</div>
    <div class="agg-grid" style="margin-bottom:14px">
      <div class="agg-card"><div class="agg-l">Corretores (media)</div><div class="agg-v">${fmtN(records.reduce((a,r)=>a+(r.totalBrokers||0),0)/N)}</div></div>
      <div class="agg-card"><div class="agg-l">Corretores ativos (media)</div><div class="agg-v">${fmtN(records.reduce((a,r)=>a+(r.activeBrokers||0),0)/N)}</div></div>
      <div class="agg-card"><div class="agg-l">VGV medio (12m)</div><div class="agg-v" style="font-size:14px">${fmt(records.reduce((a,r)=>a+(r.totalVGV||0),0)/N)}</div></div>
      <div class="agg-card"><div class="agg-l">Ticket medio</div><div class="agg-v" style="font-size:14px">${fmt(records.filter(r=>r.avgTicket>0).reduce((a,r)=>a+r.avgTicket,0)/(records.filter(r=>r.avgTicket>0).length||1))}</div></div>
      <div class="agg-card"><div class="agg-l">Media executivos/inc.</div><div class="agg-v">${(records.reduce((a,r)=>a+(r.parcExecutives||0),0)/N).toFixed(1)}</div></div>
      <div class="agg-card"><div class="agg-l">Media gerentes/inc.</div><div class="agg-v">${(records.reduce((a,r)=>a+(r.parcManagers||0),0)/N).toFixed(1)}</div></div>
    </div>

    <div class="bi-grid-2">
      <div class="dash-card"><h3>Metas de VGV</h3>
        <div class="goal-grid">
          <div class="goal-card"><div class="goal-v" style="color:var(--gr)">${records.filter(r=>r.meetingGoals==='yes').length}</div><div class="goal-l">Batendo</div></div>
          <div class="goal-card"><div class="goal-v" style="color:var(--am)">${records.filter(r=>r.meetingGoals==='partial').length}</div><div class="goal-l">Parcial</div></div>
          <div class="goal-card"><div class="goal-v" style="color:var(--red)">${records.filter(r=>r.meetingGoals==='no').length}</div><div class="goal-l">Abaixo</div></div>
        </div>
      </div>
      <div class="dash-card"><h3>Exclusividade corretores</h3>
        <div class="goal-grid">
          <div class="goal-card"><div class="goal-v" style="color:var(--gr)">${records.filter(r=>r.brokersExclusivity==='exclusive').length}</div><div class="goal-l">Exclusivos</div></div>
          <div class="goal-card"><div class="goal-v" style="color:var(--am)">${records.filter(r=>r.brokersExclusivity==='mixed').length}</div><div class="goal-l">Misto</div></div>
          <div class="goal-card"><div class="goal-v" style="color:var(--red)">${records.filter(r=>r.brokersExclusivity==='non-exclusive').length}</div><div class="goal-l">Nao exclusivos</div></div>
        </div>
      </div>
    </div>

    <div class="dash-card">
      <h3>Relatorios mais desejados</h3>
      <div class="tool-rank">${(()=>{
        const rptFreq={};Object.keys(RPT_LABELS).forEach(k=>{rptFreq[k]=records.filter(r=>(r.desiredReports||[]).includes(k)).length;});
        return Object.entries(rptFreq).map(([k,n])=>({l:RPT_LABELS[k],n})).sort((a,b)=>b.n-a.n).filter(t=>t.n>0).map(t=>
          '<div class="tool-row-d"><div class="tool-label">'+t.l+'</div><div class="tool-bar-wrap"><div class="tool-bar" style="width:'+Math.round(t.n/N*100)+'%;background:var(--am)"></div></div><div class="tool-count">'+t.n+'/'+N+'</div></div>'
        ).join('');
      })()}</div>
    </div>`;
}

// ── DIAG LIST ────────────────────────────────────────────────
let dlFilter='all';
function showDiagList(filter){
  hideAll();
  if(filter!==undefined) dlFilter=filter;
  const list=document.getElementById('diagList');
  list.style.display='block';
  showNav('navList');
  let records=loadDB();
  const total=records.length;
  const realCount=records.filter(r=>!r.isSim).length;
  const simCount=records.filter(r=>r.isSim).length;
  if(dlFilter==='real') records=records.filter(r=>!r.isSim);
  else if(dlFilter==='sim') records=records.filter(r=>r.isSim);
  records.sort((a,b)=>new Date(b.date)-new Date(a.date));

  if(total===0){
    list.innerHTML=`
      <div style="font-size:20px;font-weight:500;margin-bottom:20px">Diagnosticos Realizados</div>
      <div class="dash-card"><div class="empty-state">Nenhum diagnostico salvo ainda.<br/><span style="font-size:12px">Complete um diagnostico para ve-lo aqui.</span></div></div>`;
    return;
  }

  list.innerHTML=`
    <div style="font-size:20px;font-weight:500;margin-bottom:6px">Diagnosticos Realizados</div>
    <div style="font-size:12px;color:var(--mu);margin-bottom:16px">${total} diagnostico${total>1?'s':''} · ${realCount} rea${realCount!==1?'is':'l'} · ${simCount} simulac${simCount!==1?'oes':'ao'}</div>
    <div class="dl-filters">
      <button class="dl-filter ${dlFilter==='all'?'active':''}" onclick="showDiagList('all')">Todos (${total})</button>
      <button class="dl-filter ${dlFilter==='real'?'active':''}" onclick="showDiagList('real')">Reais (${realCount})</button>
      <button class="dl-filter ${dlFilter==='sim'?'active':''}" onclick="showDiagList('sim')">Simulacoes (${simCount})</button>
    </div>
    <div id="dlCards">${records.map(r=>{
      const te=r.results?.te||0;const tc=te<15?'r':te<30?'a':'g';
      const d=r.date?new Date(r.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
      return`<div class="dl-card" onclick="viewDiag(${r.id})">
        <div class="dl-info">
          <div class="dl-name">${r.companyName||'Sem nome'}</div>
          <div class="dl-meta">
            <span>${d}</span>
            <span>${r.location||'—'}</span>
            <span class="te-pill ${tc}">${fmtP(te)}</span>
            <span class="dl-badge ${r.isSim?'sim':'real'}">${r.isSim?'Simulacao':'Real'}</span>
            ${r.consultantName?'<span style="color:var(--mu)">'+r.consultantName+'</span>':''}
          </div>
        </div>
        <div class="dl-actions">
          <button class="dl-del" onclick="event.stopPropagation();deleteDiag(${r.id})" title="Excluir">&#10005;</button>
          <span class="dl-chev">&#8250;</span>
        </div>
      </div>`;
    }).join('')}</div>`;
}

function deleteDiag(id){
  if(!confirm('Excluir este diagnostico?')) return;
  const arr=loadDB().filter(r=>r.id!==id);
  saveDB(arr);
  showDiagList();
}

function viewDiag(id){
  const r=loadDB().find(r=>r.id===id);
  if(!r)return;
  // Load data into D and show results
  Object.assign(D,r);
  isSim=!!r.isSim;
  showResults();
}

// ── COPY ──────────────────────────────────────────────────────
function copyPipefy(){
  const r=calc();
  const chalTxt=D.challenges.map(k=>CHAL_LABELS[k]||k).join(', ')||'Não informado';
  const rptTxt=D.desiredReports.map(k=>RPT_LABELS[k]||k).join(', ')||'Não informado';
  const toolTxt=TOOLS_DEF.filter(t=>D[t.k]).map(t=>t.l+(D.toolCosts[t.k]?' (R$'+D.toolCosts[t.k].toLocaleString('pt-BR')+'/mês)':'')).join(', ')||'Nenhuma';
  const txt=`${isSim?'⚠ SIMULAÇÃO COM DADOS NÃO REAIS\n\n':''}DIAGNÓSTICO COMERCIAL DWV\n${D.companyName} · ${D.location}\nResponsável: ${D.responsibleName} (${D.responsibleRole})\n\n— MÉTRICAS —\nVGV Atual: ${fmt(D.totalVGV)}\nMeta VGV: ${fmt(D.vgvGoal)}\nGap: ${fmt(r.gap)}\nCorretores totais: ${fmtN(D.totalBrokers)}\nCorretores ativos: ${fmtN(D.activeBrokers)}\nTaxa de Engajamento: ${fmtP(r.te)}\nDelta/Milhão: ${r.dc.toFixed(2)}\nVGV por corretor ativo: ${fmt(r.vgvPorCorretor)}\n\n— META DWV —\nCorretores a ativar: ${fmtN(r.corretoresAdicionar)}\nCorretores p/ pagar o plano: ${r.corretoresParaPagarPlano||'—'}\nRetorno se meta atingida: ${fmt(r.retornoTotal)}\n\n— PLANO DWV —\nPlano Operadora: ${fmt(r.planoAnual)}/ano (12x ${fmt(r.planoMensal)}/mês)\n\n— ROTAS —\nRota A (Engajamento): TE de ${fmtP(r.te)} → ${fmtP(r.nteNeeded)}\nRota B (Base): ${fmtN(D.totalBrokers)} → ${fmtN(r.nct)} corretores\nRota C (Produtividade): DC de ${r.dc.toFixed(2)} → ${r.dcNovo.toFixed(2)}/M\n\n— TECNOLOGIA —\nCRM: ${D.hasCRM?D.crmName:'Não'}\nFerramentas (${r.nTools}): ${toolTxt}\nCusto anual ferramentas: ${fmt(r.totalToolCost)}\n\n— DESAFIOS —\n${chalTxt}\n\n— RELATÓRIOS DESEJADOS —\n${rptTxt}\n\nTabela Zero: ${D.tabelaZero?'Sim — '+D.tabelaZeroAccess.map(k=>TZ_LABELS[k]).join(', '):'Não'}${D.observations?'\n\nObservações: '+D.observations:''}`;
  navigator.clipboard.writeText(txt).then(()=>alert('Copiado! Cole no card do Pipefy.')).catch(()=>alert('Não foi possível copiar automaticamente.'));
}

// ── PDF ───────────────────────────────────────────────────────
function generatePDF(){
  const r=calc();
  const chalTxt=D.challenges.map(k=>CHAL_LABELS[k]||k).join(', ')||'Não informado';
  const rptTxt=D.desiredReports.map(k=>RPT_LABELS[k]||k).join(', ')||'Não informado';
  const toolRows=TOOLS_DEF.filter(t=>D[t.k]).map(t=>`<tr><td>${t.l}</td><td>${D.toolCosts[t.k]?fmt(D.toolCosts[t.k])+'/mês':'—'}</td><td>${D.toolCosts[t.k]?fmt(D.toolCosts[t.k]*12)+'/ano':'—'}</td></tr>`).join('');
  const tzTxt=D.tabelaZero?D.tabelaZeroAccess.map(k=>TZ_LABELS[k]).join(', '):'Não utiliza';
  const segTxt={none:'Não segmenta',manual:'Manual (planilha/memória)',system:'Por sistema — '+D.brokerSegCRM}[D.brokerSegmentation]||'Não informado';
  const teColor=r.te<15?'#E8392A':r.te<30?'#e0a020':'#2e9e60';
  const teLabel=r.te<15?'Crítica':r.te<30?'Regular':'Boa';
  const nTools=TOOLS_DEF.filter(t=>D[t.k]).length+(!D.hasCRM?1:0);
  const corMinTxt=r.corretoresParaPagarPlano!==null
    ?(r.corretoresParaPagarPlano===1
      ?'Com apenas <strong>1 corretor</strong> ativado, o investimento já se paga.'
      :`Com apenas <strong>${r.corretoresParaPagarPlano} corretores</strong> ativados, o investimento já se paga.`)
    :'';

  // Org boxes - apenas parcerias
  const parcBoxesPDF=Array(Math.max(D.parcManagers,0)).fill(0).map((_,i)=>`<div class="rob hi">Ger. Parceria ${D.parcManagers>1?i+1:''}</div>`).join('');
  const execBoxesPDF=Array(Math.min(D.parcExecutives,8)).fill(0).map((_,i)=>`<div class="rob">Exec. ${i+1}</div>`).join('');

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Diagnóstico DWV — ${D.companyName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#111;background:#fff;padding:28px;font-size:12px;line-height:1.55}
h1{font-size:18px;font-weight:700}
h2{font-size:11px;font-weight:700;margin:16px 0 7px;color:#E8392A;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #f0d0ce;padding-bottom:4px}
.sim-w{background:#fff8e1;border:1px solid #f9c12a;border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#7a5c00;font-weight:600}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #E8392A;padding-bottom:12px;margin-bottom:16px}
.logo-b{background:#E8392A;border-radius:7px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;flex-shrink:0}
.kpis{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:14px}
.kpi{background:#f7f7f7;border-radius:7px;padding:10px;border-left:3px solid #E8392A}
.kl{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px}.kv{font-size:16px;font-weight:700;color:#E8392A}.ks{font-size:10px;color:#999;margin-top:2px}
.box{margin-bottom:12px;padding:12px 14px;background:#f9f9f9;border-radius:7px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:10px 0}
.routes{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0}
.route{background:#fff;border:1px solid #ddd;border-radius:6px;padding:9px}
.rn{font-size:10px;color:#E8392A;text-transform:uppercase;font-weight:700;margin-bottom:3px}
.rv{font-size:15px;font-weight:700;color:#E8392A}.rd{font-size:10px;color:#888;margin-top:3px}
table{width:100%;border-collapse:collapse;margin:6px 0;font-size:11px}
th{text-align:left;padding:6px 8px;background:#E8392A;color:#fff;font-weight:600}
td{padding:6px 8px;border-bottom:1px solid #eee}
tr:last-child td{border-bottom:none}tr:nth-child(even)td{background:#fafafa}
.fm{background:#f0f0f0;border-radius:4px;padding:6px 10px;font-family:monospace;font-size:11px;margin:5px 0 10px;color:#444}
.hl{background:#fef3f2;border:1px solid #f5c6c2;border-radius:5px;padding:10px 12px;margin:8px 0}
.gl{background:#f0fdf4;border:1px solid #86efac;border-radius:5px;padding:12px 14px}
.roi-card{background:#fff;border:1px solid #ddd;border-radius:7px;padding:12px;text-align:center}
.roi-n{font-size:20px;font-weight:700;color:#E8392A;margin-bottom:3px}
.roi-l{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
.org{margin:8px 0}.org-lev{margin-bottom:6px}.org-lab{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.07em;margin-bottom:4px}
.rob-boxes{display:flex;gap:5px;flex-wrap:wrap}
.rob{background:#f0f0f0;border:1px solid #ddd;border-radius:5px;padding:3px 9px;font-size:11px}
.rob.hi{border-color:#E8392A;color:#E8392A;background:#fef3f2}
.rob.gn{border-color:#2e9e60;color:#2e9e60;background:#f0fdf4}
.rob.go{border-color:#c09000;color:#c09000;background:#fffbeb}
.rob.si{border-color:#999;color:#666}.rob.br{border-color:#a06030;color:#a06030}
.oarr{color:#bbb;font-size:11px;margin:2px 0 2px 6px}
.flow{display:flex;align-items:center;flex-wrap:wrap;gap:0;margin:8px 0}
.fstep{background:#fff;border:1px solid #ddd;border-radius:6px;padding:7px 9px;font-size:11px;flex:1;min-width:70px}
.fstep.red{border-color:#f5c6c2;background:#fef9f9}.fstep.gn{border-color:#86efac;background:#f0fdf4}
.ft{font-weight:700;font-size:11px;margin-bottom:2px}.fd{font-size:10px;color:#888;line-height:1.4}
.farr{color:#bbb;font-size:12px;padding:0 2px;flex-shrink:0;align-self:center}
.footer{margin-top:20px;padding-top:10px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:center}
@media print{body{padding:16px}@page{margin:12mm;size:A4}}
</style></head><body>
${isSim?'<div class="sim-w">⚠ SIMULAÇÃO COM DADOS NÃO REAIS — Este diagnóstico não representa uma incorporadora real.</div>':''}
<div class="hdr">
  <div>
    <h1>Diagnóstico Comercial DWV</h1>
    <div style="font-size:11px;color:#666;margin-top:3px">${D.companyName} · ${D.location} · Responsável: ${D.responsibleName} (${D.responsibleRole})</div>
    <div style="font-size:10px;color:#aaa;margin-top:2px">Gerado em ${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}</div>
  </div>
  <div class="logo-b">DWV</div>
</div>

<h2>Resumo Executivo</h2>
<div class="kpis">
  <div class="kpi"><div class="kl">VGV Atual (12m)</div><div class="kv">${fmt(D.totalVGV)}</div><div class="ks">Canal parcerias</div></div>
  <div class="kpi"><div class="kl">Meta de VGV</div><div class="kv">${fmt(D.vgvGoal)}</div><div class="ks">Gap: ${fmt(r.gap)}</div></div>
  <div class="kpi"><div class="kl">Taxa de Engajamento</div><div class="kv" style="color:${teColor}">${fmtP(r.te)} · ${teLabel}</div><div class="ks">${fmtN(D.activeBrokers)} de ${fmtN(D.totalBrokers)}</div></div>
  <div class="kpi"><div class="kl">Corretores a Ativar</div><div class="kv">${fmtN(r.corretoresAdicionar)}</div><div class="ks">Meta da DWV</div></div>
</div>
<p style="font-size:12px;color:#444;line-height:1.65;margin-bottom:8px">
  A <strong>${D.companyName}</strong> possui <strong>${fmtN(D.totalBrokers)} corretores</strong> cadastrados, mas apenas <strong>${fmtN(D.activeBrokers)} (${fmtP(r.te)})</strong> realizaram vendas — engajamento <strong style="color:${teColor}">${teLabel.toLowerCase()}</strong>. Cada corretor ativo gera em média <strong>${fmt(r.vgvPorCorretor)}</strong> em VGV. A DWV precisa ativar mais <strong>${fmtN(r.corretoresAdicionar)} corretores</strong> para atingir a meta de <strong>${fmt(D.vgvGoal)}</strong>.
</p>

<h2>Fórmula de Aceleração</h2>
<div class="box">
  <strong>Taxa de Engajamento (TE)</strong><div class="fm">TE = (${fmtN(D.activeBrokers)} / ${fmtN(D.totalBrokers)}) × 100 = ${fmtP(r.te)}</div>
  <strong>Delta de Corretores por Milhão (DC)</strong><div class="fm">DC = ${fmtN(D.activeBrokers)} / (${fmt(D.totalVGV)} / 1M) = ${r.dc.toFixed(2)} corretores/M</div>
  <strong>Corretores Necessários para a Meta (NC)</strong><div class="fm">NC = (${fmt(D.vgvGoal)} / 1M) × ${r.dc.toFixed(2)} = ${fmtN(r.nc)} corretores ativos → ativar mais ${fmtN(r.corretoresAdicionar)}</div>
</div>

<h2>3 Rotas Estratégicas</h2>
<div class="routes">
  <div class="route"><div class="rn">Rota A · Engajamento</div><div class="rv">${fmtP(r.nteNeeded)}</div><div class="rd">Nova TE (hoje: ${fmtP(r.te)})</div></div>
  <div class="route"><div class="rn">Rota B · Crescer Base</div><div class="rv">${fmtN(r.nct)}</div><div class="rd">Corretores totais (hoje: ${fmtN(D.totalBrokers)})</div></div>
  <div class="route"><div class="rn">Rota C · Produtividade</div><div class="rv">${r.dcNovo.toFixed(2)}/M</div><div class="rd">DC necessário (hoje: ${r.dc.toFixed(2)}/M)</div></div>
</div>

<h2>Organograma · Canal Parcerias</h2>
<div class="box">
  <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Sem DWV</div>
  <div class="org">
    <div class="org-lev"><div class="org-lab">Direção</div><div class="rob-boxes"><div class="rob hi">Dir. de Parceria</div></div></div>
    <div class="oarr">↓</div>
    <div class="org-lev"><div class="org-lab">Gerência</div><div class="rob-boxes">${parcBoxesPDF||'<div class="rob">—</div>'}</div></div>
    ${D.parcExecutives>0?`<div class="oarr">↓</div><div class="org-lev"><div class="org-lab">Executivos</div><div class="rob-boxes">${execBoxesPDF}</div></div>`:''}
    <div class="oarr">↓</div>
    <div class="org-lev"><div class="org-lab">Base</div><div class="rob-boxes"><div class="rob">${fmtN(D.totalBrokers)} cadastrados</div><div class="rob hi">${fmtN(D.activeBrokers)} ativos (${fmtP(r.te)})</div></div></div>
  </div>
  <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px">Fluxo atual — canal cego</div>
  <div class="flow">
    <div class="fstep red"><div class="ft">Captação</div><div class="fd">Manual, sem rastreio</div></div><div class="farr">→</div>
    <div class="fstep red"><div class="ft">Cadastro</div><div class="fd">Planilha, sem segmentação</div></div><div class="farr">→</div>
    <div class="fstep red"><div class="ft">Comunicação</div><div class="fd">WhatsApp pessoal</div></div><div class="farr">→</div>
    <div class="fstep red"><div class="ft">Proposta</div><div class="fd">Sem visibilidade gerente</div></div><div class="farr">→</div>
    <div class="fstep red"><div class="ft">Resultado</div><div class="fd">Gerente vê só na mesa</div></div>
  </div>
  <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px">Com Operadora DWV</div>
  <div class="org">
    <div class="org-lev"><div class="org-lab">Direção</div><div class="rob-boxes"><div class="rob hi">Dir. de Parceria</div></div></div>
    <div class="oarr">↓</div>
    <div class="org-lev"><div class="org-lab">Gerência · Operadora DWV (lateral)</div><div class="rob-boxes">${parcBoxesPDF}<div class="rob gn">Operadora DWV ↔</div></div></div>
    ${D.parcExecutives>0?`<div class="oarr">↓</div><div class="org-lev"><div class="org-lab">Executivos + Suporte</div><div class="rob-boxes">${execBoxesPDF}<div class="rob gn">Suporte Op.</div></div></div>`:''}
    <div class="oarr">↓</div>
    <div class="org-lev"><div class="org-lab">Base Segmentada</div><div class="rob-boxes"><div class="rob go">Ouro</div><div class="rob si">Prata</div><div class="rob br">Bronze</div></div></div>
  </div>
  <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px">Fluxo com DWV</div>
  <div class="flow">
    <div class="fstep gn"><div class="ft">Captação</div><div class="fd">Meta Ads → CRM</div></div><div class="farr">→</div>
    <div class="fstep gn"><div class="ft">Classificação</div><div class="fd">Bronze/Prata/Ouro</div></div><div class="farr">→</div>
    <div class="fstep gn"><div class="ft">Ativação</div><div class="fd">WhatsApp API + e-mail</div></div><div class="farr">→</div>
    <div class="fstep gn"><div class="ft">Proposta</div><div class="fd">Rastreada em tempo real</div></div><div class="farr">→</div>
    <div class="fstep gn"><div class="ft">BI Completo</div><div class="fd">Exec/Gerente/Diretoria</div></div>
  </div>
</div>

<h2>Tecnologia e Ferramentas</h2>
<div class="box">
  <p><strong>CRM de parceiros:</strong> ${D.hasCRM?'Sim — '+D.crmName:'Não utiliza'}</p>
  ${toolRows?`<table style="margin-top:8px"><tr><th>Ferramenta</th><th>Custo mensal</th><th>Custo anual</th></tr>${toolRows}</table>`:''}
  ${r.totalToolCost>0?`<p style="margin-top:8px"><strong>Custo anual total com ferramentas desconectadas: ${fmt(r.totalToolCost)}</strong></p>`:''}
  <div class="hl" style="margin-top:8px">A DWV substitui <strong>${nTools} ferramentas desconectadas</strong> em um único ambiente integrado.</div>
</div>

<h2>Dores e Desafios</h2>
<div class="box">
  <p><strong>Desafios:</strong> ${chalTxt}</p>
  ${D.challengesText?`<p style="margin-top:6px"><strong>Contexto:</strong> ${D.challengesText}</p>`:''}
  ${D.testedActions&&D.testedResults?`<p style="margin-top:6px"><strong>Ações testadas:</strong> ${D.testedResults}</p>`:''}
  <p style="margin-top:6px"><strong>Relatórios desejados:</strong> ${rptTxt}</p>
</div>

<h2>Retorno sobre Investimento DWV</h2>
<div class="gl">
  <div class="g2" style="margin-bottom:12px">
    <div>
      <div style="font-size:10px;color:#555;margin-bottom:3px;text-transform:uppercase;letter-spacing:.05em">Plano com Operadora DWV</div>
      <div style="font-size:16px;font-weight:700">${fmt(r.planoAnual)}/ano</div>
      <div style="font-size:11px;color:#888">12x ${fmt(r.planoMensal)}/mês</div>
    </div>
    <div>
      <div style="font-size:10px;color:#555;margin-bottom:3px;text-transform:uppercase;letter-spacing:.05em">VGV por corretor ativado</div>
      <div style="font-size:16px;font-weight:700;color:#E8392A">${fmt(r.vgvPorCorretor)}</div>
      <div style="font-size:11px;color:#888">produtividade média atual</div>
    </div>
  </div>
  <div class="g3">
    <div class="roi-card"><div class="roi-l">Ponto de equilíbrio</div><div class="roi-n">${r.corretoresParaPagarPlano||'—'}</div><div style="font-size:11px;color:#888">corretores mínimos p/ pagar o plano</div></div>
    <div class="roi-card"><div class="roi-l">Meta da DWV</div><div class="roi-n" style="color:#e0a020">${fmtN(r.corretoresAdicionar)}</div><div style="font-size:11px;color:#888">corretores a ativar</div></div>
    <div class="roi-card"><div class="roi-l">Retorno se meta atingida</div><div class="roi-n" style="color:#2e9e60;font-size:16px">${fmt(r.retornoTotal)}</div><div style="font-size:11px;color:#888">em VGV adicional</div></div>
  </div>
  <p style="margin-top:12px;font-size:12px;line-height:1.65">${corMinTxt} Se a DWV conseguir ativar todos os <strong>${fmtN(r.corretoresAdicionar)} corretores necessários</strong>, o retorno é de <strong>${fmt(r.retornoTotal)}</strong> em VGV adicional.${r.totalToolCost>0?' Somando a economia de '+fmt(r.totalToolCost)+'/ano ao consolidar as ferramentas, o retorno total supera esse valor.':''}${D.tabelaZero?' Com Tabela Zero ('+tzTxt+'), corretores Ouro têm acesso antecipado — aumentando produtividade por ativo.':''}</p>
</div>

<div style="margin-top:12px">
  <table><tr><th colspan="2">Estrutura · Canal Parcerias</th></tr>
    <tr><td>Exclusividade</td><td>${{exclusive:'Exclusivos',non_exclusive:'Não exclusivos',mixed:'Misto'}[D.brokersExclusivity]||'—'}</td></tr>
    <tr><td>Segmentação de corretores</td><td>${segTxt}</td></tr>
    <tr><td>Imobiliárias parceiras</td><td>${D.hasImob?'Sim':'Não'}</td></tr>
    <tr><td>Tabela Zero</td><td>${D.tabelaZero?'Sim — '+tzTxt:'Não'}</td></tr>
    ${D.tabelaZeroObs?`<tr><td>Obs. Tabela Zero</td><td>${D.tabelaZeroObs}</td></tr>`:''}
  </table>
</div>

${D.observations?`<h2>Observações</h2><div class="box">${D.observations}</div>`:''}
<div class="footer">DWV · Diagnóstico Comercial · Fórmula de Aceleração · dwvapp.com.br</div>
</body></html>`;

  const w=window.open('','_blank');
  if(!w){alert('Libere popups para gerar o PDF.');return;}
  w.document.write(html);w.document.close();
  setTimeout(()=>{w.focus();w.print();},600);
}

// ── INIT ──────────────────────────────────────────────────────
showStart();
