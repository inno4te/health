/* ===== Team21 Health Platform — Shared JS ===== */

const T21 = {
  storage: (window.storage && typeof window.storage.set === 'function') ? window.storage : null,
  user: null,
  toast(msg, type){
    const t = document.getElementById('t21-toast') || (function(){
      const el = document.createElement('div');
      el.id='t21-toast'; el.className='toast'; document.body.appendChild(el); return el;
    })();
    t.textContent = msg;
    t.className = 'toast show ' + (type||'');
    clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'),2400);
  },
  todayKey(){ return new Date().toISOString().slice(0,10); },
  uid(){ return (Date.now().toString(36) + Math.random().toString(36).slice(2,8)); },
  async djb2(str){ let h=5381; for(let i=0;i<str.length;i++) h=((h<<5)+h)+str.charCodeAt(i); return (h>>>0).toString(16); },

  /* ---------- AUTH UI ---------- */
  injectAuthModal(){
    if(document.getElementById('authModal')) return;
    const m = document.createElement('div');
    m.id = 'authModal';
    m.className = 'modal-backdrop';
    m.innerHTML = `
      <div class="modal">
        <button class="modal-close" id="authClose" aria-label="Close">×</button>
        <h3 id="authTitle">Welcome back</h3>
        <p class="sub" id="authSub">Sign in to save your work.</p>
        <div class="field" id="nameField" style="display:none">
          <label for="authName">Full name</label>
          <input type="text" id="authName" autocomplete="name" />
        </div>
        <div class="field">
          <label for="authEmail">Email</label>
          <input type="email" id="authEmail" autocomplete="email" />
        </div>
        <div class="field">
          <label for="authPass">Password</label>
          <input type="password" id="authPass" autocomplete="current-password" />
        </div>
        <div class="auth-msg" id="authMsg"></div>
        <button class="btn btn-primary" id="authSubmit" style="width:100%;margin-top:8px;padding:12px">Sign in</button>
        <div class="auth-switch"><span id="authSwitchText">New here? </span><a id="authSwitchLink">Create an account</a></div>
        <p style="margin-top:16px;font-size:11px;color:var(--mute);line-height:1.5;text-align:center">Your data is stored privately in your Team21 account. We never share or sell your information.</p>
      </div>`;
    document.body.appendChild(m);

    document.getElementById('authClose').addEventListener('click', ()=> this.closeAuth());
    m.addEventListener('click', e=>{ if(e.target.id==='authModal') this.closeAuth(); });
    document.getElementById('authSwitchLink').addEventListener('click', e=>{
      this.setAuthMode(e.target.dataset.mode || 'register');
    });
    document.getElementById('authSubmit').addEventListener('click', ()=> this.submitAuth());
  },
  openAuth(mode){ this.injectAuthModal(); document.getElementById('authModal').classList.add('open'); this.setAuthMode(mode||'login'); },
  closeAuth(){ document.getElementById('authModal').classList.remove('open'); const m=document.getElementById('authMsg'); if(m) m.classList.remove('show'); },
  setAuthMode(mode){
    const isReg = mode === 'register';
    document.getElementById('authTitle').textContent = isReg ? 'Create your account' : 'Welcome back';
    document.getElementById('authSub').textContent   = isReg ? 'A free account saves your tracker, notes and questions.' : 'Sign in to load your tracker, notes and saved items.';
    document.getElementById('nameField').style.display = isReg ? '' : 'none';
    document.getElementById('authSubmit').textContent  = isReg ? 'Create account' : 'Sign in';
    document.getElementById('authSwitchText').textContent = isReg ? 'Already have an account? ' : 'New here? ';
    const link = document.getElementById('authSwitchLink');
    link.textContent = isReg ? 'Sign in' : 'Create an account';
    link.dataset.mode = isReg ? 'login' : 'register';
  },
  flashAuth(msg, ok){
    const e = document.getElementById('authMsg');
    e.textContent = msg; e.classList.toggle('ok', !!ok); e.classList.add('show');
    setTimeout(()=>e.classList.remove('show'), 3000);
  },
  async submitAuth(){
    const email = document.getElementById('authEmail').value.trim().toLowerCase();
    const pass  = document.getElementById('authPass').value;
    const name  = document.getElementById('authName').value.trim();
    const isReg = document.getElementById('nameField').style.display !== 'none';
    if(!email || !pass || (isReg && !name)){ this.flashAuth('Please fill all fields.'); return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ this.flashAuth('Enter a valid email.'); return; }
    if(pass.length < 6){ this.flashAuth('Password must be at least 6 characters.'); return; }

    if(!this.storage){
      this.user = {email, name: name || email.split('@')[0]};
      this.flashAuth('Signed in (session only — persistent storage unavailable).', true);
      this.afterAuth();
      return;
    }
    const userKey = `t21:user:${email}`;
    try{
      if(isReg){
        let existing=null; try{ existing = await this.storage.get(userKey); }catch(_){}
        if(existing && existing.value){ this.flashAuth('Account exists. Please sign in.'); return; }
        const hash = await this.djb2(pass);
        await this.storage.set(userKey, JSON.stringify({email, name, hash, created: Date.now()}));
        this.user = {email, name};
        this.flashAuth('Account created.', true);
      } else {
        let r=null; try{ r = await this.storage.get(userKey); }catch(_){}
        if(!r || !r.value){ this.flashAuth('No account found for that email.'); return; }
        const data = JSON.parse(r.value);
        const hash = await this.djb2(pass);
        if(hash !== data.hash){ this.flashAuth('Incorrect password.'); return; }
        this.user = {email: data.email, name: data.name};
        this.flashAuth('Signed in.', true);
      }
      try{ await this.storage.set('t21:session', JSON.stringify(this.user)); }catch(_){}
      this.afterAuth();
    } catch(err){ this.flashAuth('Storage error — try again.'); }
  },
  afterAuth(){
    setTimeout(()=> this.closeAuth(), 500);
    this.renderUserBadge();
    if(typeof window.onUserAuthChange === 'function') window.onUserAuthChange(this.user);
  },
  async signOut(){
    this.user = null;
    if(this.storage){ try{ await this.storage.delete('t21:session'); }catch(_){} }
    this.renderUserBadge();
    if(typeof window.onUserAuthChange === 'function') window.onUserAuthChange(null);
    this.toast('Signed out');
  },
  renderUserBadge(){
    const nav = document.getElementById('navCta');
    if(!nav) return;
    nav.innerHTML = '';
    if(!this.user){
      nav.innerHTML = `
        <button class="btn btn-sm" id="loginBtn">Sign In</button>
        <button class="btn btn-sm btn-primary" id="registerBtn">Create Account</button>`;
      document.getElementById('loginBtn').addEventListener('click', ()=> this.openAuth('login'));
      document.getElementById('registerBtn').addEventListener('click', ()=> this.openAuth('register'));
      return;
    }
    const initials = (this.user.name || this.user.email).split(/[\s@]/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase();
    const badge = document.createElement('div');
    badge.className = 'user-badge';
    badge.innerHTML = `<div class="user-avatar">${initials}</div>
                       <div><div class="name">${this.user.name || this.user.email.split('@')[0]}</div></div>
                       <button class="logout" id="logoutBtn">Sign out</button>`;
    nav.appendChild(badge);
    document.getElementById('logoutBtn').addEventListener('click', ()=> this.signOut());
  },

  /* ---------- NAV INJECTOR ---------- */
  injectNav(activePath){
    const links = [
      ['index.html','Home'],
      ['carcinogens.html','Carcinogens'],
      ['additives.html','Food Additives'],
      ['lifestyle.html','Lifestyle'],
      ['proposals.html','Proposals'],
      ['tracker.html','Tracker'],
      ['notes.html','My Notes'],
      ['community.html','Community Q&A'],
      ['evidence.html','Evidence']
    ];
    const navWrap = document.querySelector('.nav-inner');
    if(!navWrap) return;
    const linksWrap = navWrap.querySelector('.nav-links') || document.createElement('div');
    linksWrap.className = 'nav-links';
    linksWrap.innerHTML = links.map(([h,t]) =>
      `<a href="${h}" ${ (activePath===h ? 'class="active"' : '') }>${t}</a>`
    ).join('');
    if(!navWrap.querySelector('.nav-links')){
      // insert before nav-cta
      const cta = navWrap.querySelector('.nav-cta');
      navWrap.insertBefore(linksWrap, cta);
    }
    // Mobile toggle
    let mt = navWrap.querySelector('.mobile-toggle');
    if(!mt){
      mt = document.createElement('button');
      mt.className = 'mobile-toggle';
      mt.innerHTML = '☰';
      mt.addEventListener('click', ()=> linksWrap.classList.toggle('open'));
      navWrap.appendChild(mt);
    }
  },

  /* ---------- FOOTER INJECTOR ---------- */
  injectFooter(){
    if(document.querySelector('footer.t21-footer')) return;
    const f = document.createElement('footer');
    f.className = 't21-footer';
    f.innerHTML = `
      <div class="foot-inner">
        <div class="foot-brand">
          <div class="brand-name" style="font-family:'Fraunces',serif">Team21 Health Platform</div>
          <p>An evidence-based preventive-health resource mapping the dietary, environmental and behavioural factors implicated in cancer and chronic disease — drawn from IARC, WHO, NIH, AICR and the leading medical journals.</p>
        </div>
        <div class="foot-col">
          <h5>Explore</h5>
          <a href="carcinogens.html">Carcinogens</a>
          <a href="additives.html">Food additives</a>
          <a href="lifestyle.html">Lifestyle</a>
          <a href="proposals.html">Proposals</a>
        </div>
        <div class="foot-col">
          <h5>Your Account</h5>
          <a href="tracker.html">Daily tracker</a>
          <a href="notes.html">My notes</a>
          <a href="community.html">Community Q&amp;A</a>
        </div>
        <div class="foot-col">
          <h5>Editorial</h5>
          <a href="evidence.html">Sources</a>
          <a href="evidence.html#disclaimer">Disclaimer</a>
          <span style="display:block;color:#a8b8af;font-size:13px;padding:4px 0">Editor — Innocent Forteh</span>
        </div>
      </div>
      <div class="foot-bottom">
        <div class="copy">© Innocent Forteh · Team21 Health Platform · All rights reserved.</div>
        <div>For educational use only · Not medical advice.</div>
      </div>`;
    document.body.appendChild(f);
  },

  /* ---------- BOOTSTRAP ---------- */
  async boot(activePath){
    this.injectNav(activePath);
    this.injectFooter();
    this.injectAuthModal();
    // Restore session
    if(this.storage){
      try{
        const r = await this.storage.get('t21:session');
        if(r && r.value) this.user = JSON.parse(r.value);
      }catch(_){}
    }
    this.renderUserBadge();
    if(typeof window.onUserAuthChange === 'function') window.onUserAuthChange(this.user);
  }
};

/* Listen for cross-page hooks */
window.T21 = T21;
