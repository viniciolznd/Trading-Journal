window.JournalAuth = (() => {
  async function login(e) {
    e.preventDefault();
    const email=document.getElementById("loginEmail").value.trim();
    const password=document.getElementById("loginPassword").value;
    const err=document.getElementById("loginError");
    err.hidden=true;

    const {error}=await sb.auth.signInWithPassword({email,password});
    if(error) {
      err.textContent=error.message;
      err.hidden=false;
    }
  }

  async function logout() {
    await sb.auth.signOut();
  }

  function init() {
    document.getElementById("loginForm").addEventListener("submit",login);
    document.getElementById("logoutBtn").addEventListener("click",logout);
  }

  return { init, logout };
})();
