// ============================================================
// data.js  –  טעינת נתונים מהשרת + רינדור הגריד
// ============================================================

let cages = [];
let currentCageId   = '';
let currentCageType = '';
let currentMiceInCage = [];

const colorMap = {
    'experiment control':        'type-gray',
    'experiment cbz 200 ng/l':   'type-blue',
    'experiment cbz 2000 ng/l':  'type-red',
    'mating':                    'type-yellow',
    'mating cbz 200 ng/l':       'type-turquoise',
    'stock male':                'type-green',
    'single male':               'type-dark-purple',
    'stock female':              'type-light-purple'
};

// טעינת כל הנתונים מהשרת ורינדור מחדש
async function loadData() {
    const stats = await (await fetch('/api/stats')).json();
    document.getElementById('totalMice').innerText = stats.total_mice;

    cages = await (await fetch('/api/cages')).json();
    renderGrid();

    document.getElementById('mCage').innerHTML =
        '<option value="">--Select--</option>' +
        cages.map(c => `<option value="${c.cage_id}">${c.cage_id} - ${c.cage_name}</option>`).join('');

    await updateCageWarnings();
}

// רינדור לוח הכלובים
function renderGrid() {
    const grid = document.getElementById('mainGrid');
    grid.innerHTML = '<div></div><div>C1</div><div>C2</div><div>C3</div><div>C4</div>';

    for (let r = 1; r <= 6; r++) {
        grid.innerHTML += `<div class="row-label">R${r}</div>`;
        for (let c = 1; c <= 4; c++) {
            const cage = cages.find(ca => ca.row === r && ca.col === c);
            if (cage) {
                grid.innerHTML += `
                    <div class="cell occupied ${colorMap[cage.cage_type.toLowerCase().trim()] || ''}"
                         id="cage-${cage.cage_id}"
                         onclick="openCageModal('${cage.cage_id}')">
                        <div class="cage-title">${cage.cage_name}</div>
                        <div class="cage-count" id="cnt-${cage.cage_id}">...</div>
                        <div style="font-size:10px">ID: ${cage.cage_id}</div>
                    </div>`;
                updateCount(cage.cage_id);
            } else {
                grid.innerHTML += `<div class="cell" onclick="openNewCage(${r},${c})">+</div>`;
            }
        }
    }
}

// עדכון מונה עכברים בכלוב
async function updateCount(id) {
    const res  = await fetch(`/api/mice?cage_id=${id}`);
    const mice = await res.json();
    document.getElementById(`cnt-${id}`).innerText = `${mice.length}/6`;
}

// סימון כלובים עם כפילות Mark
async function updateCageWarnings() {
    document.querySelectorAll('.cell').forEach(el => el.classList.remove('blink-red-border'));

    const response = await fetch('/api/mice');
    const mice = await response.json();

    const duplicateCageIds = new Set();
    const cageMap = {};
    mice.forEach(m => {
        if (!cageMap[m.cage_id]) cageMap[m.cage_id] = new Set();
        if (cageMap[m.cage_id].has(m.mark)) duplicateCageIds.add(m.cage_id);
        cageMap[m.cage_id].add(m.mark);
    });

    duplicateCageIds.forEach(cageId => {
        const el = document.getElementById('cage-' + cageId);
        if (el) el.classList.add('blink-red-border');
    });
}

// ייבוא מאקסל
function triggerImport(t) {
    window.importType = t;
    document.getElementById('excelFile').click();
}
async function handleImport(i) {
    const fd = new FormData();
    fd.append('file', i.files[0]);
    fd.append('type', window.importType);
    await fetch('/api/import', { method: 'POST', body: fd });
    loadData();
}

// הפעלה ראשונית
loadData();
