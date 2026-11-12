(()=>{
  const $=id=>document.getElementById(id);
  const ENDPOINT='quick-action';
  let client=null,matchId=null,pollTimer=null,busy=false,lastMatch=null;
  const say=(message,error=false)=>{const el=$('leagueStatus');if(el){el.textContent=message;el.style.color=error?'#ff9b9b':'#bda9d1';}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ready(){return !!(window.supabase?.createClient&&window.ROULETTE_SUPABASE_URL&&window.ROULETTE_SUPABASE_PUBLISHABLE_KEY);}
  async function session(){const {data,error}=await client.auth.getSession();if(error)throw error;if(!data.session?.access_token)throw new Error('Entre na sua conta na seção Conta e personagens salvos.');return data.session;}
  async function invoke(body){const {data,error}=await client.functions.invoke(ENDPOINT,{body});if(error){let detail=error.message||'Falha ao chamar o servidor.';try{const ctx=error.context;if(ctx?.json){const j=await ctx.json();detail=j.error||detail;}}catch{}throw new Error(detail);}if(data?.error)throw new Error(data.error);return data;}
  async function loadCharacters(){
    try{
      if(!client)throw new Error('Serviço de conta ainda não carregou.');
      const s=await session();
      const {data,error}=await client.from('characters').select('id,name,created_at').eq('user_id',s.user.id).order('created_at',{ascending:false}).limit(30);
      if(error)throw error;
      const select=$('leagueCharacter');
      if(!data?.length){select.innerHTML='<option value="">Nenhum personagem salvo na nuvem</option>';say('Você ainda não tem fichas salvas. Gere um personagem e use “Salvar personagem atual” na seção Conta e personagens salvos.',true);return;}
      select.innerHTML='<option value="">Escolha uma ficha…</option>'+data.map(c=>`<option value="${esc(c.id)}">${esc(c.name||'Personagem sem nome')}</option>`).join('');
      say(`${data.length} ficha(s) encontrada(s). Escolha uma para entrar na fila.`);
    }catch(e){$('leagueCharacter').innerHTML='<option value="">Entre na sua conta primeiro</option>';say(e.message,true);}
  }
  function stopPolling(){if(pollTimer)clearTimeout(pollTimer);pollTimer=null;}
  function schedulePoll(){stopPolling();if(matchId)pollTimer=setTimeout(refreshMatch,3500);}
  function renderMatch(match){
    lastMatch=match;const state=match?.state;
    if(!state){$('leagueBattle').hidden=true;say(match?.status==='pending'?'Você está na fila. Aguardando outro jogador…':'Partida criada. Aguardando o segundo jogador…');return;}
    $('leagueBattle').hidden=false;
    client.auth.getUser().then(({data})=>{
      const userId=data?.user?.id;
      const active=state.activeUserId===userId;
      const finished=state.status==='finished';
      const remaining=Math.max(0,Math.ceil((Date.parse(state.turnDeadlineAt)-Date.now())/1000));
      $('leagueTurn').textContent=finished?(state.winnerUserId===userId?'🏆 VOCÊ VENCEU!':'FIM DE PARTIDA'):(active?`⚔️ SEU TURNO • ${remaining}s`:`⏳ TURNO DO ADVERSÁRIO • ${remaining}s`);
      $('leagueFighters').innerHTML=state.players.map(p=>{
        const pct=Math.max(0,Math.min(100,p.hp/p.maxHp*100));
        return `<article class="league-fighter ${p.userId===state.activeUserId&&!finished?'active':''}"><b>${esc(p.name)} ${p.userId===userId?'(VOCÊ)':''}</b><small>${p.userId===state.activeUserId&&!finished?'Turno atual':p.defending?'Defendendo':'Aguardando'}</small><div class="league-hp"><span style="width:${pct}%"></span></div><small>❤️ ${p.hp} / ${p.maxHp} PV</small><div class="league-energy">⚡ ${p.energy} / ${p.maxEnergy} energia</div></article>`;
      }).join('');
      $('leagueCombatActions').hidden=finished||!active;
      $('leagueLog').innerHTML=(state.log||[]).slice().reverse().map(item=>`<p>${esc(item.message||item.type||'Ação registrada')}</p>`).join('')||'<p>A batalha ainda não começou.</p>';
      if(finished){say(state.winnerUserId===userId?'Vitória! A partida foi finalizada.':'A partida foi finalizada.');stopPolling();}
      else say(active?'Sua vez! Escolha uma ação antes do tempo acabar.':'Partida em andamento. O servidor atualizará o estado automaticamente.');
    });
  }
  async function refreshMatch(){
    if(!matchId||busy)return;
    try{const result=await invoke({op:'get',match_id:matchId});renderMatch(result.match);if(result.match?.status!=='finished')schedulePoll();}
    catch(e){say('Não foi possível atualizar a partida: '+e.message,true);schedulePoll();}
  }
  async function join(){
    if(busy)return;
    const characterId=$('leagueCharacter').value;
    if(!characterId){say('Escolha uma ficha salva na nuvem primeiro.',true);return;}
    busy=true;$('leagueJoin').disabled=true;stopPolling();say('Procurando adversário…');
    try{const result=await invoke({op:'join',character_id:characterId});const q=Array.isArray(result.queue)?result.queue[0]:result.queue;matchId=q?.match_id||result.match?.id;if(!matchId)throw new Error('O servidor não retornou o identificador da partida.');$('leagueBattle').hidden=false;renderMatch(result.match||{status:q?.status||'pending',state:null});schedulePoll();}
    catch(e){say(e.message,true);}
    finally{busy=false;$('leagueJoin').disabled=false;}
  }
  async function action(type){
    if(!matchId||busy)return;
    busy=true;document.querySelectorAll('[data-league-action]').forEach(b=>b.disabled=true);
    try{const result=await invoke({op:'action',match_id:matchId,action:type});renderMatch(result.match);if(result.match?.status!=='finished')schedulePoll();}
    catch(e){say(e.message,true);await refreshMatch();}
    finally{busy=false;document.querySelectorAll('[data-league-action]').forEach(b=>b.disabled=false);}
  }
  window.addEventListener('load',()=>{
    if(!ready()){say('Configuração Supabase não encontrada.',true);return;}
    client=window.supabase.createClient(window.ROULETTE_SUPABASE_URL,window.ROULETTE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    $('leagueRefresh').addEventListener('click',loadCharacters);
    $('leagueJoin').addEventListener('click',join);
    document.querySelectorAll('[data-league-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.leagueAction)));
    client.auth.onAuthStateChange(()=>{loadCharacters();});
    loadCharacters();
  });
})();
