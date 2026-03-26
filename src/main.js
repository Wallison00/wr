import './style.css';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase via Variáveis de Ambiente do Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicializa o cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHAMP_NAMES = ["Aatrox","Ahri","Akali","Akshan","Alistar","Ambessa","Amumu","Annie","Ashe","AurelionSol","Aurora","Bardo","Blitzcrank","Brand","Braum","Caitlyn","Camille","Corki","Darius","Diana","DrMundo","Draven","Ekko","Evelynn","Ezreal","Fiddlesticks","Fiora","Fizz","Galio","Garen","Gnar","Gragas","Graves","Gwen","Hecarim","Heimerdinger","Irelia","Janna","JarvanIV","Jax","Jayce","Jhin","Jinx","KaiSa","Kalista","Karma","Kassadin","Katarina","Kayle","Kayn","Kennen","KhaZix","Kindred","KogMaw","LeeSin","Leona","Lillia","Lissandra","Lucian","Lulu","Lux","Malphite","Maokai","MasterYi","Milio","MissFortune","MonkeyKing","Mordekaiser","Morgana","Nami","Nasus","Nautilus","Nidalee","Nilah","Nocturne","Nunu","Olaf","Orianna","Ornn","Pantheon","Poppy","Pyke","Rakan","Rammus","Rell","Renekton","Rengar","Riven","Rumble","Ryze","Samira","Senna","Seraphine","Sett","Shen","Shyvana","Singed","Sion","Sivir","Smolder","Sona","Soraka","Swain","Syndra","Talon","Teemo","Thresh","Tristana","Tryndamere","TwistedFate","Twitch","Urgot","Varus","Vayne","Veigar","VelKoz","Vex","Vi","Viego","Viktor","Vladimir","Volibear","Warwick","Xayah","XinZhao","Yasuo","Yone","Yuumi","Zed","Zeri","Ziggs","Zilean","Zoe","Zyra"];

const ALL_LANES = ["Barão", "Selva", "Meio", "Dragão", "Suporte"];
const ROUTE_ORDER = [...ALL_LANES, "Pendentes"];

let champions = [];
let currentRoute = 'sem-rota';
let currentView = 'grid';

