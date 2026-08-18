window.JournalTrades = (() => {
  let state;

  const $ = id => document.getElementById(id);
  const numOrNull = id => $(id).value === "" ? null : Number($(id).value);
  const textOrNull = id => $(id).value.trim() === "" ? null : $(id).value.trim();

  function bindState(s) { state = s; }

  function populateAccountSelects() {
    const selects=[$("tradeAccount"),$("payoutAccount")];
    selects.forEach(sel=>{
      sel.innerHTML="";
      if (!state.accounts.length) {
        sel.innerHTML='<option value="">Create an account first</option>';
        return;
      }
      state.accounts.filter(a=>a.active!==false).forEach(a=>{
        const o=document.createElement("option"); o.value=a.id; o.textContent=`${a.account_name} · ${a.prop_firm}`; sel.appendChild(o);
      });
    });
  }

  function populateConfluences() {
    const root=$("confluenceOptions"); root.innerHTML="";
    state.confluences.forEach(c=>{
      const label=document.createElement("label"); label.className="chip-check";
      label.innerHTML=`<input type="checkbox" value="${c.id}"><span>${escapeHtml(c.name)}</span>`;
      root.appendChild(label);
    });
  }

  function openNew() {
    if (!state.accounts.length) {
      toast("Create a trading account first.", true);
      showPanel("accounts");
      return;
    }
    $("tradeForm").reset();
    $("tradeId").value="";
    $("tradeInstrument").value="MNQ";
    $("tradeDate").value=window.JournalDashboard.getSelectedDate() || window.JournalDashboard.iso(new Date());
    $("tradeContracts").value=1;
    $("tradeModalTitle").textContent="Add Trade";
    $("existingScreenshots").innerHTML="";
    populateAccountSelects();
    populateConfluences();
    $("tradeFormError").hidden=true;
    $("tradeModal").showModal();
  }

  async function openEdit(id) {
    const trade=state.trades.find(t=>t.id===id); if(!trade) return;
    $("tradeForm").reset(); populateAccountSelects(); populateConfluences();
    $("tradeId").value=trade.id;
    $("tradeDate").value=trade.trade_date;
    $("tradeTime").value=trade.trade_time ? trade.trade_time.slice(0,5) : "";
    $("tradeAccount").value=trade.account_id || "";
    $("tradeInstrument").value=trade.instrument;
    $("tradeSession").value=trade.session;
    $("tradeDirection").value=trade.direction;
    $("tradeResult").value=trade.result;
    $("tradePnl").value=trade.pnl;
    $("tradeContracts").value=trade.contracts ?? 1;
    $("tradePoints").value=trade.points ?? "";
    $("tradeEntry").value=trade.entry_price ?? "";
    $("tradeExit").value=trade.exit_price ?? "";
    $("tradeStop").value=trade.stop_loss ?? "";
    $("tradeTarget").value=trade.take_profit ?? "";
    $("tradeRisk").value=trade.risk_amount ?? "";
    $("tradeRR").value=trade.rr ?? "";
    $("tradeNotes").value=trade.notes ?? "";
    state.tradeConfluences.filter(x=>x.trade_id===id).forEach(x=>{
      const cb=document.querySelector(`#confluenceOptions input[value="${x.confluence_id}"]`);
      if(cb) cb.checked=true;
    });
    $("tradeModalTitle").textContent="Edit Trade";
    await renderExistingScreenshots(id);
    $("tradeModal").showModal();
  }

  async function renderExistingScreenshots(tradeId) {
    const root=$("existingScreenshots"); root.innerHTML="";
    const shots=state.screenshots.filter(s=>s.trade_id===tradeId);
    for (const shot of shots) {
      const { data, error } = await sb.storage.from("trade-screenshots").createSignedUrl(shot.storage_path, 3600);
      if(error) continue;
      const item=document.createElement("div"); item.className="screenshot-item";
      item.innerHTML=`<a href="${data.signedUrl}" target="_blank" rel="noopener"><img src="${data.signedUrl}" alt="Trade screenshot"></a><button type="button" aria-label="Delete screenshot">×</button>`;
      item.querySelector("button").onclick=()=>deleteScreenshot(shot.id,shot.storage_path,tradeId);
      root.appendChild(item);
    }
  }

  async function deleteScreenshot(id,path,tradeId) {
    if(!confirm("Delete this screenshot?")) return;
    await sb.storage.from("trade-screenshots").remove([path]);
    const {error}=await sb.from("trade_screenshots").delete().eq("id",id);
    if(error) return toast(error.message,true);
    state.screenshots=state.screenshots.filter(s=>s.id!==id);
    renderExistingScreenshots(tradeId);
    toast("Screenshot deleted.");
  }

  function getCheckedConfluences() {
    return [...document.querySelectorAll("#confluenceOptions input:checked")].map(x=>Number(x.value));
  }

  async function saveTrade(e) {
    e.preventDefault();
    $("tradeFormError").hidden=true;
    const id=$("tradeId").value || null;
    const date=$("tradeDate").value;

    if(!id) {
      const count=state.trades.filter(t=>t.trade_date===date).length;
      if(count>=2) {
        $("tradeFormError").textContent="Daily limit reached: maximum 2 trades per day.";
        $("tradeFormError").hidden=false;
        return;
      }
    }

    const payload={
      user_id: state.user.id,
      account_id: $("tradeAccount").value || null,
      trade_date: date,
      trade_time: $("tradeTime").value || null,
      instrument: "MNQ",
      session: $("tradeSession").value,
      direction: $("tradeDirection").value,
      result: $("tradeResult").value,
      pnl: Number($("tradePnl").value),
      contracts: Number($("tradeContracts").value || 1),
      entry_price: numOrNull("tradeEntry"),
      exit_price: numOrNull("tradeExit"),
      stop_loss: numOrNull("tradeStop"),
      take_profit: numOrNull("tradeTarget"),
      risk_amount: numOrNull("tradeRisk"),
      reward_amount: null,
      rr: numOrNull("tradeRR"),
      points: numOrNull("tradePoints"),
      notes: textOrNull("tradeNotes"),
      updated_at: new Date().toISOString()
    };

    let saved;
    if(id) {
      const {data,error}=await sb.from("trades").update(payload).eq("id",id).select().single();
      if(error) return showTradeError(error.message); saved=data;
      await sb.from("trade_confluences").delete().eq("trade_id",id);
    } else {
      const {data,error}=await sb.from("trades").insert(payload).select().single();
      if(error) return showTradeError(error.message); saved=data;
    }

    const selected=getCheckedConfluences();
    if(selected.length) {
      const rows=selected.map(confluence_id=>({trade_id:saved.id,confluence_id}));
      const {error}=await sb.from("trade_confluences").insert(rows);
      if(error) return showTradeError(error.message);
    }

    const files=[...$("tradeScreenshots").files];
    for(const file of files) await uploadScreenshot(saved.id,file);

    $("tradeModal").close();
    window.JournalDashboard.setSelectedDate(saved.trade_date);
    await window.JournalApp.reloadData();
    toast(id ? "Trade updated." : "Trade saved.");
  }

  async function uploadScreenshot(tradeId,file) {
    const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=`${state.user.id}/${tradeId}/${crypto.randomUUID()}-${safe}`;
    const {error:upErr}=await sb.storage.from("trade-screenshots").upload(path,file,{upsert:false,contentType:file.type});
    if(upErr) throw upErr;
    const {error:rowErr}=await sb.from("trade_screenshots").insert({
      user_id:state.user.id, trade_id:tradeId, storage_path:path, file_name:file.name
    });
    if(rowErr) throw rowErr;
  }

  async function deleteTrade(id) {
    if(!confirm("Delete this trade and its screenshots?")) return;
    const shots=state.screenshots.filter(s=>s.trade_id===id);
    if(shots.length) await sb.storage.from("trade-screenshots").remove(shots.map(s=>s.storage_path));
    const {error}=await sb.from("trades").delete().eq("id",id);
    if(error) return toast(error.message,true);
    await window.JournalApp.reloadData();
    toast("Trade deleted.");
  }

  async function saveAccount(e) {
    e.preventDefault();
    const {error}=await sb.from("trading_accounts").insert({
      user_id:state.user.id,
      account_name:$("accountName").value.trim(),
      prop_firm:$("accountFirm").value,
      initial_balance:Number($("accountBalance").value)
    });
    if(error) return toast(error.message,true);
    $("accountModal").close(); $("accountForm").reset();
    await window.JournalApp.reloadData(); toast("Account created.");
  }

  async function deleteAccount(id) {
    const hasTrades=state.trades.some(t=>t.account_id===id);
    if(hasTrades) return toast("This account has trades. Keep it for journal history.",true);
    if(!confirm("Delete this account?")) return;
    const {error}=await sb.from("trading_accounts").delete().eq("id",id);
    if(error) return toast(error.message,true);
    await window.JournalApp.reloadData(); toast("Account deleted.");
  }

  async function savePayout(e) {
    e.preventDefault();
    const {error}=await sb.from("payouts").insert({
      user_id:state.user.id,
      account_id:$("payoutAccount").value,
      payout_date:$("payoutDate").value,
      amount:Number($("payoutAmount").value),
      notes:textOrNull("payoutNotes")
    });
    if(error) return toast(error.message,true);
    $("payoutModal").close(); $("payoutForm").reset();
    await window.JournalApp.reloadData(); toast("Payout saved.");
  }

  async function deletePayout(id) {
    if(!confirm("Delete this payout?")) return;
    const {error}=await sb.from("payouts").delete().eq("id",id);
    if(error) return toast(error.message,true);
    await window.JournalApp.reloadData(); toast("Payout deleted.");
  }

  function showTradeError(msg) {
    $("tradeFormError").textContent=msg; $("tradeFormError").hidden=false;
  }

  function escapeHtml(s="") {
    return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  return {
    bindState, populateAccountSelects, populateConfluences, openNew, openEdit, saveTrade,
    deleteTrade, saveAccount, deleteAccount, savePayout, deletePayout
  };
})();
