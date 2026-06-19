const STORAGE_KEY = 'ritmo-estudos-v1';
const studyDates = [
  {label:'19 jun',week:'sexta'},{label:'20 jun',week:'sábado'},{label:'21 jun',week:'domingo'},
  {label:'22 jun',week:'segunda'},{label:'23 jun',week:'terça'},{label:'24 jun',week:'quarta'},
  {label:'25 jun',week:'quinta'},{label:'30 jun',week:'terça'},{label:'01 jul',week:'quarta'}
];
const examTopics = [
  'Pneumologia — TB',
  'Pneumologia — TEP / TVP / TEV',
  'Pneumologia — Neoplasias pulmonares, incluindo metástases',
  'Pneumologia — Insuficiência respiratória',
  'Pneumologia — Micoses pulmonares',
  'Endocrinologia — Eixo hipotálamo–hipófise–gônada',
  'Endocrinologia — Tireoideopatias e paratireoides',
  'Endocrinologia — Adrenal: hipo, hiper, feocromocitoma, hiperaldosteronismo e incidentaloma',
  'Endocrinologia — DM: DM1, DM2, MODY, insulinoterapia, complicações agudas e crônicas e hiperglicemia hospitalar',
  'Endocrinologia — Síndrome metabólica e obesidade',
  'Nefrologia — Glomerulopatias',
  'Nefrologia — Tubulopatias e vasculopatias',
  'Nefrologia — IRA',
  'Nefrologia — DRC, transplante e hemodiálise'
];
const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
const semesterDefaults={name:'6º período',topics:[],weekdayLimits:[2,2,2,2,2,0,0],sessions:[]};
const defaults = {topics:[],sessions:[],questionLogs:[],commitments:[],dailyLimits:studyDates.map(()=>2),unscheduledTopics:0,semester:semesterDefaults};
let state = Object.assign({}, defaults, JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')||{});
state.dailyLimits = Array.isArray(state.dailyLimits)&&state.dailyLimits.length===studyDates.length?state.dailyLimits:studyDates.map(()=>2);
state.commitments = state.commitments||[];
state.semester=Object.assign({},semesterDefaults,state.semester||{});state.semester.topics=state.semester.topics||[];state.semester.sessions=state.semester.sessions||[];state.semester.weekdayLimits=Array.isArray(state.semester.weekdayLimits)&&state.semester.weekdayLimits.length===7?state.semester.weekdayLimits:[2,2,2,2,2,0,0];
let shouldSeedSchedule=false,shouldSeedSemester=false;
if(state.contentSeedVersion!==2){
  state.topics=[...examTopics];state.dailyLimits=studyDates.map(()=>2);shouldSeedSchedule=true;
  if(!state.commitments.length)state.commitments=[{id:'starter-internship',dateIndex:0,title:'Estágio'}];
  if(!state.semester.topics.length){state.semester.name='6º período';state.semester.topics=['Clínica Médica — Cardiologia','Clínica Médica — Nefrologia','Clínica Médica — Neurologia'];shouldSeedSemester=true}
  state.contentSeedVersion=2;
}
if(state.scheduleVersion!==4){state.sessions=[];state.unscheduledTopics=0;state.scheduleVersion=4;shouldSeedSchedule=true;localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const save=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
const escapeHtml=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const toast=message=>{const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)};
const durationLabel=m=>m<60?`${m} min`:(m%60?`${Math.floor(m/60)}h${m%60}`:`${m/60}h`);

$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.tab').forEach(x=>x.classList.remove('active'));$$('.view').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');$('#'+btn.dataset.view).classList.add('active');
}));

function renderTopics(){
  const list=$('#topicList');
  if(!state.topics.length){list.innerHTML='<div class="topic-empty">Comece com um conteúdo da sua prova de Medicina.</div>';return}
  list.innerHTML=state.topics.map((t,i)=>`<div class="topic-item"><span>${escapeHtml(t)}</span><button data-remove="${i}" aria-label="Remover ${escapeHtml(t)}">×</button></div>`).join('');
  $$('[data-remove]').forEach(b=>b.onclick=()=>{state.topics.splice(+b.dataset.remove,1);state.sessions=[];save();renderAll()});
}
$('#topicForm').addEventListener('submit',e=>{
  e.preventDefault();const input=$('#topicInput'),raw=input.value.trim();if(!raw)return;
  const topic=`${$('#areaInput').value} — ${raw}`;
  if(state.topics.some(t=>t.toLowerCase()===topic.toLowerCase())){toast('Esse conteúdo já está na lista.');return}
  state.topics.push(topic);state.sessions=[];input.value='';save();renderAll();input.focus();
});

