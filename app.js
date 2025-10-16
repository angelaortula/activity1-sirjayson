// --- State ---
let students = []; // { student_id, student_name, section, tuition_fee, initial_payout }
let sortState = { key: 'student_name', dir: 'asc' };

// --- Utilities ---
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function setStatus(msg) {
  const el = $('#status');
  if (el) el.textContent = msg ?? '';
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// --- Load & Parse XML ---
async function loadXML() {
  try {
    setStatus('Loading XML…');
    const res = await fetch('./students.xml', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const dom = new DOMParser().parseFromString(text, 'application/xml');

    if (dom.querySelector('parsererror')) throw new Error('Invalid XML format.');

    const nodes = dom.querySelectorAll('catalog > student');
    students = [...nodes].map(s => ({
      student_id: s.getAttribute('id') || '',
      student_name: s.querySelector('name')?.textContent?.trim() || '',
      section: s.querySelector('section')?.textContent?.trim() || '',
      tuition_fee: Number(s.querySelector('tuition_fee')?.textContent?.trim() || '0'),
      initial_payout: Number(s.querySelector('initial_payout')?.textContent?.trim() || '0'),
    }));

    render();
    setStatus(`Loaded ${students.length} students from XML.`);
  } catch (err) {
    console.error(err);
    setStatus(`Failed to load XML: ${err.message}.`);
  }
}

// --- Render Table ---
function render() {
  const q = $('#search').value.trim().toLowerCase();
  let filtered = students.filter(s =>
    s.student_name.toLowerCase().includes(q) ||
    s.section.toLowerCase().includes(q)
  );

  const { key, dir } = sortState;
  const mult = dir === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const va = a[key], vb = b[key];
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * mult;
    }
    return String(va).localeCompare(String(vb)) * mult;
  });

  const tbody = $('#studentsBody');
  tbody.innerHTML = '';
  for (const s of filtered) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.student_id}</td>
      <td>${s.student_name}</td>
      <td>${s.section}</td>
      <td>₱${s.tuition_fee.toFixed(2)}</td>
      <td>₱${s.initial_payout.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  }
}

// --- Add Student ---
function setupForm() {
  $('#addForm').addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const newStudent = {
      student_id: data.get('student_id').trim(),
      student_name: data.get('student_name').trim(),
      section: data.get('section').trim(),
      tuition_fee: Number(data.get('tuition_fee')),
      initial_payout: Number(data.get('initial_payout')),
    };

    if (students.some(s => s.student_id === newStudent.student_id)) {
      setStatus(`Student ID "${newStudent.student_id}" already exists.`);
      return;
    }

    students.push(newStudent);
    e.currentTarget.reset();
    render();
    setStatus(`Added "${newStudent.student_name}".`);
  });
}

// --- Search ---
function setupSearch() {
  $('#search').addEventListener('input', () => render());
}

// --- Sorting ---
function setupSorting() {
  $$('#studentsTable thead th').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-key');
      if (!key) return;
      if (sortState.key === key) {
        sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
      } else {
        sortState.key = key;
        sortState.dir = 'asc';
      }
      render();
    });
  });
}

// --- Export to XML ---
function setupExport() {
  $('#exportBtn').addEventListener('click', () => {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<catalog>',
      ...students.map(s => (
        `  <student id="${escapeXml(s.student_id)}">` +
        `\n    <name>${escapeXml(s.student_name)}</name>` +
        `\n    <section>${escapeXml(s.section)}</section>` +
        `\n    <tuition_fee>${s.tuition_fee.toFixed(2)}</tuition_fee>` +
        `\n    <initial_payout>${s.initial_payout.toFixed(2)}</initial_payout>` +
        `\n  </student>`
      )),
      '</catalog>'
    ].join('\n');

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_export.xml';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus('Exported current data to students_export.xml.');
  });
}

// --- Initialize ---
window.addEventListener('DOMContentLoaded', async () => {
  setupForm();
  setupSearch();
  setupSorting();
  setupExport();
  await loadXML();
});
