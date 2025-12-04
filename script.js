// 闹钟数据存储
let alarms = [];
let alarmIdCounter = 0;
let audioContext = null;
let currentAlarmId = null;

// DOM元素
const addAlarmBtn = document.getElementById('addAlarmBtn');
const addAlarmModal = document.getElementById('addAlarmModal');
const closeAddModal = document.getElementById('closeAddModal');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const saveAlarmBtn = document.getElementById('saveAlarmBtn');
const alarmList = document.getElementById('alarmList');
const emptyState = document.getElementById('emptyState');
const ringModal = document.getElementById('ringModal');
const snoozeBtn = document.getElementById('snoozeBtn');
const dismissBtn = document.getElementById('dismissBtn');
const ringTitle = document.getElementById('ringTitle');
const ringMessage = document.getElementById('ringMessage');

// 添加闹钟表单元素
const alarmTitleInput = document.getElementById('alarmTitle');
const alarmTimeInput = document.getElementById('alarmTime');
const repeatTypeRadios = document.querySelectorAll('input[name="repeatType"]');
const repeatIntervalSection = document.getElementById('repeatIntervalSection');
const repeatSpecificSection = document.getElementById('repeatSpecificSection');
const repeatValueInput = document.getElementById('repeatValue');
const repeatUnitSelect = document.getElementById('repeatUnit');
const dateGrid = document.getElementById('dateGrid');
const playSoundCheckbox = document.getElementById('playSound');
const voiceAnnounceCheckbox = document.getElementById('voiceAnnounce');
const alarmSoundSelect = document.getElementById('alarmSound');

// 初始化
function init() {
    loadAlarms();
    renderAlarms();
    setupEventListeners();
    generateDateGrid();
    startAlarmChecker();
}

// 加载闹钟数据
function loadAlarms() {
    const saved = localStorage.getItem('alarms');
    if (saved) {
        alarms = JSON.parse(saved);
        alarmIdCounter = alarms.length > 0 ? Math.max(...alarms.map(a => a.id)) + 1 : 0;
    }
}

// 保存闹钟数据
function saveAlarms() {
    localStorage.setItem('alarms', JSON.stringify(alarms));
}

// 设置事件监听器
function setupEventListeners() {
    addAlarmBtn.addEventListener('click', openAddAlarmModal);
    closeAddModal.addEventListener('click', closeAddAlarmModal);
    cancelAddBtn.addEventListener('click', closeAddAlarmModal);
    saveAlarmBtn.addEventListener('click', saveAlarm);
    snoozeBtn.addEventListener('click', snoozeAlarm);
    dismissBtn.addEventListener('click', dismissAlarm);

    // 点击模态框外部关闭
    addAlarmModal.addEventListener('click', (e) => {
        if (e.target === addAlarmModal) closeAddAlarmModal();
    });

    ringModal.addEventListener('click', (e) => {
        if (e.target === ringModal) dismissAlarm();
    });

    // 重复类型切换
    repeatTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedType = document.querySelector('input[name="repeatType"]:checked').value;
            repeatIntervalSection.style.display = selectedType === 'interval' ? 'block' : 'none';
            repeatSpecificSection.style.display = selectedType === 'specific' ? 'block' : 'none';
        });
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAddAlarmModal();
            if (ringModal.style.display === 'flex') {
                dismissAlarm();
            }
        }
    });
}

// 打开添加闹钟弹窗
function openAddAlarmModal() {
    addAlarmModal.classList.add('active');
    alarmTitleInput.focus();
    // 设置默认时间为当前时间后5分钟
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const timeString = now.toTimeString().slice(0, 5);
    alarmTimeInput.value = timeString;
    // 重置表单
    resetAddAlarmForm();
}

// 关闭添加闹钟弹窗
function closeAddAlarmModal() {
    addAlarmModal.classList.remove('active');
}

// 重置添加闹钟表单
function resetAddAlarmForm() {
    document.querySelector('form').reset();
    document.getElementById('repeatDaily').checked = false;
    document.getElementById('repeatSpecific').checked = false;
    document.getElementById('enableInterval').checked = false;
    repeatSpecificSection.style.display = 'none';
    playSoundCheckbox.checked = true;
    voiceAnnounceCheckbox.checked = true;
    // 重新生成日期网格
    generateDateGrid();
    // 清除编辑状态
    delete window.editingAlarmId;
}

