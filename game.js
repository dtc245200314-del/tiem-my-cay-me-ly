(() => {
  "use strict";

  const STORAGE_KEY = "tiem-my-cay-me-ly-release-v1";
  const MAX_CUSTOMERS = 6;

  const INGREDIENTS = {
    bowl: { name: "Tô giấy", short: "Lấy tô", icon: "🥣", cost: 2, life: 99, unlock: 1 },
    noodles: { name: "Vắt mỳ", short: "Mỳ", icon: "🍜", cost: 6, life: 2, unlock: 1 },
    broth: { name: "Nước dùng", short: "Nước dùng", icon: "🥘", cost: 4, life: 2, unlock: 1 },
    kimchi: { name: "Kim chi", short: "Kim chi", icon: "🥬", cost: 3, life: 3, unlock: 1 },
    sausage: { name: "Xúc xích", short: "Xúc xích", icon: "🌭", cost: 5, life: 2, unlock: 1 },
    mushroom: { name: "Nấm", short: "Nấm", icon: "🍄", cost: 4, life: 2, unlock: 1 },
    cheese: { name: "Phô mai", short: "Phô mai", icon: "🧀", cost: 6, life: 2, unlock: 2 },
    egg: { name: "Trứng lòng đào", short: "Trứng", icon: "🥚", cost: 4, life: 2, unlock: 2 },
    seafood: { name: "Hải sản", short: "Hải sản", icon: "🦐", cost: 9, life: 1, unlock: 3 },
    chili: { name: "Ớt cấp cay", short: "Tăng cay", icon: "🌶️", cost: 1, life: 8, unlock: 1 }
  };

  const RECIPES = [
    { id: "kimchi", name: "Mỳ cay kim chi", main: "kimchi", price: 42, unlock: 1 },
    { id: "sausage", name: "Mỳ cay xúc xích", main: "sausage", price: 48, unlock: 1 },
    { id: "mushroom", name: "Mỳ cay nấm", main: "mushroom", price: 46, unlock: 1 },
    { id: "seafood", name: "Mỳ cay hải sản", main: "seafood", price: 58, unlock: 3 }
  ];

  const UPGRADES = {
    patience: { icon: "🪑", name: "Ghế chờ êm ái", description: "+5 giây kiên nhẫn mỗi cấp", baseCost: 120, max: 3 },
    signboard: { icon: "✨", name: "Biển hiệu bắt mắt", description: "+10% doanh thu mỗi cấp", baseCost: 150, max: 3 },
    fridge: { icon: "❄️", name: "Tủ lạnh xịn", description: "+1 ngày hạn dùng cho hàng mới", baseCost: 180, max: 3 }
  };

  const CUSTOMERS = [
    ["👩🏻", "Linh"], ["🧑🏽", "Minh"], ["👨🏻", "Tuấn"], ["👩🏽", "Hạ"],
    ["🧕🏻", "An"], ["👨🏾", "Khoa"], ["👩🏻‍🦱", "Vy"], ["🧑🏻‍🦰", "Bảo"]
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const els = {
    day: $("#dayLabel"), phase: $("#phaseLabel"), shopName: $("#shopName"), money: $("#moneyLabel"),
    stars: $("#starsLabel"), rating: $("#ratingLabel"), reviews: $("#reviewLabel"),
    prep: $("#prepScreen"), service: $("#serviceScreen"), menu: $("#menuGrid"), panel: $("#panel"),
    cart: $("#cartTotal"), buy: $("#buyBtn"), open: $("#openBtn"), openDay: $("#openDay"),
    splash: $("#splash"), start: $("#startBtn"), newGame: $("#newGameBtn"),
    settings: $("#settingsBtn"), rename: $("#renameBtn"), modal: $("#modalOverlay"), modalCard: $("#modalCard"),
    toast: $("#toast"), progress: $("#serviceProgress"), avatar: $("#customerAvatar"),
    customer: $("#customerName"), orderText: $("#orderText"), orderChips: $("#orderChips"),
    patienceBar: $("#patienceBar"), patienceText: $("#patienceText"), bowl: $("#noodleBowl"),
    emptyTray: $("#emptyTray"), bowlContent: $("#bowlContent"), spice: $("#spiceBadge"),
    ingredients: $("#ingredientGrid"), combo: $("#comboLabel"), hint: $("#serviceHint"),
    serve: $("#serveBtn"), discard: $("#discardBtn")
  };

  const createInventory = () => Object.fromEntries(Object.keys(INGREDIENTS).map((id) => [id, []]));
  const defaultState = () => ({
    day: 1,
    money: 400,
    rating: 4,
    reviews: 0,
    shopName: "Tiệm Mỳ Cay Mê Ly",
    inventory: createInventory(),
    upgrades: { patience: 0, signboard: 0, fridge: 0 },
    history: [],
    todayCost: 0,
    tutorialSeen: false,
    settings: { sound: true }
  });

  let state = loadState() || defaultState();
  let pending = Object.fromEntries(Object.keys(INGREDIENTS).map((id) => [id, 0]));
  let activeTab = "stock";
  let currentOrder = null;
  let currentBowl = {};
  let serviceIndex = 0;
  let combo = 1;
  let patienceTotal = 0;
  let patienceRemaining = 0;
  let timer = null;
  let paused = false;
  let toastTimer = null;
  let shift = freshShift();
  let audioContext = null;

  function freshShift() {
    return { revenue: 0, correct: 0, scoreTotal: 0, waste: 0, customers: 0 };
  }

  function normalizeState(value) {
    const base = defaultState();
    if (!value || typeof value !== "object") return base;
    const merged = { ...base, ...value };
    merged.inventory = { ...base.inventory, ...(value.inventory || {}) };
    merged.upgrades = { ...base.upgrades, ...(value.upgrades || {}) };
    merged.settings = { ...base.settings, ...(value.settings || {}) };
    Object.keys(INGREDIENTS).forEach((id) => {
      if (!Array.isArray(merged.inventory[id])) merged.inventory[id] = [];
      merged.inventory[id] = merged.inventory[id]
        .filter((batch) => Number(batch.qty) > 0)
        .map((batch) => ({ qty: Number(batch.qty), expiresDay: Number(batch.expiresDay) || merged.day }));
    });
    return merged;
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (_) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // The game remains playable when storage is unavailable.
    }
  }

  function hasSave() {
    try { return Boolean(localStorage.getItem(STORAGE_KEY)); } catch (_) { return false; }
  }

  function money(value) {
    return `${Math.round(value)}k`;
  }

  function formatRating(value) {
    return Number(value).toFixed(1).replace(".", ",");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;"
    }[char]));
  }

  function totalStock(id) {
    return (state.inventory[id] || []).reduce((sum, batch) => sum + batch.qty, 0);
  }

  function nearestExpiry(id) {
    const batches = (state.inventory[id] || []).filter((batch) => batch.qty > 0);
    return batches.length ? Math.min(...batches.map((batch) => batch.expiresDay)) : null;
  }

  function addStock(id, quantity) {
    const item = INGREDIENTS[id];
    const bonus = item.life >= 90 ? 0 : state.upgrades.fridge;
    state.inventory[id].push({ qty: quantity, expiresDay: state.day + item.life - 1 + bonus });
  }

  function consumeStock(id, quantity = 1) {
    if (totalStock(id) < quantity) return false;
    const batches = state.inventory[id].sort((a, b) => a.expiresDay - b.expiresDay);
    let needed = quantity;
    for (const batch of batches) {
      const used = Math.min(batch.qty, needed);
      batch.qty -= used;
      needed -= used;
      if (!needed) break;
    }
    state.inventory[id] = batches.filter((batch) => batch.qty > 0);
    saveState();
    return true;
  }

  function expireOldStock() {
    let expired = 0;
    Object.keys(INGREDIENTS).forEach((id) => {
      const fresh = [];
      state.inventory[id].forEach((batch) => {
        if (batch.expiresDay < state.day) expired += batch.qty;
        else fresh.push(batch);
      });
      state.inventory[id] = fresh;
    });
    return expired;
  }

  function renderHeader() {
    els.day.textContent = state.day;
    els.openDay.textContent = state.day;
    els.shopName.textContent = state.shopName;
    els.money.textContent = money(state.money);
    els.rating.textContent = formatRating(state.rating);
    els.reviews.textContent = state.reviews;
    const filled = Math.max(1, Math.min(5, Math.round(state.rating)));
    els.stars.textContent = "★".repeat(filled) + "☆".repeat(5 - filled);
    els.stars.setAttribute("aria-label", `${formatRating(state.rating)} trên 5 sao`);
  }

  function renderMenu() {
    els.menu.innerHTML = RECIPES.map((recipe) => {
      const locked = state.day < recipe.unlock;
      return `<div class="menu-item${locked ? " locked" : ""}"><span>${locked ? "🔒" : INGREDIENTS[recipe.main].icon} ${escapeHtml(recipe.name.replace("Mỳ cay ", ""))}</span><b>${locked ? `Ngày ${recipe.unlock}` : money(recipe.price)}</b></div>`;
    }).join("");
  }

  function renderPrep() {
    paused = false;
    clearInterval(timer);
    timer = null;
    els.phase.textContent = "Chuẩn bị";
    els.prep.classList.remove("hidden");
    els.service.classList.add("hidden");
    renderHeader();
    renderMenu();
    setTab(activeTab);
    updateCart();
  }

  function setTab(tab) {
    activeTab = tab;
    $$(".tab").forEach((button) => {
      const selected = button.dataset.tab === tab;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    if (tab === "stock") renderStockPanel();
    if (tab === "upgrades") renderUpgradePanel();
    if (tab === "recipes") renderRecipePanel();
    if (tab === "journal") renderJournalPanel();
  }

  function renderStockPanel() {
    const rows = Object.entries(INGREDIENTS).map(([id, item]) => {
      const locked = state.day < item.unlock;
      const stock = totalStock(id);
      const expiry = nearestExpiry(id);
      const remaining = expiry === null ? null : expiry - state.day;
      let badge = "Chưa có trong kho";
      let danger = false;
      if (stock) {
        badge = item.life >= 90 ? `${stock} phần · không hỏng` : `${stock} phần · ${remaining <= 0 ? "hết hạn cuối ngày" : `còn ${remaining + 1} ngày`}`;
        danger = item.life < 90 && remaining <= 0;
      }
      return `<div class="stock-row${locked ? " locked" : ""}">
        <div class="stock-meta"><span class="stock-icon">${item.icon}</span><div class="stock-copy"><strong>${escapeHtml(item.name)}${locked ? ` · mở ngày ${item.unlock}` : ""}</strong><small>${money(item.cost)}/phần · nhập theo lốc 5</small><span class="stock-badge${danger ? " danger" : ""}">${badge}</span></div></div>
        <div class="stepper"><button type="button" data-stock-action="minus" data-id="${id}" aria-label="Bớt ${escapeHtml(item.name)}">−</button><output>${pending[id]}</output><button type="button" data-stock-action="plus" data-id="${id}" aria-label="Thêm ${escapeHtml(item.name)}">+</button></div>
      </div>`;
    }).join("");
    els.panel.innerHTML = `<div class="panel-card"><div class="panel-title"><h2>Nhập nguyên liệu</h2><small>Hàng cũ được dùng trước</small></div><div class="stock-list">${rows}</div></div>`;
  }

  function renderUpgradePanel() {
    const cards = Object.entries(UPGRADES).map(([id, upgrade]) => {
      const level = state.upgrades[id];
      const complete = level >= upgrade.max;
      const cost = upgrade.baseCost * (level + 1);
      return `<article class="upgrade-card"><span class="big">${upgrade.icon}</span><div><h3>${escapeHtml(upgrade.name)} · Cấp ${level}/${upgrade.max}</h3><p>${escapeHtml(upgrade.description)}</p></div><button class="buy-upgrade" type="button" data-upgrade="${id}" ${complete || state.money < cost ? "disabled" : ""}>${complete ? "Tối đa" : money(cost)}</button></article>`;
    }).join("");
    els.panel.innerHTML = `<div class="panel-card"><div class="panel-title"><h2>Nâng cấp quán</h2><small>Hiệu lực vĩnh viễn</small></div><div class="upgrade-grid">${cards}</div></div>`;
  }

  function renderRecipePanel() {
    const cards = RECIPES.map((recipe) => {
      const locked = state.day < recipe.unlock;
      return `<article class="recipe-card"><h3>${locked ? "🔒" : INGREDIENTS[recipe.main].icon} ${escapeHtml(recipe.name)} · ${money(recipe.price)}</h3><p>${locked ? `Mở khóa vào ngày ${recipe.unlock}.` : `Công thức: 1 tô + 1 vắt mỳ + 1 nước dùng + 1 ${INGREDIENTS[recipe.main].name.toLowerCase()} + đúng cấp cay. Topping gọi thêm cần cho đúng đơn.`}</p></article>`;
    }).join("");
    els.panel.innerHTML = `<div class="panel-card"><div class="panel-title"><h2>Sổ công thức</h2><small>Giao đúng mới được thanh toán</small></div><div class="recipe-list">${cards}</div></div>`;
  }

  function renderJournalPanel() {
    const cards = state.history.length
      ? [...state.history].reverse().map((entry) => `<article class="journal-card"><strong>Ngày ${entry.day} · ${entry.correct}/${entry.customers} đơn đúng · ${formatRating(entry.average)}★</strong><br>Thu ${money(entry.revenue)} · Chi ${money(entry.cost)} · <b>${entry.profit >= 0 ? "Lãi" : "Lỗ"} ${money(Math.abs(entry.profit))}</b></article>`).join("")
      : `<article class="journal-card">Chưa có ca bán nào. Hãy nhập hàng và mở cửa để viết trang đầu tiên!</article>`;
    els.panel.innerHTML = `<div class="panel-card"><div class="panel-title"><h2>Nhật ký kinh doanh</h2><small>Lưu 10 ngày gần nhất</small></div><div class="journal-list">${cards}</div></div>`;
  }

  function updateCart() {
    const total = Object.entries(pending).reduce((sum, [id, qty]) => sum + qty * INGREDIENTS[id].cost, 0);
    els.cart.textContent = money(total);
    els.buy.disabled = total <= 0 || total > state.money;
    els.buy.textContent = total > state.money ? "Không đủ tiền nhập hàng" : "Nhập nguyên liệu";
  }

  function changePending(id, direction) {
    if (state.day < INGREDIENTS[id].unlock) return;
    pending[id] = Math.max(0, pending[id] + (direction === "plus" ? 5 : -5));
    renderStockPanel();
    updateCart();
    tone(440, 0.035);
  }

  function purchasePending() {
    const total = Object.entries(pending).reduce((sum, [id, qty]) => sum + qty * INGREDIENTS[id].cost, 0);
    if (!total || total > state.money) return;
    Object.entries(pending).forEach(([id, qty]) => {
      if (qty) addStock(id, qty);
      pending[id] = 0;
    });
    state.money -= total;
    state.todayCost += total;
    saveState();
    renderHeader();
    renderStockPanel();
    updateCart();
    tone(660, 0.08);
    toast(`Đã nhập hàng · chi ${money(total)}`);
  }

  function openShop() {
    const mustHave = ["bowl", "noodles", "broth", "chili"];
    const missing = mustHave.filter((id) => totalStock(id) < 1).map((id) => INGREDIENTS[id].name);
    const hasMain = RECIPES.some((recipe) => recipe.unlock <= state.day && totalStock(recipe.main) > 0);
    if (!hasMain) missing.push("ít nhất một loại nhân chính");
    if (missing.length) {
      toast(`Chưa thể mở cửa: thiếu ${missing.join(", ")}`);
      tone(170, 0.12);
      return;
    }
    pending = Object.fromEntries(Object.keys(INGREDIENTS).map((id) => [id, 0]));
    shift = freshShift();
    serviceIndex = 0;
    combo = 1;
    currentBowl = {};
    els.prep.classList.add("hidden");
    els.service.classList.remove("hidden");
    els.phase.textContent = "11:00";
    nextCustomer();
  }

  function viableRecipes() {
    return RECIPES.filter((recipe) => recipe.unlock <= state.day && totalStock(recipe.main) > 0);
  }

  function canServeAnother() {
    return totalStock("bowl") > 0 && totalStock("noodles") > 0 && totalStock("broth") > 0 && totalStock("chili") > 0 && viableRecipes().length > 0;
  }

  function makeOrder() {
    const recipes = viableRecipes();
    if (!recipes.length) return null;
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];
    const maxSpice = Math.min(5, 2 + Math.floor(state.day / 2));
    const spice = 1 + Math.floor(Math.random() * maxSpice);
    const availableExtras = ["cheese", "egg"].filter((id) => state.day >= INGREDIENTS[id].unlock && totalStock(id) > 0);
    const extra = availableExtras.length && Math.random() < 0.45
      ? availableExtras[Math.floor(Math.random() * availableExtras.length)] : null;
    const person = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
    return { recipe, spice, extra, avatar: person[0], customer: person[1] };
  }

  function nextCustomer() {
    clearInterval(timer);
    if (serviceIndex >= MAX_CUSTOMERS) return finishShift();
    if (!canServeAnother()) return finishShift("Bếp đã hết nguyên liệu cốt lõi nên quán đóng sớm.");
    currentOrder = makeOrder();
    currentBowl = {};
    patienceTotal = 25 + state.upgrades.patience * 5;
    patienceRemaining = patienceTotal;
    renderCustomer();
    renderBowl();
    renderIngredients();
    renderProgress();
    updateClock();
    timer = setInterval(tickPatience, 200);
  }

  function renderCustomer() {
    const { recipe, spice, extra } = currentOrder;
    els.avatar.textContent = currentOrder.avatar;
    els.customer.textContent = currentOrder.customer;
    els.orderText.textContent = `Cho mình ${recipe.name.toLowerCase()}${extra ? ` thêm ${INGREDIENTS[extra].name.toLowerCase()}` : ""} nhé!`;
    const chips = [
      `${INGREDIENTS[recipe.main].icon} ${INGREDIENTS[recipe.main].short}`,
      ...(extra ? [`${INGREDIENTS[extra].icon} ${INGREDIENTS[extra].short}`] : []),
      `🌶️ Cấp ${spice}`
    ];
    els.orderChips.innerHTML = chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join("");
    updatePatience();
  }

  function updateClock() {
    const minutes = 11 * 60 + serviceIndex * 38;
    const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minute = String(minutes % 60).padStart(2, "0");
    els.phase.textContent = `${hour}:${minute}`;
  }

  function renderProgress() {
    els.progress.innerHTML = Array.from({ length: MAX_CUSTOMERS }, (_, index) => `<i class="${index < serviceIndex ? "done" : index === serviceIndex ? "current" : ""}"></i>`).join("");
    els.combo.textContent = `Combo ×${combo}`;
  }

  function tickPatience() {
    if (paused) return;
    patienceRemaining = Math.max(0, patienceRemaining - 0.2);
    updatePatience();
    if (patienceRemaining <= 0) {
      clearInterval(timer);
      addReview(1);
      shift.scoreTotal += 1;
      shift.customers += 1;
      combo = 1;
      currentBowl = {};
      serviceIndex += 1;
      tone(130, 0.18);
      toast("Khách chờ quá lâu và đã rời đi…");
      setTimeout(nextCustomer, 850);
    }
  }

  function updatePatience() {
    const ratio = Math.max(0, patienceRemaining / patienceTotal);
    els.patienceBar.style.width = `${ratio * 100}%`;
    els.patienceBar.style.background = ratio > 0.55 ? "#57a86d" : ratio > 0.25 ? "#e6a735" : "#d94b3d";
    els.patienceText.textContent = ratio > 0.65 ? "Khách đang vui vẻ chờ món" : ratio > 0.35 ? "Khách bắt đầu sốt ruột" : "Nhanh lên, khách sắp bỏ đi!";
  }

  function ingredientOrder() {
    return ["bowl", "noodles", "broth", "kimchi", "sausage", "mushroom", "cheese", "egg", "seafood", "chili"]
      .filter((id) => INGREDIENTS[id].unlock <= state.day);
  }

  function renderIngredients() {
    els.ingredients.innerHTML = ingredientOrder().map((id) => {
      const item = INGREDIENTS[id];
      const qty = totalStock(id);
      return `<button class="ingredient-btn${id === "chili" ? " spice" : ""}" type="button" data-ingredient="${id}" ${qty <= 0 ? "disabled" : ""}><span class="emoji">${item.icon}</span><span class="label">${escapeHtml(item.short)}</span><span class="qty">${qty}</span></button>`;
    }).join("");
  }

  function addIngredient(id) {
    if (!currentOrder) return;
    if (id !== "bowl" && !currentBowl.bowl) {
      toast("Lấy tô trước đã nhé!");
      tone(180, 0.07);
      return;
    }
    if (id === "bowl" && currentBowl.bowl) {
      toast("Trên bếp đã có một tô rồi.");
      return;
    }
    if (id === "chili" && (currentBowl.chili || 0) >= 5) {
      toast("Cấp 5 là cay hết nấc rồi!");
      return;
    }
    if (!consumeStock(id)) {
      toast(`${INGREDIENTS[id].name} đã hết.`);
      renderIngredients();
      return;
    }
    currentBowl[id] = (currentBowl[id] || 0) + 1;
    renderBowl();
    renderIngredients();
    tone(id === "chili" ? 520 : 760, 0.045);
  }

  function renderBowl() {
    const hasBowl = Boolean(currentBowl.bowl);
    els.emptyTray.classList.toggle("hidden", hasBowl);
    els.bowl.classList.toggle("hidden", !hasBowl);
    const visibleIds = Object.keys(currentBowl).filter((id) => !["bowl", "broth", "chili"].includes(id));
    els.bowlContent.textContent = visibleIds.map((id) => INGREDIENTS[id].icon.repeat(Math.min(2, currentBowl[id]))).join("");
    els.spice.textContent = `${currentBowl.chili || 0}🌶️`;
    const count = Object.values(currentBowl).reduce((sum, qty) => sum + qty, 0);
    els.hint.textContent = hasBowl ? `Trong tô: ${count} thành phần · đối chiếu kỹ đơn trước khi giao` : "Đọc đơn → lấy tô → cho đủ nguyên liệu → giao món";
  }

  function expectedBowl() {
    const expected = { bowl: 1, noodles: 1, broth: 1, chili: currentOrder.spice, [currentOrder.recipe.main]: 1 };
    if (currentOrder.extra) expected[currentOrder.extra] = 1;
    return expected;
  }

  function isExactOrder() {
    const expected = expectedBowl();
    const keys = new Set([...Object.keys(expected), ...Object.keys(currentBowl)]);
    return [...keys].every((id) => (expected[id] || 0) === (currentBowl[id] || 0));
  }

  function serveOrder() {
    if (!currentBowl.bowl) {
      toast("Chưa có món để giao!");
      return;
    }
    clearInterval(timer);
    const correct = isExactOrder();
    let score = 1;
    if (correct) {
      const ratio = patienceRemaining / patienceTotal;
      score = ratio > 0.67 ? 5 : ratio > 0.34 ? 4 : 3;
      const extraPrice = currentOrder.extra === "cheese" ? 7 : currentOrder.extra === "egg" ? 6 : 0;
      const base = currentOrder.recipe.price + extraPrice;
      const revenue = Math.round(base * (1 + state.upgrades.signboard * 0.1) + Math.min(8, (combo - 1) * 2));
      state.money += revenue;
      shift.revenue += revenue;
      shift.correct += 1;
      combo += 1;
      toast(`${score}★ Tuyệt! Thu ${money(revenue)}${combo > 2 ? " · có thưởng combo" : ""}`);
      tone(900, 0.1);
      setTimeout(() => tone(1180, 0.08), 90);
    } else {
      const expected = expectedBowl();
      const missing = Object.keys(expected).filter((id) => (currentBowl[id] || 0) < expected[id]);
      score = missing.length <= 1 ? 2 : 1;
      combo = 1;
      toast(`${score}★ Chưa đúng đơn — khách không thanh toán.`);
      tone(150, 0.2);
    }
    addReview(score);
    shift.scoreTotal += score;
    shift.customers += 1;
    serviceIndex += 1;
    currentOrder = null;
    currentBowl = {};
    saveState();
    renderHeader();
    renderProgress();
    setTimeout(nextCustomer, 900);
  }

  function discardBowl() {
    const used = Object.values(currentBowl).reduce((sum, qty) => sum + qty, 0);
    if (!used) {
      toast("Bếp đang trống.");
      return;
    }
    shift.waste += used;
    currentBowl = {};
    combo = 1;
    renderBowl();
    renderProgress();
    tone(210, 0.09);
    toast("Đã bỏ tô lỗi. Nguyên liệu không được hoàn lại.");
  }

  function addReview(score) {
    state.rating = (state.rating * state.reviews + score) / (state.reviews + 1);
    state.reviews += 1;
    renderHeader();
  }

  function finishShift(reason = "Ca bán đã kết thúc. Cùng xem hôm nay quán làm ăn thế nào nhé!") {
    clearInterval(timer);
    timer = null;
    currentOrder = null;
    paused = true;
    const average = shift.customers ? shift.scoreTotal / shift.customers : 0;
    const entry = {
      day: state.day,
      revenue: shift.revenue,
      cost: state.todayCost,
      profit: shift.revenue - state.todayCost,
      correct: shift.correct,
      customers: shift.customers,
      average
    };
    state.history.push(entry);
    state.history = state.history.slice(-10);
    saveState();
    const profitLabel = entry.profit >= 0 ? `Lãi ${money(entry.profit)}` : `Lỗ ${money(Math.abs(entry.profit))}`;
    showModal(`<h2>🌙 Tổng kết ngày ${state.day}</h2><p>${escapeHtml(reason)}</p>
      <div class="summary-grid">
        <div class="summary-cell"><span>Đơn đúng</span><strong>${shift.correct}/${shift.customers}</strong></div>
        <div class="summary-cell"><span>Điểm ca</span><strong>${formatRating(average)}★</strong></div>
        <div class="summary-cell"><span>Doanh thu</span><strong>${money(shift.revenue)}</strong></div>
        <div class="summary-cell"><span>Kết quả</span><strong>${profitLabel}</strong></div>
      </div>
      <p>Đã bỏ phí <b>${shift.waste}</b> phần nguyên liệu. Đánh giá quán hiện tại: <b>${formatRating(state.rating)}★</b>.</p>
      <div class="modal-actions"><button type="button" data-modal-action="next-day">Sang ngày ${state.day + 1} →</button></div>`, false);
  }

  function startNextDay() {
    closeModal();
    state.day += 1;
    state.todayCost = 0;
    const expired = expireOldStock();
    saveState();
    renderPrep();
    if (expired) toast(`Sang ngày mới: ${expired} phần nguyên liệu đã hết hạn.`);
    else toast(`Ngày ${state.day} bắt đầu — chúc quán đông khách!`);
    if (state.day === 2) setTimeout(() => toast("Đã mở khóa phô mai và trứng lòng đào!"), 1300);
    if (state.day === 3) setTimeout(() => toast("Đã mở khóa mỳ cay hải sản!"), 1300);
  }

  function buyUpgrade(id) {
    const upgrade = UPGRADES[id];
    const level = state.upgrades[id];
    if (!upgrade || level >= upgrade.max) return;
    const cost = upgrade.baseCost * (level + 1);
    if (state.money < cost) return toast("Chưa đủ tiền để nâng cấp.");
    state.money -= cost;
    state.upgrades[id] += 1;
    saveState();
    renderHeader();
    renderUpgradePanel();
    tone(980, 0.12);
    toast(`${upgrade.name} đã lên cấp ${state.upgrades[id]}!`);
  }

  function showModal(content, closable = true) {
    paused = true;
    els.modalCard.innerHTML = `${content}${closable ? `<div class="modal-actions"><button class="light" type="button" data-modal-action="close">Đóng</button></div>` : ""}`;
    els.modal.classList.remove("hidden");
  }

  function closeModal() {
    els.modal.classList.add("hidden");
    paused = false;
  }

  function showTutorial() {
    state.tutorialSeen = true;
    saveState();
    showModal(`<h2>🍜 Cách chơi</h2><p>Mỗi ngày có hai nhịp: chuẩn bị thật khéo, rồi phục vụ thật nhanh.</p>
      <ol class="tutorial-steps">
        <li><b>📦</b><span><strong>Nhập hàng</strong><br>Chú ý hạn dùng và số tiền trong quỹ.</span></li>
        <li><b>👀</b><span><strong>Đọc đơn</strong><br>Nhìn nhân chính, topping và đúng cấp cay.</span></li>
        <li><b>🍜</b><span><strong>Nấu món</strong><br>Lấy tô, thêm mỳ, nước dùng, nhân và ớt.</span></li>
        <li><b>⭐</b><span><strong>Giao nhanh</strong><br>Món đúng và khách còn vui sẽ được nhiều sao.</span></li>
      </ol>`);
  }

  function showSettings() {
    showModal(`<h2>⚙️ Cài đặt</h2><p>Tiến độ được lưu tự động ngay trên trình duyệt này.</p>
      <div class="modal-actions"><button type="button" data-modal-action="sound">${state.settings.sound ? "🔊 Tắt âm thanh" : "🔇 Bật âm thanh"}</button><button class="light" type="button" data-modal-action="tutorial">Xem hướng dẫn</button></div>
      <div class="danger-zone"><p><strong>Vùng nguy hiểm</strong><br>Xóa toàn bộ tiền, kho, nâng cấp và nhật ký.</p><button class="danger-btn" type="button" data-modal-action="reset">Xóa tiến độ</button></div>`);
  }

  function showRename() {
    showModal(`<h2>✎ Đổi tên quán</h2><p>Chọn một cái tên thật dễ nhớ (tối đa 28 ký tự).</p><input id="shopNameInput" maxlength="28" value="${escapeHtml(state.shopName)}" style="width:100%;padding:11px;border:2px solid #d8b38c;border-radius:10px;background:#fff;font-weight:800"><div class="modal-actions"><button type="button" data-modal-action="rename-save">Lưu tên</button><button class="light" type="button" data-modal-action="close">Hủy</button></div>`, false);
    const input = $("#shopNameInput");
    input.focus();
    input.select();
  }

  function handleModalAction(action) {
    if (action === "close") closeModal();
    if (action === "next-day") startNextDay();
    if (action === "tutorial") showTutorial();
    if (action === "sound") {
      state.settings.sound = !state.settings.sound;
      saveState();
      showSettings();
      if (state.settings.sound) tone(720, 0.08);
    }
    if (action === "rename-save") {
      const value = $("#shopNameInput").value.trim();
      if (!value) return toast("Tên quán không được để trống.");
      state.shopName = value.slice(0, 28);
      saveState();
      renderHeader();
      closeModal();
      toast("Đã treo biển hiệu mới!");
    }
    if (action === "reset") {
      if (!window.confirm("Xóa toàn bộ tiến độ và chơi lại từ đầu?")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* no-op */ }
      state = defaultState();
      pending = Object.fromEntries(Object.keys(INGREDIENTS).map((id) => [id, 0]));
      closeModal();
      els.splash.classList.remove("hidden");
      els.newGame.classList.add("hidden");
      els.start.textContent = "Vào bếp";
      renderPrep();
    }
  }

  function toast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  function tone(frequency, duration) {
    if (!state.settings.sound) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {
      // Audio is decorative; gameplay does not depend on it.
    }
  }

  function beginGame(forceTutorial = false) {
    els.splash.classList.add("hidden");
    renderPrep();
    tone(640, 0.07);
    if (forceTutorial || !state.tutorialSeen) setTimeout(showTutorial, 250);
  }

  $$(".tab").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
  els.panel.addEventListener("click", (event) => {
    const stockButton = event.target.closest("[data-stock-action]");
    if (stockButton) changePending(stockButton.dataset.id, stockButton.dataset.stockAction);
    const upgradeButton = event.target.closest("[data-upgrade]");
    if (upgradeButton) buyUpgrade(upgradeButton.dataset.upgrade);
  });
  els.ingredients.addEventListener("click", (event) => {
    const button = event.target.closest("[data-ingredient]");
    if (button) addIngredient(button.dataset.ingredient);
  });
  els.modalCard.addEventListener("click", (event) => {
    const button = event.target.closest("[data-modal-action]");
    if (button) handleModalAction(button.dataset.modalAction);
  });
  els.modalCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.id === "shopNameInput") handleModalAction("rename-save");
  });
  els.buy.addEventListener("click", purchasePending);
  els.open.addEventListener("click", openShop);
  els.serve.addEventListener("click", serveOrder);
  els.discard.addEventListener("click", discardBowl);
  els.settings.addEventListener("click", showSettings);
  els.rename.addEventListener("click", showRename);
  els.start.addEventListener("click", () => beginGame(false));
  els.newGame.addEventListener("click", () => {
    if (!window.confirm("Bỏ tiến độ hiện tại và bắt đầu một tiệm mới?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* no-op */ }
    state = defaultState();
    beginGame(true);
  });

  renderHeader();
  renderMenu();
  setTab("stock");
  updateCart();
  if (hasSave()) {
    els.start.textContent = "Tiếp tục vào bếp";
    els.newGame.classList.remove("hidden");
  }
})();
