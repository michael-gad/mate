// ============================================================
// experiment.js  –  מעקב הזדווגות והריון
// ============================================================

async function openExpModal(mouseId) {
    event.stopImmediatePropagation();
    window.currentFemaleId  = mouseId;
    window.currentExpId     = null;

    document.getElementById('expMouseInfo').innerText = 'Female: ' + mouseId;
    document.getElementById('matingDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expMaleId').innerHTML = '<option>Loading...</option>';
    document.getElementById('matingSetup').style.display      = 'block';
    document.getElementById('pregnancyTracking').style.display = 'none';
    document.getElementById('expModal').classList.add('active');

    await _loadExpModal(mouseId);
}

async function _loadExpModal(mouseId) {
    try {
        // טעינת זכרים עם בדיקת אחים
        const males = await (await fetch(`/api/males?female_id=${mouseId}`)).json();
        window.malesData = males;

        document.getElementById('expMaleId').innerHTML = males.length === 0
            ? '<option value="">— No males in system —</option>'
            : males.map(m => {
                const isSib = !!m.sibling_reason;
                return `<option value="${m.mouse_id}" data-sibling="${isSib}">
                    ${isSib ? '⚠️ ' : ''}${m.mouse_id}${isSib ? ' — ' + m.sibling_reason : ''}
                </option>`;
              }).join('');
        _styleSelectOptions();

        // טעינת הניסוי האחרון (הפעיל)
        const expData = await (await fetch(`/api/experiment/active?female_id=${mouseId}`)).json();
        if (expData) {
            window.currentExpId = expData.id;
            window.matingDate   = expData.mating_date;
            _showTrackingView(expData);
            await loadPregWeights();
        } else {
            _showSetupView();
        }

        // טעינת היסטוריה (כל הניסויים)
        await _loadHistory(mouseId);

    } catch (err) {
        console.error('ExpModal load error:', err);
        alert('שגיאה בטעינת חלון הזיווג:\n' + err.message +
              '\n\nנסה לפתוח: http://localhost:5000/api/init_db');
    }
}

function _showSetupView() {
    document.getElementById('matingSetup').style.display       = 'block';
    document.getElementById('pregnancyTracking').style.display = 'none';
}

function _showTrackingView(exp) {
    document.getElementById('matingSetup').style.display       = 'none';
    document.getElementById('pregnancyTracking').style.display = 'block';
    document.getElementById('sacDate').innerText               = exp.sacrifice_date;
    document.getElementById('matingMaleDisplay').innerText     = exp.male_id;
    document.getElementById('matingDateDisplay').innerText     = exp.mating_date;
}

// ---- שמירת זיווג חדש ----

async function saveMating() {
    const sel  = document.getElementById('expMaleId');
    const male = sel.value;
    if (!male) return alert('Please select a male.');

    const maleData = (window.malesData || []).find(m => m.mouse_id === male);
    if (maleData && maleData.sibling_reason) {
        alert(`❌ לא ניתן לזווג — ${maleData.sibling_reason}\n\nאנא בחר זכר אחר.`);
        return;
    }

    const res = await fetch('/api/experiment', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            female_id:   window.currentFemaleId,
            male_id:     male,
            mating_date: document.getElementById('matingDate').value
        })
    });

    if (res.ok) {
        await _loadExpModal(window.currentFemaleId);
    } else {
        const err = await res.json();
        alert('שגיאה: ' + err.error);
    }
}

// ---- כפתורי מצב ----

function editMating() {
    _showSetupView();
}

// זיווג חדש — מאתחל טופס ריק, הניסוי הקודם נשמר בהיסטוריה
function startNewMating() {
    window.currentExpId = null;
    document.getElementById('matingDate').value = new Date().toISOString().split('T')[0];
    _showSetupView();
}

// ---- היסטוריית ניסויים ----

