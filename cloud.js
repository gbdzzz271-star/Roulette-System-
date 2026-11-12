(()=>{
  const $ = id => document.getElementById(id);
  const status = (message, error=false) => {
    const el=$('cloudStatus'); if(!el) return;
    el.textContent=message; el.style.color=error?'#ff9b9b':'#b2a6bd';
  };
  let client=null, currentUser=null, busy=false;
  const ready=()=>!!(window.supabase?.createClient && window.ROULETTE_SUPABASE_URL && window.ROULETTE_SUPABASE_PUBLISHABLE_KEY);
  function setSignedIn(user){
    currentUser=user||null;
    $('cloudLogout').hidden=!user;
    $('cloudSave').disabled=!user || !window.lastCharacter;
    $('cloudSignup').hidden=!!user;
    $('cloudLogin').hidden=!!user;
    $('cloudEmail').disabled=!!user;
    $('cloudPassword').disabled=!!user;
    if(user){$('cloudCharacters').textContent='Carregando seus personagens…';}
    else $('cloudCharacters').textContent='Entre para carregar seus personagens salvos.';
  }
  async function getValidSession(){
    let result=await client.auth.getSession();
    if(result.error) throw result.error;
    let session=result.data.session;
    if(!session?.access_token){
      const refreshed=await client.auth.refreshSession();
      if(refreshed.error) throw refreshed.error;
      session=refreshed.data.session;
    }
    if(!session?.access_token || !session.user?.id) throw new Error('Sessão sem token válido. Saia e entre novamente.');
    const {data:{user},error}=await client.auth.getUser(session.access_token);
    if(error) throw error;
    if(!user?.id || user.id!==session.user.id) throw new Error('A sessão não corresponde ao usuário conectado. Entre novamente.');
    currentUser=user;
    return session;
  }
  async function restCharacters(method, session, body){
    const url=window.ROULETTE_SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/characters';
    const headers={
      'apikey':window.ROULETTE_SUPABASE_PUBLISHABLE_KEY,
      'Authorization':'Bearer '+session.access_token,
      'Accept':'application/json'
    };
    if(method==='POST'){
      headers['Content-Type']='application/json';
      headers['Prefer']='return=minimal';
    }
    const response=await fetch(method==='GET'?url+'?select=id,name,created_at,character_data&user_id=eq.'+encodeURIComponent(session.user.id)+'&order=created_at.desc&limit=30':url,{
      method,headers,body:method==='POST'?JSON.stringify(body):undefined,cache:'no-store'
    });
    const text=await response.text();
    let payload=null; try{payload=text?JSON.parse(text):null;}catch{}
    if(!response.ok){
      const message=payload?.message||payload?.hint||payload?.details||('HTTP '+response.status);
      throw new Error(message+' (HTTP '+response.status+')');
    }
    return payload;
  }
  async function init(){
    if(!ready()){status('Não foi possível carregar o serviço de autenticação. Verifique sua conexão.',true);return;}
    client=window.supabase.createClient(window.ROULETTE_SUPABASE_URL,window.ROULETTE_SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data,error}=await client.auth.getSession();
    if(error){status('Erro ao verificar sessão: '+error.message,true);return;}
    setSignedIn(data.session?.user||null);
    status(data.session?.user?'Conta conectada.':'Conexão pronta. Crie sua conta ou entre.');
    client.auth.onAuthStateChange((event,session)=>{
      setSignedIn(session?.user||null);
      status(session?.user?'Conta conectada.':'Você saiu da conta.');
      if(session?.user && event!=='INITIAL_SESSION') setTimeout(()=>loadCharacters(),0);
    });
    if(data.session?.user) loadCharacters();
  }
  async function signup(){
    const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
    if(!email||password.length<6){status('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.',true);return;}
    status('Criando sua conta…');
    const {data,error}=await client.auth.signUp({email,password,options:{data:{username:email.split('@')[0]}}});
    if(error){status('Não foi possível criar a conta: '+error.message,true);return;}
    if(data.session){setSignedIn(data.user);status('Conta criada e conectada!');loadCharacters();}
    else status('Cadastro iniciado! Confira seu e-mail para confirmar a conta e depois faça login.');
  }
  async function login(){
    const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
    if(!email||!password){status('Preencha e-mail e senha.',true);return;}
    status('Entrando…');
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error){status('Falha no login: '+error.message,true);return;}
    setSignedIn(data.user);status('Login realizado com sucesso!');await loadCharacters();
  }
  async function logout(){
    const {error}=await client.auth.signOut();
    if(error){status('Erro ao sair: '+error.message,true);return;}
    setSignedIn(null);status('Você saiu da conta.');
  }
  async function saveCharacter(){
    if(busy)return;
    const c=window.lastCharacter;
    if(!currentUser){status('Entre na sua conta primeiro.',true);return;}
    if(!c){status('Gere um personagem completo antes de salvar.',true);return;}
    busy=true;$('cloudSave').disabled=true;status('Salvando personagem na nuvem…');
    try{
      const session=await getValidSession();
      const name=[c.titles?.name,c.races?.name].filter(Boolean).join(' — ')||'Personagem sem título';
      await restCharacters('POST',session,{user_id:session.user.id,name,character_data:c});
      status('Personagem salvo na nuvem!');await loadCharacters();
    }catch(error){status('Não foi possível salvar: '+error.message,true);}
    finally{busy=false;$('cloudSave').disabled=!currentUser||!window.lastCharacter;}
  }
  async function loadCharacters(){
    if(!currentUser||busy)return;
    $('cloudCharacters').textContent='Verificando sessão e carregando personagens…';
    try{
      const session=await getValidSession();
      const data=await restCharacters('GET',session);
      if(!Array.isArray(data)||!data.length){$('cloudCharacters').textContent='Você ainda não salvou personagens.';return;}
      $('cloudCharacters').innerHTML='<h3>Seus personagens na nuvem</h3>'+data.map(row=>`<div class="cloud-character"><div><b>${safe(row.name)}</b><small>${new Date(row.created_at).toLocaleString('pt-BR')}</small></div><button class="subtle" data-load-character="${safe(row.id)}">Abrir ficha</button></div>`).join('');
      $('cloudCharacters').querySelectorAll('[data-load-character]').forEach(button=>button.addEventListener('click',()=>{
        const row=data.find(x=>x.id===button.dataset.loadCharacter);if(!row?.character_data)return;
        window.lastCharacter=row.character_data;
        if(typeof window.renderSheet==='function')window.renderSheet(row.character_data);
        $('export').disabled=false;$('sheet').scrollIntoView({behavior:'smooth',block:'start'});
        $('cloudSave').disabled=false;status('Ficha carregada da nuvem.');
      }));
    }catch(error){$('cloudCharacters').textContent='Erro ao carregar personagens: '+error.message;}
  }
  function safe(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  window.addEventListener('load',()=>{
    $('cloudSignup').addEventListener('click',signup);$('cloudLogin').addEventListener('click',login);$('cloudLogout').addEventListener('click',logout);$('cloudSave').addEventListener('click',saveCharacter);
    init();
  });
  Object.defineProperty(window,'lastCharacter',{get:()=>window.__rsLastCharacter||null,set:v=>{window.__rsLastCharacter=v;}});
})();
