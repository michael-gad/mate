// ============================================================
// mice.js  –  עכברים: הוספה, עריכה, הקרבה, ארכיון, אירועים
// ============================================================

// ---- פתיחת מודאל עכבר ----

function openMouseModal() {
    window.isEditMode = false;
    document.getElementById('mId').value = '';
    document.getElementById('mId').disabled = false;
    document.getElementById('mFather').value = '';
    document.getElementById('mMother').value = '';
    document.getElementById('mouseModal').classList.add('active');
}

function closeMouseModal() {
    document.getElementById('mouseModal').classList.remove('active');
}

// מילוי שדות מודאל עכבר לעריכה
async function editMouse(mouseId) {
    event.stopPropagation();
    window.isEditMode = true;
    const mouse = currentMiceInCage.find(m => m.mouse_id === mouseId);
    if (!mouse) { console.error('Mouse not found!'); return; }

    document.getElementById('mId').value = mouse.mouse_id;
    document.getElementById('mId').disabled = true;
    document.getElementById('mMark').value = mouse.mark;
    document.getElementById('mSex').value = mouse.sex;
    document.getElementById('mDob').value = mouse.dob || '';
    document.getElementById('mFather').value = mouse.father || '';
    document.getElementById('mMother').value = mouse.mother || '';
    document.getElementById('mCage').value = mouse.cage_id;
    document.getElementById('mCbz').value = mouse.cbz_start || '';
    document.getElementById('mouseModal').classList.add('active');
}

// שמירת עכבר חדש
async function saveMouse() {
    const mId   = document.getElementById('mId').value.trim();
    const mMark = document.getElementById('mMark').value.trim();
    const mSex  = document.getElementById('mSex').value.trim();
    const mDob  = document.getElementById('mDob').value;
    const mCage = document.getElementById('mCage').value.trim();

    if (!mId || !mMark || !mSex || !mDob || !mCage) {
        alert('שגיאה: חסרים פרטים חיוניים!'); return;
    }

    const responseCheck = await fetch('/api/mice');
    const existingMice  = await responseCheck.json();

    if (existingMice.some(mouse => mouse.mouse_id === mId)) {
        alert('שגיאה: עכבר עם Mouse ID זהה כבר קיים במושבה!'); return;
    }

    const miceInCage = existingMice.filter(mouse => mouse.cage_id === mCage);
    if (miceInCage.length >= 6) {
        alert('שגיאה: הכלוב מלא! לא ניתן להוסיף יותר מ-6 עכברים בכלוב.'); return;
    }

    const isMarkDuplicate = miceInCage.some(mouse => mouse.mark === mMark);
    if (isMarkDuplicate)
        alert('שימו לב: קיים כבר עכבר עם סימון (Mark) זהה בכלוב הזה. העכבר ייווצר בכל זאת.');

    const mouseData = {
        mouse_id: mId, mark: mMark, sex: mSex, dob: mDob, cage_id: mCage,
        father: document.getElementById('mFather').value.trim(),
        mother: document.getElementById('mMother').value.trim(),
        cbz_start: document.getElementById('mCbz').value.trim()
    };

    try {
        const response = await fetch('/api/mice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mouseData)
        });
        if (response.ok) {
            await loadData(); closeModals();
            alert('העכבר נוסף בהצלחה!');
        } else {
            const error = await response.json();
            alert('שגיאה מהשרת: ' + (error.error || 'לא ניתן להוסיף את העכבר'));
        }
    } catch (err) {
        console.error(err); alert('שגיאת תקשורת עם השרת');
    }
}