async function _loadHistory(femaleId) {
    const all = await (await fetch(`/api/experiment/history?female_id=${femaleId}`)).json();
    const tbody = document.getElementById('matingHistoryBody');

    if (all.length <= 1) {
        document.getElementById('matingHistorySection').style.display = 'none';
        return;
    }

    document.getElementById('matingHistorySection').style.display = 'block';
    // מציג את כל הניסויים מלבד האחרון (שמוצג בחלק הראשי)
    const past = all.slice(1);
    tbody.innerHTML = past.map(e => `
        <tr>
            <td>${e.mating_date}</td>
            <td>${e.male_id}</td>
            <td>${e.sacrifice_date}</td>
            <td><button class="table-btn btn-edit" onclick="viewPastMating(${e.id}, '${e.mating_date}')">View Weights</button></td>
        </tr>
    `).join('');
}

async function viewPastMating(expId, matingDate) {
    window.currentExpId = expId;
    window.matingDate   = matingDate;
    // מציג את ה-tracking section עם המשקלים של הניסוי ההיסטורי
    const expRes = await (await fetch(`/api/experiment/history?female_id=${window.currentFemaleId}`)).json();
    const exp    = expRes.find(e => e.id === expId);
    if (exp) _showTrackingView(exp);
    await loadPregWeights();
}

// ---- משקלי הריון ----

function _styleSelectOptions() {
    Array.from(document.getElementById('expMaleId').options).forEach(opt => {
        if (opt.dataset.sibling === 'true') {
            opt.style.color      = '#e74c3c';
            opt.style.fontWeight = 'bold';
            opt.style.background = '#fdf2f2';
        }
    });
}

async function loadPregWeights() {
    if (!window.currentExpId) return;
    const weights  = await (await fetch(`/api/preg_weights?experiment_id=${window.currentExpId}`)).json();
    const matingDt = new Date(window.matingDate);
    let initialW = 0, latestW = 0;

    document.getElementById('pregWeightBody').innerHTML = weights.map(w => {
        const gd = ((new Date(w.date) - matingDt) / 86400000) - 0.5;
        if (gd <= 0.5) initialW = w.weight;
        latestW = w.weight;
        return `<tr>
            <td><input type="date" value="${w.date}"
                       onchange="updatePregW('${w.date}', this.value, ${w.weight})"></td>
            <td>${gd.toFixed(1)}</td>
            <td><input type="number" step="0.1" value="${w.weight}" style="width:65px"
                       onchange="updatePregW('${w.date}', '${w.date}', this.value)"></td>
            <td><button class="btn btn-danger" style="padding:2px 6px; font-size:11px"
                        onclick="deletePregW(${window.currentExpId}, '${w.date}')">Del</button></td>
        </tr>`;
    }).join('');

    const status = document.getElementById('pregStatus');
    const diff   = latestW - initialW;
    if (initialW > 0 && diff >= 5) {
        status.innerText   = `✅ PREGNANT (+${diff.toFixed(1)}g)`;
        status.style.color = '#27ae60';
    } else if (weights.length > 0) {
        status.innerText   = `Monitoring... (Δ${diff.toFixed(1)}g)`;
        status.style.color = '#e67e22';
    } else {
        status.innerText   = 'No weights recorded yet';
        status.style.color = '#7f8c8d';
    }
}

async function addPregWeight() {
    const d = document.getElementById('newPregDate').value;
    const w = document.getElementById('newPregWeight').value;
    if (!d || !w) return alert('Please fill in both date and weight.');
    const gd = ((new Date(d) - new Date(window.matingDate)) / 86400000) - 0.5;
    await fetch('/api/preg_weights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            experiment_id: window.currentExpId,
            female_id:     window.currentFemaleId,
            date: d, weight: parseFloat(w), gd_day: gd
        })
    });
    loadPregWeights();
}

async function updatePregW(oldD, newD, newW) {
    if (oldD !== newD)
        await fetch(`/api/preg_weights/${window.currentExpId}/${oldD}`, { method: 'DELETE' });
    const gd = ((new Date(newD) - new Date(window.matingDate)) / 86400000) - 0.5;
    await fetch('/api/preg_weights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            experiment_id: window.currentExpId,
            female_id:     window.currentFemaleId,
            date: newD, weight: parseFloat(newW), gd_day: gd
        })
    });
    loadPregWeights();
}

async function deletePregW(expId, date) {
    if (confirm('Delete this weight entry?')) {
        await fetch(`/api/preg_weights/${expId}/${date}`, { method: 'DELETE' });
        loadPregWeights();
    }
}
