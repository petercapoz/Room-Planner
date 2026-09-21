const STORAGE_KEY = "roomcraft-planner-v3";

const roomTemplates = [
  { name: "Bedroom", length: 12, width: 11, height: 8 },
  { name: "Living", length: 18, width: 14, height: 9 },
  { name: "Office", length: 10, width: 10, height: 8 },
  { name: "Studio", length: 24, width: 18, height: 9 },
  { name: "Apartment", length: 32, width: 22, height: 9 },
];

const furnitureTemplates = [
  { name: "Twin Bed", length: 6.25, width: 3.2, height: 2.1, color: "#2f80ed" },
  { name: "Queen Bed", length: 6.7, width: 5, height: 2.3, color: "#1f6feb" },
  { name: "King Bed", length: 6.7, width: 6.35, height: 2.3, color: "#155e75" },
  { name: "Sectional Sofa", length: 9, width: 6, height: 2.8, color: "#0f766e" },
  { name: "Sofa", length: 7, width: 3.1, height: 2.8, color: "#16a34a" },
  { name: "Desk", length: 5, width: 2.5, height: 2.5, color: "#7c3aed" },
  { name: "Dining Table", length: 6, width: 3.5, height: 2.5, color: "#b45309" },
  { name: "Dresser", length: 5, width: 1.8, height: 3.2, color: "#be123c" },
  { name: "TV Stand", length: 5.5, width: 1.4, height: 1.8, color: "#475569" },
  { name: "Bookcase", length: 3.2, width: 1.2, height: 6, color: "#9333ea" },
];

const state = {
  projects: [],
  currentProjectId: null,
  selectedItemId: null,
  currentView: "2d",
  measureMode: false,
  measureSelection: [],
  measureResult: null,
  drag: null,
};

const dom = {};

function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultProject() {
  return {
    id: uid("project"),
    name: "Living Room Concept",
    room: { length: 18, width: 14, height: 9, unit: "ft" },
    furniture: [
      { id: uid("item"), name: "Sectional Sofa", length: 9, width: 6, height: 2.8, x: 1.8, y: 6.4, rotation: 0, color: "#0f766e" },
      { id: uid("item"), name: "TV Stand", length: 5.5, width: 1.4, height: 1.8, x: 6.2, y: 1.8, rotation: 0, color: "#475569" },
      { id: uid("item"), name: "Coffee Table", length: 4, width: 2.2, height: 1.4, x: 7, y: 3.7, rotation: 0, color: "#b45309" },
    ],
  };
}

function currentProject() {
  return state.projects.find((project) => project.id === state.currentProjectId);
}

function unit() {
  return currentProject().room.unit;
}

function fmt(value) {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit()}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundStep(value) {
  return Math.round(value * 10) / 10;
}

function footprint(item) {
  const rotated = item.rotation % 180 !== 0;
  return {
    width: rotated ? item.width : item.length,
    height: rotated ? item.length : item.width,
  };
}

function itemBounds(item) {
  const fp = footprint(item);
  return {
    left: item.x,
    top: item.y,
    right: item.x + fp.width,
    bottom: item.y + fp.height,
    width: fp.width,
    height: fp.height,
  };
}

function overlaps(a, b) {
  const ab = itemBounds(a);
  const bb = itemBounds(b);
  return ab.left < bb.right && ab.right > bb.left && ab.top < bb.bottom && ab.bottom > bb.top;
}

function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.projects = parsed.projects || [];
      state.currentProjectId = parsed.currentProjectId || state.projects[0]?.id;
    } catch {
      state.projects = [];
    }
  }

  if (!state.projects.length) {
    const project = defaultProject();
    state.projects = [project];
    state.currentProjectId = project.id;
  }
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      projects: state.projects,
      currentProjectId: state.currentProjectId,
    })
  );
  dom.saveStatus.textContent = "Saved";
}

function markDirty() {
  dom.saveStatus.textContent = "Saving...";
  window.clearTimeout(markDirty.timer);
  markDirty.timer = window.setTimeout(save, 120);
}

