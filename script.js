// 全局变量
let alarms = [];
let currentAlarm = null;
let checkInterval = null;
let calendar = null;

// 页面加载完成后初始化
 document.addEventListener('DOMContentLoaded', function() {
     // 初始化闹钟列表
     loadAlarms();
     
     // 初始化日历
     initCalendar();
     
     // 设置重复周期选择事件
     const repeatRadios = document.querySelectorAll('input[name="alarm-repeat"]');
     repeatRadios.forEach(radio => {
         radio.addEventListener('change', function() {
             toggleRepeatInterval();
         });
     });
     
     // 设置表单提交事件
     document.getElementById('alarm-form').addEventListener('submit', function(e) {
         e.preventDefault();
         addAlarm();
     });
     
     // 开始检查闹钟
     startAlarmCheck();
     
     // 设置今天的日期为默认值
     const today = new Date().toISOString().split('T')[0];
     document.getElementById('alarm-date').value = today;
     
     // 设置对话框按钮事件
     document.getElementById('stop-btn').addEventListener('click', stopAlarm);
     document.getElementById('snooze-btn').addEventListener('click', snoozeAlarm);
 });

// 切换闹钟面板显示
function toggleAlarmPanel() {
    const panel = document.getElementById('alarm-panel');
    const calendarPanel = document.getElementById('calendar-panel');
    
    panel.classList.toggle('hidden');
    calendarPanel.classList.add('hidden');
}

// 切换日历面板显示
function toggleCalendarPanel() {
    const panel = document.getElementById('alarm-panel');
    const calendarPanel = document.getElementById('calendar-panel');
    
    calendarPanel.classList.toggle('hidden');
    panel.classList.add('hidden');
}

// 切换重复间隔输入框显示
function toggleRepeatInterval() {
    const repeatType = document.querySelector('input[name="alarm-repeat"]:checked').value;
    const intervalDiv = document.getElementById('repeat-interval');
    
    if (repeatType === 'once') {
        intervalDiv.classList.add('hidden');
    } else {
        intervalDiv.classList.remove('hidden');
    }
}

// 添加闹钟
function addAlarm() {
    const title = document.getElementById('alarm-title').value;
    const date = document.getElementById('alarm-date').value;
    const time = document.getElementById('alarm-time').value;
    const repeat = document.querySelector('input[name="alarm-repeat"]:checked').value;
    const action = document.getElementById('alarm-action').value;
    
    let interval = 0;
    if (repeat !== 'once') {
        interval = parseInt(document.getElementById('interval-value').value);
    }
    
    const alarm = {
        id: Date.now(),
        title: title,
        date: date,
        time: time,
        repeat: repeat,
        interval: interval,
        action: action,
        enabled: true
    };
    
    alarms.push(alarm);
    saveAlarms();
    renderAlarms();
    updateCalendar();
    
    // 重置表单
    document.getElementById('alarm-form').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('alarm-date').value = today;
    // 重置单选按钮为"不重复"
    document.querySelector('input[name="alarm-repeat"][value="once"]').checked = true;
    toggleRepeatInterval();
    
    showNotification('闹钟已设置', `将在 ${date} ${time} 提醒`);
}

// 删除闹钟
function deleteAlarm(id) {
    alarms = alarms.filter(alarm => alarm.id !== id);
    saveAlarms();
    renderAlarms();
    updateCalendar();
    showNotification('闹钟已删除', '该闹钟已从列表中移除');
}