// 生成日期选择网格（未来7天）
function generateDateGrid() {
    dateGrid.innerHTML = '';
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dateItem = document.createElement('div');
        dateItem.className = 'date-item';
        dateItem.dataset.date = date.toISOString().split('T')[0];
        
        const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
        const dateStr = date.getDate();
        const monthStr = date.getMonth() + 1;
        
        dateItem.innerHTML = `
            <div class="date">${monthStr}/${dateStr}</div>
            <div class="weekday">周${weekday}</div>
        `;
        
        dateItem.addEventListener('click', () => {
            dateItem.classList.toggle('selected');
        });
        
        dateGrid.appendChild(dateItem);
    }
}

// 保存闹钟
function saveAlarm() {
    const title = alarmTitleInput.value.trim();
    const time = alarmTimeInput.value;
    const repeatType = document.querySelector('input[name="repeatType"]:checked').value;
    const playSound = playSoundCheckbox.checked;
    const voiceAnnounce = voiceAnnounceCheckbox.checked;
    const soundType = alarmSoundSelect.value;
    
    if (!title || !time) {
        alert('请填写闹钟标题和时间');
        return;
    }
    
    let repeatConfig = {};
    
    // 跨天重复设置
    if (document.getElementById('repeatDaily').checked) {
        repeatConfig.repeatDaily = true;
    } else if (document.getElementById('repeatSpecific').checked) {
        const selectedDates = Array.from(dateGrid.querySelectorAll('.date-item.selected'))
            .map(item => item.dataset.date);
        if (selectedDates.length === 0) {
            alert('请选择至少一个日期');
            return;
        }
        repeatConfig.repeatSpecific = true;
        repeatConfig.dates = selectedDates;
    }
    
    // 一天内间隔重复设置
    if (document.getElementById('enableInterval').checked) {
        const value = parseInt(repeatValueInput.value);
        const unit = repeatUnitSelect.value;
        repeatConfig.interval = { value, unit };
    }
    
    if (window.editingAlarmId !== undefined) {
        // 更新现有闹钟
        const alarmIndex = alarms.findIndex(a => a.id === window.editingAlarmId);
        if (alarmIndex !== -1) {
            alarms[alarmIndex] = {
                ...alarms[alarmIndex],
                title,
                time,
                repeatConfig,
                playSound,
                voiceAnnounce,
                soundType
            };
        }
        delete window.editingAlarmId;
    } else {
        // 创建新闹钟
        const alarm = {
            id: alarmIdCounter++,
            title,
            time,
            repeatConfig,
            playSound,
            voiceAnnounce,
            soundType,
            enabled: true,
            createdAt: new Date().toISOString()
        };
        alarms.push(alarm);
    }
    
    saveAlarms();
    renderAlarms();
    closeAddAlarmModal();
}

