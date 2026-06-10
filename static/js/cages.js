// ============================================================
// cages.js  –  פעולות כלוב (פתיחה, שמירה, מחיקה)
// ============================================================

// עיצוב תאריך להצגה (YYYY-MM-DD → DD/MM/YYYY)
function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr === '' || dateStr === 'None' || dateStr === 'null' || dateStr === '-') return '';
    let cleanDate = dateStr.toString().split(' ')[0].split('T')[0];
    const parts = cleanDate.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
}

function formatDate(d) { return d ? d.split(' ')[0] : '-'; }

// פתיחת תא ריק ליצירת כלוב חדש
function openNewCage(r, c) {
    document.getElementById('cageId').value = '';
    document.getElementById('cageId').disabled = false;
    document.getElementById('cageName').value = '';
    document.getElementById('cageType').selectedIndex = 0;
    document.getElementById('cageDate').value = '';
    document.getElementById('cRow').value = r;
    document.getElementById('rSlider').value = r;
    document.getElementById('cCol').value = c;
    document.getElementById('colSlider').value = c;
    document.getElementById('miceTableBody').innerHTML = '';
    document.getElementById('cageModalTitle').innerText = 'Create New Cage';
    document.getElementById('cageModal').classList.add('active');
}

// פתיחת כלוב קיים לעריכה
async function openCageModal(id) {
    const cage = cages.find(c => c.cage_id === id);
    if (!cage) return;

    document.getElementById('cageId').value = cage.cage_id;
    document.getElementById('cageId').disabled = true;
    document.getElementById('cageName').value = cage.cage_name;
    document.getElementById('cageType').value = cage.cage_type;
    document.getElementById('cageDate').value = cage.open_date || '';
    document.getElementById('cRow').value = cage.row;
    document.getElementById('rSlider').value = cage.row;
    document.getElementById('cCol').value = cage.col;
    document.getElementById('colSlider').value = cage.col;
    document.getElementById('cageModalTitle').innerText = 'Edit Cage';
    document.getElementById('miceInCageSection').style.display = 'block';

    const response = await fetch(`/api/mice?cage_id=${id}`);
    const mice = await response.json();
    currentMiceInCage = mice;
    currentCageType = cage.cage_type;

    document.getElementById('miceTableBody').innerHTML = mice.map(m => `
        <tr>
            <td>${m.mouse_id}</td>
            <td>${m.mark}</td>
            <td>${m.sex}</td>
            <td>${formatDisplayDate(m.dob)}</td>
            <td>${m.father || '-'}</td>
            <td>${m.mother || '-'}</td>
            <td>${formatDisplayDate(m.cbz_start)}</td>
            <td>
                <button class="table-btn btn-record"   onclick="handleRecordClick('${m.mouse_id}', '${cage.cage_type}')">Record</button>
                <button class="table-btn btn-edit"     onclick="event.stopPropagation(); editMouse('${m.mouse_id}')">Edit</button>
                <button class="table-btn btn-sacrifice" onclick="openSacrificeModal('${m.mouse_id}')">Sacrifice</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('cageModal').classList.add('active');
}

// שמירת כלוב (חדש או עריכה)
async function saveCage() {
    const id   = document.getElementById('cageId').value.trim();
    const name = document.getElementById('cageName').value.trim();
    const type = document.getElementById('cageType').value.trim();
    const date = document.getElementById('cageDate').value;
    const row  = document.getElementById('cRow').value;
    const col  = document.getElementById('cCol').value;
    const isEdit = document.getElementById('cageId').disabled;

    if (!id || !name || !type || !date || !row || !col)
        return alert('Please fill in all required fields.');
    if (!/^\d{6}$/.test(id))
        return alert('Cage ID must be exactly 6 digits.');
    if (cages.some(c => c.row == row && c.col == col && c.cage_id !== id))
        return alert(`This location (Row ${row}, Col ${col}) is already occupied!`);
    if (!isEdit && cages.some(c => c.cage_id === id))
        return alert('Cage ID already exists in the system.');

    const data = { cage_id: id, cage_name: name, cage_type: type, row: parseInt(row), col: parseInt(col), open_date: date };
    const response = await fetch('/api/cages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (response.ok) {
        await loadData();
        closeModals();
    } else {
        const errText = await response.text();
        alert('Server error: ' + errText);
    }
}

// מחיקת כלוב
async function deleteCage() {
    const id = document.getElementById('cageId').value;
    if (confirm('Delete?')) {
        const res = await fetch(`/api/cages/${id}`, { method: 'DELETE' });
        if (res.ok) { loadData(); closeModals(); }
        else alert('Error');
    }
}

// סגירת מודאל כלוב
function closeCage() {
    document.getElementById('cageModal').classList.remove('active');
}