const app = {
  editingId: null,
  modalSelections: { weak: [], strong: [], synergy: [] }, 
  draft: {
    left: [null, null, null, null, null],
    right: [null, null, null, null, null],
    leftLanes: [null, null, null, null, null],
    activeSlot: { team: 'left', index: 0 },
    startingTeam: null,
    currentGridLane: 'Todos'
  },

  async init() {
    this.cacheDOM(); this.bindEvents(); await this.loadData(); this.render();
  },

  cacheDOM() {
    this.grid = document.getElementById('championsGrid');
    this.mainGridView = document.getElementById('mainGridView');
    this.picksBansView = document.getElementById('picksBansView');
    this.draftHeroGrid = document.getElementById('draftHeroGrid');
    this.sidebar = document.querySelector('.sidebar');
    this.menuToggleBtn = document.getElementById('menuToggleBtn');
    this.addBtn = document.getElementById('addChampBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.syncBtn = document.getElementById('syncBtn');
    this.resetDraftBtn = document.getElementById('resetDraftBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.importBtn = document.getElementById('importBtn');
    this.importFile = document.getElementById('importFile');
    this.modal = document.getElementById('champModal');
    this.form = document.getElementById('champForm');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.champImageFile = document.getElementById('champImageFile');
    this.champImage = document.getElementById('champImage');
    this.champImagePreview = document.getElementById('champImagePreview');
    this.searchInput = document.getElementById('searchInput');
    this.draftSearchInput = document.getElementById('draftSearchInput');
    this.modalTitle = this.modal.querySelector('h2');
    this.weakGrid = document.getElementById('weakAgainstSelection');
    this.strongGrid = document.getElementById('strongAgainstSelection');
    this.synergyGrid = document.getElementById('synergyWithSelection');
    this.weakPreview = document.getElementById('weakSelectedPreview');
    this.strongPreview = document.getElementById('strongSelectedPreview');
    this.synergyPreview = document.getElementById('synergySelectedPreview');
    this.selectionSearches = document.querySelectorAll('.selection-search');
    this.navItems = document.querySelectorAll('.nav-item[data-view]');
    this.viewTitle = document.getElementById('viewTitle');
    this.viewSubtitle = document.getElementById('viewSubtitle');
    this.draftSlots = document.querySelectorAll('.draft-slot');
    this.draftTabs = document.querySelectorAll('.draft-tab');
  },

  bindEvents() {
    this.addBtn.onclick = () => this.openModal();
    this.resetBtn.onclick = () => this.resetData();
    this.syncBtn.onclick = () => this.syncBidirectional();
    this.resetDraftBtn.onclick = () => this.resetDraft();
    this.exportBtn.onclick = () => this.exportData();
    this.importBtn.onclick = () => this.importFile.click();
    this.importFile.onchange = (e) => this.importData(e);
    this.champImageFile.onchange = (e) => this.handleImageUpload(e);
    this.cancelBtn.onclick = () => this.closeModal();
    this.form.onsubmit = (e) => this.handleSubmit(e);
    this.searchInput.oninput = (e) => this.handleSearch(e);
    this.draftSearchInput.oninput = (e) => this.renderDraftHeroGrid(e.target.value);
    this.selectionSearches.forEach(i => i.oninput = (e) => this.renderGroupedGrid(e.target.dataset.type, e.target.value));
    this.navItems.forEach(i => i.onclick = () => { if (i.dataset.view === 'grid') { this.switchView('grid'); this.switchRoute(i.dataset.route); } else { this.switchView('picks-bans'); } });
    this.draftSlots.forEach(s => s.onclick = () => this.setActiveDraftSlot(s.dataset.team, parseInt(s.dataset.index)));
    this.draftTabs.forEach(t => t.onclick = () => this.setDraftGridLane(t.dataset.gridLane));
    this.menuToggleBtn.onclick = () => this.sidebar.classList.toggle('collapsed');
    window.onclick = (e) => { if (e.target === this.modal) this.closeModal(); };
  },

  handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      this.champImage.value = event.target.result;
      this.champImagePreview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; box-shadow: 0 0 10px var(--primary-glow);">`;
    };
    reader.readAsDataURL(file);
  },

  setDraftGridLane(lane) {
    this.draft.currentGridLane = lane;
    this.renderTabs();
    this.renderDraftHeroGrid(this.draftSearchInput.value);
  },

  switchView(view) {
    currentView = view;
    this.navItems.forEach(item => item.classList.toggle('active', item.dataset.view === view && (!item.dataset.route || item.dataset.route === currentRoute)));
    if (view === 'grid') { this.mainGridView.style.display = 'block'; this.picksBansView.style.display = 'none'; } 
    else { this.mainGridView.style.display = 'none'; this.picksBansView.style.display = 'block'; this.renderDraftHeroGrid(); this.renderDraftSlots(); this.renderTabs(); }
  },

  setActiveDraftSlot(team, index) {
    this.draft.activeSlot = { team, index };
    if (this.draft[team][index]) {
      this.draft[team][index] = null;
    }
    this.renderDraftSlots(); this.renderDraftHeroGrid(); this.renderTabs();
  },

  selectDraftHero(heroId) {
    const { team, index } = this.draft.activeSlot;
    if ([...this.draft.left, ...this.draft.right].includes(heroId)) return;


    if (this.draft.startingTeam === null) this.draft.startingTeam = team;
    this.draft[team][index] = heroId;
    this.findNextEmptySlot(); this.renderDraftSlots(); this.renderDraftHeroGrid(); this.renderTabs();
  },

  findNextEmptySlot() {
    const pickSequence = [{ t: 'start', n: 1 }, { t: 'other', n: 2 }, { t: 'start', n: 2 }, { t: 'other', n: 2 }, { t: 'start', n: 2 }, { t: 'other', n: 1 }];
    const allPicks = [...this.draft.left, ...this.draft.right].filter(id => id !== null);
    const totalPicks = allPicks.length; if (totalPicks >= 10) return;
    const startTeam = this.draft.startingTeam; const otherTeam = startTeam === 'left' ? 'right' : 'left';
    let currentPickCount = 0; let targetTeam = startTeam;
    for (const step of pickSequence) {
      const stepTeam = step.t === 'start' ? startTeam : otherTeam;
      for (let i = 0; i < step.n; i++) {
        if (currentPickCount === totalPicks) {
          targetTeam = stepTeam; const emptyIdx = this.draft[targetTeam].findIndex(slot => slot === null);
          if (emptyIdx !== -1) { this.draft.activeSlot = { team: targetTeam, index: emptyIdx }; return; }
        }
        currentPickCount++;
      }
    }
  },

  resetDraft() {
    this.draft.left = [null, null, null, null, null]; this.draft.right = [null, null, null, null, null];
    this.draft.activeSlot = { team: 'left', index: 0 };
    this.draft.startingTeam = null; this.draft.currentGridLane = 'Todos';
    this.renderDraftSlots(); this.renderDraftHeroGrid(); this.renderTabs();
  },

  renderTabs() {
    const allyPicks = this.draft.left.filter(id => id !== null);
    const enemyPicks = this.draft.right.filter(id => id !== null);
    const selectedIds = [...this.draft.left, ...this.draft.right];

    this.draftTabs.forEach(tab => {
      const lane = tab.dataset.gridLane;
      tab.classList.toggle('active', lane === this.draft.currentGridLane);
      
      let count = 0;
      if (lane === 'Todos') {
        const recommended = champions.filter(h => !selectedIds.includes(h.id)).map(h => {
          let score = 0;
          ALL_LANES.forEach(l => {
            if (h.lanes && h.lanes.includes(l)) {
              allyPicks.forEach(aId => { if (h.synergy.includes(aId)) score++; });
              enemyPicks.forEach(eId => { if (h.strongAgainst.includes(eId)) score++; });
            }
          });
          return score;
        }).filter(s => s > 0);
        count = recommended.length;
      } else {
        const recommended = champions.filter(h => h.lanes && h.lanes.includes(lane) && !selectedIds.includes(h.id)).map(h => {
          let score = 0;
          allyPicks.forEach(aId => { if (h.synergy.includes(aId)) score++; });
          enemyPicks.forEach(eId => { if (h.strongAgainst.includes(eId)) score++; });
          return score;
        }).filter(s => s > 0);
        count = recommended.length;
      }

      const label = lane === 'Todos' ? 'TODOS' : lane.toUpperCase();
      tab.innerHTML = `${label}${count > 0 ? `<span class="tab-badge">${count}</span>` : ''}`;
    });
  },

  renderDraftSlots() {
    this.draftSlots.forEach(slot => {
      const team = slot.dataset.team; const index = parseInt(slot.dataset.index);
      const heroId = this.draft[team][index]; const isActive = this.draft.activeSlot.team === team && this.draft.activeSlot.index === index;
      
      slot.classList.toggle('active', isActive); slot.classList.toggle('empty', !heroId);
      
      if (heroId) { 
        const h = champions.find(h => h.id === heroId); 
        const laneLabel = h.lanes ? h.lanes.join(', ') : '';
        slot.innerHTML = `<img src="${h.image}">${laneLabel ? `<span class="slot-lane">${laneLabel}</span>` : ''}`; 
      } 
      else { 
        slot.innerHTML = `<span class="slot-plus">+</span>`; 
      }
    });
  },

  renderDraftHeroGrid(term = '') {
    this.draftHeroGrid.innerHTML = ''; 
    const searchTerm = term.toLowerCase();
    const selectedIds = [...this.draft.left, ...this.draft.right].filter(id => id !== null);
    const filterLane = this.draft.currentGridLane;
    const allyPicks = this.draft.left.filter(id => id !== null);
    const enemyPicks = this.draft.right.filter(id => id !== null);

    let filteredHeroes = champions.filter(hero => {
      const matchesSearch = hero.name.toLowerCase().includes(searchTerm);
      const matchesLane = filterLane === 'Todos' || (hero.lanes && hero.lanes.includes(filterLane));
      return matchesSearch && matchesLane;
    });

    const scoredHeroes = filteredHeroes.map(h => {
      let score = 0;
      const relevantLanes = h.lanes || [];
      
      relevantLanes.forEach(l => {
          allyPicks.forEach(aId => { if (h.synergy.includes(aId)) score++; });
          enemyPicks.forEach(eId => { if (h.strongAgainst.includes(eId)) score++; });
      });
      
      return { ...h, score };
    }).sort((a, b) => b.score - a.score);

    if (scoredHeroes.length === 0) {
      this.draftHeroGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #555; padding: 20px;">Nenhum herói encontrado.</div>`;
      return;
    }

    scoredHeroes.forEach(hero => {
      const item = document.createElement('div');
      const isSelected = selectedIds.includes(hero.id);
      const isRecommended = hero.score > 0;
      
      item.className = `draft-hero-item ${isSelected ? 'selected' : ''} ${isRecommended ? 'recommended' : ''}`;
      item.innerHTML = `
        <img src="${hero.image}" title="${hero.name}">
        <div class="draft-hero-name">${hero.name}</div>
        ${hero.score > 0 ? `<div class="item-score">${hero.score}</div>` : ''}
      `;
      item.onclick = () => this.selectDraftHero(hero.id);
      this.draftHeroGrid.appendChild(item);
    });
  },

  async toggleStatusOk(id) {
    const idx = champions.findIndex(c => c.id === id); if (idx !== -1) { 
        champions[idx].statusOk = !champions[idx].statusOk; 
        const { error } = await supabase.from('champions').update({ statusOk: champions[idx].statusOk }).eq('id', id);
        if (error) console.error("Update error:", error);
        this.render(); 
    }
  },

  async syncBidirectional() {
    if (confirm('Sincronizar?')) {
      champions.forEach(a => {
        a.weakAgainst.forEach(bid => { const b = champions.find(h => h.id === bid); if (b && !b.strongAgainst.includes(a.id)) b.strongAgainst.push(a.id); });
        a.strongAgainst.forEach(bid => { const b = champions.find(h => h.id === bid); if (b && !b.weakAgainst.includes(a.id)) b.weakAgainst.push(a.id); });
        a.synergy.forEach(bid => { const b = champions.find(h => h.id === bid); if (b && !b.synergy.includes(a.id)) b.synergy.push(a.id); });
      });
      await this.saveData(); this.render();
    }
  },

  switchRoute(route) {
    currentRoute = route; this.navItems.forEach(item => item.classList.toggle('active', item.dataset.view === 'grid' && item.dataset.route === route));
    if (route === 'sem-rota') { this.viewTitle.textContent = "Pendentes de Cadastro"; this.viewSubtitle.textContent = "Heróis pendentes"; } 
    else { this.viewTitle.textContent = `Rota: ${route}`; this.viewSubtitle.textContent = `Lista: ${route}`; }
    this.render();
  },

  async loadData() {
    try {
      const { data, error } = await supabase.from('champions').select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        champions = data.map(c => ({ ...c, statusOk: c.statusOk || false, weakAgainst: c.weakAgainst || [], strongAgainst: c.strongAgainst || [], synergy: c.synergy || [] }));
      } else { 
        console.warn("Nenhum dado no Supabase. Use o script de seed."); 
        champions = JSON.parse(localStorage.getItem('wildrift-counters')) || [];
      }
    } catch (err) { 
        console.error("Supabase Error:", err);
        champions = JSON.parse(localStorage.getItem('wildrift-counters')) || []; 
    }
  },

  async saveData() { 
    localStorage.setItem('wildrift-counters', JSON.stringify(champions)); 
    try { 
        const { error } = await supabase.from('champions').upsert(champions);
        if (error) throw error;
    } catch (err) { 
        console.warn("Sync error:", err); 
    } 
  },

  exportData() { const ds = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(champions)); const dn = document.createElement('a'); dn.setAttribute("href", ds); dn.setAttribute("download", "backup.json"); dn.click(); },
  importData(ev) { const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = async (e) => { const d = JSON.parse(e.target.result); if (Array.isArray(d)) { champions = d; await this.saveData(); this.render(); } }; r.readAsText(f); },

  renderSelectionGrids(sw = [], ss = [], sy = []) {
    this.modalSelections = { weak: [...sw], strong: [...ss], synergy: [...sy] };
    this.selectionSearches.forEach(i => i.value = ''); this.renderGroupedGrid('weak'); this.renderGroupedGrid('strong'); this.renderGroupedGrid('synergy');
  },

  renderSelectedPreviews(type) {
    const pc = type === 'weak' ? this.weakPreview : type === 'strong' ? this.strongPreview : this.synergyPreview;
    pc.innerHTML = ''; const ids = this.modalSelections[type];
    if (ids.length === 0) { pc.innerHTML = '<span style="color:#444;font-size:0.65rem">Nenhum</span>'; return; }
    ids.forEach(id => {
      const h = champions.find(h => h.id === id); if (!h) return;
      const c = document.createElement('div'); c.className = 'preview-chip'; c.innerHTML = `<img src="${h.image}" title="${h.name}">`;
      c.onclick = () => { this.modalSelections[type] = this.modalSelections[type].filter(x => x !== id); this.renderGroupedGrid(type, document.querySelector(`.selection-search[data-type="${type}"]`).value); };
      pc.appendChild(c);
    });
  },

  renderGroupedGrid(type, term = '') {
    const ct = type === 'weak' ? this.weakGrid : type === 'strong' ? this.strongGrid : this.synergyGrid; ct.innerHTML = '';
    const st = term.toLowerCase(); const sl = this.modalSelections[type]; this.renderSelectedPreviews(type);
    const cg = (rt, li, ty) => {
      const fl = li.filter(h => h.name.toLowerCase().includes(st)); if (fl.length === 0) return null;
      const gd = document.createElement('div'); gd.className = 'selection-group'; gd.innerHTML = `<div class="selection-group-title">${rt}</div>`;
      const gg = document.createElement('div'); gg.className = 'selection-group-grid';
      fl.forEach(h => { const l = this.createHeroSelectionItem(h, ty, sl.includes(h.id)); gg.appendChild(l); });
      gd.appendChild(gg); return gd;
    };
    ROUTE_ORDER.forEach(rt => { const li = rt === 'Pendentes' ? champions.filter(c => !c.lanes || c.lanes.length === 0) : champions.filter(c => c.lanes && c.lanes.includes(rt)); const gd = cg(rt, li, type); if (gd) ct.appendChild(gd); });
    ct.querySelectorAll('input').forEach(i => i.onchange = (e) => {
      if (e.target.checked) { if (!this.modalSelections[type].includes(e.target.value)) this.modalSelections[type].push(e.target.value); } 
      else { this.modalSelections[type] = this.modalSelections[type].filter(id => id !== e.target.value); }
      this.renderGroupedGrid(type, document.querySelector(`.selection-search[data-type="${type}"]`).value);
    });
  },

  createHeroSelectionItem(h, ty, ch) {
    const l = document.createElement('label'); l.className = 'hero-checkbox';
    const n = ty === 'weak' ? 'weakAgainst' : ty === 'strong' ? 'strongAgainst' : 'synergyWith';
    l.innerHTML = `<input type="checkbox" name="${n}" value="${h.id}" ${ch ? 'checked' : ''}><img src="${h.image}" title="${h.name}">`; return l;
  },

  openModal(c = null) {
    if (c) { 
      this.editingId = c.id; 
      this.modalTitle.textContent = `Editar ${c.name}`; 
      document.getElementById('champName').value = c.name; 
      this.champImage.value = c.image || ''; 
      this.champImagePreview.innerHTML = c.image ? `<img src="${c.image}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">` : '';
      this.champImageFile.value = '';
      this.form.querySelectorAll('input[name="lane"]').forEach(cb => cb.checked = (c.lanes || []).includes(cb.value)); 
      this.renderSelectionGrids(c.weakAgainst || [], c.strongAgainst || [], c.synergy || []); 
    }
    else { 
      this.editingId = null; 
      this.modalTitle.textContent = 'Novo'; 
      this.form.reset(); 
      this.champImage.value = '';
      this.champImagePreview.innerHTML = '';
      this.champImageFile.value = '';
      this.renderSelectionGrids(); 
    }
    this.modal.style.display = 'flex';
  },

  closeModal() { this.modal.style.display = 'none'; this.form.reset(); this.champImage.value = ''; this.champImagePreview.innerHTML = ''; this.champImageFile.value = ''; this.editingId = null; this.modalSelections = { weak: [], strong: [], synergy: [] }; },

  async handleSubmit(e) {
    e.preventDefault(); const name = document.getElementById('champName').value; const currentId = this.editingId || name.toLowerCase().replace(/\s+/g, '-');
    const heroData = { id: currentId, name, image: this.champImage.value || `/herois/${name}.png`, lanes: Array.from(this.form.querySelectorAll('input[name="lane"]:checked')).map(cb => cb.value), statusOk: false, weakAgainst: this.modalSelections.weak, strongAgainst: this.modalSelections.strong, synergy: this.modalSelections.synergy };
    if (this.editingId) champions[champions.findIndex(c => c.id === this.editingId)] = heroData; else champions.push(heroData);
    
    // Auto-linkagem
    champions.forEach(h => { if (h.id !== currentId) { h.weakAgainst = h.weakAgainst.filter(id => id !== currentId); h.strongAgainst = h.strongAgainst.filter(id => id !== currentId); h.synergy = h.synergy.filter(id => id !== currentId); } });
    heroData.weakAgainst.forEach(bid => { const b = champions.find(h => h.id === bid); if (b && !b.strongAgainst.includes(currentId)) b.strongAgainst.push(currentId); });
    heroData.strongAgainst.forEach(bid => { const b = champions.find(h => h.id === bid); if (b && !b.weakAgainst.includes(currentId)) b.weakAgainst.push(currentId); });
    heroData.synergy.forEach(bid => { const b = champions.find(h => h.id === bid); if (b && !b.synergy.includes(currentId)) b.synergy.push(currentId); });
    
    await this.saveData(); this.render(); this.closeModal();
  },

  handleSearch(e) { this.render(e.target.value.toLowerCase()); },
  async deleteChamp(id) { 
    if (confirm('Excluir?')) { 
        champions = champions.filter(c => c.id !== id); 
        const { error } = await supabase.from('champions').delete().eq('id', id);
        if (error) console.error("Delete error:", error);
        this.render(); 
    } 
  },

  render(searchTerm = '') {
    if (currentView !== 'grid') return;
    this.grid.innerHTML = '';
    const data = champions.filter(champ => {
      const matchesSearch = searchTerm === '' || champ.name.toLowerCase().includes(searchTerm);
      let matchesRoute = false; if (currentRoute === 'sem-rota') matchesRoute = !champ.lanes || champ.lanes.length === 0; else matchesRoute = (champ.lanes || []).includes(currentRoute);
      return matchesSearch && matchesRoute;
    });
    data.forEach(champ => {
      const card = document.createElement('div'); card.className = 'champion-card';
      const rI = (li, isSy = false) => { if (!li || li.length === 0) return '-'; return li.map(id => { const h = champions.find(x => x.id === id); if (!h) return ''; return `<img src="${h.image}" class="counter-icon ${isSy ?'synergy-icon':''}" title="${h.name}">`; }).join(''); };
      card.innerHTML = `
        <div class="card-header"><div class="header-left"><img src="${champ.image}" class="champion-icon"><div><h3>${champ.name}</h3><div class="lane-badges">${(champ.lanes || []).map(l => `<span class="lane-badge">${l}</span>`).join('')}</div></div></div>
          <div class="card-actions"><label class="status-switch"><input type="checkbox" ${champ.statusOk ? 'checked' : ''} onchange="app.toggleStatusOk('${champ.id}')"><span class="status-slider"></span></label><button class="icon-btn" onclick="app.openModalById('${champ.id}')">✏️</button><button class="icon-btn delete-btn" onclick="app.deleteChamp('${champ.id}')">🗑️</button></div>
        </div>
        <div class="card-body">
          <div class="counter-section"><span class="counter-label weak">FRACA CONTRA</span><div class="counter-list">${rI(champ.weakAgainst)}</div></div>
          <div class="counter-section"><span class="counter-label strong">FORTE CONTRA</span><div class="counter-list">${rI(champ.strongAgainst)}</div></div>
          <div class="synergy-card-section"><span class="synergy-label">SINERGIA COM</span><div class="counter-list">${rI(champ.synergy, true)}</div></div>
        </div>
      `;
      this.grid.appendChild(card);
    });
  },
  openModalById(id) { const c = champions.find(c => c.id === id); if (c) this.openModal(c); }
};
window.app = app; app.init();