// עדכון עכבר קיים
async function updateMouse() {
    const mId = document.getElementById('mId').value.trim();
    const mouseData = {
        mouse_id: mId,
        mark:      document.getElementById('mMark').value.trim(),
        sex:       document.getElementById('mSex').value.trim(),
        dob:       document.getElementById('mDob').value,
        cage_id:   document.getElementById('mCage').value.trim(),
        father:    document.getElementById('mFather').value.trim(),
        mother:    document.getElementById('mMother').value.trim(),
        cbz_start: document.getElementById('mCbz').value.trim()
    };

    const response = await fetch(`/api/mice/${mId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mouseData)
    });

    if (response.ok) {
        alert('הפרטים עודכנו בהצלחה!');
        closeMouseModal();
        await openCageModal(mouseData.cage_id);
        await updateCageWarnings();
    } else {
        alert('שגיאה בעדכון העכבר.');
    }
}

// מחיקת עכבר
async function deleteMouse(id) {
    if (confirm('Delete?')) {
        await fetch(`/api/mice/${id}`, { method: 'DELETE' });
        loadData(); closeModals();
    }
}

// ---- הקרבה ----

function openSacrificeModal(mouseId) {
    event.stopPropagation();
    window.currentMouseId = mouseId;
    document.getElementById('sacrificeMouseText').innerText = 'Sacrificing mouse: ' + mouseId;
    document.getElementById('sacrificeDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('sacrificeModal').classList.add('active');
}

function closeSacrificeModal() {
    document.getElementById('sacrificeModal').classList.remove('active');
}

async function submitSacrifice() {
    const data = {
        mouse_id: window.currentMouseId,
        date:     document.getElementById('sacrificeDate').value,
        reason:   document.getElementById('sacrificeReason').value
    };
    const res = await fetch('/api/sacrifice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        closeSacrificeModal();
        closeModals();
        await loadData();
    } else {
        const err = await res.json().catch(() => ({}));
        alert('Error: ' + (err.error || 'Could not save sacrifice'));
    }
}

// ---- ארכיון ----

function openArchiveOnly() {
    document.getElementById('archiveModal').classList.add('active');
    showArchiveWindow();
}

function closeArchive() {
    document.getElementById('archiveModal').classList.remove('active');
}

async function showArchiveWindow() {
    try {
        const response = await fetch('/api/mice/sacrificed');
        if (!response.ok) throw new Error('Server error');
        const sacrificedMice = await response.json();
        document.getElementById('archiveTableBody').innerHTML = sacrificedMice.map(m => `
            <tr style="cursor:pointer" onclick="openArchivedMouse(${JSON.stringify(m).replace(/"/g,'&quot;')})">
                <td style="color:#2980b9; text-decoration:underline">${m.mouse_id}</td>
                <td>${m.mark || '-'}</td>
                <td>${m.sex || '-'}</td>
                <td>${m.cage_id || '-'}</td>
                <td>${m.sacrifice_date || '-'}</td>
                <td>${m.reason || '-'}</td>
                <td onclick="event.stopPropagation()">
                    <button class="table-btn btn-record" onclick="openArchivedMouse(${JSON.stringify(m).replace(/"/g,'&quot;')})">&#128065; View</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Archive fetch error:', e);
    }
}

function openArchivedMouse(m) {
    if (typeof m === 'string') m = JSON.parse(m.replace(/&quot;/g,'"'));
    window.currentArchivedMouse = m;
    document.getElementById('amId').innerText      = m.mouse_id   || '-';
    document.getElementById('amMark').innerText    = m.mark       || '-';
    document.getElementById('amSex').innerText     = m.sex        || '-';
    document.getElementById('amDob').innerText     = m.dob        || '-';
    document.getElementById('amCage').innerText    = m.cage_id    || '-';
    document.getElementById('amFather').innerText  = m.father     || '-';
    document.getElementById('amMother').innerText  = m.mother     || '-';
    document.getElementById('amCbz').innerText     = m.cbz_start  || '-';
    document.getElementById('amSacDate').innerText = m.sacrifice_date || '-';
    document.getElementById('amReason').innerText  = m.reason     || '-';
    document.getElementById('archiveMouseModal').classList.add('active');
}

async function restoreMouse() {
    const m = window.currentArchivedMouse;
    if (!m) return;
    if (!confirm(`Restore mouse ${m.mouse_id} back to cage ${m.cage_id}?`)) return;
    const res = await fetch('/api/restore', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mouse_id: m.mouse_id })
    });
    const result = await res.json();
    if (res.ok) {
        document.getElementById('archiveMouseModal').classList.remove('active');
        await loadData();
        await showArchiveWindow();
        alert(`Mouse ${m.mouse_id} restored to cage ${m.cage_id} successfully.`);
    } else {
        alert('Cannot restore: ' + result.error);
    }
}

