// 闹钟应用主脚本

// 全局变量
let alarms = [];
let editingAlarmId = null;
let ringingAlarm = null;
let checkInterval = null;
let audio = null;

// DOM 元素引用
const addAlarmBtn = document.getElementById('addAlarmBtn');
const alarmModal = document.getElementById('alarmModal');
const ringingModal = document.getElementById('ringingModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('cancelBtn');
const alarmForm = document.getElementById('alarmForm');
const modalTitle = document.getElementById('modalTitle');
const alarmList = document.getElementById('alarmList');
const emptyState = document.getElementById('emptyState');

// 表单元素
const alarmTitleInput = document.getElementById('alarmTitle');
const alarmTimeInput = document.getElementById('alarmTime');
const repeatTypeRadios = document.querySelectorAll('input[name="repeatType"]');
const intervalSettings = document.getElementById('intervalSettings');
const intervalValueInput = document.getElementById('intervalValue');
const intervalUnitSelect = document.getElementById('intervalUnit');
const specificDateSettings = document.getElementById('specificDateSettings');
const datePicker = document.getElementById('datePicker');
const selectedDatesContainer = document.getElementById('selectedDates');
const alarmSoundSelect = document.getElementById('alarmSound');
const enableVoiceCheckbox = document.getElementById('enableVoice');

// 响铃模态框元素
const ringingTitle = document.getElementById('ringingTitle');
const ringingAlarmTitle = document.getElementById('ringingAlarmTitle');
const ringingTime = document.getElementById('ringingTime');
const snoozeBtn = document.getElementById('snoozeBtn');
const stopRingingBtn = document.getElementById('stopRingingBtn');

// 初始化
function init() {
    // 加载保存的闹钟
    loadAlarms();
    
    // 绑定事件
    bindEvents();
    
    // 渲染闹钟列表
    renderAlarmList();
    
    // 启动闹钟检查
    startAlarmCheck();
    
    // 初始化日期选择器
    initDatePicker();
}

// 绑定事件
function bindEvents() {
    // 添加闹钟按钮
    addAlarmBtn.addEventListener('click', () => openAlarmModal());
    
    // 关闭模态框按钮
    closeModalBtn.addEventListener('click', () => closeAlarmModal());
    cancelBtn.addEventListener('click', () => closeAlarmModal());
    
    // 表单提交
    alarmForm.addEventListener('submit', (e) => handleFormSubmit(e));
    
    // 绑定重复类型选择
    const repeatCheckboxes = document.querySelectorAll('.checkbox-option input[type="checkbox"]');
    repeatCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => handleRepeatTypeChange());
    });
    
    // 响铃模态框按钮
    snoozeBtn.addEventListener('click', () => handleSnooze());
    stopRingingBtn.addEventListener('click', () => stopRinging());
    
    // 点击模态框外部关闭
    alarmModal.addEventListener('click', (e) => {
        if (e.target === alarmModal) closeAlarmModal();
    });
    
    ringingModal.addEventListener('click', (e) => {
        if (e.target === ringingModal) stopRinging();
    });
}

