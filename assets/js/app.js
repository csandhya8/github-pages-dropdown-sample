
// Simple utility to fetch local JSON with no caching
async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function setStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg || '';
  el.style.color = type === 'error' ? 'var(--danger)' : 'var(--muted)';
}

function setOptions(select, items, placeholderText) {
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = placeholderText;
  select.appendChild(placeholder);

  if (Array.isArray(items)) {
    for (const item of items) {
      const opt = document.createElement('option');
      // support {code,name} or {id,name}
      const value = item.code || item.id;
      opt.value = value;
      opt.textContent = item.name;
      select.appendChild(opt);
    }
  }
}

function saveSelection({ country, state, city }) {
  const payload = { country: country || '', state: state || '', city: city || '' };
  localStorage.setItem('selection', JSON.stringify(payload));
}

function loadSavedSelection() {
  try {
    const raw = localStorage.getItem('selection');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function getParamsSelection() {
  const p = new URLSearchParams(window.location.search);
  return { country: p.get('country') || '', state: p.get('state') || '', city: p.get('city') || '' };
}

async function loadCountries() {
  setStatus('Loading countries…');
  const countrySel = document.getElementById('country');
  const countries = await fetchJSON('data/countries.json');
  setOptions(countrySel, countries, 'Select a country');
  setStatus('');
}

async function loadStates(countryCode) {
  setStatus('Loading states…');
  const stateSel = document.getElementById('state');
  stateSel.disabled = true;
  const statesByCountry = await fetchJSON('data/states.json');
  const states = statesByCountry[countryCode] || [];
  setOptions(stateSel, states, states.length ? 'Select a state' : 'No states found');
  stateSel.disabled = states.length === 0;
  setStatus('');
}

async function loadCities(stateCode) {
  setStatus('Loading cities…');
  const citySel = document.getElementById('city');
  citySel.disabled = true;
  const citiesByState = await fetchJSON('data/cities.json');
  const cities = citiesByState[stateCode] || [];
  setOptions(citySel, cities, cities.length ? 'Select a city' : 'No cities found');
  citySel.disabled = cities.length === 0;
  setStatus('');
}

function updateSummary() {
  const countrySel = document.getElementById('country');
  const stateSel = document.getElementById('state');
  const citySel = document.getElementById('city');
  document.getElementById('summary-country').textContent = countrySel.options[countrySel.selectedIndex]?.text || '—';
  document.getElementById('summary-state').textContent = stateSel.options[stateSel.selectedIndex]?.text || '—';
  document.getElementById('summary-city').textContent = citySel.options[citySel.selectedIndex]?.text || '—';
}

async function init() {
  const countrySel = document.getElementById('country');
  const stateSel = document.getElementById('state');
  const citySel = document.getElementById('city');
  const clearBtn = document.getElementById('clear');
  const reloadBtn = document.getElementById('reload');

  // Load countries first
  try {
    await loadCountries();
  } catch (err) {
    console.error(err);
    setStatus(err.message, 'error');
    return;
  }

  const params = getParamsSelection();
  const saved = loadSavedSelection();

  // Preselect order: URL params > saved > none
  const preCountry = params.country || saved.country || '';
  if (preCountry) {
    countrySel.value = preCountry;
    await loadStates(preCountry).catch(err => setStatus(err.message, 'error'));
  }

  const preState = params.state || saved.state || '';
  if (preCountry && preState) {
    stateSel.value = preState;
    await loadCities(preState).catch(err => setStatus(err.message, 'error'));
  }

  const preCity = params.city || saved.city || '';
  if (preCountry && preState && preCity) {
    citySel.value = preCity;
  }

  updateSummary();

  // Event listeners
  countrySel.addEventListener('change', async (e) => {
    const country = e.target.value;
    // reset dependent
    setOptions(stateSel, [], '—');
    setOptions(citySel, [], '—');
    stateSel.disabled = true;
    citySel.disabled = true;

    if (country) {
      await loadStates(country).catch(err => setStatus(err.message, 'error'));
    }
    saveSelection({ country, state: '', city: '' });
    updateSummary();
  });

  stateSel.addEventListener('change', async (e) => {
    const country = countrySel.value;
    const state = e.target.value;
    setOptions(citySel, [], '—');
    citySel.disabled = true;
    if (state) {
      await loadCities(state).catch(err => setStatus(err.message, 'error'));
    }
    saveSelection({ country, state, city: '' });
    updateSummary();
  });

  citySel.addEventListener('change', (e) => {
    const country = countrySel.value;
    const state = stateSel.value;
    const city = e.target.value;
    saveSelection({ country, state, city });
    updateSummary();
  });

  clearBtn.addEventListener('click', () => {
    localStorage.removeItem('selection');
    countrySel.value = '';
    setOptions(stateSel, [], '—');
    setOptions(citySel, [], '—');
    stateSel.disabled = true;
    citySel.disabled = true;
    updateSummary();
  });

  reloadBtn.addEventListener('click', () => {
    // Force reload from JSON files
    init();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