function cacheDom() {
  [
    "projectSelect",
    "newProjectBtn",
    "duplicateProjectBtn",
    "exportPngBtn",
    "exportPdfBtn",
    "saveStatus",
    "projectNameInput",
    "roomLengthInput",
    "roomWidthInput",
    "roomHeightInput",
    "unitSelect",
    "roomTemplates",
    "customNameInput",
    "customLengthInput",
    "customWidthInput",
    "customHeightInput",
    "customColorInput",
    "addCustomBtn",
    "selectedBadge",
    "selectedEmpty",
    "selectedEditor",
    "selectedNameInput",
    "selectedLengthInput",
    "selectedWidthInput",
    "selectedHeightInput",
    "selectedColorInput",
    "selectedXInput",
    "selectedYInput",
    "rotateLeftBtn",
    "rotateRightBtn",
    "duplicateItemBtn",
    "deleteItemBtn",
    "wallDistances",
    "view2dBtn",
    "view3dBtn",
    "measureBtn",
    "suggestBtn",
    "plannerStage",
    "floorPlan",
    "view3d",
    "furnitureLibrary",
    "spaceMeterFill",
    "spaceMetrics",
    "recommendations",
  ].forEach((id) => {
    dom[id] = document.getElementById(id);
  });
}

function bindEvents() {
  dom.projectSelect.addEventListener("change", () => {
    state.currentProjectId = dom.projectSelect.value;
    state.selectedItemId = null;
    state.measureSelection = [];
    state.measureResult = null;
    save();
    render();
  });

  dom.newProjectBtn.addEventListener("click", () => {
    const project = {
      id: uid("project"),
      name: `New Layout ${state.projects.length + 1}`,
      room: { length: 12, width: 10, height: 8, unit: "ft" },
      furniture: [],
    };
    state.projects.push(project);
    state.currentProjectId = project.id;
    state.selectedItemId = null;
    save();
    render();
  });

  dom.duplicateProjectBtn.addEventListener("click", () => {
    const source = currentProject();
    const copy = structuredClone(source);
    copy.id = uid("project");
    copy.name = `${source.name} Copy`;
    copy.furniture = copy.furniture.map((item) => ({ ...item, id: uid("item") }));
    state.projects.push(copy);
    state.currentProjectId = copy.id;
    state.selectedItemId = null;
    save();
    render();
  });

  dom.exportPngBtn.addEventListener("click", exportPng);
  dom.exportPdfBtn.addEventListener("click", exportPdf);

  ["projectNameInput", "roomLengthInput", "roomWidthInput", "roomHeightInput", "unitSelect"].forEach((id) => {
    dom[id].addEventListener("input", updateRoomFromInputs);
  });

  dom.addCustomBtn.addEventListener("click", () => {
    addFurniture({
      name: dom.customNameInput.value.trim() || "Custom Piece",
      length: Number(dom.customLengthInput.value) || 1,
      width: Number(dom.customWidthInput.value) || 1,
      height: Number(dom.customHeightInput.value) || 1,
      color: dom.customColorInput.value,
    });
  });

  [
    "selectedNameInput",
    "selectedLengthInput",
    "selectedWidthInput",
    "selectedHeightInput",
    "selectedColorInput",
    "selectedXInput",
    "selectedYInput",
  ].forEach((id) => {
    dom[id].addEventListener("input", updateSelectedFromInputs);
  });

  dom.rotateLeftBtn.addEventListener("click", () => rotateSelected(-90));
  dom.rotateRightBtn.addEventListener("click", () => rotateSelected(90));
  dom.duplicateItemBtn.addEventListener("click", duplicateSelectedItem);
  dom.deleteItemBtn.addEventListener("click", deleteSelectedItem);

  dom.view2dBtn.addEventListener("click", () => setView("2d"));
  dom.view3dBtn.addEventListener("click", () => setView("3d"));

  dom.measureBtn.addEventListener("click", () => {
    state.measureMode = !state.measureMode;
    state.measureSelection = [];
    state.measureResult = null;
    render();
  });

  dom.suggestBtn.addEventListener("click", suggestLayout);
  window.addEventListener("resize", renderStage);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function updateRoomFromInputs() {
  const project = currentProject();
  project.name = dom.projectNameInput.value.trim() || "Untitled Layout";
  project.room.length = Math.max(1, Number(dom.roomLengthInput.value) || 1);
  project.room.width = Math.max(1, Number(dom.roomWidthInput.value) || 1);
  project.room.height = Math.max(1, Number(dom.roomHeightInput.value) || 1);
  project.room.unit = dom.unitSelect.value;

  project.furniture.forEach((item) => clampItemToRoom(item));
  markDirty();
  render();
}

function updateSelectedFromInputs() {
  const item = selectedItem();
  if (!item) return;

  item.name = dom.selectedNameInput.value.trim() || "Furniture";
  item.length = Math.max(0.2, Number(dom.selectedLengthInput.value) || 0.2);
  item.width = Math.max(0.2, Number(dom.selectedWidthInput.value) || 0.2);
  item.height = Math.max(0.1, Number(dom.selectedHeightInput.value) || 0.1);
  item.color = dom.selectedColorInput.value;
  item.x = Number(dom.selectedXInput.value) || 0;
  item.y = Number(dom.selectedYInput.value) || 0;
  clampItemToRoom(item);
  markDirty();
  render();
}

function selectedItem() {
  return currentProject().furniture.find((item) => item.id === state.selectedItemId);
}

function setView(view) {
  state.currentView = view;
  render();
}

function addFurniture(template) {
  const project = currentProject();
  const item = {
    id: uid("item"),
    name: template.name,
    length: Number(template.length),
    width: Number(template.width),
    height: Number(template.height),
    rotation: 0,
    color: template.color,
    x: Math.max(0, (project.room.length - Number(template.length)) / 2),
    y: Math.max(0, (project.room.width - Number(template.width)) / 2),
  };
  clampItemToRoom(item);
  project.furniture.push(item);
  state.selectedItemId = item.id;
  markDirty();
  render();
}

function clampItemToRoom(item) {
  const project = currentProject();
  const fp = footprint(item);
  item.x = roundStep(clamp(item.x, 0, Math.max(0, project.room.length - fp.width)));
  item.y = roundStep(clamp(item.y, 0, Math.max(0, project.room.width - fp.height)));
}

function rotateSelected(delta) {
  const item = selectedItem();
  if (!item) return;
  item.rotation = (item.rotation + delta + 360) % 360;
  clampItemToRoom(item);
  markDirty();
  render();
}

function duplicateSelectedItem() {
  const item = selectedItem();
  if (!item) return;
  const copy = { ...item, id: uid("item"), name: `${item.name} Copy`, x: item.x + 0.8, y: item.y + 0.8 };
  clampItemToRoom(copy);
  currentProject().furniture.push(copy);
  state.selectedItemId = copy.id;
  markDirty();
  render();
}

function deleteSelectedItem() {
  const project = currentProject();
  project.furniture = project.furniture.filter((item) => item.id !== state.selectedItemId);
  state.selectedItemId = null;
  state.measureSelection = [];
  state.measureResult = null;
  markDirty();
  render();
}

function render() {
  renderProjectPicker();
  renderInputs();
  renderTemplates();
  renderLibrary();
  renderStage();
  renderSelectedEditor();
  renderMetrics();
  renderRecommendations();
}

function renderProjectPicker() {
  dom.projectSelect.innerHTML = state.projects
    .map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`)
    .join("");
  dom.projectSelect.value = state.currentProjectId;
}

function renderInputs() {
  const project = currentProject();
  dom.projectNameInput.value = project.name;
  dom.roomLengthInput.value = project.room.length;
  dom.roomWidthInput.value = project.room.width;
  dom.roomHeightInput.value = project.room.height;
  dom.unitSelect.value = project.room.unit;
}

function renderTemplates() {
  dom.roomTemplates.innerHTML = roomTemplates
    .map((template) => `<button class="template-chip" data-room-template="${template.name}">${template.name}</button>`)
    .join("");

  dom.roomTemplates.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const template = roomTemplates.find((entry) => entry.name === button.dataset.roomTemplate);
      const project = currentProject();
      project.room.length = template.length;
      project.room.width = template.width;
      project.room.height = template.height;
      project.furniture.forEach((item) => clampItemToRoom(item));
      markDirty();
      render();
    });
  });
}

function renderLibrary() {
  dom.furnitureLibrary.innerHTML = furnitureTemplates
    .map(
      (item, index) => `
        <button class="library-item" data-template-index="${index}">
          <span class="swatch" style="background:${item.color}"></span>
          <span><strong>${escapeHtml(item.name)}</strong><span>${fmtTemplate(item)}</span></span>
          <span class="add-glyph">+</span>
        </button>
      `
    )
    .join("");

  dom.furnitureLibrary.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => addFurniture(furnitureTemplates[Number(button.dataset.templateIndex)]));
  });
}

function renderStage() {
  const project = currentProject();
  const stageRect = dom.plannerStage.getBoundingClientRect();
  const maxWidth = Math.max(320, stageRect.width - 80);
  const maxHeight = Math.max(300, stageRect.height - 90);
  const scale = Math.min(maxWidth / project.room.length, maxHeight / project.room.width, 58);
  const planWidth = project.room.length * scale;
  const planHeight = project.room.width * scale;

  dom.view2dBtn.classList.toggle("active", state.currentView === "2d");
  dom.view3dBtn.classList.toggle("active", state.currentView === "3d");
  dom.floorPlan.classList.toggle("hidden", state.currentView !== "2d");
  dom.view3d.classList.toggle("hidden", state.currentView !== "3d");
  dom.measureBtn.classList.toggle("measure-on", state.measureMode);

  dom.floorPlan.style.width = `${planWidth}px`;
  dom.floorPlan.style.height = `${planHeight}px`;
  dom.floorPlan.style.backgroundSize = `${scale}px ${scale}px`;
  dom.floorPlan.innerHTML = wallLabelHtml(project);

  const conflictIds = new Set();
  project.furniture.forEach((item, index) => {
    project.furniture.slice(index + 1).forEach((other) => {
      if (overlaps(item, other)) {
        conflictIds.add(item.id);
        conflictIds.add(other.id);
      }
    });
  });

  project.furniture.forEach((item) => {
    const fp = footprint(item);
    const node = document.createElement("div");
    node.className = "furniture";
    node.dataset.itemId = item.id;
    node.style.left = `${item.x * scale}px`;
    node.style.top = `${item.y * scale}px`;
    node.style.width = `${fp.width * scale}px`;
    node.style.height = `${fp.height * scale}px`;
    node.style.background = `linear-gradient(135deg, ${item.color}, ${shade(item.color, -20)})`;
    if (item.id === state.selectedItemId) node.classList.add("selected");
    if (conflictIds.has(item.id)) node.classList.add("conflict");
    node.innerHTML = `
      <div class="rotation-badge">${item.rotation}°</div>
      <div class="furniture-label">${escapeHtml(item.name)}<span class="furniture-measure">${fmt(item.length)} × ${fmt(item.width)}</span></div>
      <div class="resize-handle" title="Resize"></div>
    `;
    node.addEventListener("pointerdown", (event) => onItemPointerDown(event, item.id, scale));
    node.addEventListener("click", (event) => onItemClick(event, item.id));
    dom.floorPlan.appendChild(node);
  });

  renderMeasureLine(scale);
  render3d(scale);
}

function wallLabelHtml(project) {
  const top = fmt(project.room.length);
  const side = fmt(project.room.width);
  return `
    <div class="wall-label top">North wall ${top}</div>
    <div class="wall-label bottom">South wall ${top}</div>
    <div class="wall-label left">West wall ${side}</div>
    <div class="wall-label right">East wall ${side}</div>
  `;
}

function onItemClick(event, itemId) {
  event.stopPropagation();
  if (state.measureMode) {
    if (!state.measureSelection.includes(itemId)) state.measureSelection.push(itemId);
    if (state.measureSelection.length > 2) state.measureSelection.shift();
    state.measureResult = state.measureSelection.length === 2 ? measureBetweenItems(state.measureSelection[0], state.measureSelection[1]) : null;
  } else {
    state.selectedItemId = itemId;
  }
  render();
}

function onItemPointerDown(event, itemId, scale) {
  event.preventDefault();
  event.stopPropagation();
  const item = currentProject().furniture.find((entry) => entry.id === itemId);
  state.selectedItemId = itemId;
  const isResize = event.target.classList.contains("resize-handle");
  state.drag = {
    type: isResize ? "resize" : "move",
    itemId,
    scale,
    startX: event.clientX,
    startY: event.clientY,
    original: { ...item },
  };
  event.currentTarget.setPointerCapture?.(event.pointerId);
  renderSelectedEditor();
}

function onPointerMove(event) {
  if (!state.drag) return;
  const item = currentProject().furniture.find((entry) => entry.id === state.drag.itemId);
  if (!item) return;

  const dx = (event.clientX - state.drag.startX) / state.drag.scale;
  const dy = (event.clientY - state.drag.startY) / state.drag.scale;

  if (state.drag.type === "move") {
    item.x = roundStep(state.drag.original.x + dx);
    item.y = roundStep(state.drag.original.y + dy);
  } else {
    const originalFp = footprint(state.drag.original);
    const nextWidth = Math.max(0.2, originalFp.width + dx);
    const nextHeight = Math.max(0.2, originalFp.height + dy);
    if (item.rotation % 180 !== 0) {
      item.width = roundStep(nextWidth);
      item.length = roundStep(nextHeight);
    } else {
      item.length = roundStep(nextWidth);
      item.width = roundStep(nextHeight);
    }
  }

  clampItemToRoom(item);
  markDirty();
  renderStage();
  renderSelectedEditor();
  renderMetrics();
  renderRecommendations();
}

function onPointerUp() {
  if (!state.drag) return;
  state.drag = null;
  save();
  render();
}

function renderSelectedEditor() {
  const item = selectedItem();
  dom.selectedBadge.textContent = item ? "Active" : "None";
  dom.selectedEmpty.classList.toggle("hidden", Boolean(item));
  dom.selectedEditor.classList.toggle("hidden", !item);
  if (!item) return;

  dom.selectedNameInput.value = item.name;
  dom.selectedLengthInput.value = item.length;
  dom.selectedWidthInput.value = item.width;
  dom.selectedHeightInput.value = item.height;
  dom.selectedColorInput.value = item.color;
  dom.selectedXInput.value = item.x;
  dom.selectedYInput.value = item.y;

  const project = currentProject();
  const b = itemBounds(item);
  dom.wallDistances.innerHTML = [
    ["Left wall", b.left],
    ["Right wall", project.room.length - b.right],
    ["Top wall", b.top],
    ["Bottom wall", project.room.width - b.bottom],
  ]
    .map(([label, value]) => `<div class="metric-row"><span>${label}</span><strong>${fmt(Math.max(0, value))}</strong></div>`)
    .join("");
}

function renderMetrics() {
  const project = currentProject();
  const roomArea = project.room.length * project.room.width;
  const furnitureArea = project.furniture.reduce((sum, item) => sum + item.length * item.width, 0);
  const freeArea = Math.max(0, roomArea - furnitureArea);
  const occupiedPct = clamp((furnitureArea / roomArea) * 100, 0, 100);
  dom.spaceMeterFill.style.width = `${occupiedPct}%`;
  dom.spaceMetrics.innerHTML = [
    ["Room area", `${fmt(roomArea)}²`],
    ["Furniture footprint", `${fmt(furnitureArea)}²`],
    ["Free floor space", `${fmt(freeArea)}²`],
    ["Open percentage", `${Math.round(100 - occupiedPct)}%`],
  ]
    .map(([label, value]) => `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderRecommendations() {
  const project = currentProject();
  const checks = [];
  let collisions = 0;
  project.furniture.forEach((item, index) => {
    project.furniture.slice(index + 1).forEach((other) => {
      if (overlaps(item, other)) collisions += 1;
    });
  });

  checks.push({
    level: collisions ? "bad" : "ok",
    text: collisions ? `${collisions} furniture overlap${collisions > 1 ? "s" : ""} detected.` : "No furniture collisions detected.",
  });

  const tightItems = project.furniture.filter((item) => {
    const b = itemBounds(item);
    return b.left < 1.5 || b.top < 1.5 || project.room.length - b.right < 1.5 || project.room.width - b.bottom < 1.5;
  });
  checks.push({
    level: tightItems.length ? "warn" : "ok",
    text: tightItems.length ? `${tightItems.length} item${tightItems.length > 1 ? "s are" : " is"} within ${fmt(1.5)} of a wall.` : `Wall clearances are at least ${fmt(1.5)} for placed items.`,
  });

  const roomArea = project.room.length * project.room.width;
  const furnitureArea = project.furniture.reduce((sum, item) => sum + item.length * item.width, 0);
  const freePct = roomArea ? ((roomArea - furnitureArea) / roomArea) * 100 : 0;
  checks.push({
    level: freePct < 35 ? "warn" : "ok",
    text: freePct < 35 ? "Free floor space is getting tight; consider circulation paths before finalizing." : "Free floor space leaves room for circulation.",
  });

  if (state.measureResult) {
    checks.unshift({ level: "ok", text: `Measured clearance: ${fmt(state.measureResult.distance)} between ${state.measureResult.labels}.` });
  } else if (state.measureMode) {
    checks.unshift({ level: "ok", text: "Measure mode is active. Select two furniture items to calculate edge-to-edge clearance." });
  }

  dom.recommendations.innerHTML = checks.map((check) => `<div class="check ${check.level}">${escapeHtml(check.text)}</div>`).join("");
}

function measureBetweenItems(firstId, secondId) {
  const first = currentProject().furniture.find((item) => item.id === firstId);
  const second = currentProject().furniture.find((item) => item.id === secondId);
  const a = itemBounds(first);
  const b = itemBounds(second);
  const horizontal = Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right));
  const vertical = Math.max(0, Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));
  return {
    distance: Math.sqrt(horizontal * horizontal + vertical * vertical),
    labels: `${first.name} and ${second.name}`,
  };
}

