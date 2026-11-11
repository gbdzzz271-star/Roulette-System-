const META=[['powers','Poderes','✦',150],['races','Raças','♜',50],['classes','Classes','⚔',20],['weapons','Armas','⚒',50],['strength','Força','⬆',10,'FOR'],['speed','Velocidade','➤',10,'VEL'],['resistance','Resistência','⬡',10,'RES'],['handling','Manuseio','⚙',10,'MAN'],['agility','Agilidade','⤴',10,'AGI'],['balance','Equilíbrio','◇',10,'EQU'],['intelligence','Especialização intelectual','🧠',10,'INT'],['secondary1','Poder secundário I','✧',50],['secondary2','Poder secundário II','✧',50]];
const ATTRS=['FOR','VEL','RES','MAN','AGI','EQU','INT','ENE','PER'];
let catalog=null,history=JSON.parse(localStorage.getItem('rs_beta_history')||'[]'),lastCharacter=null,deferred=null,currentWheelId=null,selected={},wheelBusy=false;
const $=id=>document.getElementById(id);
function renderGrid(){ $('grid').innerHTML='';META.forEach(([id,name,ico,count])=>{const b=document.createElement('button');b.className='card';b.innerHTML=`<em>${count} itens</em><span class="ico">${ico}</span><b>${name}</b><small>${selected[id]?'✓ '+escape(selected[id].name):'Toque para abrir a roleta'}</small>`;b.onclick=()=>openWheel(id);$('grid').appendChild(b);});updateProgress();}
function weightedPick(list){const total=list.reduce((s,x)=>s+Math.max(0,Number(x.weight??x.probability??1)),0);let r=Math.random()*total;for(const x of list){r-=Math.max(0,Number(x.weight??x.probability??1));if(r<0)return x;}return list[list.length-1];}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function ageFor(r){let lo=Number($('ageMin').value||1),hi=Number($('ageMax').value||10000);if(lo<1||hi<lo)throw Error('Faixa provisória de idade inválida.');if(r.age_type==='range'&&Number.isFinite(r.age_min)&&Number.isFinite(r.age_max))return {n:rand(r.age_min,r.age_max),provisional:false,range:`${r.age_min}–${r.age_max} anos`};if(/milhar|milênio|milenio|1\.000\+|1000\+/.test((r.lifespan||'').toLowerCase()))lo=Math.max(lo,1000);if(lo>hi)lo=Number($('ageMin').value||1);return {n:rand(lo,hi),provisional:true,range:`${lo.toLocaleString('pt-BR')}–${hi.toLocaleString('pt-BR')} anos (provisória)`};}
const ATTR_CATEGORY={strength:'FOR',speed:'VEL',resistance:'RES',handling:'MAN',agility:'AGI',balance:'EQU',intelligence:'INT'};
function affinitySourcesFor(stat){
  const sources=[];
  for(const [key,label] of [['races','Raça'],['classes','Classe'],['weapons','Arma']]){
    const item=selected[key]; if(!item) continue;
    const text=String(item.buffs||'');
    // Só considera bônus permanentes escritos com o código exato do atributo.
    const re=/\+\s*(\d+(?:[.,]\d+)?)\s*%\s*(FOR|VEL|RES|MAN|AGI|EQU|INT|ENE|PER)\b/gi;
    let m,found=false;
    while((m=re.exec(text))){if(m[2].toUpperCase()===stat){found=true;break;}}
    if(found)sources.push({label,name:item.name,bonus:.7});
  }
  return sources;
}
function affinityFor(stat){return Math.min(1.5,affinitySourcesFor(stat).reduce((n,x)=>n+x.bonus,0));}
function wheelItems(id){
  let items=[...(catalog.categories[id]||[])];
  if(id==='secondary2'&&selected.secondary1)items=items.filter(x=>x.name!==selected.secondary1.name);
  if(id==='secondary1'&&selected.secondary2)items=items.filter(x=>x.name!==selected.secondary2.name);
  const stat=ATTR_CATEGORY[id];
  if(stat&&items.length){
    const sources=affinitySourcesFor(stat),bonus=Math.min(1.5,sources.reduce((n,x)=>n+x.bonus,0));
    if(bonus>0){
      const rankOf=x=>['Comum','Incomum','Raro','Épico','Lendário','Mítico','Divino','Transcendente'].indexOf(x.rarity);
      const topRank=Math.max(...items.map(rankOf));
      const topItems=items.filter(x=>rankOf(x)===topRank);
      // Distribui o bônus entre os resultados de maior raridade, sem favorecer apenas um item arbitrário.
      const share=bonus/topItems.length;
      const topNames=new Set(topItems.map(x=>x.name));
      items=items.map(x=>topNames.has(x.name)?{...x,weight:Number(x.weight??x.probability??1)+share,_affinityBonus:share,_affinitySources:sources}:x);
    }
  }
  return items;
}
function openWheel(id){if(!catalog)return;currentWheelId=id;const meta=META.find(x=>x[0]===id),items=wheelItems(id);$('wheelTitle').textContent=meta[1];$('wheelCount').textContent=`${items.length} opções na roleta`; $('wheelStatus').textContent='Pronta para girar';$('wheelResult').innerHTML=selected[id]?`Último resultado salvo: <b>${escape(selected[id].name)}</b>`:'A roleta ainda não foi girada.';$('spin').disabled=false;$('wheelModal').classList.add('open');$('wheelModal').setAttribute('aria-hidden','false');document.body.classList.add('modal-open');drawWheel(id);renderWheelList(id);}
function closeWheel(){if(wheelBusy)return;$('wheelModal').classList.remove('open');$('wheelModal').setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');currentWheelId=null;}
function colorFor(i){const hues=[267,286,310,326,42,195,220,250];return `hsl(${hues[i%hues.length]} 42% ${i%2?31:39}%)`;}
function drawWheel(id){const canvas=$('wheelCanvas'),ctx=canvas.getContext('2d'),items=wheelItems(id),size=900,dpr=window.devicePixelRatio||1;canvas.width=size*dpr;canvas.height=size*dpr;canvas.style.width='100%';canvas.style.height='auto';ctx.scale(dpr,dpr);const cx=size/2,cy=size/2,r=420,weights=items.map(x=>Math.max(.0001,Number(x.weight??x.probability??1))),total=weights.reduce((a,b)=>a+b,0);let a=-Math.PI/2;items.forEach((item,i)=>{const span=weights[i]/total*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,a+span);ctx.closePath();ctx.fillStyle=colorFor(i);ctx.fill();ctx.strokeStyle='#f1d99c';ctx.lineWidth=1.2;ctx.stroke();if(span>.018){ctx.save();ctx.translate(cx,cy);ctx.rotate(a+span/2);ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle='#fff';const fs=span<.055?7:span<.10?9:13;ctx.font=`700 ${fs}px Arial`;let label=item.name||item.id;if(label.length>22)label=label.slice(0,20)+'…';if(span<.035)label=item.id||String(i+1);ctx.fillText(label,r-10,0,Math.max(12,r*span*.92));ctx.restore();}a+=span;});ctx.beginPath();ctx.arc(cx,cy,74,0,Math.PI*2);ctx.fillStyle='#100d18';ctx.fill();ctx.strokeStyle='#e8bd68';ctx.lineWidth=8;ctx.stroke();ctx.fillStyle='#e8bd68';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 28px Arial';ctx.fillText('RS',cx,cy);}
function renderWheelList(id){const items=wheelItems(id);$('wheelList').innerHTML=items.map((x,i)=>`<div class="wheel-list-row"><i style="background:${colorFor(i)}"></i><span class="wheel-list-id">${escape(x.id||String(i+1).padStart(3,'0'))}</span><span class="wheel-list-name">${escape(x.name)}</span><small>${escape(x.rarity||'')}</small></div>`).join('');}
function spinWheel(){if(wheelBusy||!currentWheelId)return;const id=currentWheelId;let items=wheelItems(id);if(!items.length){$('wheelStatus').textContent='Não há opções disponíveis.';return;}const item=weightedPick(items),index=items.indexOf(item),weights=items.map(x=>Math.max(.0001,Number(x.weight??x.probability??1))),total=weights.reduce((a,b)=>a+b,0);let before=weights.slice(0,index).reduce((a,b)=>a+b,0);const center=-Math.PI/2+((before+weights[index]/2)/total)*Math.PI*2;const target=(((-Math.PI/2-center)*180/Math.PI)%360+360)%360;const turns=6+rand(0,2),rotation=turns*360+target;wheelBusy=true;$('spin').disabled=true;$('wheelStatus').textContent='A roleta está girando…';$('wheelResult').textContent='Boa sorte!';const canvas=$('wheelCanvas');canvas.style.transition='none';canvas.style.transform='rotate(0deg)';void canvas.offsetWidth;canvas.style.transition='transform 5.2s cubic-bezier(.12,.78,.12,1)';canvas.style.transform=`rotate(${rotation}deg)`;setTimeout(()=>{selected[id]=item;let age=null;if(id==='races'){age=ageFor(item);selected.age=age;}show(item,id);addHistory(META.find(x=>x[0]===id)[1],item.name,item.rarity||'—');$('wheelStatus').textContent='Resultado definido!';$('wheelResult').innerHTML=`<strong>${escape(item.name)}</strong><span>${escape(item.rarity||'Raridade não especificada')} • ${escape(item.id||'')}</span>${age?`<span>Idade sorteada: ${age.n.toLocaleString('pt-BR')} anos${age.provisional?' (faixa provisória)':''}</span>`:''}`;$('spin').disabled=false;wheelBusy=false;renderGrid();updateProgress();if(Object.keys(selected).filter(k=>META.some(m=>m[0]===k)).length===META.length)buildCharacter();},5350);}
function mods(txt){const out={};const re=/([+-])\s*(\d+(?:[.,]\d+)?)\s*%\s*(FOR|VEL|RES|MAN|AGI|EQU|INT|ENE|PER)\b([^;]*)/gi;let m;while((m=re.exec(txt||''))){const tail=(m[4]||'').toLowerCase();if(/\b(em|quando|durante|sob|se|enquanto|na água|na agua|no frio|no calor|em ambientes|em situações|em situacoes|em movimentos)\b/.test(tail))continue;out[m[3].toUpperCase()]=(out[m[3].toUpperCase()]||0)+Number(m[2].replace(',','.'))*(m[1]==='-'?-1:1);}return out;}
function buildCharacter(){const c={...selected};c.mod=Object.fromEntries(ATTRS.map(a=>[a,0]));[c.races,c.classes,c.powers,c.weapons,c.strength,c.speed,c.resistance,c.handling,c.agility,c.balance,c.intelligence].forEach(x=>{[x.buffs,x.debuffs].forEach(t=>{for(const [a,v] of Object.entries(mods(t)))c.mod[a]+=v;});});c.final=Object.fromEntries(ATTRS.map(a=>[a,Math.round(100*(1+c.mod[a]/100)*100)/100]));c.at=new Date().toISOString();lastCharacter=c;renderSheet(c);$('export').disabled=false;$('sheet').scrollIntoView({behavior:'smooth',block:'start'});}
function show(item,catId){
  const box=$('result'),cat=META.find(x=>x[0]===catId);let chance='';
  if(cat){const list=wheelItems(catId),sum=list.reduce((n,x)=>n+Number(x.weight??x.probability??1),0);chance=`Chance efetiva: ${(Number(item.weight??item.probability??1)/sum*100).toFixed(4)}%`;}
  const sources=item._affinitySources||[];
  box.innerHTML=`<div class="eyebrow">${escape(item.rarity||'RESULTADO OFICIAL')}</div><div class="result-title">${escape(item.id||'')} ${escape(item.name)}</div><p>${escape(item.description||item.buffs||item.raw||'')}</p><div class="chips">${[chance,item.lifespan?'Longevidade: '+item.lifespan:'',item.buffs?'Buffs: '+item.buffs:'',item.debuffs?'Debuffs: '+item.debuffs:'',item.limitation?'Limitação: '+item.limitation:'',item._affinityBonus?'Bônus de afinidade: +'+item._affinityBonus.toFixed(2)+' de peso':''].filter(Boolean).map(x=>`<span class="chip">${escape(x)}</span>`).join('')}</div>${sources.length?`<p class="affinity-note">Afinidades aplicadas: ${sources.map(x=>`${escape(x.label)} ${escape(x.name)} (+0,7)`).join(' • ')}</p>`:''}`;
}
function portraitData(c){
  // Avatar procedural offline: ilustração vetorial de corpo inteiro, sem API e sem custo por uso.
  const seedText=[c.races?.name,c.powers?.name,c.secondary1?.name,c.secondary2?.name,c.classes?.name,c.weapons?.name].join('|');
  const seed=seedText.split('').reduce((a,x)=>((a*31)+x.charCodeAt(0))>>>0,7);
  const hue=seed%360, accent=(hue+72)%360, hairHue=(hue+155)%360;
  const pick=(n)=>((seed>>>n)%100)/100;
  const skin=['#f0c6a5','#c98f70','#8d5b48','#e2b18c'][seed%4];
  const hair=['#171522','#d8d7e5','#7a3c2c','#e7bd55','#563b78'][((seed>>>4)%5)];
  const eye=`hsl(${accent} 95% 72%)`;
  const armor=`hsl(${hue} 34% 22%)`, trim=`hsl(${accent} 78% 67%)`;
  const cloak=pick(9)>.5;
  const aura=`hsl(${accent} 90% 58%)`;
  const race=(c.races?.name||'').toLowerCase(), power=(c.powers?.name||'').toLowerCase();
  const ears=/elf|dem[oô]nio|fera|drag|bestial|leon|lobo/.test(race);
  const horns=/dem[oô]nio|drag|diab|infernal/.test(race);
  const wings=/anjo|celestial|seraf|drag|d[rú]ade/.test(race);
  const auraShape=/gelo|ice|frio/.test(power)?'❄':/fogo|chama|flam/.test(power)?'✦':/raio|el[eé]tric/.test(power)?'ϟ':/som|sonor/.test(power)?'♫':'✧';
  const weapon=c.weapons?.name||'Arma';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">
  <defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#211536"/><stop offset=".55" stop-color="#100d1b"/><stop offset="1" stop-color="#080710"/></linearGradient><radialGradient id="halo"><stop stop-color="${aura}" stop-opacity=".48"/><stop offset="1" stop-color="${aura}" stop-opacity="0"/></radialGradient><linearGradient id="coat" x2="1" y2="1"><stop stop-color="${armor}"/><stop offset="1" stop-color="#090811"/></linearGradient><linearGradient id="metal" x2="0" y2="1"><stop stop-color="#fff0bd"/><stop offset=".45" stop-color="${trim}"/><stop offset="1" stop-color="#8b5c2b"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <rect width="600" height="900" fill="url(#bg)"/><circle cx="300" cy="300" r="275" fill="url(#halo)"/>
  <g fill="none" stroke="${trim}" opacity=".38"><circle cx="300" cy="330" r="240" stroke-width="2"/><circle cx="300" cy="330" r="260" stroke-dasharray="5 15"/><path d="M30 690 Q300 550 570 690 M55 730 Q300 610 545 730"/></g>
  <g opacity=".75" fill="${aura}" filter="url(#glow)"><path d="M80 430 Q20 300 125 230 Q75 350 160 390Z"/><path d="M520 430 Q580 300 475 230 Q525 350 440 390Z"/><path d="M105 540 Q45 480 90 400 Q90 485 155 500Z"/><path d="M495 540 Q555 480 510 400 Q510 485 445 500Z"/></g>
  ${wings?`<g fill="${trim}" opacity=".65"><path d="M245 330 Q65 80 75 290 Q130 360 245 430Z"/><path d="M355 330 Q535 80 525 290 Q470 360 355 430Z"/></g>`:''}
  ${cloak?`<path d="M220 360 L130 820 Q300 875 470 820 L380 360Z" fill="#11101b" stroke="${trim}" stroke-width="5"/>`:''}
  <path d="M235 330 L190 410 L145 850 Q300 885 455 850 L410 410 L365 330Z" fill="url(#coat)" stroke="${trim}" stroke-width="5"/>
  <path d="M245 365 L210 500 L265 545 L300 470 L335 545 L390 500 L355 365Z" fill="url(#metal)" stroke="#24172d" stroke-width="7"/>
  <path d="M270 365 L300 450 L330 365" fill="none" stroke="#fff0c9" stroke-width="5" opacity=".8"/>
  <path d="M220 410 L155 470 L115 650 L165 670 L245 505Z M380 410 L445 470 L485 650 L435 670 L355 505Z" fill="${armor}" stroke="${trim}" stroke-width="6"/>
  <path d="M260 520 L235 690 L260 850 L300 850 L315 650 L340 850 L380 850 L365 690 L340 520Z" fill="#171421" stroke="${trim}" stroke-width="5"/>
  <path d="M235 680 L300 710 L365 680" fill="none" stroke="url(#metal)" stroke-width="15"/>
  <path d="M270 270 L270 345 Q300 385 330 345 L330 270Z" fill="${skin}" stroke="#251824" stroke-width="5"/>
  ${ears?`<path d="M218 205 L165 165 L190 265Z M382 205 L435 165 L410 265Z" fill="${skin}" stroke="#251824" stroke-width="6"/>`:''}
  ${horns?`<path d="M240 145 Q175 45 205 40 Q260 80 270 145 M360 145 Q425 45 395 40 Q340 80 330 145" fill="#211322" stroke="${trim}" stroke-width="8"/>`:''}
  <ellipse cx="300" cy="220" rx="91" ry="112" fill="${skin}" stroke="#251824" stroke-width="8"/>
  <path d="M207 220 Q185 90 300 92 Q415 90 393 220 L365 175 L330 145 L285 170 L240 145Z" fill="${hair}" stroke="#17121d" stroke-width="7"/>
  <path d="M215 190 Q190 260 225 315 L250 280 L240 205Z M385 190 Q410 260 375 315 L350 280 L360 205Z" fill="${hair}"/>
  <path d="M245 225 Q265 210 280 225 M320 225 Q340 210 355 225" stroke="#211522" stroke-width="9" stroke-linecap="round" fill="none"/>
  <ellipse cx="263" cy="235" rx="8" ry="5" fill="${eye}" filter="url(#glow)"/><ellipse cx="337" cy="235" rx="8" ry="5" fill="${eye}" filter="url(#glow)"/>
  <path d="M285 285 Q300 295 315 285" fill="none" stroke="#813f50" stroke-width="5" stroke-linecap="round"/>
  <path d="M250 350 L300 405 L350 350" fill="none" stroke="${trim}" stroke-width="8"/>
  <g transform="translate(445 390) rotate(15)"><path d="M0 0 L15 0 L15 390 L7 430 L0 390Z" fill="url(#metal)" stroke="#211629" stroke-width="5"/><path d="M-25 35 L40 35" stroke="${trim}" stroke-width="13"/><path d="M7 -65 L25 0 L7 35 L-10 0Z" fill="${trim}" stroke="#fff0c9" stroke-width="4"/></g>
  <g fill="#fff0c9" font-family="serif" text-anchor="middle"><text x="300" y="65" font-size="23" letter-spacing="6">ROULETTE SYSTEM</text><text x="300" y="875" font-size="18" letter-spacing="3">${auraShape} ${String(c.classes?.name||'AVENTUREIRO').toUpperCase()} ${auraShape}</text></g>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function rarityScore(x){return ({'Comum':10,'Incomum':20,'Rara':30,'Épica':45,'Lendária':60,'Mítica':75,'Divina':90,'Transcendente':100})[x?.rarity]||25;}
function powerIndex(c){const keys=['FOR','VEL','RES','MAN','AGI','EQU','INT','ENE','PER'];const weights={FOR:.18,VEL:.14,RES:.14,MAN:.08,AGI:.08,EQU:.06,INT:.10,ENE:.10,PER:.07};let score=0;for(const k of keys)score+=Math.min(100,Math.max(0,c.final[k]/2))*weights[k];const hax=(rarityScore(c.powers)+rarityScore(c.secondary1)+rarityScore(c.secondary2))/3;score+=hax*.05;return Math.round(score*10)/10;}
function renderSheet(c){const parts=[['Poder principal',c.powers],['Poder secundário I',c.secondary1],['Poder secundário II',c.secondary2],['Raça',c.races],['Classe',c.classes],['Arma',c.weapons],['Força',c.strength],['Velocidade',c.speed],['Resistência',c.resistance],['Manuseio',c.handling],['Agilidade',c.agility],['Equilíbrio',c.balance],['Especialização intelectual',c.intelligence]];const pi=powerIndex(c);$('sheet').innerHTML=`<div class="character-card"><div class="character-portrait"><img alt="Avatar procedural de corpo inteiro do personagem" src="${portraitData(c)}"></div><div class="character-card-body"><small>ROULETTE SYSTEM • PERSONAGEM GERADO</small><h2>${escape(c.races.name)} • ${escape(c.classes.name)}</h2><p>${c.age.n.toLocaleString('pt-BR')} anos ${c.age.provisional?'(idade provisória)':''}</p><div class="power-index"><small>ÍNDICE DE PODER TOTAL • EXPERIMENTAL</small><strong>${pi}/100</strong><span>Prévia matemática, ainda não oficial</span></div></div></div><div class="sheet-section"><h3>Identificação</h3><div class="sheet-grid"><div class="item"><b>Idade</b><span>${c.age.n.toLocaleString('pt-BR')} anos ${c.age.provisional?'(PROVISÓRIA)':''}</span></div><div class="item"><b>Raça</b><span>${escape(c.races.name)} • ${escape(c.races.lifespan||'longevidade não especificada')}</span></div><div class="item"><b>Estado</b><span>Ápice desde a geração — Regra 002</span></div></div>${c.age.provisional?'<p class="muted">Idade gerada usando faixa provisória da Beta.</p>':''}</div><div class="sheet-section"><h3>Resultados sorteados</h3><div class="sheet-grid">${parts.map(([label,x])=>`<div class="item"><b>${label}: ${escape(x.name)}</b><span>${escape(x.rarity||'Raridade não especificada')} • ${escape(x.id)}</span><span>${escape(x.description||x.buffs||'')}</span></div>`).join('')}</div></div><div class="sheet-section"><h3>Nove atributos</h3><div class="stats-grid">${ATTRS.map(a=>`<div class="stat"><b>${c.final[a]}</b><small>${a} • ${c.mod[a]>=0?'+':''}${c.mod[a]}%</small></div>`).join('')}</div><p class="muted">Base 100. Fórmula: atributo final = atributo-base × (1 + soma dos modificadores / 100). Bônus condicionais não entram no atributo-base.</p></div><div class="sheet-section"><h3>Limitações</h3><div class="sheet-grid">${parts.filter(x=>x[1]?.limitation).map(([label,x])=>`<div class="item"><b>${label}</b><span>${escape(x.limitation)}</span></div>`).join('')}</div></div>`;}
let championshipRound=0,championshipWins=0;
function pickCategory(id){const list=catalog.categories[id]||[];return list.length?weightedPick(list):{id:'—',name:'Não definido',rarity:'—',buffs:''};}
function makeBot(){
  const b={powers:pickCategory('powers'),secondary1:pickCategory('secondary1'),secondary2:pickCategory('secondary2'),races:pickCategory('races'),classes:pickCategory('classes'),weapons:pickCategory('weapons')};
  for(const [id] of META){if(ATTR_CATEGORY[id])b[id]=pickCategory(id);}
  b.mod=Object.fromEntries(ATTRS.map(a=>[a,0]));
  [b.races,b.classes,b.powers,b.weapons,b.strength,b.speed,b.resistance,b.handling,b.agility,b.balance,b.intelligence].forEach(x=>{[x?.buffs,x?.debuffs].forEach(t=>{for(const [a,v] of Object.entries(mods(t)))b.mod[a]+=v;});});
  b.final=Object.fromEntries(ATTRS.map(a=>[a,Math.round(100*(1+b.mod[a]/100)*100)/100]));
  b.age={n:rand(18,120),provisional:true};return b;
}
function fighterCard(c,label,score){return `<article class="fighter-card"><div class="fighter-portrait"><img src="${portraitData(c)}" alt="Avatar de ${escape(c.races.name)}"></div><div class="fighter-info"><small>${label}</small><h3>${escape(c.races.name)}</h3><p class="fighter-role">${escape(c.classes.name)} • ${escape(c.weapons.name)}</p><div class="fighter-powers"><b>PODERES</b><span>${escape(c.powers.name)}</span><span>${escape(c.secondary1.name)} / ${escape(c.secondary2.name)}</span></div><div class="fighter-stats"><span>FOR <b>${c.final.FOR}</b></span><span>VEL <b>${c.final.VEL}</b></span><span>RES <b>${c.final.RES}</b></span><span>INT <b>${c.final.INT}</b></span></div><div class="fighter-score">ÍNDICE DE PODER <strong>${score.toFixed(1)}</strong></div></div></article>`;}
function openChampionship(){if(!lastCharacter){$('championshipStatus').innerHTML='Gere um personagem completo nas 13 roletas antes de entrar no campeonato.';return;}$('championshipStatus').innerHTML='<p class="arena-intro">Inscrição confirmada. Prepare seu combatente!</p>';$('championshipPlay').hidden=false;$('championshipPlay').textContent='INICIAR CAMPEONATO';}
function playBotRound(){
  if(!lastCharacter){openChampionship();return;}
  if(championshipRound===0)championshipWins=0;
  const player=lastCharacter,bot=makeBot(),pBase=powerIndex(player),bBase=powerIndex(bot),round=championshipRound+1;
  const pRoll=rand(-8,8),bRoll=rand(-8,8),pScore=Math.max(0,pBase+pRoll),bScore=Math.max(0,bBase+bRoll),won=pScore>=bScore;
  championshipWins=won?championshipWins+1:0;championshipRound=won&&round<3?round:0;
  const outcome=won?(round===3?'CAMPEÃO DO TORNEIO':'VITÓRIA NA RODADA'):'DERROTA';
  const log=won?['Você estudou a postura do adversário e encontrou uma abertura.','Sua combinação de atributos e habilidades fez a diferença.','O adversário recuou; a rodada terminou a seu favor.'][rand(0,2)]:['O BOT leu seus movimentos e controlou o ritmo.','A combinação do adversário levou vantagem nesta rodada.','Seu combatente não conseguiu superar a estratégia rival.'][rand(0,2)];
  $('championshipStatus').innerHTML=`<div class="arena-shell"><div class="arena-topline"><span>ROULETTE LEAGUE</span><b>RODADA ${round} / 3</b></div><div class="arena-versus">${fighterCard(player,'SEU COMBATENTE',pBase)}<div class="versus-mark">VS</div>${fighterCard(bot,'ADVERSÁRIO • BOT',bBase)}</div><div class="arena-scoreboard"><div><small>SUA PONTUAÇÃO</small><strong>${pScore.toFixed(1)}</strong><span>${pBase.toFixed(1)} ${pRoll>=0?'+':''}${pRoll}</span></div><b>×</b><div><small>PONTUAÇÃO DO BOT</small><strong>${bScore.toFixed(1)}</strong><span>${bBase.toFixed(1)} ${bRoll>=0?'+':''}${bRoll}</span></div></div><div class="arena-announcer"><b>${outcome}</b><p>${log}</p><small>${won?(round===3?'Você conquistou o campeonato!':'Mais uma vitória separa você do título.'):'Treine sua combinação e tente novamente.'}</small></div></div>`;
  $('championshipPlay').textContent=won&&round<3?'PRÓXIMA RODADA':'NOVO CAMPEONATO';
}
$('championshipBot')?.addEventListener('click',openChampionship);$('championshipPlay')?.addEventListener('click',playBotRound);$('championshipPlayers')?.addEventListener('click',()=>$('championshipStatus').innerHTML='🚧 <b>Em Desenvolvimento</b><p>O campeonato contra jogadores ainda não está disponível. Não há fila de espera.</p>');
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addHistory(cat,name,rarity){history.unshift({cat,name,rarity,date:new Date().toISOString()});history=history.slice(0,100);localStorage.setItem('rs_beta_history',JSON.stringify(history));renderHistory();}function renderHistory(){if(!history.length){$('history').textContent='Nenhum sorteio registrado.';return;}$('history').innerHTML=history.map(x=>`<div class="history-row"><div><b>${escape(x.name)}</b><small>${escape(x.cat)} • ${new Date(x.date).toLocaleString('pt-BR')}</small></div><em>${escape(x.rarity)}</em></div>`).join('');}
function updateProgress(){const done=META.filter(m=>selected[m[0]]).length;$('progressText').textContent=`${done} de ${META.length} categorias sorteadas`; $('progressBar').style.width=`${done/META.length*100}%`;}
function validate(d){if(d.schema_version!==1||!d.categories)throw Error('JSON incompatível.');for(const [id,, ,n] of META)if(!Array.isArray(d.categories[id])||d.categories[id].length!==n)throw Error(`Categoria ${id}: esperados ${n}, recebidos ${d.categories[id]?.length??0}.`);}
async function load(){try{const r=await fetch('./catalogo-oficial.json');if(!r.ok)throw Error('Falha ao carregar o catálogo.');const d=await r.json();validate(d);catalog=d;$('status').textContent='440/440 CARREGADOS';$('importNote').textContent='Catálogo oficial integrado e validado.';renderGrid();}catch(e){$('status').textContent='ERRO';$('importNote').textContent=e.message;}}
$('start').onclick=()=>$('grid').scrollIntoView({behavior:'smooth'});$('spin').onclick=spinWheel;$('wheelClose').onclick=closeWheel;$('wheelModal').addEventListener('click',e=>{if(e.target===$('wheelModal'))closeWheel();});$('clear').onclick=()=>{if(confirm('Apagar histórico?')){history=[];localStorage.removeItem('rs_beta_history');renderHistory();}};$('file').onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());validate(d);catalog=d;$('status').textContent='CATÁLOGO IMPORTADO';$('importNote').textContent='Catálogo atualizado nesta sessão.';renderGrid();}catch(err){$('importNote').textContent='Erro: '+err.message;}};$('restore').onclick=load;['ageMin','ageMax'].forEach(id=>$(id).onchange=()=>$('ageNote').textContent=`Faixa provisória: ${$('ageMin').value}–${$('ageMax').value} anos.`);
$('export').onclick=()=>{if(!lastCharacter)return;const c=lastCharacter;const lines=['ROULETTE SYSTEM — FICHA BETA',`Idade: ${c.age.n} anos${c.age.provisional?' (provisória)':''}`,`Raça: ${c.races.name}`,`Poder principal: ${c.powers.name}`,`Poder secundário I: ${c.secondary1.name}`,`Poder secundário II: ${c.secondary2.name}`,`Índice de poder experimental: ${powerIndex(c)}/100`,`Classe: ${c.classes.name}`,`Arma: ${c.weapons.name}`,...ATTRS.map(a=>`${a}: ${c.final[a]} (${c.mod[a]}%)`),`Força: ${c.strength.name}`,`Velocidade: ${c.speed.name}`,`Resistência: ${c.resistance.name}`,`Manuseio: ${c.handling.name}`,`Agilidade: ${c.agility.name}`,`Equilíbrio: ${c.balance.name}`,`QI: ${c.intelligence.name}`];const a=document.createElement('a'),url=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'}));a.href=url;a.download='ROULETTE_SYSTEM_FICHA.txt';a.click();URL.revokeObjectURL(url);};
renderGrid();renderHistory();load();window.addEventListener('resize',()=>{if(currentWheelId)drawWheel(currentWheelId);});window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;$('install').hidden=false;});$('install').onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;$('install').hidden=true;}};if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

// Splash screen: reveal the app after assets and initial catalog load.
window.addEventListener('load',()=>{const splash=document.getElementById('splash');if(splash)setTimeout(()=>splash.classList.add('hide'),1900);});