// 渲染闹钟列表
function renderAlarms() {
    if (alarms.length === 0) {
        alarmList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // 按时间排序闹钟
    const sortedAlarms = [...alarms].sort((a, b) => {
        return a.time.localeCompare(b.time);
    });
    
    alarmList.innerHTML = sortedAlarms.map(alarm => {
        const repeatText = getRepeatText(alarm.repeatConfig);
        return `
            <div class="alarm-item ${alarm.enabled ? '' : 'disabled'}" data-alarm-id="${alarm.id}">
                <div class="alarm-info">
                    <div class="alarm-time">${alarm.time}</div>
                    <div class="alarm-title">${alarm.title}</div>
                    <div class="alarm-repeat">
                        <i class="fas fa-redo"></i>
                        ${repeatText}
                    </div>
                </div>
                <div class="alarm-actions">
                    <div class="toggle-switch ${alarm.enabled ? 'active' : ''}" onclick="toggleAlarm(${alarm.id})"></div>
                    <button class="btn btn-secondary" onclick="editAlarm(${alarm.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteAlarm(${alarm.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 获取重复设置文本
function getRepeatText(repeatConfig) {
    if (!repeatConfig) {
        return '一次性';
    }
    
    const parts = [];
    
    // 跨天重复
    if (repeatConfig.repeatDaily) {
        parts.push('每天');
    } else if (repeatConfig.repeatSpecific) {
        parts.push('特定日期');
    } else if (!repeatConfig.interval) {
        // 没有跨天重复也没有间隔重复，就是一次性
        parts.push('一次性');
    }
    
    // 一天内间隔重复
    if (repeatConfig.interval) {
        parts.push(`每隔 ${repeatConfig.interval.value} ${repeatConfig.interval.unit === 'minutes' ? '分钟' : '小时'}`);
    }
    
    return parts.join('，');
}

// 切换闹钟启用状态
function toggleAlarm(id) {
    const alarm = alarms.find(a => a.id === id);
    if (alarm) {
        alarm.enabled = !alarm.enabled;
        saveAlarms();
        renderAlarms();
    }
}

// 编辑闹钟
function editAlarm(id) {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    
    // 保存原闹钟ID，用于更新
    window.editingAlarmId = id;
    
    // 填充表单
    alarmTitleInput.value = alarm.title;
    alarmTimeInput.value = alarm.time;
    playSoundCheckbox.checked = alarm.playSound;
    voiceAnnounceCheckbox.checked = alarm.voiceAnnounce;
    alarmSoundSelect.value = alarm.soundType;
    
    // 设置重复类型
    document.getElementById('repeatDaily').checked = alarm.repeatConfig.repeatDaily || false;
    document.getElementById('repeatSpecific').checked = alarm.repeatConfig.repeatSpecific || false;
    document.getElementById('enableInterval').checked = !!alarm.repeatConfig.interval;
    
    // 显示相应的重复设置区域
    repeatSpecificSection.style.display = alarm.repeatConfig.repeatSpecific ? 'block' : 'none';
    
    // 填充重复间隔设置
    if (alarm.repeatConfig.interval) {
        repeatValueInput.value = alarm.repeatConfig.interval.value;
        repeatUnitSelect.value = alarm.repeatConfig.interval.unit;
    }
    
    // 填充特定日期设置
    if (alarm.repeatConfig.repeatSpecific && alarm.repeatConfig.dates) {
        generateDateGrid();
        alarm.repeatConfig.dates.forEach(date => {
            const dateItem = dateGrid.querySelector(`[data-date="${date}"]`);
            if (dateItem) {
                dateItem.classList.add('selected');
            }
        });
    }
    
    openAddAlarmModal();
}

// 删除闹钟
function deleteAlarm(id) {
    alarms = alarms.filter(a => a.id !== id);
    saveAlarms();
    renderAlarms();
}

// 开始闹钟检查器
function startAlarmChecker() {
    setInterval(checkAlarms, 1000);
}

// 检查闹钟
function checkAlarms() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDate = now.toISOString().split('T')[0];
    
    alarms.forEach(alarm => {
        if (!alarm.enabled) return;
        
        let shouldRing = false;
        
        // 检查基础时间匹配
        if (alarm.time === currentTime) {
            // 检查重复设置
            if (alarm.repeatConfig.repeatDaily) {
                shouldRing = true;
            } else if (alarm.repeatConfig.repeatSpecific) {
                shouldRing = alarm.repeatConfig.dates.includes(currentDate);
            } else if (!alarm.repeatConfig.interval) {
                // 没有重复设置，一次性闹钟
                shouldRing = true;
            }
        }
        
        // 检查间隔重复
        if (alarm.repeatConfig.interval) {
            shouldRing = checkIntervalAlarm(alarm, now);
        }
        
        if (shouldRing) {
            triggerAlarm(alarm);
        }
    });
}

// 检查间隔闹钟
function checkIntervalAlarm(alarm, now) {
    const lastRung = alarm.lastRung ? new Date(alarm.lastRung) : null;
    const alarmTime = parseTimeString(alarm.time);
    
    // 如果是当天第一次检查，设置初始时间
    if (!lastRung || lastRung.toDateString() !== now.toDateString()) {
        const initialAlarmTime = new Date(now);
        initialAlarmTime.setHours(alarmTime.hours, alarmTime.minutes, 0, 0);
        
        // 如果初始时间已过，设置为明天的时间
        if (initialAlarmTime < now) {
            initialAlarmTime.setDate(initialAlarmTime.getDate() + 1);
        }
        
        alarm.lastRung = initialAlarmTime.toISOString();
        saveAlarms();
        return false;
    }
    
    // 计算下一次响铃时间
    const nextAlarmTime = new Date(lastRung);
    if (alarm.repeatConfig.interval.unit === 'minutes') {
        nextAlarmTime.setMinutes(nextAlarmTime.getMinutes() + alarm.repeatConfig.interval.value);
    } else {
        nextAlarmTime.setHours(nextAlarmTime.getHours() + alarm.repeatConfig.interval.value);
    }
    
    // 检查是否到达响铃时间
    if (now >= nextAlarmTime) {
        alarm.lastRung = now.toISOString();
        saveAlarms();
        return true;
    }
    
    return false;
}

// 解析时间字符串为小时和分钟
function parseTimeString(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}

// 触发闹钟
function triggerAlarm(alarm) {
    currentAlarmId = alarm.id;
    ringTitle.textContent = alarm.title;
    ringMessage.textContent = `闹钟时间: ${alarm.time}`;
    ringModal.style.display = 'flex';
    
    // 播放铃声
    if (alarm.playSound) {
        playAlarmSound(alarm.soundType);
    }
    
    // 语音播报
    if (alarm.voiceAnnounce) {
        speakAlarm(alarm.title, alarm.time);
    }
}

// 播放闹钟铃声
function playAlarmSound(soundType) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // 停止之前的声音
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // 根据不同的铃声类型生成不同的音频
    switch (soundType) {
        case 'classic':
            playClassicAlarm();
            break;
        case 'birds':
            playBirdsSound();
            break;
        case 'digital':
            playDigitalAlarm();
            break;
        case 'soft':
            playSoftMusic();
            break;
    }
}

// 经典闹钟铃声
function playClassicAlarm() {
    const playTone = (frequency, duration, startTime) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    const interval = 0.25;
    
    // 播放10次铃声
    for (let i = 0; i < 10; i++) {
        playTone(800, 0.1, now + i * interval);
        playTone(600, 0.1, now + i * interval + 0.1);
    }
}

// 鸟鸣声
function playBirdsSound() {
    const playBirdTone = (frequency, duration, startTime) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // 随机鸟鸣声
    for (let i = 0; i < 8; i++) {
        const freq = 1500 + Math.random() * 1000;
        const duration = 0.3 + Math.random() * 0.2;
        const delay = i * 0.5 + Math.random() * 0.2;
        playBirdTone(freq, duration, now + delay);
    }
}

// 电子铃声
function playDigitalAlarm() {
    const playDigitalTone = (frequency, duration, startTime) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.2, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    for (let i = 0; i < 12; i++) {
        const freq = i % 2 === 0 ? 1200 : 800;
        playDigitalTone(freq, 0.1, now + i * 0.2);
    }
}

// 柔和音乐
function playSoftMusic() {
    const playSoftTone = (frequency, duration, startTime) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    
    for (let i = 0; i < notes.length; i++) {
        playSoftTone(notes[i], 0.4, now + i * 0.5);
    }
}

// 语音播报闹钟
function speakAlarm(title, time) {
    if (!window.speechSynthesis) {
        return;
    }
    
    // 停止之前的播报
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(`闹钟响了！${title}，现在时间${time}`);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    speechSynthesis.speak(utterance);
}

// 稍后提醒
function snoozeAlarm() {
    dismissAlarm();
    
    // 5分钟后再次响铃
    const alarm = alarms.find(a => a.id === currentAlarmId);
    if (alarm) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        alarm.lastRung = now.toISOString();
        saveAlarms();
    }
}

// 关闭闹钟
function dismissAlarm() {
    ringModal.style.display = 'none';
    
    // 停止声音和语音播报
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    if (window.speechSynthesis) {
        speechSynthesis.cancel();
    }
    
    // 对于间隔闹钟，关闭后禁用闹钟，防止继续响铃
    if (currentAlarmId !== null) {
        const alarm = alarms.find(a => a.id === currentAlarmId);
        if (alarm && alarm.repeatConfig.interval) {
            alarm.enabled = false;
            saveAlarms();
            renderAlarms();
        }
    }
    
    currentAlarmId = null;
}

// 初始化应用
init();