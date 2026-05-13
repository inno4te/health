/* ===== System page renderer ===== */
/* Renders a full body-system page from window.SYSTEMS[key] */

function renderSystemPage(key){
  const data = SYSTEMS[key];
  if(!data){ console.warn('No system data for', key); return; }

  document.title = data.title + ' — Team21 Health Platform';

  const head = document.getElementById('sysHead');
  if(head){
    head.innerHTML = `
      <div>
        <div class="eyebrow">${data.eyebrow}</div>
        <h1>${data.titleHTML || data.title.replace(/(\w+)$/, '<em>$1</em>')}</h1>
        <p class="intro">${data.intro}</p>
      </div>
      <div class="meta">EVIDENCE-BASED<br>SOURCED · CITED<br>UPDATED 2026</div>`;
  }

  // Key numbers
  const kv = document.getElementById('sysKV');
  if(kv && data.keyNumbers){
    kv.innerHTML = data.keyNumbers.map(n=>`
      <div class="kv"><div class="k">${n.k}</div><div class="v">${n.v}</div><div class="s">${n.s||''}</div></div>
    `).join('');
  }

  // Tips
  const tips = document.getElementById('sysTips');
  if(tips && data.tips){
    tips.innerHTML = data.tips.map(t=>{
      const hay = (t.h + ' ' + t.p + ' ' + t.ev).toLowerCase();
      return `<article class="tip" data-search="${hay.replace(/"/g,'&quot;')}">
        <div class="num">${t.n}</div>
        <h4>${t.h}</h4>
        <p>${t.p}</p>
        <div class="ev">${t.ev}</div>
        <div class="topic-actions" style="margin-top:8px;padding-top:8px">
          <button class="action-btn" data-act="bookmark" data-id="${key}-${t.n}" data-name="${t.h.replace(/"/g,'&quot;')}">☆ Bookmark</button>
          <button class="action-btn" data-act="note" data-id="${key}-${t.n}" data-name="${t.h.replace(/"/g,'&quot;')}">✎ Add note</button>
        </div>
      </article>`;
    }).join('');
    wireTopicActions(tips);
  }

  // Warnings
  const warns = document.getElementById('sysWarns');
  if(warns && data.warnings){
    warns.innerHTML = data.warnings.map(w=>`<div class="warn"><strong>${w.h}</strong>${w.p}</div>`).join('');
  } else if(warns){
    warns.style.display='none';
  }

  // Foods to eat / avoid
  const foodWrap = document.getElementById('sysFoods');
  if(foodWrap && data.foods){
    foodWrap.innerHTML = `
      <div class="info-grid">
        <div class="info-card">
          <h4 style="color:var(--good)">Eat regularly</h4>
          <ul>${data.foods.eat.map(f=>`<li>${f}</li>`).join('')}</ul>
        </div>
        <div class="info-card">
          <h4 style="color:var(--accent)">Limit or avoid</h4>
          <ul>${data.foods.avoid.map(f=>`<li>${f}</li>`).join('')}</ul>
        </div>
      </div>`;
  } else if(foodWrap){
    foodWrap.style.display='none';
  }

  // Search box
  const search = document.getElementById('sysSearch');
  if(search && tips){
    search.addEventListener('input', e=>{
      const q = e.target.value.toLowerCase().trim();
      tips.querySelectorAll('.tip').forEach(t=>{
        t.style.display = (!q || (t.dataset.search||'').includes(q)) ? '' : 'none';
      });
    });
  }
}

window.renderSystemPage = renderSystemPage;