// 打开闹钟模态框
function openAlarmModal(alarmId = null) {
    editingAlarmId = alarmId;
    
    if (alarmId) {
        // 编辑模式
        modalTitle.textContent = '编辑闹钟';
        const alarm = alarms.find(a => a.id === alarmId);
        if (alarm) {
            alarmTitleInput.value = alarm.title;
            alarmTimeInput.value = alarm.time;
            
            // 设置重复类型（支持复选框）
            const dailyCheckbox = document.getElementById('repeatDaily');
            const intervalCheckbox = document.getElementById('repeatInterval');
            const specificCheckbox = document.getElementById('repeatSpecific');
            
            if (dailyCheckbox) {
                dailyCheckbox.checked = alarm.isDaily || alarm.repeatType === 'daily';
            }
            if (intervalCheckbox) {
                intervalCheckbox.checked = alarm.isInterval || alarm.repeatType === 'interval';
            }
            if (specificCheckbox) {
                specificCheckbox.checked = alarm.isSpecific || alarm.repeatType === 'specific';
            }
            
            handleRepeatTypeChange();
            
            // 设置间隔
            if (alarm.isInterval || alarm.repeatType === 'interval') {
                intervalValueInput.value = alarm.interval?.value || 1;
                intervalUnitSelect.value = alarm.interval?.unit || 'minutes';
            }
            
            // 设置特定日期
            if (alarm.isSpecific || alarm.repeatType === 'specific') {
                selectedDates = alarm.specificDates || [];
                renderSelectedDates();
            }
            
            // 设置响铃设置
            alarmSoundSelect.value = alarm.sound;
            enableVoiceCheckbox.checked = alarm.enableVoice;
        }
    } else {
        // 添加模式
        modalTitle.textContent = '添加闹钟';
        alarmForm.reset();
        handleRepeatTypeChange();
        selectedDates = [];
        renderSelectedDates();
    }
    
    alarmModal.classList.add('active');
}

// 关闭闹钟模态框
function closeAlarmModal() {
    alarmModal.classList.remove('active');
    editingAlarmId = null;
}

// 处理重复类型变更
function handleRepeatTypeChange() {
    // 重构：间隔重复与每天/特定日期提醒可以同时设置，而非互斥
    // 因此，这里不再隐藏其他设置，而是根据用户选择显示相关设置
    const dailyCheckbox = document.getElementById('repeatDaily');
    const intervalCheckbox = document.getElementById('repeatInterval');
    const specificCheckbox = document.getElementById('repeatSpecific');
    
    // 检查是否有任何重复类型被选中
    const isDailyChecked = dailyCheckbox?.checked || false;
    const isIntervalChecked = intervalCheckbox?.checked || false;
    const isSpecificChecked = specificCheckbox?.checked || false;
    
    // 显示/隐藏相关设置
    intervalSettings.classList.toggle('hidden', !isIntervalChecked);
    specificDateSettings.classList.toggle('hidden', !isSpecificChecked);
    
    // 注意：每天选项不需要额外的设置界面
}

// 处理表单提交
function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = alarmTitleInput.value.trim();
    const time = alarmTimeInput.value;
    const sound = alarmSoundSelect.value;
    const enableVoice = enableVoiceCheckbox.checked;
    
    // 重构：间隔重复与每天/特定日期提醒可以同时设置
    // 因此，不再使用单一的repeatType，而是使用多个布尔值来表示不同的重复类型
    const isDaily = document.getElementById('repeatDaily')?.checked || false;
    const isInterval = document.getElementById('repeatInterval')?.checked || false;
    const isSpecific = document.getElementById('repeatSpecific')?.checked || false;
    
    let alarmData = {
        title,
        time,
        // 保留repeatType字段以保持向后兼容性，但实际使用新的字段
        repeatType: isInterval ? 'interval' : (isSpecific ? 'specific' : (isDaily ? 'daily' : 'once')),
        // 新的重复设置字段
        isDaily,
        isInterval,
        isSpecific,
        sound,
        enableVoice,
        enabled: true
    };
    
    // 添加间隔重复设置
    if (isInterval) {
        alarmData.interval = {
            value: parseInt(intervalValueInput.value),
            unit: intervalUnitSelect.value
        };
    }
    
    // 添加特定日期设置
    if (isSpecific) {
        alarmData.specificDates = selectedDates;
    }
    
    if (editingAlarmId) {
        // 编辑现有闹钟
        const index = alarms.findIndex(a => a.id === editingAlarmId);
        if (index !== -1) {
            alarms[index] = {...alarms[index], ...alarmData};
        }
    } else {
        // 添加新闹钟
        alarmData.id = Date.now().toString();
        alarms.push(alarmData);
    }
    
    saveAlarms();
    renderAlarmList();
    closeAlarmModal();
}

