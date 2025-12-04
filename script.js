class AlarmApp {
    constructor() {
        this.alarms = this.loadAlarms();
        this.editingAlarmId = null;
        this.initElements();
        this.initEventListeners();
        this.renderAlarms();
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
        this.checkAlarms();
        setInterval(() => this.checkAlarms(), 1000);
        this.generateDateGrid();
    }

    initElements() {
        this.addAlarmBtn = document.getElementById('addAlarmBtn');
        this.addAlarmModal = document.getElementById('addAlarmModal');
        this.closeAddModalBtn = document.getElementById('closeAddModal');
        this.cancelAddBtn = document.getElementById('cancelAddBtn');
        this.addAlarmForm = document.getElementById('addAlarmForm');
        this.alarmList = document.getElementById('alarmList');
        this.emptyState = document.getElementById('emptyState');
        this.currentTimeEl = document.getElementById('currentTime');
        this.intervalGroup = document.getElementById('intervalGroup');
        this.datesGroup = document.getElementById('datesGroup');
        this.dateGrid = document.getElementById('dateGrid');
        this.alarmRingingModal = document.getElementById('alarmRingingModal');
        this.snoozeBtn = document.getElementById('snoozeBtn');
        this.dismissBtn = document.getElementById('dismissBtn');
        this.ringingTitle = document.getElementById('ringingTitle');
        this.ringingTime = document.getElementById('ringingTime');
    }

    initEventListeners() {
        this.addAlarmBtn.addEventListener('click', () => this.openAddModal());
        this.closeAddModalBtn.addEventListener('click', () => this.hideAddModal());
        this.cancelAddBtn.addEventListener('click', () => this.hideAddModal());
        this.addAlarmForm.addEventListener('submit', (e) => this.addAlarm(e));
        this.snoozeBtn.addEventListener('click', () => this.snoozeAlarm());
        this.dismissBtn.addEventListener('click', () => this.dismissAlarm());

        document.querySelectorAll('input[name="repeatType"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleRepeatTypeChange(e));
        });

        this.addAlarmModal.addEventListener('click', (e) => {
            if (e.target === this.addAlarmModal) this.hideAddModal();
        });

        this.alarmRingingModal.addEventListener('click', (e) => {
            if (e.target === this.alarmRingingModal) this.dismissAlarm();
        });
    }

    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.currentTimeEl.textContent = timeString;
    }

    generateDateGrid() {
        this.dateGrid.innerHTML = '';
        const today = new Date();
        const selectedDates = new Set();

        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const displayDate = date.toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric'
            });

            const dateItem = document.createElement('div');
            dateItem.className = 'date-item';
            dateItem.textContent = displayDate;
            dateItem.dataset.date = dateStr;
            dateItem.addEventListener('click', () => this.toggleDateSelection(dateItem, dateStr));

            this.dateGrid.appendChild(dateItem);
        }
    }

    toggleDateSelection(element, dateStr) {
        element.classList.toggle('selected');
    }

    getSelectedDates() {
        const selected = [];
        document.querySelectorAll('.date-item.selected').forEach(item => {
            selected.push(item.dataset.date);
        });
        return selected;
    }

    handleRepeatTypeChange(e) {
        const type = e.target.value;
        if (type === 'interval') {
            this.intervalGroup.style.display = 'block';
        } else {
            this.intervalGroup.style.display = 'none';
        }

        if (type === 'none') {
            this.datesGroup.style.display = 'block';
        } else {
            this.datesGroup.style.display = 'none';
            document.querySelectorAll('.date-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }
    }

    openAddModal() {
        this.addAlarmForm.reset();
        this.intervalGroup.style.display = 'none';
        this.datesGroup.style.display = 'block';
        document.querySelectorAll('.date-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        this.addAlarmModal.classList.add('active');
    }

    hideAddModal() {
        this.addAlarmModal.classList.remove('active');
    }

    handleAddAlarm(e) {
        e.preventDefault();

        const title = document.getElementById('alarmTitle').value;
        const time = document.getElementById('alarmTime').value;
        const repeatType = document.querySelector('input[name="repeatType"]:checked').value;
        const intervalValue = document.getElementById('intervalValue').value;
        const intervalUnit = document.getElementById('intervalUnit').value;
        const playSound = document.getElementById('playSound').checked;
        const voiceAnnounce = document.getElementById('voiceAnnounce').checked;
        const selectedDates = this.getSelectedDates();

        if (this.editingAlarmId) {
            // 编辑模式，更新现有闹钟
            const alarm = this.alarms.find(a => a.id === this.editingAlarmId);
            if (alarm) {
                alarm.title = title;
                alarm.time = time;
                alarm.repeatType = repeatType;
                alarm.interval = repeatType === 'interval' ? { value: parseInt(intervalValue), unit: intervalUnit } : null;
                alarm.dates = repeatType === 'none' ? selectedDates : [];
                alarm.playSound = playSound;
                alarm.voiceAnnounce = voiceAnnounce;

                this.saveAlarms();
                this.renderAlarms();
                this.hideAddModal();
                this.editingAlarmId = null;
            }
        } else {
            // 添加模式，创建新闹钟
            const alarm = {
                id: Date.now(),
                title,
                time,
                repeatType,
                interval: repeatType === 'interval' ? { value: parseInt(intervalValue), unit: intervalUnit } : null,
                dates: repeatType === 'none' ? selectedDates : [],
                playSound,
                voiceAnnounce,
                enabled: true,
                lastTriggered: null
            };

            this.alarms.push(alarm);
            this.saveAlarms();
            this.renderAlarms();
            this.hideAddModal();
        }
    }

    renderAlarms() {
        if (this.alarms.length === 0) {
            this.alarmList.style.display = 'none';
            this.emptyState.style.display = 'block';
            return;
        }

        this.alarmList.style.display = 'flex';
        this.emptyState.style.display = 'none';

        this.alarmList.innerHTML = '';
        this.alarms.forEach(alarm => {
            const alarmEl = this.createAlarmElement(alarm);
            this.alarmList.appendChild(alarmEl);
        });
    }

    createAlarmElement(alarm) {
        const div = document.createElement('div');
        div.className = `alarm-item ${alarm.enabled ? '' : 'disabled'}`;
        div.dataset.id = alarm.id;

        const [hours, minutes] = alarm.time.split(':');
        const timeString = `${hours}:${minutes}`;
        let repeatText = '';

        switch (alarm.repeatType) {
            case 'none':
                repeatText = alarm.dates.length > 0 ? `在 ${alarm.dates.length} 个日期响铃` : '仅一次';
                break;
            case 'daily':
                repeatText = '每天响铃';
                break;
            case 'interval':
                repeatText = `每 ${alarm.interval.value} ${alarm.interval.unit === 'minutes' ? '分钟' : '小时'} 响铃`;
                break;
        }

        div.innerHTML = `
            <div class="alarm-info">
                <div class="alarm-title">${alarm.title}</div>
                <div class="alarm-time">${timeString}</div>
                <div class="alarm-desc">${repeatText}</div>
            </div>
            <div class="alarm-actions">
                <button class="icon-btn toggle" onclick="app.toggleAlarm(${alarm.id})" title="${alarm.enabled ? '禁用' : '启用'}">
                    <i class="fas ${alarm.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                </button>
                <button class="icon-btn edit" onclick="app.editAlarm(${alarm.id})" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn delete" onclick="app.deleteAlarm(${alarm.id})" title="删除">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return div;
    }

    toggleAlarm(id) {
        const alarm = this.alarms.find(a => a.id === id);
        if (alarm) {
            alarm.enabled = !alarm.enabled;
            this.saveAlarms();
            this.renderAlarms();
        }
    }

    editAlarm(id) {
        const alarm = this.alarms.find(a => a.id === id);
        if (!alarm) return;

        document.getElementById('alarmTitle').value = alarm.title;
        document.getElementById('alarmTime').value = alarm.time;
        document.querySelector(`input[name="repeatType"][value="${alarm.repeatType}"]`).checked = true;
        document.getElementById('playSound').checked = alarm.playSound;
        document.getElementById('voiceAnnounce').checked = alarm.voiceAnnounce;

        if (alarm.repeatType === 'interval' && alarm.interval) {
            document.getElementById('intervalValue').value = alarm.interval.value;
            document.getElementById('intervalUnit').value = alarm.interval.unit;
        }

        this.handleRepeatTypeChange({ target: { value: alarm.repeatType } });

        if (alarm.repeatType === 'none') {
            document.querySelectorAll('.date-item').forEach(item => {
                item.classList.toggle('selected', alarm.dates.includes(item.dataset.date));
            });
        }

        this.addAlarmModal.classList.add('active');

        this.editingAlarmId = id;
        this.addAlarmModal.classList.add('active');
    }



    deleteAlarm(id) {
        if (confirm('确定要删除这个闹钟吗？')) {
            this.alarms = this.alarms.filter(a => a.id !== id);
            this.saveAlarms();
            this.renderAlarms();
        }
    }

    checkAlarms() {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const currentDateStr = now.toISOString().split('T')[0];

        this.alarms.forEach(alarm => {
            if (!alarm.enabled) return;

            const shouldTrigger = this.shouldTriggerAlarm(alarm, now, currentTime, currentDateStr);
            if (shouldTrigger) {
                this.triggerAlarm(alarm);
            }
        });
    }

    shouldTriggerAlarm(alarm, now, currentTime, currentDateStr) {
        if (alarm.time !== currentTime) return false;

        switch (alarm.repeatType) {
            case 'none':
                return alarm.dates.length === 0 || alarm.dates.includes(currentDateStr);
            case 'daily':
                return true;
            case 'interval':
                if (!alarm.interval || !alarm.lastTriggered) return true;
                const intervalMs = alarm.interval.unit === 'minutes' 
                    ? alarm.interval.value * 60 * 1000 
                    : alarm.interval.value * 60 * 60 * 1000;
                return now - new Date(alarm.lastTriggered) >= intervalMs;
            default:
                return false;
        }
    }

    triggerAlarm(alarm) {
        alarm.lastTriggered = new Date().toISOString();
        this.saveAlarms();

        this.ringingTitle.textContent = alarm.title;
        this.ringingTime.textContent = alarm.time;
        this.alarmRingingModal.classList.add('active');

        if (alarm.playSound) {
            this.playAlarmSound();
        }

        if (alarm.voiceAnnounce) {
            this.voiceAnnounce(alarm.title);
        }

        this.currentRingingAlarm = alarm;
    }

    playAlarmSound() {
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

        this.alarmInterval = setInterval(() => {
            const newOscillator = audioContext.createOscillator();
            newOscillator.connect(gainNode);
            newOscillator.frequency.value = 800;
            newOscillator.type = 'sine';
            newOscillator.start(audioContext.currentTime);
            newOscillator.stop(audioContext.currentTime + 0.5);
        }, 1000);
    }

    voiceAnnounce(message) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'zh-CN';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    }

    snoozeAlarm() {
        this.dismissAlarm();
        setTimeout(() => {
            this.triggerAlarm(this.currentRingingAlarm);
        }, 5 * 60 * 1000);
    }

    dismissAlarm() {
        this.alarmRingingModal.classList.remove('active');
        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.currentRingingAlarm = null;
    }

    saveAlarms() {
        localStorage.setItem('alarms', JSON.stringify(this.alarms));
    }

    loadAlarms() {
        const saved = localStorage.getItem('alarms');
        return saved ? JSON.parse(saved) : [];
    }
}

const app = new AlarmApp();