function renderMeasureLine(scale) {
  if (!state.measureResult || state.measureSelection.length !== 2) return;
  const [firstId, secondId] = state.measureSelection;
  const first = currentProject().furniture.find((item) => item.id === firstId);
  const second = currentProject().furniture.find((item) => item.id === secondId);
  if (!first || !second) return;
  const a = itemBounds(first);
  const b = itemBounds(second);
  const ax = (a.left + a.width / 2) * scale;
  const ay = (a.top + a.height / 2) * scale;
  const bx = (b.left + b.width / 2) * scale;
  const by = (b.top + b.height / 2) * scale;
  const dx = bx - ax;
  const dy = by - ay;
  const line = document.createElement("div");
  line.className = "measure-line";
  line.style.left = `${ax}px`;
  line.style.top = `${ay}px`;
  line.style.width = `${Math.sqrt(dx * dx + dy * dy)}px`;
  line.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  line.innerHTML = `<span>${fmt(state.measureResult.distance)}</span>`;
  dom.floorPlan.appendChild(line);
}

function render3d(scale) {
  const project = currentProject();
  const width = project.room.length * scale * 0.85;
  const height = project.room.width * scale * 0.85;
  const depthScale = Math.max(6, scale * 0.28);
  dom.view3d.innerHTML = `
    <div class="room-3d" style="width:${width}px;height:${height}px">
      <div class="floor-3d" style="width:${width}px;height:${height}px;background-size:${scale * 0.85}px ${scale * 0.85}px"></div>
    </div>
  `;
  const room = dom.view3d.querySelector(".room-3d");
  project.furniture.forEach((item) => {
    const fp = footprint(item);
    const block = document.createElement("div");
    block.className = "block-3d";
    block.style.left = `${item.x * scale * 0.85}px`;
    block.style.top = `${item.y * scale * 0.85}px`;
    block.style.width = `${fp.width * scale * 0.85}px`;
    block.style.height = `${fp.height * scale * 0.85}px`;
    block.style.background = item.color;
    block.style.setProperty("--depth", `${Math.max(8, item.height * depthScale)}px`);
    block.title = item.name;
    room.appendChild(block);
  });
}