function renderAvailability(){
  $('#availabilityList').innerHTML=studyDates.map((d,i)=>i===studyDates.length-1?`<div class="availability-row final-day-row"><span>${d.label} · ${d.week}<small class="capacity-note">revisão final de todos os conteúdos</small></span><strong>Todos</strong></div>`:`<label class="availability-row"><span>${d.label} · ${d.week}<small class="capacity-note">matérias novas</small></span><select data-availability="${i}" aria-label="Matérias novas em ${d.label}"><option value="0" ${state.dailyLimits[i]===0?'selected':''}>Nenhuma</option><option value="1" ${state.dailyLimits[i]===1?'selected':''}>1 matéria</option><option value="2" ${state.dailyLimits[i]===2?'selected':''}>2 matérias</option></select></label>`).join('');
  $$('[data-availability]').forEach(s=>s.onchange=()=>{state.dailyLimits[+s.dataset.availability]=+s.value;state.sessions=[];save();renderAll()});
  $('#commitmentDate').innerHTML=studyDates.map((d,i)=>`<option value="${i}">${d.label} · ${d.week}</option>`).join('');
}
$('#commitmentForm').addEventListener('submit',e=>{
  e.preventDefault();const title=$('#commitmentTitle').value.trim();if(!title)return;
  const dateIndex=+$('#commitmentDate').value,limit=+$('#commitmentLimit').value;
  state.commitments.push({id:Date.now().toString(),dateIndex,title});state.dailyLimits[dateIndex]=limit;
  state.sessions=[];$('#commitmentTitle').value='';save();renderAll();toast('Compromisso reservado na agenda.');
});
function renderCommitments(){
  const box=$('#commitmentList');
  box.innerHTML=state.commitments.length?state.commitments.map(c=>`<div class="commitment-item"><div><strong>${escapeHtml(c.title)}</strong><span>${studyDates[c.dateIndex].label} · cabem ${state.dailyLimits[c.dateIndex]} matéria(s)</span></div><button data-remove-commitment="${c.id}" aria-label="Remover ${escapeHtml(c.title)}">×</button></div>`).join(''):'<div class="history-empty">Nenhum compromisso adicionado.</div>';
  $$('[data-remove-commitment]').forEach(b=>b.onclick=()=>{state.commitments=state.commitments.filter(c=>c.id!==b.dataset.removeCommitment);state.sessions=[];save();renderAll()});
}

function generateSchedule(){
  if(!state.topics.length){toast('Adicione pelo menos um conteúdo médico.');$('#topicInput').focus();return}
  const previousDone=new Map(state.sessions.map(s=>[s.id,s.done])),studyLoads=studyDates.map(()=>0),sessions=[],studied=[];let unscheduled=0;
  state.topics.forEach((topic,order)=>{
    let dateIndex=-1;
    for(let i=0;i<studyDates.length-1;i++){if(studyLoads[i]<state.dailyLimits[i]){dateIndex=i;break}}
    if(dateIndex<0){unscheduled++;return}
    studyLoads[dateIndex]++;const id=`${topic}-study`;
    const session={id,topic,dateIndex,type:'study',done:previousDone.get(id)||false,order};sessions.push(session);studied.push(session);
  });
  const reviewLoads=studyDates.map(()=>0);
  studied.forEach((session,order)=>{
    const preferred=session.dateIndex+1;let dateIndex=-1;
    for(let i=preferred;i<studyDates.length-1;i++){if(reviewLoads[i]<2){dateIndex=i;break}}
    if(dateIndex>=0){reviewLoads[dateIndex]++;const id=`${session.topic}-quick`;sessions.push({id,topic:session.topic,dateIndex,type:'quick',done:previousDone.get(id)||false,order})}
  });
  studied.forEach((session,order)=>{const id=`${session.topic}-final`;sessions.push({id,topic:session.topic,dateIndex:studyDates.length-1,type:'final',done:previousDone.get(id)||false,order})});
  state.sessions=sessions;state.unscheduledTopics=unscheduled;state.scheduleVersion=4;save();renderSchedule();
  toast(unscheduled?`${unscheduled} conteúdo(s) não couberam antes da revisão final.`:'Duas matérias novas por dia, com revisões rápidas em rodízio.');
}
$('#generateBtn').onclick=generateSchedule;