// 渲染闹钟列表
function renderAlarmList() {
    alarmList.innerHTML = '';
    
    if (alarms.length === 0) {
        emptyState.style.display = 'block';
        alarmList.style.display = 'none';
        return;
    }
    
    emptyState.style.display = 'none';
    alarmList.style.display = 'grid';
    
    // 按时间排序
    const sortedAlarms = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
    
    sortedAlarms.forEach(alarm => {
        const alarmItem = createAlarmItem(alarm);
        alarmList.appendChild(alarmItem);
    });
}

// 创建闹钟项
function createAlarmItem(alarm) {
    const div = document.createElement('div');
    div.className = `alarm-item ${!alarm.enabled ? 'disabled' : ''}`;
    div.dataset.alarmId = alarm.id;
    
    // 重复描述 - 支持组合重复类型
    let repeatDescription = '';
    const repeatParts = [];
    
    if (alarm.isDaily) {
        repeatParts.push('每天');
    }
    
    if (alarm.isInterval && alarm.interval) {
        repeatParts.push(`${alarm.interval.value}${alarm.interval.unit === 'minutes' ? '分钟' : '小时'}间隔`);
    }
    
    if (alarm.isSpecific && alarm.specificDates) {
        repeatParts.push(`${alarm.specificDates.length}个特定日期`);
    }
    
    // 保持向后兼容性，支持旧的repeatType字段
    if (repeatParts.length === 0) {
        if (alarm.repeatType === 'daily') {
            repeatDescription = '每天';
        } else if (alarm.repeatType === 'interval' && alarm.interval) {
            repeatDescription = `${alarm.interval.value}${alarm.interval.unit === 'minutes' ? '分钟' : '小时'}间隔`;
        } else if (alarm.repeatType === 'specific' && alarm.specificDates) {
            const dateCount = alarm.specificDates.length;
            repeatDescription = `${dateCount}个特定日期`;
        }
    } else {
        repeatDescription = repeatParts.join(' + ');
    }
    
    div.innerHTML = `
        <div class="alarm-item-header">
            <div>
                <div class="alarm-title">${alarm.title}</div>
                <div class="alarm-time">${formatTime(alarm.time)}</div>
                <div class="alarm-repeat">${repeatDescription}</div>
            </div>
            <label class="toggle-switch">
                <input type="checkbox" ${alarm.enabled ? 'checked' : ''} data-action="toggle-enabled">
                <span class="toggle-slider"></span>
            </label>
        </div>
        <div class="alarm-actions">
            <button class="alarm-action-btn" data-action="edit" title="编辑">
                <i class="fas fa-edit"></i>
            </button>
            <button class="alarm-action-btn delete" data-action="delete" title="删除">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // 绑定操作事件
    const toggleEnabledBtn = div.querySelector('input[data-action="toggle-enabled"]');
    const editBtn = div.querySelector('button[data-action="edit"]');
    const deleteBtn = div.querySelector('button[data-action="delete"]');
    
    toggleEnabledBtn.addEventListener('change', () => toggleAlarmEnabled(alarm.id));
    editBtn.addEventListener('click', () => openAlarmModal(alarm.id));
    deleteBtn.addEventListener('click', () => deleteAlarm(alarm.id));
    
    return div;
}

// 切换闹钟启用状态
function toggleAlarmEnabled(alarmId) {
    const alarm = alarms.find(a => a.id === alarmId);
    if (alarm) {
        alarm.enabled = !alarm.enabled;
        saveAlarms();
        renderAlarmList();
    }
}

// 编辑闹钟
function editAlarm(alarmId) {
    openAlarmModal(alarmId);
}

// 删除闹钟
function deleteAlarm(alarmId) {
    // 这里使用自定义确认框，避免浏览器原生确认框的样式问题
    // 由于用户反馈取消时仍会删除，可能是因为某些浏览器对confirm的处理问题
    // 重新实现删除逻辑，确保只有在用户明确确认时才删除
    const userConfirmed = window.confirm('确定要删除这个闹钟吗？');
    if (userConfirmed) {
        alarms = alarms.filter(a => a.id !== alarmId);
        saveAlarms();
        renderAlarmList();
    }
}

// 启动闹钟检查
function startAlarmCheck() {
    // 每分钟检查一次
    checkInterval = setInterval(() => checkAlarms(), 60000);
    
    // 立即检查一次
    checkAlarms();
}

// 检查闹钟
function checkAlarms() {
    const now = new Date();
    const currentTime = formatTimeForComparison(now);
    const currentDateStr = formatDate(now);
    
    alarms.forEach(alarm => {
        if (!alarm.enabled) return;
        
        let shouldRing = false;
        
        // 重构：支持间隔重复与每天/特定日期提醒的组合
        if (alarm.isInterval) {
            // 间隔重复响铃
            const lastRung = alarm.lastRung ? new Date(alarm.lastRung) : null;
            const intervalMinutes = alarm.interval.unit === 'minutes' ? alarm.interval.value : alarm.interval.value * 60;
            
            if (!lastRung) {
                // 第一次响铃，检查是否到了设置的时间，并且满足每天或特定日期的条件
                const timeMatch = alarm.time === currentTime;
                const dateMatch = alarm.isDaily || (alarm.isSpecific && alarm.specificDates.includes(currentDateStr)) || !alarm.isDaily && !alarm.isSpecific;
                shouldRing = timeMatch && dateMatch;
            } else {
                // 计算下次响铃时间
                const nextRingTime = new Date(lastRung.getTime() + intervalMinutes * 60 * 1000);
                shouldRing = now >= nextRingTime;
                
                // 如果同时设置了每天或特定日期，还需要检查日期是否匹配
                if (shouldRing && (alarm.isDaily || alarm.isSpecific)) {
                    const dateMatch = alarm.isDaily || (alarm.isSpecific && alarm.specificDates.includes(currentDateStr));
                    shouldRing = dateMatch;
                }
            }
        } else if (alarm.isDaily) {
            // 每天同一时间响铃
            shouldRing = alarm.time === currentTime;
        } else if (alarm.isSpecific) {
            // 特定日期响铃
            shouldRing = alarm.time === currentTime && alarm.specificDates.includes(currentDateStr);
        } else {
            // 单次响铃
            shouldRing = alarm.time === currentTime && !alarm.lastRung;
        }
        
        if (shouldRing) {
            ringAlarm(alarm);
            
            // 更新最后响铃时间
            alarm.lastRung = now.toISOString();
            saveAlarms();
        }
    });
}

// 闹钟响铃
function ringAlarm(alarm) {
    ringingAlarm = alarm;
    
    // 显示响铃模态框
    ringingAlarmTitle.textContent = alarm.title;
    ringingTime.textContent = formatTime(alarm.time);
    ringingModal.classList.add('active');
    
    // 播放响铃音乐
    playAlarmSound(alarm.sound);
    
    // 语音播报
    if (alarm.enableVoice) {
        speakAlarmTitle(alarm.title);
    }
}

// 播放闹钟声音
function playAlarmSound(soundType) {
    // 这里简化处理，实际应用中可以添加不同的音频文件
    if (!audio) {
        audio = new Audio();
        audio.loop = true;
    }
    
    // 由于没有实际音频文件，这里使用 Web Audio API 创建一个简单的提示音
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 2);
    
    // 循环播放
    setTimeout(() => {
        if (ringingAlarm) {
            playAlarmSound(soundType);
        }
    }, 3000);
}

// 语音播报闹钟标题
function speakAlarmTitle(title) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(title);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        speechSynthesis.speak(utterance);
    }
}

// 处理稍后提醒
function handleSnooze() {
    stopRinging();
    
    // 10分钟后再次提醒
    setTimeout(() => {
        if (ringingAlarm) {
            ringAlarm(ringingAlarm);
        }
    }, 10 * 60 * 1000);
}

// 停止响铃
function stopRinging() {
    ringingModal.classList.remove('active');
    
    // 对于间隔提醒的闹钟，在停止后需要标记为已处理
    // 这样在下一次检查时，会根据最后响铃时间来计算下一次响铃时间
    if (ringingAlarm && ringingAlarm.repeatType === 'interval') {
        // 更新最后响铃时间，这样下一次响铃会从现在开始计算间隔
        ringingAlarm.lastRung = new Date().toISOString();
        saveAlarms();
    }
    
    ringingAlarm = null;
    
    // 停止音频
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    
    // 停止语音播报
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
    }
}

// 日期选择器相关
let currentDate = new Date();
let selectedDates = [];

// 初始化日期选择器
function initDatePicker() {
    renderDatePicker();
}

// 渲染日期选择器
function renderDatePicker() {
    datePicker.innerHTML = '';
    
    // 头部
    const header = document.createElement('div');
    header.className = 'date-picker-header';
    header.innerHTML = `
        <div class="date-picker-title">${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月</div>
        <div class="date-picker-nav">
            <button id="prevMonth" title="上个月">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button id="nextMonth" title="下个月">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    datePicker.appendChild(header);
    
    // 星期几标题
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    days.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'date-picker-day';
        dayElement.textContent = day;
        datePicker.appendChild(dayElement);
    });
    
    // 获取当月天数和第一天是星期几
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // 添加上个月的空白日期
    for (let i = 0; i < firstDay; i++) {
        const emptyDate = document.createElement('div');
        emptyDate.className = 'date-picker-date disabled';
        datePicker.appendChild(emptyDate);
    }
    
    // 添加当月的日期
    for (let day = 1; day <= daysInMonth; day++) {
        const dateElement = document.createElement('div');
        const dateStr = formatDate(new Date(year, month, day));
        
        dateElement.className = `date-picker-date ${selectedDates.includes(dateStr) ? 'selected' : ''}`;
        dateElement.textContent = day;
        dateElement.dataset.date = dateStr;
        
        dateElement.addEventListener('click', () => toggleDateSelection(dateStr));
        
        datePicker.appendChild(dateElement);
    }
    
    // 绑定月份导航按钮
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderDatePicker();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderDatePicker();
    });
}