// 渲染闹钟列表
function renderAlarms() {
    const container = document.getElementById('alarms-container');
    
    console.log('渲染闹钟列表，数量:', alarms.length);
    console.log('闹钟数据:', alarms);
    
    if (alarms.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无设置的闹钟</p>';
        return;
    }
    
    container.innerHTML = alarms.map(alarm => `
        <div class="alarm-item">
            <div class="alarm-info">
                <span class="alarm-title">${alarm.title}</span>
                <span class="alarm-time">${alarm.date} ${alarm.time}</span>
            </div>
            <div class="alarm-actions">
                <button class="delete-btn" onclick="deleteAlarm(${alarm.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// 加载闹钟数据
function loadAlarms() {
    const saved = localStorage.getItem('webAlarms');
    if (saved) {
        try {
            alarms = JSON.parse(saved);
            // 过滤掉已过期且不重复的闹钟
            const now = new Date();
            alarms = alarms.filter(alarm => {
                if (alarm.repeat === 'once') {
                    const alarmTime = new Date(`${alarm.date}T${alarm.time}`);
                    return alarmTime > now;
                }
                return true;
            });
            saveAlarms();
            console.log('加载闹钟数据成功:', alarms);
        } catch (error) {
            console.error('加载闹钟数据失败:', error);
            alarms = [];
        }
    }
    renderAlarms();
}

// 保存闹钟数据
function saveAlarms() {
    localStorage.setItem('webAlarms', JSON.stringify(alarms));
}

// 初始化日历
function initCalendar() {
    if (typeof FullCalendar === 'undefined') {
        console.error('FullCalendar is not loaded');
        return;
    }
    
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'zh-cn',
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: getCalendarEvents(),
        dateClick: function(info) {
            // 点击日期时设置闹钟日期
            document.getElementById('alarm-date').value = info.dateStr;
            toggleAlarmPanel();
        },
        eventClick: function(info) {
            info.jsEvent.preventDefault(); // 阻止默认行为
            // 可以在这里添加查看/编辑闹钟的功能
        }
    });
    
    calendar.render();
    console.log('日历初始化成功');
}

// 获取日历事件
function getCalendarEvents() {
    return alarms.map(alarm => {
        let endDate = new Date(`${alarm.date}T${alarm.time}`);
        endDate.setMinutes(endDate.getMinutes() + 30);
        
        return {
            id: alarm.id,
            title: alarm.title,
            start: `${alarm.date}T${alarm.time}`,
            end: endDate.toISOString(),
            allDay: false,
            backgroundColor: '#ff4444',
            borderColor: '#ff4444'
        };
    });
}

// 更新日历
function updateCalendar() {
    if (calendar) {
        calendar.removeAllEvents();
        const events = getCalendarEvents();
        console.log('更新日历事件:', events);
        calendar.addEventSource(events);
    }
}

// 开始检查闹钟
function startAlarmCheck() {
    if (checkInterval) {
        clearInterval(checkInterval);
    }
    
    // 每分钟检查一次
    checkInterval = setInterval(checkAlarms, 1000);
}

// 检查闹钟
function checkAlarms() {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDate = now.toISOString().split('T')[0];
    
    alarms.forEach(alarm => {
        if (!alarm.enabled) return;
        
        const alarmDateTime = new Date(`${alarm.date}T${alarm.time}`);
        const timeDiff = Math.abs(now - alarmDateTime);
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        
        // 检查是否到了提醒时间
        if (alarm.repeat === 'once') {
            if (currentDate === alarm.date && currentTime === alarm.time) {
                triggerAlarm(alarm);
            }
        } else if (alarm.repeat === 'minutes') {
            if (minutesDiff % alarm.interval === 0 && minutesDiff < 60) {
                triggerAlarm(alarm);
            }
        } else if (alarm.repeat === 'hours') {
            const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
            if (hoursDiff % alarm.interval === 0 && now.getMinutes() === alarmDateTime.getMinutes()) {
                triggerAlarm(alarm);
            }
        } else if (alarm.repeat === 'days') {
            const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            if (daysDiff % alarm.interval === 0 && 
                now.getHours() === alarmDateTime.getHours() && 
                now.getMinutes() === alarmDateTime.getMinutes()) {
                triggerAlarm(alarm);
            }
        } else if (alarm.repeat === 'weeks') {
            const weeksDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7));
            if (weeksDiff % alarm.interval === 0 && 
                now.getDay() === alarmDateTime.getDay() && 
                now.getHours() === alarmDateTime.getHours() && 
                now.getMinutes() === alarmDateTime.getMinutes()) {
                triggerAlarm(alarm);
            }
        } else if (alarm.repeat === 'months') {
            // 大致的月间隔检查，不考虑每月天数差异
            const monthsDiff = (now.getFullYear() - alarmDateTime.getFullYear()) * 12 + 
                              (now.getMonth() - alarmDateTime.getMonth());
            if (monthsDiff % alarm.interval === 0 && 
                now.getDate() === alarmDateTime.getDate() && 
                now.getHours() === alarmDateTime.getHours() && 
                now.getMinutes() === alarmDateTime.getMinutes()) {
                triggerAlarm(alarm);
            }
        }
    });
}

// 触发闹钟
function triggerAlarm(alarm) {
    if (currentAlarm) return; // 已有闹钟在响
    
    currentAlarm = alarm;
    
    // 显示提醒对话框
    document.getElementById('dialog-title').textContent = '闹钟提醒';
    document.getElementById('dialog-message').textContent = alarm.title;
    document.getElementById('alarm-dialog').classList.remove('hidden');
    
    // 执行提醒动作
    if (alarm.action === 'ring') {
        playAlarmSound();
    } else if (alarm.action === 'vibrate') {
        vibrateDevice();
    } else if (alarm.action === 'speech') {
        speakAlarm(alarm.title);
    }
    
    // 闪烁标题栏
    flashTitleBar();
}

// 播放闹钟声音（使用Web Audio API生成）
function playAlarmSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 设置频率
        oscillator.type = 'square'; // 方波
        
        // 渐强渐弱效果
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.1, audioContext.currentTime + 2);
        
        oscillator.start(audioContext.currentTime);
        
        // 保存引用以便停止
        currentAlarm.audioContext = audioContext;
        currentAlarm.oscillator = oscillator;
        currentAlarm.gainNode = gainNode;
        
    } catch (error) {
        console.error('Web Audio API播放失败:', error);
        // 如果Web Audio也失败，尝试语音合成
        speakAlarm(currentAlarm.title);
    }
}

// 震动设备
function vibrateDevice() {
    if ('vibrate' in navigator) {
        // 震动模式：震动1秒，停止0.5秒，重复
        const pattern = [1000, 500];
        navigator.vibrate(pattern);
    } else {
        // 不支持震动，改用语音
        speakAlarm(currentAlarm.title);
    }
}

// 语音提醒
function speakAlarm(message) {
    if ('speechSynthesis' in window) {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'zh-CN';
        utterance.rate = 1;
        utterance.pitch = 1;
        
        // 多次播放
        let count = 0;
        const speakInterval = setInterval(() => {
            if (count < 3 && currentAlarm) {
                synth.speak(utterance);
                count++;
            } else {
                clearInterval(speakInterval);
            }
        }, 2000);
    }
}

// 闪烁标题栏
function flashTitleBar() {
    const originalTitle = document.title;
    let flashInterval = null;
    let isOriginal = true;
    
    flashInterval = setInterval(() => {
        if (!currentAlarm) {
            clearInterval(flashInterval);
            document.title = originalTitle;
            return;
        }
        
        document.title = isOriginal ? '⏰ ' + currentAlarm.title : originalTitle;
        isOriginal = !isOriginal;
    }, 1000);
}

// 停止闹钟
function stopAlarm() {
    // 停止音频（Web Audio API）
    if (currentAlarm && currentAlarm.oscillator) {
        currentAlarm.oscillator.stop();
        currentAlarm.audioContext.close();
    }
    
    // 停止震动
    if ('vibrate' in navigator) {
        navigator.vibrate(0);
    }
    
    // 停止语音
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    // 隐藏对话框
    document.getElementById('alarm-dialog').classList.add('hidden');
    
    // 恢复标题
    document.title = 'Web闹钟';
    
    currentAlarm = null;
}

// 稍后提醒（5分钟后）
function snoozeAlarm() {
    // 在停止闹钟之前保存当前闹钟的副本
    const alarmToSnooze = currentAlarm;
    stopAlarm();
    
    // 创建新的闹钟，5分钟后提醒
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    
    const snoozeAlarm = {
        id: Date.now(),
        title: `稍后提醒：${alarmToSnooze.title}`,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().slice(0, 5),
        repeat: 'once',
        interval: 0,
        action: alarmToSnooze.action,
        enabled: true
    };
    
    alarms.push(snoozeAlarm);
    saveAlarms();
    renderAlarms();
    updateCalendar();
    
    showNotification('稍后提醒已设置', '将在5分钟后再次提醒');
}

// 显示通知
function showNotification(title, message) {
    if (!('Notification' in window)) {
        alert(message);
        return;
    }
    
    if (Notification.permission === 'granted') {
        new Notification(title, { body: message, icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij4KICA8cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnoiIGZpbGw9IiM0YTkwZTIiLz4KICA8cGF0aCBkPSJNMTIgMThjLTIuMjEgMC00LTEuNzktNC00czEuNzktNCA0LTRzNCAxLjc5IDQgNHMtMS43OSA0LTQgNHoiIGZpbGw9IiM0YTkwZTIiLz4KICA8cGF0aCBkPSJNMTIgMTRjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxem0wLTRjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxem0tMyA3Yy41NSAwIDEtLjQ1IDEtMXMtLjQ1LTEtMS0xLT EgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxCiAgICAgICAgbTAgLTRjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxem02IDdjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxCiAgICAgICAgbTAgLTRjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxIiAvPgo8L3N2Zz4K' });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body: message, icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij4KICA8cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnoiIGZpbGw9IiM0YTkwZTIiLz4KICA8cGF0aCBkPSJNMTIgMThjLTIuMjEgMC00LTEuNzktNC00czEuNzktNCA0LTRzNCAxLjc5IDQgNHMtMS43OSA0LTQgNHoiIGZpbGw9IiM0YTkwZTIiLz4KICA8cGF0aCBkPSJNMTIgMTRjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxem0wLTRjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxem0tMyA3Yy41NSAwIDEtLjQ1IDEtMXMtLjQ1LTEtMS0xLT EgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxCiAgICAgICAgbTAgLTRjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxem02IDdjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxCiAgICAgICAgbTAgLTRjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTFzLTEgLjQ1LTEgMWMuMDAgLjU1LjQ1IDEgMSAxIiAvPgo8L3N2Zz4K' });
            }
        });
    }
}

// 请求通知权限
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

// 添加日历按钮到悬浮球附近
const calendarBtn = document.createElement('button');
calendarBtn.textContent = '📅';
calendarBtn.className = 'floating-btn calendar-btn';
calendarBtn.style.bottom = '90px';
calendarBtn.onclick = toggleCalendarPanel;
document.body.appendChild(calendarBtn);

// 请求通知权限
requestNotificationPermission();