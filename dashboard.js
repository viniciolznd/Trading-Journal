window.JournalDashboard = (() => {
  const fmtMoney = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));
  const signedPnl = t => {
    const value = Math.abs(Number(t?.pnl || 0));
    if (t?.result === "LOSS") return -value;
    if (t?.result === "BE") return 0;
    return value;
  };
  const toLocalDate = dateStr => new Date(`${dateStr}T00:00:00`);
  const iso = d => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const y = x.getFullYear();
    const m = String(x.getMonth()+1).padStart(2,"0");
    const day = String(x.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };
  const monday = d => {
    const x = new Date(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1-day;
    x.setDate(x.getDate()+diff);
    x.setHours(0,0,0,0);
    return x;
  };

  let calendarDate = new Date();
  let selectedDate = iso(new Date());

  function setMoneyTone(el, value) {
    el.classList.remove("positive-text","negative-text");
    if (Number(value) > 0) el.classList.add("positive-text");
    if (Number(value) < 0) el.classList.add("negative-text");
  }

  function aggregateDay(trades, date) {
    const items = trades.filter(t => t.trade_date === date);
    return { items, pnl: items.reduce((s,t)=>s+signedPnl(t),0) };
  }

  function renderStats(state) {
    const trades = state.trades;
    const payouts = state.payouts;
    const accounts = state.accounts;

    const net = trades.reduce((s,t)=>s+signedPnl(t),0);
    const wins = trades.filter(t=>t.result==="WIN").length;
    const losses = trades.filter(t=>t.result==="LOSS").length;
    const be = trades.filter(t=>t.result==="BE").length;
    const decided = wins + losses;
    const winRate = decided ? (wins/decided)*100 : 0;

    const now = new Date();
    const today = iso(now);
    const weekStart = monday(now);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
    const weekPnl = trades.filter(t => {
      const d = toLocalDate(t.trade_date);
      return d >= weekStart && d <= weekEnd;
    }).reduce((s,t)=>s+signedPnl(t),0);
    const todayAgg = aggregateDay(trades,today);
    const payoutTotal = payouts.reduce((s,p)=>s+Number(p.amount||0),0);
    const initialTotal = accounts.reduce((s,a)=>s+Number(a.initial_balance||0),0);
    const equity = initialTotal + net - payoutTotal;

    const pairs = [
      ["statNetPnl", net], ["statWeek", weekPnl], ["statToday", todayAgg.pnl],
      ["statEquity", equity], ["statPayouts", payoutTotal]
    ];
    pairs.forEach(([id,val]) => {
      const el = document.getElementById(id);
      el.textContent = fmtMoney(val);
      if (["statNetPnl","statWeek","statToday"].includes(id)) setMoneyTone(el,val);
    });

    document.getElementById("statWinRate").textContent = `${winRate.toFixed(1)}%`;
    document.getElementById("statRecord").textContent = `${wins}W · ${losses}L · ${be}BE`;
    document.getElementById("statTradeLimit").textContent = `${todayAgg.items.length} / 2 trades`;

    const addBtn = document.getElementById("openTradeModal");
    addBtn.disabled = todayAgg.items.length >= 2;
    addBtn.title = addBtn.disabled ? "Daily limit reached for today. You can still edit existing trades." : "";
  }

  function renderCalendar(state) {
    const trades = state.trades;
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    document.getElementById("calendarTitle").textContent = new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric"}).format(calendarDate);

    const first = new Date(year,month,1);
    const last = new Date(year,month+1,0);
    const leading = (first.getDay()+6)%7;
    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";

    for (let i=0;i<leading;i++) {
      const cell=document.createElement("div"); cell.className="calendar-day empty"; grid.appendChild(cell);
    }

    let monthPnl = 0;
    for (let day=1; day<=last.getDate(); day++) {
      const date = iso(new Date(year,month,day));
      const agg = aggregateDay(trades,date);
      monthPnl += agg.pnl;

      const btn = document.createElement("button");
      btn.className = "calendar-day";
      if (agg.pnl>0) btn.classList.add("positive");
      if (agg.pnl<0) btn.classList.add("negative");
      if (date===selectedDate) btn.classList.add("selected");
      btn.innerHTML = `
        <span class="day-number">${day}</span>
        ${agg.items.length ? `<span class="day-pnl ${agg.pnl>=0?"positive":"negative"}">${fmtMoney(agg.pnl)}</span><span class="day-trades">${agg.items.length} trade${agg.items.length===1?"":"s"}</span>` : ""}
      `;
      btn.addEventListener("click",()=> {
        selectedDate=date;
        renderCalendar(state);
        renderTradeList(state);
      });
      grid.appendChild(btn);
    }

    const mt = document.getElementById("monthlyPnl");
    mt.textContent = fmtMoney(monthPnl);
    setMoneyTone(mt, monthPnl);
    renderWeeks(state, year, month);
  }

  function renderWeeks(state, year, month) {
    const first = new Date(year,month,1);
    const last = new Date(year,month+1,0);
    let start = monday(first);
    const box = document.getElementById("weekSummary");
    box.innerHTML = "";
    let weekNo = 1;
    while (start <= last) {
      const end = new Date(start); end.setDate(end.getDate()+6);
      const items = state.trades.filter(t => {
        const d = toLocalDate(t.trade_date);
        return d >= start && d <= end && d.getMonth()===month && d.getFullYear()===year;
      });
      const pnl = items.reduce((s,t)=>s+signedPnl(t),0);
      const div=document.createElement("div"); div.className="week-box";
      div.innerHTML=`<span>Week ${weekNo}</span><strong class="${pnl>0?"positive-text":pnl<0?"negative-text":""}">${fmtMoney(pnl)}</strong><small>${items.length} trade${items.length===1?"":"s"}</small>`;
      box.appendChild(div);
      start = new Date(start); start.setDate(start.getDate()+7); weekNo++;
    }
  }

  function renderTradeList(state) {
    const {items,pnl}=aggregateDay(state.trades,selectedDate);
    document.getElementById("selectedDayTitle").textContent = `Trades for ${new Intl.DateTimeFormat("en-US",{month:"long",day:"numeric",year:"numeric"}).format(toLocalDate(selectedDate))}`;
    const p = document.getElementById("selectedDayPnl");
    p.textContent=fmtMoney(pnl);
    p.className=`pill ${pnl>0?"positive":pnl<0?"negative":"neutral"}`;

    const list=document.getElementById("tradeList");
    if (!items.length) {
      list.innerHTML='<div class="empty-state">No trades recorded for this day.</div>';
      return;
    }
    list.innerHTML="";
    items.sort((a,b)=>(a.trade_time||"").localeCompare(b.trade_time||"")).forEach(t=>{
      const account=state.accounts.find(a=>a.id===t.account_id);
      const row=document.createElement("div"); row.className="trade-row";
      const displayPnl = signedPnl(t);
      row.innerHTML=`
        <div>
          <div class="trade-main">
            <span class="badge ${t.result.toLowerCase()}">${t.result}</span>
            <strong class="${displayPnl>0?"positive-text":displayPnl<0?"negative-text":""}">${fmtMoney(displayPnl)}</strong>
            <span class="badge be">${t.direction}</span>
            <span class="badge be">${t.session}</span>
            ${t.rr!=null ? `<span class="badge be">${Number(t.rr).toFixed(1)}R</span>` : ""}
          </div>
          <div class="trade-meta">${t.instrument} · ${account?.account_name || "No account"} · ${t.trade_time ? t.trade_time.slice(0,5) : "No time"}${t.notes ? ` · ${escapeHtml(t.notes).slice(0,120)}`:""}</div>
        </div>
        <div class="trade-actions">
          <button class="mini-btn" data-action="edit" data-id="${t.id}">Edit</button>
          <button class="mini-btn" data-action="delete" data-id="${t.id}">Delete</button>
        </div>`;
      row.querySelector('[data-action="edit"]').addEventListener("click",()=>window.JournalTrades.openEdit(t.id));
      row.querySelector('[data-action="delete"]').addEventListener("click",()=>window.JournalTrades.deleteTrade(t.id));
      list.appendChild(row);
    });
  }

  function renderConfluences(state) {
    const root=document.getElementById("confluenceStats");
    const tradeById=Object.fromEntries(state.trades.map(t=>[t.id,t]));
    const groups={};
    state.tradeConfluences.forEach(tc=>{
      const trade=tradeById[tc.trade_id];
      const conf=state.confluences.find(c=>c.id===tc.confluence_id);
      if (!trade || !conf) return;
      if (!groups[conf.name]) groups[conf.name]={name:conf.name,wins:0,losses:0,be:0,pnl:0,total:0};
      const g=groups[conf.name]; g.total++; g.pnl+=signedPnl(trade);
      if (trade.result==="WIN") g.wins++;
      else if (trade.result==="LOSS") g.losses++;
      else g.be++;
    });
    const rows=Object.values(groups).sort((a,b)=>b.total-a.total);
    if (!rows.length) { root.innerHTML='<div class="empty-state">Add confluences to trades to see performance here.</div>'; return; }
    root.innerHTML="";
    rows.slice(0,12).forEach(g=>{
      const decided=g.wins+g.losses;
      const wr=decided ? (g.wins/decided)*100 : 0;
      const div=document.createElement("div"); div.className="metric-row";
      div.innerHTML=`<div><strong>${escapeHtml(g.name)}</strong><small>${g.total} trades · ${wr.toFixed(0)}% win rate</small></div><strong class="${g.pnl>0?"positive-text":g.pnl<0?"negative-text":""}">${fmtMoney(g.pnl)}</strong>`;
      root.appendChild(div);
    });
  }

  function escapeHtml(s="") {
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  function renderAll(state) {
    renderStats(state);
    renderCalendar(state);
    renderTradeList(state);
    renderConfluences(state);
    window.JournalCharts.renderAll(state.trades);
  }

  function initNav(state) {
    document.getElementById("prevMonth").onclick=()=>{ calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1); renderCalendar(state); };
    document.getElementById("nextMonth").onclick=()=>{ calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1); renderCalendar(state); };
    document.getElementById("todayBtn").onclick=()=>{ calendarDate=new Date(); selectedDate=iso(new Date()); renderCalendar(state); renderTradeList(state); };
  }

  return { renderAll, initNav, fmtMoney, signedPnl, iso, getSelectedDate:()=>selectedDate, setSelectedDate:d=>selectedDate=d };
})();
