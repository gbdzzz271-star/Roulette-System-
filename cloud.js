(()=>{
  const $ = id => document.getElementById(id);
  const status = (message, error=false) => { $('cloudStatus').textContent=message; $('cloudStatus').style.color=error?'#ff9b9b':'#b2a6bd'; };
  let client=null, currentUser=null;
  const ready=()=>!!(window.supabase?.createClient && window.ROULETTE_SUPABASE_URL && window.ROULETTE_SUPABASE_PUBLISHABLE_KEY);
  function setSignedIn(user){
    currentUser=user||null;
    $('cloudLogout').hidden=!user;
    $('cloudSave').disabled=!user || !window.lastCharacter;
    $('cloudSignup').hidden=!!user;
    $('cloudLogin').hidden=!!user;
    $('cloudEmail').disabled=!!user;
    $('cloudPassword').disabled=!!user;
    if(user){$('cloudCharacters').textContent='Carregando seus personagens…';loadCharacters();}
    else $('cloudCharacters').textContent='Entre para carregar seus personagens salvos.';
  }
  async function init(){
    if(!ready()){status('Não foi possível carregar o serviço de autenticação. Verifique sua conexão.',true);return;}
    client=window.supabase.createClient(window.ROULETTE_SUPABASE_URL,window.ROULETTE_SUPABASE_PUBLISHABLE_KEY);
    const {data,error}=await client.auth.getSession();
    if(error){status('Erro ao verificar sessão: '+error.message,true);return;}
    setSignedIn(data.session?.user||null);
    status(data.session?.user?'Conta conectada.':'Conexão pronta. Crie sua conta ou entre.');
    client.auth.onAuthStateChange((_event,session)=>{setSignedIn(session?.user||null);status(session?.user?'Conta conectada.':'Você saiu da conta.');});
  }
  async function signup(){
    const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
    if(!email||password.length<6){status('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.',true);return;}
    status('Criando sua conta…');
    const {data,error}=await client.auth.signUp({email,password,options:{data:{username:email.split('@')[0]}}});
    if(error){status('Não foi possível criar a conta: '+error.message,true);return;}
    if(data.session){status('Conta criada e conectada!');setSignedIn(data.user);}
    else status('Cadastro iniciado! Confira seu e-mail para confirmar a conta e depois faça login.');
  }
  async function login(){
    const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
    if(!email||!password){status('Preencha e-mail e senha.',true);return;}
    status('Entrando…');
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error){status('Falha no login: '+error.message,true);return;}
    setSignedIn(data.user);status('Login realizado com sucesso!');
  }
  async function logout(){const {error}=await client.auth.signOut();if(error){status('Erro ao sair: '+error.message,true);return;}setSignedIn(null);status('Você saiu da conta.');}
  async function saveCharacter(){
    const c=window.lastCharacter;
    if(!currentUser){status('Entre na sua conta primeiro.',true);return;}
    if(!c){status('Gere um personagem completo antes de salvar.',true);return;}
    const name=[c.titles?.name,c.races?.name].filter(Boolean).join(' — ')||'Personagem sem título';
    $('cloudSave').disabled=true;status('Salvando personagem na nuvem…');
    const {error}=await client.from('characters').insert({user_id:currentUser.id,name,character_data:c});
    $('cloudSave').disabled=false;
    if(error){status('Não foi possível salvar: '+error.message,true);return;}
    status('Personagem salvo na nuvem!');await loadCharacters();
  }
  async function loadCharacters(){
    if(!currentUser)return;
    const {data,error}=await client.from('characters').select('id,name,created_at,character_data').order('created_at',{ascending:false}).limit(30);
    if(error){$('cloudCharacters').textContent='Erro ao carregar personagens: '+error.message;return;}
    if(!data?.length){$('cloudCharacters').textContent='Você ainda não salvou personagens.';return;}
    $('cloudCharacters').innerHTML='<h3>Seus personagens na nuvem</h3>'+data.map(row=>`<div class="cloud-character"><div><b>${safe(row.name)}</b><small>${new Date(row.created_at).toLocaleString('pt-BR')}</small></div><button class="subtle" data-load-character="${row.id}">Abrir ficha</button></div>`).join('');
    $('cloudCharacters').querySelectorAll('[data-load-character]').forEach(button=>button.addEventListener('click',()=>{
      const row=data.find(x=>x.id===button.dataset.loadCharacter);if(!row?.character_data)return;
      window.lastCharacter=row.character_data;
      if(typeof window.renderSheet==='function')window.renderSheet(row.character_data);
      $('export').disabled=false;$('sheet').scrollIntoView({behavior:'smooth',block:'start'});
      $('cloudSave').disabled=false;status('Ficha carregada da nuvem.');
    }));
  }
  function safe(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  window.addEventListener('load',()=>{
    $('cloudSignup').addEventListener('click',signup);$('cloudLogin').addEventListener('click',login);$('cloudLogout').addEventListener('click',logout);$('cloudSave').addEventListener('click',saveCharacter);
    init();
  });
  // O app.js mantém a ficha em escopo global via estes acessores.
  Object.defineProperty(window,'lastCharacter',{get:()=>window.__rsLastCharacter||null,set:v=>{window.__rsLastCharacter=v;}});
})();