// 切换日期选择
function toggleDateSelection(dateStr) {
    const index = selectedDates.indexOf(dateStr);
    if (index > -1) {
        selectedDates.splice(index, 1);
    } else {
        selectedDates.push(dateStr);
    }
    
    renderDatePicker();
    renderSelectedDates();
}

// 渲染已选择的日期
function renderSelectedDates() {
    selectedDatesContainer.innerHTML = '';
    
    selectedDates.forEach(dateStr => {
        const tag = document.createElement('div');
        tag.className = 'selected-date-tag';
        tag.innerHTML = `
            ${dateStr}
            <button onclick="removeSelectedDate('${dateStr}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        selectedDatesContainer.appendChild(tag);
    });
}

// 移除已选择的日期
function removeSelectedDate(dateStr) {
    selectedDates = selectedDates.filter(d => d !== dateStr);
    renderDatePicker();
    renderSelectedDates();
}

// 工具函数

// 格式化时间 (HH:MM -> HH时MM分)
function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    return `${hours}时${minutes}分`;
}

// 格式化时间用于比较
function formatTimeForComparison(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 格式化日期 (YYYY-MM-DD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 保存闹钟到本地存储
function saveAlarms() {
    localStorage.setItem('alarms', JSON.stringify(alarms));
}

// 从本地存储加载闹钟
function loadAlarms() {
    const saved = localStorage.getItem('alarms');
    if (saved) {
        try {
            alarms = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load alarms:', e);
            alarms = [];
        }
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}