function renderSchedule(){
  $('#statTopics').textContent=state.topics.length;$('#statSessions').textContent=state.sessions.length;
  const done=state.sessions.filter(s=>s.done).length,pct=state.sessions.length?Math.round(done/state.sessions.length*100):0;
  $('#progressPct').textContent=pct+'%';$('#progressBar').style.width=pct+'%';const box=$('#schedule');
  if(!state.sessions.length&&!state.commitments.length){box.className='schedule empty-state';box.innerHTML='<div class="empty-orbit">✦</div><h3>Seu cronograma vai aparecer aqui</h3><p>Adicione conteúdos e sua rotina; depois clique em “Organizar meu ciclo”.</p>';return}
  const missing=state.sessions.length?(state.unscheduledTopics||0):0;
  box.className='schedule';box.innerHTML=(missing?`<div class="plan-warning"><b>Limite respeitado.</b> ${missing} conteúdo(s) ficaram pendentes porque não cabem antes de 01/07 com apenas duas matérias novas por dia.</div>`:'')+studyDates.map((d,di)=>{
    const rank={study:0,quick:1,final:2},items=state.sessions.filter(s=>s.dateIndex===di).sort((a,b)=>rank[a.type]-rank[b.type]||a.order-b.order),commits=state.commitments.filter(c=>c.dateIndex===di);
    if(!items.length&&!commits.length)return '';
    return `<div class="day-group ${di===studyDates.length-1?'final-review-day':''}"><div class="day-label"><strong>${d.label.split(' ')[0]}</strong><span>${d.label.split(' ')[1]} · ${d.week}</span><small class="capacity-note">${di===studyDates.length-1?'revisar tudo':`máx. ${state.dailyLimits[di]} novas`}</small></div><div class="session-list">${commits.map(c=>`<div class="session session-commitment"><span class="check">•</span><span class="session-title">${escapeHtml(c.title)}</span><span class="session-kind">Compromisso</span></div>`).join('')}${items.map(s=>`<div class="session ${s.done?'done':''}" data-session="${escapeHtml(s.id)}"><span class="check">${s.done?'✓':''}</span><span class="session-title">${escapeHtml(s.topic)}</span><span class="session-kind ${s.type==='study'?'study':s.type}">${s.type==='study'?'Estudar · resumo · questões':s.type==='quick'?'Revisão rápida':'Revisão final'}</span></div>`).join('')}</div></div>`;
  }).join('');
  $$('[data-session]').forEach(el=>el.onclick=()=>{const s=state.sessions.find(x=>x.id===el.dataset.session);s.done=!s.done;save();renderSchedule()});
}