// ---- אירועים (משקל / המלטה) ----

function handleRecordClick(mouseId, cageType) {
    event.stopPropagation();
    const expTypes = ['experiment control', 'experiment cbz 200 ng/l', 'experiment cbz 2000 ng/l'];
    if (expTypes.includes(cageType.toLowerCase().trim())) {
        openExpModal(mouseId);
    } else {
        openWeightModal(mouseId);
    }
}

async function openWeightModal(mouseId) {
    window.currentMouseId = mouseId;
    document.getElementById('eventMouseInfo').innerText = 'Mouse: ' + mouseId;
    document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('isLitter').checked = false;
    toggleEventType();
    try { await loadEventHistory(mouseId); }
    catch (error) { console.error('שגיאה בטעינת היסטוריה:', error); }
    document.getElementById('weightModal').classList.add('active');
}

async function saveEvent() {
    const isL   = document.getElementById('isLitter').checked;
    const d     = document.getElementById('eventDate').value;
    const mouseId = window.currentMouseId;
    if (isL) {
        await fetch('/api/litters', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mouse_id: mouseId, birth_date: d,
                pups_count:   document.getElementById('pupsCount').value,
                weaning_date: document.getElementById('weaningDate').value }) });
    } else {
        await fetch('/api/weights', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mouse_id: mouseId, date: d,
                weight: document.getElementById('weightValue').value }) });
    }
    loadEventHistory(mouseId);
}

async function loadEventHistory(id) {
    const [wR, lR] = await Promise.all([fetch(`/api/weights/${id}`), fetch(`/api/litters/${id}`)]);
    const weights  = await wR.json();
    const litters  = await lR.json();

    let evs = weights.map(w => ({ id: w.id, t: 'Weight', d: w.date, i: w.weight + 'g', type: 'weight' }));
    litters.forEach(l => evs.push({ id: l.id, t: 'Litter', d: l.birth_date, i: l.pups_count + ' pups', type: 'litter' }));
    evs.sort((a, b) => new Date(b.d) - new Date(a.d));

    document.getElementById('eventHistoryBody').innerHTML = evs.map(e => `
        <tr>
            <td>${e.t}</td><td>${e.d}</td><td>${e.i}</td>
            <td>
                <button class="table-btn btn-edit"      onclick="editEvent('${e.type}', ${e.id})">Edit</button>
                <button class="table-btn btn-sacrifice"  onclick="deleteEvent('${e.type}', ${e.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function deleteEvent(type, id) {
    if (!confirm('Delete this record?')) return;
    await fetch(`/api/${type}s/${id}`, { method: 'DELETE' });
    loadEventHistory(window.currentMouseId);
}

async function editEvent(type, id) {
    const newVal = prompt(type === 'weight' ? 'New weight (g):' : 'New pups count:');
    if (newVal === null) return;
    const newDate = prompt('New date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!newDate) return;

    const body = type === 'weight'
        ? { date: newDate, weight: parseFloat(newVal) }
        : { birth_date: newDate, pups_count: parseInt(newVal),
            weaning_date: new Date(new Date(newDate).getTime() + 21*86400000).toISOString().split('T')[0] };

    await fetch(`/api/${type}s/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    loadEventHistory(window.currentMouseId);
}

function toggleEventType() {
    const isL = document.getElementById('isLitter').checked;
    document.getElementById('weightFields').style.display = isL ? 'none' : 'block';
    document.getElementById('litterFields').style.display = isL ? 'block' : 'none';
    if (isL) updateWeaningDate();
}

function updateWeaningDate() {
    const d = document.getElementById('eventDate').value;
    if (!d) return;
    let dt = new Date(d);
    dt.setDate(dt.getDate() + 21);
    document.getElementById('weaningDate').value = dt.toISOString().split('T')[0];
}

// ---- סגירה כללית ----

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}
