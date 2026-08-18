window.JournalApp = (() => {
  const state = {
    user:null, trades:[], accounts:[], payouts:[], confluences:[], tradeConfluences:[], screenshots:[]
  };

  async function fetchAll() {
    const uid=state.user.id;
    const [trades,accounts,payouts,confluences,tcs,screens] = await Promise.all([
      sb.from("trades").select("*").eq("user_id",uid).order("trade_date",{ascending:true}),
      sb.from("trading_accounts").select("*").eq("user_id",uid).order("created_at",{ascending:true}),
      sb.from("payouts").select("*").eq("user_id",uid).order("payout_date",{ascending:false}),
      sb.from("confluences").select("*").order("category").order("name"),
      sb.from("trade_confluences").select("*"),
      sb.from("trade_screenshots").select("*").eq("user_id",uid)
    ]);
    const results=[trades,accounts,payouts,confluences,tcs,screens];
    const bad=results.find(r=>r.error);
    if(bad) throw bad.error;

    state.trades=trades.data||[];
    state.accounts=accounts.data||[];
    state.payouts=payouts.data||[];
    state.confluences=confluences.data||[];
    state.tradeConfluences=tcs.data||[];
    state.screenshots=screens.data||[];
  }

  async function reloadData() {
    try {
      await fetchAll();
      window.JournalTrades.bindState(state);
      window.JournalTrades.populateAccountSelects();
      window.JournalTrades.populateConfluences();
      renderAccounts();
      renderPayouts();
      window.JournalDashboard.renderAll(state);
    } catch(err) {
      console.error(err);
      toast(err.message || "Could not load journal data.",true);
    }
  }

  function renderAccounts() {
    const root=document.getElementById("accountsGrid");
    if(!state.accounts.length) {
      root.innerHTML='<div class="card empty-state">No accounts yet. Create your first Apex, FundedNext, Lucid or personal account.</div>';
      return;
    }
    root.innerHTML="";
    state.accounts.forEach(a=>{
      const accountTrades=state.trades.filter(t=>t.account_id===a.id);
      const pnl=accountTrades.reduce((s,t)=>s+Number(t.pnl||0),0);
      const paid=state.payouts.filter(p=>p.account_id===a.id).reduce((s,p)=>s+Number(p.amount||0),0);
      const equity=Number(a.initial_balance||0)+pnl-paid;
      const card=document.createElement("article"); card.className="account-card";
      card.innerHTML=`
        <span class="firm">${escapeHtml(a.prop_firm || "Other")}</span>
        <h3>${escapeHtml(a.account_name)}</h3>
        <div class="account-numbers">
          <div><span>Initial</span><strong>${JournalDashboard.fmtMoney(a.initial_balance)}</strong></div>
          <div><span>Current equity</span><strong>${JournalDashboard.fmtMoney(equity)}</strong></div>
          <div><span>Trading P&L</span><strong class="${pnl>0?"positive-text":pnl<0?"negative-text":""}">${JournalDashboard.fmtMoney(pnl)}</strong></div>
          <div><span>Payouts</span><strong>${JournalDashboard.fmtMoney(paid)}</strong></div>
        </div>
        <footer><button class="mini-btn">Delete</button></footer>`;
      card.querySelector("button").onclick=()=>JournalTrades.deleteAccount(a.id);
      root.appendChild(card);
    });
  }

  function renderPayouts() {
    const root=document.getElementById("payoutList");
    if(!state.payouts.length) { root.innerHTML='<div class="empty-state">No payouts recorded yet.</div>'; return; }
    root.innerHTML="";
    state.payouts.forEach(p=>{
      const a=state.accounts.find(x=>x.id===p.account_id);
      const row=document.createElement("div"); row.className="trade-row";
      row.innerHTML=`
        <div>
          <div class="trade-main"><span class="badge win">PAYOUT</span><strong class="positive-text">${JournalDashboard.fmtMoney(p.amount)}</strong></div>
          <div class="trade-meta">${escapeHtml(a?.account_name||"Unknown account")} · ${p.payout_date}${p.notes?` · ${escapeHtml(p.notes)}`:""}</div>
        </div>
        <div class="trade-actions"><button class="mini-btn">Delete</button></div>`;
      row.querySelector("button").onclick=()=>JournalTrades.deletePayout(p.id);
      root.appendChild(row);
    });
  }

  function showPanel(name) {
    document.querySelectorAll(".panel-view").forEach(x=>x.hidden=true);
    document.getElementById(`${name}Panel`).hidden=false;
    document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===name));
  }
  window.showPanel=showPanel;

  function bindUI() {
    document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>showPanel(btn.dataset.view)));
    document.getElementById("openTradeModal").onclick=()=>JournalTrades.openNew();
    document.getElementById("openAccountModal").onclick=()=>document.getElementById("accountModal").showModal();
    document.getElementById("openPayoutModal").onclick=()=>{
      JournalTrades.populateAccountSelects();
      document.getElementById("payoutDate").value=JournalDashboard.iso(new Date());
      document.getElementById("payoutModal").showModal();
    };
    document.querySelectorAll(".close-modal").forEach(btn=>btn.onclick=()=>document.getElementById(btn.dataset.close).close());
    document.getElementById("tradeForm").addEventListener("submit",JournalTrades.saveTrade);
    document.getElementById("accountForm").addEventListener("submit",JournalTrades.saveAccount);
    document.getElementById("payoutForm").addEventListener("submit",JournalTrades.savePayout);
    JournalDashboard.initNav(state);
  }

  async function onSession(session) {
    if(!session?.user) {
      state.user=null;
      document.getElementById("appView").hidden=true;
      document.getElementById("loginView").hidden=false;
      return;
    }
    state.user=session.user;
    document.getElementById("loginView").hidden=true;
    document.getElementById("appView").hidden=false;
    document.getElementById("userEmail").textContent=session.user.email || "";
    const hour=new Date().getHours();
    const greet=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
    document.getElementById("greeting").textContent=`${greet} · My Journal`;
    JournalTrades.bindState(state);
    await reloadData();
  }

  async function init() {
    JournalAuth.init();
    bindUI();
    const {data:{session}}=await sb.auth.getSession();
    await onSession(session);
    sb.auth.onAuthStateChange(async (_event,session)=>{ await onSession(session); });
  }

  function escapeHtml(s="") {
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  return { init, reloadData, state };
})();

function toast(message,isError=false) {
  const el=document.getElementById("toast");
  el.textContent=message;
  el.classList.toggle("error",isError);
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>el.classList.remove("show"),3200);
}

window.addEventListener("DOMContentLoaded",()=>JournalApp.init());