function suggestLayout() {
  const project = currentProject();
  const sorted = [...project.furniture].sort((a, b) => b.length * b.width - a.length * a.width);
  const margin = Math.min(1.6, project.room.length / 8, project.room.width / 8);
  const positions = [
    { x: margin, y: margin },
    { x: project.room.length - margin, y: margin, alignRight: true },
    { x: margin, y: project.room.width - margin, alignBottom: true },
    { x: project.room.length - margin, y: project.room.width - margin, alignRight: true, alignBottom: true },
    { x: project.room.length / 2, y: project.room.width / 2, center: true },
  ];

  sorted.forEach((item, index) => {
    const fp = footprint(item);
    const slot = positions[index % positions.length];
    item.x = slot.center ? (project.room.length - fp.width) / 2 : slot.alignRight ? slot.x - fp.width : slot.x;
    item.y = slot.center ? (project.room.width - fp.height) / 2 : slot.alignBottom ? slot.y - fp.height : slot.y;
    clampItemToRoom(item);
  });

  markDirty();
  render();
}

function exportPng() {
  const project = currentProject();
  const link = document.createElement("a");
  link.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-layout.png`;
  link.href = createExportImage();
  link.click();
}

function createExportImage() {
  const project = currentProject();
  const canvas = document.createElement("canvas");
  const scale = 60;
  canvas.width = Math.ceil(project.room.length * scale + 96);
  canvas.height = Math.ceil(project.room.width * scale + 116);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#17202a";
  ctx.font = "bold 24px system-ui";
  ctx.fillText(project.name, 32, 34);
  ctx.font = "14px system-ui";
  ctx.fillStyle = "#64748b";
  ctx.fillText(`${fmt(project.room.length)} × ${fmt(project.room.width)} room`, 32, 58);

  const ox = 48;
  const oy = 84;
  ctx.fillStyle = "#fafaf7";
  ctx.fillRect(ox, oy, project.room.length * scale, project.room.width * scale);
  ctx.strokeStyle = "#263241";
  ctx.lineWidth = 8;
  ctx.strokeRect(ox, oy, project.room.length * scale, project.room.width * scale);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(38,50,65,0.16)";
  for (let x = 0; x <= project.room.length; x += 1) {
    ctx.beginPath();
    ctx.moveTo(ox + x * scale, oy);
    ctx.lineTo(ox + x * scale, oy + project.room.width * scale);
    ctx.stroke();
  }
  for (let y = 0; y <= project.room.width; y += 1) {
    ctx.beginPath();
    ctx.moveTo(ox, oy + y * scale);
    ctx.lineTo(ox + project.room.length * scale, oy + y * scale);
    ctx.stroke();
  }

  project.furniture.forEach((item) => {
    const fp = footprint(item);
    const x = ox + item.x * scale;
    const y = oy + item.y * scale;
    ctx.fillStyle = item.color;
    ctx.strokeStyle = "#17202a";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, fp.width * scale, fp.height * scale);
    ctx.strokeRect(x, y, fp.width * scale, fp.height * scale);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(item.name, x + (fp.width * scale) / 2, y + (fp.height * scale) / 2);
  });

  return canvas.toDataURL("image/png");
}

function exportPdf() {
  const image = createExportImage();
  const project = currentProject();
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(project.name)} PDF</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 24px; color: #17202a; }
          h1 { margin: 0 0 12px; font-size: 24px; }
          img { width: 100%; max-width: 960px; border: 1px solid #d7dde5; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(project.name)}</h1>
        <img alt="Exported room layout" src="${image}" />
        <script>window.addEventListener('load', () => window.print());</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function fmtTemplate(item) {
  return `${item.length} × ${item.width} × ${item.height}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shade(hex, amount) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = clamp((value >> 16) + amount, 0, 255);
  const g = clamp(((value >> 8) & 0xff) + amount, 0, 255);
  const b = clamp((value & 0xff) + amount, 0, 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

cacheDom();
load();
bindEvents();
render();
save();