$('#questionForm').addEventListener('submit',e=>{
  e.preventDefault();const total=+$('#totalInput').value,correct=+$('#correctInput').value;if(correct>total){toast('Os acertos não podem passar do total.');return}
  state.questionLogs.unshift({total,correct,topic:$('#questionTopic').value.trim()||'Treino geral',date:new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})});save();e.target.reset();renderQuestions();toast('Resultado clínico salvo.');
});
function renderQuestions(){
  const total=state.questionLogs.reduce((a,x)=>a+x.total,0),correct=state.questionLogs.reduce((a,x)=>a+x.correct,0),pct=total?correct/total*100:0,needed=total&&pct<70?Math.ceil((.7*total-correct)/.3):0;
  $('#ringPct').textContent=Math.round(pct)+'%';$('#targetRing').style.setProperty('--p',pct);$('#accuracyBar').style.width=pct+'%';$('#accuracyBar').style.background=pct>=70?'var(--lime)':'var(--coral)';$('#totalSolved').textContent=total;$('#totalCorrect').textContent=correct;$('#gapPct').textContent=Math.max(0,70-pct).toFixed(total?1:0).replace('.',',')+' p.p.';const badge=$('#statusBadge');
  if(!total){$('#neededCount').textContent='—';$('#performanceTitle').textContent='Comece seu primeiro treino';$('#neededLabel').textContent='questões até a meta';$('#neededHint').textContent='Registre um resultado para calcular';badge.textContent='Aguardando dados';badge.className='status-badge';$('#calculationExplain').textContent='Quando sua taxa estiver abaixo da meta, calcularemos o menor número de questões que você precisa acertar em sequência para atingir 70%.'}
  else if(pct>=70){$('#neededCount').textContent='✓';$('#performanceTitle').textContent='Você alcançou a meta';$('#neededLabel').textContent='meta de 70% alcançada';$('#neededHint').textContent='Mantenha o desempenho nos próximos treinos';badge.textContent='Na meta';badge.className='status-badge good';$('#calculationExplain').textContent=`Com ${correct} acertos em ${total} questões, sua taxa é ${pct.toFixed(1).replace('.',',')}%. Busque pelo menos 70% nos próximos blocos.`}
  else{$('#neededCount').textContent=needed;$('#performanceTitle').textContent='Sua próxima missão';$('#neededLabel').textContent=needed===1?'questão certa em sequência':'questões certas em sequência';$('#neededHint').textContent='para chegar a pelo menos 70%';badge.textContent='Em construção';badge.className='status-badge warn';$('#calculationExplain').textContent=`Hoje são ${correct} acertos em ${total}. Acertando as próximas ${needed}, você terá ${correct+needed} de ${total+needed} — ${((correct+needed)/(total+needed)*100).toFixed(1).replace('.',',')}%.`}
  $('#questionHistory').innerHTML=state.questionLogs.length?state.questionLogs.map(x=>`<div class="history-item"><div><strong>${escapeHtml(x.topic)}</strong><span>${x.date} · ${x.correct} de ${x.total} acertos</span></div><span class="history-score">${Math.round(x.correct/x.total*100)}%</span></div>`).join(''):'<div class="history-empty">Nenhum treino registrado ainda.</div>';
}
$('#clearHistory').onclick=()=>{state.questionLogs=[];save();renderQuestions();toast('Histórico de questões limpo.')};

