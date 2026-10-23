// CORS-прокси для обхода блокировки Steam
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

async function checkProfile() {
  const input = document.getElementById('steamInput').value.trim();
  const btn = document.getElementById('checkBtn');
  const result = document.getElementById('result');
  const error = document.getElementById('error');

  if (!input) {
    showError('Введи SteamID64 или ссылку на профиль');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;
  result.classList.add('hidden');
  error.classList.add('hidden');

  try {
    const steamId = await resolveSteamId(input);
    const profileUrl = `https://steamcommunity.com/profiles/${steamId}/?xml=1`;
    const response = await fetch(CORS_PROXY + encodeURIComponent(profileUrl));
    const xmlText = await response.text();

    if (!xmlText || xmlText.includes('<error>')) {
      throw new Error('Профиль не найден или закрыт');
    }

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');

    if (xml.querySelector('error')) {
      throw new Error('Профиль не найден или закрыт');
    }

    displayProfile(xml);
  } catch (err) {
    showError('❌ ' + err.message);
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

async function resolveSteamId(input) {
  // Если уже SteamID64 (17 цифр)
  if (/^\d{17}$/.test(input)) return input;

  // Если URL — извлекаем custom ID
  const urlMatch = input.match(/steamcommunity\.com\/(id|profiles)\/([^\/\?]+)/);
  if (urlMatch) {
    if (urlMatch[1] === 'profiles') return urlMatch[2];
    
    // custom URL -> нужно получить SteamID64
    const customUrl = `https://steamcommunity.com/id/${urlMatch[2]}/?xml=1`;
    const res = await fetch(CORS_PROXY + encodeURIComponent(customUrl));
    const xmlText = await res.text();
    const xml = new DOMParser().parseFromString(xmlText, 'text/xml');
    const steamId64 = xml.querySelector('steamID64')?.textContent;
    if (!steamId64) throw new Error('Не удалось найти профиль');
    return steamId64;
  }

  throw new Error('Неверный формат. Введи SteamID64 или ссылку');
}

function displayProfile(xml) {
  const get = (tag) => xml.querySelector(tag)?.textContent || '—';

  const name = get('steamID');
  const avatar = get('avatarFull') || get('avatarIcon');
  const onlineState = get('onlineState');
  const vacBanned = get('vacBanned') === '1';
  const memberSince = get('memberSince');

  // Форматируем дату
  const formattedDate = memberSince !== '—' 
    ? memberSince.replace('Joined ', '').replace(',', '') 
    : '—';

  document.getElementById('avatar').src = avatar;
  document.getElementById('displayName').textContent = name;
  
  // Статус
  const statusEl = document.getElementById('status');
  if (onlineState === 'online') {
    statusEl.textContent = '🟢 В сети';
    statusEl.style.color = '#4ade80';
  } else if (onlineState === 'offline') {
    statusEl.textContent = '⚫ Оффлайн';
    statusEl.style.color = '#8b92b8';
  } else {
    statusEl.textContent = '🟡 Отошёл';
    statusEl.style.color = '#facc15';
  }

  document.getElementById('statusLine').textContent = 
    onlineState === 'online' ? 'Сейчас в сети' : 
    onlineState === 'offline' ? 'Не в сети' : 'Отошёл';

  // VAC бан
  const vacEl = document.getElementById('vac');
  if (vacBanned) {
    vacEl.textContent = '🚫 Есть';
    vacEl.style.color = '#f87171';
  } else {
    vacEl.textContent = '✅ Чист';
    vacEl.style.color = '#4ade80';
  }

  document.getElementById('memberSince').textContent = formattedDate;

  // Вердикт
  const verdict = document.getElementById('verdict');
  if (vacBanned) {
    verdict.className = 'verdict red';
    verdict.textContent = '🔴 Аккаунт с VAC-баном';
  } else {
    verdict.className = 'verdict green';
    verdict.textContent = '🟢 Аккаунт активен и чист';
  }

  document.getElementById('result').classList.remove('hidden');
}

function showError(msg) {
  const error = document.getElementById('error');
  error.textContent = msg;
  error.classList.remove('hidden');
}

// Enter для отправки
document.getElementById('steamInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') checkProfile();
});
