// ROULETTE SYSTEM — Analytics robusto
(() => {
  const PANEL_ID = 'rsAnalyticsPanel';
  let client = null;
  let visitorId = null;

  function ensurePanel() {
    const operatorPanel = document.getElementById('operatorPanel');
    if (!operatorPanel) return false;
    if (document.getElementById(PANEL_ID)) return true;

    const section = document.createElement('section');
    section.id = PANEL_ID;
    section.className = 'panel';
    section.style.cssText = 'display:block!important;visibility:visible!important;margin-top:22px;padding:18px;border:1px solid #8d63c7;border-radius:16px;background:rgba(18,12,29,.96);color:#fff';
    section.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div><small style="color:#c6a5ef;letter-spacing:2px">PAINEL PRIVADO</small><h3 style="margin:5px 0 0;color:#fff">Estatísticas de acesso</h3></div>
        <button id="rsAnalyticsRefresh" class="subtle" type="button">↻ Atualizar</button>
      </div>
      <p id="rsAnalyticsStatus" class="muted">Preparando Analytics…</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px">
        <div style="padding:14px;border-radius:12px;background:#241832"><small>Visitantes únicos</small><div id="rsUnique" style="font-size:28px;font-weight:800;color:#f0d18b">—</div></div>
        <div style="padding:14px;border-radius:12px;background:#241832"><small>Online agora*</small><div id="rsOnline" style="font-size:28px;font-weight:800;color:#a98aff">—</div></div>
        <div style="padding:14px;border-radius:12px;background:#241832"><small>Acessos nas últimas 24h</small><div id="rs24h" style="font-size:28px;font-weight:800;color:#fff">—</div></div>
        <div style="padding:14px;border-radius:12px;background:#241832"><small>Acessos hoje</small><div id="rsToday" style="font-size:28px;font-weight:800;color:#fff">—</div></div>
      </div>
      <small style="display:block;margin-top:12px;color:#9c91aa">*Online agora = navegador com atividade nos últimos 5 minutos.</small>`;
    operatorPanel.appendChild(section);
    document.getElementById('rsAnalyticsRefresh').addEventListener('click', loadStats);
    return true;
  }

  function status(message) {
    const el = document.getElementById('rsAnalyticsStatus');
    if (el) el.textContent = message;
  }

  function initClient() {
    const url = window.ROULETTE_SUPABASE_URL;
    const key = window.ROULETTE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) { status('Erro: configuração pública do Supabase não foi carregada.'); return false; }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') { status('Erro: biblioteca do Supabase não carregou. Verifique a conexão e recarregue o jogo.'); return false; }
    if (!client) client = window.supabase.createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
    return true;
  }

  async function ping() {
    if (!client) return;
    try {
      const { error } = await client.from('rs_visits').insert({ visitor_id: visitorId });
      if (error) console.warn('RS Analytics ping:', error.message);
    } catch (e) { console.warn('RS Analytics ping:', e); }
  }

  async function loadStats() {
    if (!initClient()) return;
    status('Consultando estatísticas…');
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) { status('Entre na conta autorizada de operador para consultar as estatísticas.'); return; }
      const { data, error } = await client.rpc('rs_operator_stats');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('A função não retornou estatísticas.');
      document.getElementById('rsUnique').textContent = Number(row.unique_visitors || 0).toLocaleString('pt-BR');
      document.getElementById('rsOnline').textContent = Number(row.online_now || 0).toLocaleString('pt-BR');
      document.getElementById('rs24h').textContent = Number(row.visits_24h || 0).toLocaleString('pt-BR');
      document.getElementById('rsToday').textContent = Number(row.visits_today || 0).toLocaleString('pt-BR');
      status('Atualizado às ' + new Date().toLocaleTimeString('pt-BR'));
    } catch (e) { status('Erro ao consultar: ' + (e?.message || String(e))); }
  }

  function start() {
    if (!ensurePanel()) return false;
    if (!initClient()) return true;
    const stored = localStorage.getItem('rs_analytics_visitor_v1');
    visitorId = stored || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    if (!stored) localStorage.setItem('rs_analytics_visitor_v1', visitorId);
    ping();
    if (!window.__rsAnalyticsHeartbeat) {
      window.__rsAnalyticsHeartbeat = true;
      setInterval(() => { if (document.visibilityState === 'visible') ping(); }, 60000);
    }
    loadStats();
    return true;
  }

  // Tenta agora, após DOM pronto e sempre que a Central do Operador for montada.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  const observer = new MutationObserver(() => {
    if (!document.getElementById(PANEL_ID)) start();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