$('#exportBtn').onclick=()=>{
  const backup={app:'MedRitmo',backupVersion:1,exportedAt:new Date().toISOString(),data:state};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`medritmo-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup baixado com segurança.');
};
$('#importInput').onchange=e=>{
  const file=e.target.files&&e.target.files[0];if(!file)return;const reader=new FileReader();
  reader.onload=()=>{try{const parsed=JSON.parse(reader.result),data=parsed.data||parsed;if(!Array.isArray(data.topics)||!Array.isArray(data.questionLogs))throw new Error('Formato inválido');if(!confirm('Restaurar este backup? Os dados atuais serão substituídos.'))return;state=Object.assign({},defaults,data);state.dailyLimits=Array.isArray(state.dailyLimits)&&state.dailyLimits.length===studyDates.length?state.dailyLimits:studyDates.map(()=>2);state.semester=Object.assign({},semesterDefaults,state.semester||{});state.semester.topics=state.semester.topics||[];state.semester.sessions=state.semester.sessions||[];state.semester.weekdayLimits=Array.isArray(state.semester.weekdayLimits)&&state.semester.weekdayLimits.length===7?state.semester.weekdayLimits:[2,2,2,2,2,0,0];save();renderAll();toast('Backup restaurado com sucesso.')}catch(error){toast('Este arquivo não é um backup válido do MedRitmo.')}finally{e.target.value=''}};
  reader.readAsText(file);
};

function renderSemester(){
  $('#semesterName').value=state.semester.name;
  $('#semesterTopicList').innerHTML=state.semester.topics.length?state.semester.topics.map((topic,i)=>`<div class="topic-item"><span>${escapeHtml(topic)}</span><button data-remove-semester-topic="${i}" aria-label="Remover ${escapeHtml(topic)} do semestre">×</button></div>`).join(''):'<div class="history-empty">Adicione os conteúdos do próximo período.</div>';
  $$('[data-remove-semester-topic]').forEach(button=>button.onclick=()=>{state.semester.topics.splice(+button.dataset.removeSemesterTopic,1);state.semester.sessions=[];save();renderSemester()});
  $('#weekdayLimits').innerHTML=weekdays.map((day,i)=>`<label><span>${day}</span><select data-weekday-limit="${i}" aria-label="Matérias novas na ${day}"><option value="0" ${state.semester.weekdayLimits[i]===0?'selected':''}>Folga</option><option value="1" ${state.semester.weekdayLimits[i]===1?'selected':''}>1 matéria</option><option value="2" ${state.semester.weekdayLimits[i]===2?'selected':''}>2 matérias</option></select></label>`).join('');
  $$('[data-weekday-limit]').forEach(select=>select.onchange=()=>{state.semester.weekdayLimits[+select.dataset.weekdayLimit]=+select.value;state.semester.sessions=[];save();renderSemester()});
  renderSemesterSchedule();
}
$('#semesterName').onchange=e=>{state.semester.name=e.target.value.trim()||'Próximo período';save();renderSemester()};
$('#semesterTopicForm').onsubmit=e=>{
  e.preventDefault();const input=$('#semesterTopicInput'),raw=input.value.trim();if(!raw)return;const topic=`${$('#semesterArea').value} — ${raw}`;
  if(state.semester.topics.some(item=>item.toLowerCase()===topic.toLowerCase())){toast('Esse conteúdo já está no próximo período.');return}
  state.semester.topics.push(topic);state.semester.sessions=[];input.value='';save();renderSemester();input.focus();
};
function generateSemesterSchedule(){
  if(!state.semester.topics.length){toast('Adicione conteúdos do próximo período.');return}
  const weeklyCapacity=state.semester.weekdayLimits.reduce((a,b)=>a+b,0);if(!weeklyCapacity){toast('Libere pelo menos um dia da semana.');return}
  const previousDone=new Map(state.semester.sessions.map(s=>[s.id,s.done])),weeksNeeded=Math.ceil(state.semester.topics.length/weeklyCapacity),slots=[];
  for(let week=0;week<weeksNeeded+2;week++)for(let day=0;day<7;day++)slots.push({week,day,index:slots.length,capacity:state.semester.weekdayLimits[day],studyLoad:0,reviewLoad:0});
  const sessions=[],studies=[];let cursor=0;
  state.semester.topics.forEach((topic,order)=>{while(cursor<slots.length&&slots[cursor].studyLoad>=slots[cursor].capacity)cursor++;const slot=slots[cursor];if(!slot)return;slot.studyLoad++;const id=`semester-${topic}-study`;const session={id,topic,type:'study',week:slot.week,day:slot.day,slotIndex:slot.index,order,done:previousDone.get(id)||false};sessions.push(session);studies.push(session)});
  studies.forEach((study,order)=>{let start=study.slotIndex+(order%2===0?1:2),slot=null;for(let i=start;i<slots.length;i++){if(slots[i].capacity>0&&slots[i].reviewLoad<2){slot=slots[i];break}}if(slot){slot.reviewLoad++;const id=`semester-${study.topic}-quick`;sessions.push({id,topic:study.topic,type:'quick',week:slot.week,day:slot.day,order,done:previousDone.get(id)||false})}});
  state.semester.sessions=sessions;save();renderSemesterSchedule();toast(`${state.semester.name}: rotina contínua criada em ${weeksNeeded} semana(s).`);
}
$('#generateSemesterBtn').onclick=generateSemesterSchedule;
function renderSemesterSchedule(){
  const box=$('#semesterSchedule'),sessions=state.semester.sessions;if(!sessions.length){box.innerHTML='<div class="semester-empty">Sua rotina contínua aparecerá aqui.</div>';return}
  const totalWeeks=Math.max(...sessions.map(s=>s.week))+1;box.innerHTML=Array.from({length:totalWeeks},(_,week)=>`<section class="semester-week"><header><strong>Semana ${week+1}</strong><span>${escapeHtml(state.semester.name)}</span></header>${weekdays.map((day,di)=>{const items=sessions.filter(s=>s.week===week&&s.day===di).sort((a,b)=>(a.type==='study'?0:1)-(b.type==='study'?0:1)||a.order-b.order);if(!items.length)return '';return `<div class="semester-day"><b>${day}</b><div>${items.map(s=>`<button class="semester-session ${s.type} ${s.done?'done':''}" data-semester-session="${escapeHtml(s.id)}"><i>${s.done?'✓':''}</i><span>${escapeHtml(s.topic)}<small>${s.type==='study'?'Estudar · resumo · questões':'Revisão rápida'}</small></span></button>`).join('')}</div></div>`}).join('')}</section>`).join('');
  $$('[data-semester-session]').forEach(button=>button.onclick=()=>{const session=state.semester.sessions.find(s=>s.id===button.dataset.semesterSession);session.done=!session.done;save();renderSemesterSchedule()});
}

let timerPhase='focus',secondsLeft=2400,timerRunning=false,timerInterval=null,audioCtx=null,musicInterval=null,musicOn=false,fallbackAudio=null;
function timerTotal(){return timerPhase==='focus'?2400:300}
function renderTimer(){
  const min=Math.floor(secondsLeft/60),sec=secondsLeft%60,pct=(1-secondsLeft/timerTotal())*100;
  $('#timerDisplay').textContent=`${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;$('#timerRing').style.setProperty('--timer-p',pct);$('#timerPhase').textContent=timerPhase==='focus'?'FOCO':'PAUSA';
  $('#timerStatus').textContent=timerRunning?(timerPhase==='focus'?'Foco em andamento':'Pausa restauradora'):'Pronto para focar';
  $('#timerToggle').innerHTML=timerRunning?'Ⅱ <span>Pausar</span>':'▶ <span>Começar</span>';
}
function switchPhase(){timerPhase=timerPhase==='focus'?'break':'focus';secondsLeft=timerTotal();timerRunning=false;clearInterval(timerInterval);renderTimer();toast(timerPhase==='break'?'Bloco concluído. Respire por 5 minutos.':'Pausa concluída. Vamos ao próximo bloco?')}
$('#timerToggle').onclick=()=>{timerRunning=!timerRunning;if(timerRunning){timerInterval=setInterval(()=>{secondsLeft--;if(secondsLeft<=0)switchPhase();else renderTimer()},1000)}else clearInterval(timerInterval);renderTimer()};
$('#timerReset').onclick=()=>{timerRunning=false;clearInterval(timerInterval);secondsLeft=timerTotal();renderTimer()};$('#skipTimer').onclick=switchPhase;
function playChord(){
  if(!audioCtx||!musicOn)return;const now=audioCtx.currentTime;[220,277.18,329.63].forEach((freq,i)=>{const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=i===0?'sine':'triangle';osc.frequency.value=freq*(Math.random()>.7?1.5:1);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(i===0?.025:.012,now+.8);gain.gain.exponentialRampToValueAtTime(.0001,now+3.8);osc.connect(gain).connect(audioCtx.destination);osc.start(now);osc.stop(now+4)})
}
function createFallbackTrack(){
  const rate=8000,duration=8,samples=rate*duration,buffer=new ArrayBuffer(44+samples*2),view=new DataView(buffer);
  const write=(offset,text)=>[...text].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));write(0,'RIFF');view.setUint32(4,36+samples*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples*2,true);
  const notes=[220,277.18,329.63];for(let i=0;i<samples;i++){const t=i/rate,envelope=.34+.14*Math.sin(Math.PI*2*t/duration);let wave=0;notes.forEach((f,n)=>wave+=Math.sin(2*Math.PI*f*t+n*.7)/(n+2));view.setInt16(44+i*2,Math.max(-1,Math.min(1,wave*envelope))*.18*32767,true)}
  const audio=new Audio(URL.createObjectURL(new Blob([buffer],{type:'audio/wav'})));audio.loop=true;audio.volume=.32;return audio;
}
$('#musicToggle').onclick=async()=>{
  musicOn=!musicOn;const btn=$('#musicToggle');btn.classList.toggle('on',musicOn);btn.setAttribute('aria-pressed',String(musicOn));btn.querySelector('span').textContent=musicOn?'Ligada':'Desligada';
  if(musicOn){const AudioEngine=window.AudioContext||window.webkitAudioContext;if(AudioEngine){audioCtx=audioCtx||new AudioEngine();await audioCtx.resume();playChord();musicInterval=setInterval(playChord,4000)}else{fallbackAudio=fallbackAudio||createFallbackTrack();fallbackAudio.play().catch(()=>toast('Toque novamente para liberar o áudio.'))}}
  else{clearInterval(musicInterval);if(fallbackAudio)fallbackAudio.pause()}
};

$('#resetBtn').onclick=()=>{if(confirm('Limpar conteúdos, rotina, cronograma e questões?')){state={topics:[],sessions:[],questionLogs:[],commitments:[],dailyLimits:studyDates.map(()=>2),unscheduledTopics:0,semester:{name:'6º período',topics:[],weekdayLimits:[2,2,2,2,2,0,0],sessions:[]}};save();renderAll();toast('Tudo limpo. Um novo ciclo!')}};
function renderAll(){renderTopics();renderAvailability();renderCommitments();renderSchedule();renderQuestions();renderSemester();renderTimer()}
if(shouldSeedSchedule)generateSchedule();
if(shouldSeedSemester)generateSemesterSchedule();
renderAll();
