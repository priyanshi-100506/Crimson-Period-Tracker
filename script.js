// ======================
// INITIALIZATION
// ======================
document.addEventListener('DOMContentLoaded', function() {
  // Check if user has completed onboarding
  if (!localStorage.getItem('userData')) {
    document.getElementById('onboarding-modal').style.display = 'flex';
    // Set default date to today for last period
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('last-period').value = today;
  } else {
    initializeApp();
  }

  // Mobile menu toggle
  document.querySelector('.mobile-menu-toggle').addEventListener('click', function() {
    document.querySelector('.sidebar').classList.toggle('active');
  });
});

// Onboarding Form
document.getElementById('onboarding-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const userData = {
    name: document.getElementById('user-name-input').value,
    lastPeriod: document.getElementById('last-period').value,
    cycleLength: parseInt(document.getElementById('cycle-length').value),
    periodLength: parseInt(document.getElementById('period-length').value),
    flowLevel: document.getElementById('flow-level').value,
    hasPCOS: document.getElementById('pcos-diagnosed').checked
  };
  
  // Save user data
  localStorage.setItem('userData', JSON.stringify(userData));
  
  // Initialize period history
  if (!localStorage.getItem('periodHistory')) {
    localStorage.setItem('periodHistory', JSON.stringify([userData.lastPeriod]));
  }
  
  // Initialize temperature data
  if (!localStorage.getItem('temperatureData')) {
    localStorage.setItem('temperatureData', JSON.stringify({}));
  }
  
  // Close modal and initialize app
  document.getElementById('onboarding-modal').style.display = 'none';
  initializeApp();
});

function initializeApp() {
  // Load user data
  const userData = JSON.parse(localStorage.getItem('userData'));
  
  // Set user name
  document.getElementById('user-name').textContent = userData.name;
  
  // Initialize all app functionality
  setupNavigation();
  setupCalendar();
  setupTracker();
  updatePredictions();
  updateAnalytics();
  updateFertilityInfo();
  updateGreeting();
  setupNutritionTabs();
  setupHealthTracking();
  setupDarkMode();
  
  // Initialize charts
  if (typeof Chart !== 'undefined') {
    renderCharts();
  }
}

// ======================
// NAVIGATION
// ======================
function setupNavigation() {
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Update active nav link
      document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding page
      const pageId = this.dataset.page + '-page';
      document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
      document.getElementById(pageId).classList.add('active');
      
      // Close mobile menu if open
      document.querySelector('.sidebar').classList.remove('active');
      
      // Update charts when analytics page is shown
      if (pageId === 'analytics-page' && typeof Chart !== 'undefined') {
        renderCharts();
      }
    });
  });
}

// ======================
// TRACKER FUNCTIONALITY
// ======================
function setupTracker() {
  const today = new Date().toISOString().split('T')[0];
  
  // Load today's log if exists
  const todayLog = JSON.parse(localStorage.getItem('dailyLog-' + today)) || {
    symptoms: [],
    bbt: null,
    cm: '',
    notes: ''
  };
  
  // Set values from loaded log
  if (todayLog.bbt) document.getElementById('bbt-input').value = todayLog.bbt;
  if (todayLog.cm) document.getElementById('cm-input').value = todayLog.cm;
  if (todayLog.notes) document.getElementById('daily-notes').value = todayLog.notes;
  
  // Mark active symptoms
  todayLog.symptoms.forEach(symptom => {
    const btn = document.querySelector(`.symptom-btn[data-symptom="${symptom}"]`);
    if (btn) btn.classList.add('active');
  });
  
  // Symptom buttons
  document.querySelectorAll('.symptom-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      this.classList.toggle('active');
    });
  });

  // Save log button
  document.getElementById('save-log').addEventListener('click', function() {
    const dailyLog = {
      date: today,
      symptoms: Array.from(document.querySelectorAll('.symptom-btn.active'))
        .map(btn => btn.dataset.symptom),
      bbt: document.getElementById('bbt-input').value || null,
      cm: document.getElementById('cm-input').value || '',
      notes: document.getElementById('daily-notes').value || ''
    };
    
    // Save daily log
    localStorage.setItem('dailyLog-' + today, JSON.stringify(dailyLog));
    
    // Save temperature data if entered
    if (dailyLog.bbt) {
      const tempData = JSON.parse(localStorage.getItem('temperatureData'));
      tempData[today] = parseFloat(dailyLog.bbt);
      localStorage.setItem('temperatureData', JSON.stringify(tempData));
    }
    
    // Update predictions and analytics
    updatePredictions();
    updateAnalytics();
    updateFertilityInfo();
    generateCalendar(currentMonth, currentYear);
    
    alert('Your daily log has been saved!');
  });
  
  // Log period button
  document.getElementById('log-period-btn').addEventListener('click', function() {
    const periodHistory = JSON.parse(localStorage.getItem('periodHistory'));
    if (!periodHistory.includes(today)) {
      periodHistory.push(today);
      localStorage.setItem('periodHistory', JSON.stringify(periodHistory));
      
      // Update user data
      const userData = JSON.parse(localStorage.getItem('userData'));
      userData.lastPeriod = today;
      localStorage.setItem('userData', JSON.stringify(userData));
      
      // Update UI
      updatePredictions();
      updateAnalytics();
      updateFertilityInfo();
      generateCalendar(currentMonth, currentYear);
      
      alert('Period start logged successfully!');
    } else {
      alert('Period already logged for today');
    }
  });
}

// ======================
// PREDICTION & ANALYTICS
// ======================
function updatePredictions() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  const periodHistory = JSON.parse(localStorage.getItem('periodHistory'));
  
  if (periodHistory.length === 0) return;
  
  // Get last period date
  const lastPeriod = new Date(periodHistory[periodHistory.length - 1]);
  
  // Calculate cycle day
  const today = new Date();
  const cycleDay = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24)) + 1;
  document.getElementById('cycle-day').textContent = cycleDay;
  
  // Update cycle phase
  updateCyclePhase(cycleDay, userData.cycleLength);
  
  // Calculate next period date
  const avgCycleLength = calculateAvgCycleLength();
  const nextPeriod = new Date(lastPeriod);
  nextPeriod.setDate(lastPeriod.getDate() + avgCycleLength);
  
  // Calculate days until next period
  const daysUntil = Math.floor((nextPeriod - today) / (1000 * 60 * 60 * 24));
  
  // Update UI
  document.getElementById('next-period').textContent = nextPeriod.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  document.getElementById('days-until').textContent = `(${daysUntil} days)`;
  
  // Calculate ovulation date (14 days before next period)
  const ovulationDate = new Date(nextPeriod);
  ovulationDate.setDate(nextPeriod.getDate() - 14);
  document.getElementById('ovulation-date').textContent = ovulationDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

function updateCyclePhase(cycleDay, cycleLength) {
  let phase = '';
  let phaseDescription = '';
  
  if (cycleDay <= 5) {
    phase = 'Menstrual';
    phaseDescription = 'Your period is active';
  } else if (cycleDay <= 13) {
    phase = 'Follicular';
    phaseDescription = 'Follicles are developing';
  } else if (cycleDay === 14) {
    phase = 'Ovulation';
    phaseDescription = 'You\'re likely ovulating today';
  } else if (cycleDay <= cycleLength) {
    phase = 'Luteal';
    phaseDescription = 'Post-ovulation phase';
  } else {
    phase = 'Late';
    phaseDescription = 'Your period is overdue';
  }
  
  document.getElementById('cycle-phase').textContent = phase;
}

function calculateAvgCycleLength() {
  const periodHistory = JSON.parse(localStorage.getItem('periodHistory'));
  
  if (periodHistory.length < 2) {
    const userData = JSON.parse(localStorage.getItem('userData'));
    return userData.cycleLength || 28;
  }
  
  // Calculate differences between periods
  const diffs = [];
  for (let i = 1; i < periodHistory.length; i++) {
    const diff = (new Date(periodHistory[i]) - new Date(periodHistory[i-1])) / (1000 * 60 * 60 * 24);
    diffs.push(diff);
  }
  
  // Return average rounded to nearest day
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}

function updateAnalytics() {
  const periodHistory = JSON.parse(localStorage.getItem('periodHistory'));
  const userData = JSON.parse(localStorage.getItem('userData'));
  
  // Update cycle length stats
  if (periodHistory.length >= 2) {
    const avgCycle = calculateAvgCycleLength();
    document.getElementById('avg-cycle').textContent = `${avgCycle} days`;
    
    // Calculate trend
    if (periodHistory.length >= 3) {
      const lastTwoDiffs = [
        (new Date(periodHistory[periodHistory.length-1]) - new Date(periodHistory[periodHistory.length-2])) / (1000 * 60 * 60 * 24),
        (new Date(periodHistory[periodHistory.length-2]) - new Date(periodHistory[periodHistory.length-3])) / (1000 * 60 * 60 * 24)
      ];
      
      const trend = lastTwoDiffs[0] - lastTwoDiffs[1];
      if (trend > 0) {
        document.getElementById('cycle-trend').textContent = `+${Math.abs(trend)} day${Math.abs(trend) > 1 ? 's' : ''} from last cycle`;
      } else if (trend < 0) {
        document.getElementById('cycle-trend').textContent = `-${Math.abs(trend)} day${Math.abs(trend) > 1 ? 's' : ''} from last cycle`;
      } else {
        document.getElementById('cycle-trend').textContent = `Same as last cycle`;
      }
    }
  }
  
  // Update period length stats
  document.getElementById('avg-period').textContent = `${userData.periodLength} days`;
  
  // Update temperature stats if available
  const tempData = JSON.parse(localStorage.getItem('temperatureData'));
  if (Object.keys(tempData).length > 0) {
    const temps = Object.values(tempData).map(Number);
    const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
    
    // For simplicity, we'll assume first half of cycle is follicular, second half is luteal
    const follicularTemps = temps.slice(0, Math.floor(temps.length / 2));
    const lutealTemps = temps.slice(Math.floor(temps.length / 2));
    
    if (follicularTemps.length > 0) {
      const avgFollicular = (follicularTemps.reduce((a, b) => a + b, 0) / follicularTemps.length).toFixed(1);
      document.getElementById('avg-follicular-temp').textContent = `${avgFollicular}°C`;
    }
    
    if (lutealTemps.length > 0) {
      const avgLuteal = (lutealTemps.reduce((a, b) => a + b, 0) / lutealTemps.length).toFixed(1);
      document.getElementById('avg-luteal-temp').textContent = `${avgLuteal}°C`;
    }
  }
}

// ======================
// FERTILITY TRACKING
// ======================
function updateFertilityInfo() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  const periodHistory = JSON.parse(localStorage.getItem('periodHistory'));
  
  if (periodHistory.length === 0) return;
  
  const lastPeriod = new Date(periodHistory[periodHistory.length - 1]);
  const avgCycleLength = calculateAvgCycleLength();
  
  // Calculate ovulation date (14 days before next period)
  const nextPeriod = new Date(lastPeriod);
  nextPeriod.setDate(lastPeriod.getDate() + avgCycleLength);
  
  const ovulationDate = new Date(nextPeriod);
  ovulationDate.setDate(nextPeriod.getDate() - 14);
  
  // Calculate fertile window (5 days before ovulation to 1 day after)
  const fertileStart = new Date(ovulationDate);
  fertileStart.setDate(ovulationDate.getDate() - 5);
  
  const fertileEnd = new Date(ovulationDate);
  fertileEnd.setDate(ovulationDate.getDate() + 1);
  
  // Best conception days (2 days before ovulation)
  const bestConceptionStart = new Date(ovulationDate);
  bestConceptionStart.setDate(ovulationDate.getDate() - 2);
  
  const bestConceptionEnd = new Date(ovulationDate);
  
  // Update UI
  document.getElementById('fertile-window').textContent = 
    `${fertileStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
     ${fertileEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  
  document.getElementById('ovulation-day').textContent = 
    ovulationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  document.getElementById('best-conception-days').textContent = 
    `${bestConceptionStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-
     ${bestConceptionEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  
  // Determine current fertility status
  const today = new Date();
  if (today >= fertileStart && today <= fertileEnd) {
    if (today >= bestConceptionStart && today <= bestConceptionEnd) {
      document.getElementById('fertility-window-status').textContent = "High Fertility";
      document.getElementById('fertility-window-desc').textContent = "Best time for conception!";
      document.querySelector('.fertility-icon').innerHTML = '<i class="fas fa-baby"></i>';
    } else {
      document.getElementById('fertility-window-status').textContent = "Medium Fertility";
      document.getElementById('fertility-window-desc').textContent = "Good chance for conception";
      document.querySelector('.fertility-icon').innerHTML = '<i class="fas fa-venus"></i>';
    }
  } else {
    document.getElementById('fertility-window-status').textContent = "Low Fertility";
    document.getElementById('fertility-window-desc').textContent = "Less likely to conceive";
    document.querySelector('.fertility-icon').innerHTML = '<i class="fas fa-moon"></i>';
  }
}

// ======================
// PCOS CARE
// ======================
function setupNutritionTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // Set active tab
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding content
      const tabId = this.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // Set random PCOS tip
  const pcosTips = [
    "Try adding 1 tbsp of flaxseeds to your breakfast - they help regulate hormones and improve insulin sensitivity!",
    "Incorporate cinnamon in your meals - studies show it can help regulate menstrual cycles in PCOS.",
    "Opt for complex carbs like whole grains instead of refined carbs to manage insulin levels.",
    "Practice stress-reducing activities like yoga or meditation - stress worsens PCOS symptoms.",
    "Include protein with every meal to help balance blood sugar levels."
  ];
  
  const randomTip = pcosTips[Math.floor(Math.random() * pcosTips.length)];
  document.getElementById('pcos-daily-tip').textContent = randomTip;
}

// ======================
// HEALTH TRACKING
// ======================
function setupHealthTracking() {
  // Load saved weight data
  const weightData = JSON.parse(localStorage.getItem('weightData') || '[]');
  
  // Set last weight if available
  if (weightData.length > 0) {
    document.getElementById('weight-input').value = weightData[weightData.length - 1].weight;
    updateBMICalculation();
  }
  
  // Save weight button
  document.getElementById('save-weight').addEventListener('click', function() {
    const weight = parseFloat(document.getElementById('weight-input').value);
    const height = parseInt(document.getElementById('height-input').value);
    
    if (weight && height) {
      const newEntry = {
        date: new Date().toISOString().split('T')[0],
        weight: weight,
        height: height
      };
      
      weightData.push(newEntry);
      localStorage.setItem('weightData', JSON.stringify(weightData));
      updateBMICalculation();
      alert('Weight saved successfully!');
      
      // Update weight chart if on health page
      if (document.getElementById('health-page').classList.contains('active')) {
        renderWeightChart();
      }
    } else {
      alert('Please enter both weight and height');
    }
  });
}

function updateBMICalculation() {
  const weight = parseFloat(document.getElementById('weight-input').value);
  const height = parseInt(document.getElementById('height-input').value);
  
  if (weight && height) {
    const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
    document.getElementById('bmi-value').textContent = bmi;
    
    // Set BMI category
    let category = '';
    if (bmi < 18.5) {
      category = 'Underweight';
    } else if (bmi < 25) {
      category = 'Normal';
    } else if (bmi < 30) {
      category = 'Overweight';
    } else {
      category = 'Obese';
    }
    document.getElementById('bmi-category').textContent = category;
  }
}

// ======================
// CALENDAR FUNCTIONALITY
// ======================
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function setupCalendar() {
  generateCalendar(currentMonth, currentYear);
  
  // Month navigation
  document.getElementById('prev-month').addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    generateCalendar(currentMonth, currentYear);
  });
  
  document.getElementById('next-month').addEventListener('click', function() {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    generateCalendar(currentMonth, currentYear);
  });
}

function generateCalendar(month, year) {
  const calendarGrid = document.getElementById('calendar');
  calendarGrid.innerHTML = '';
  
  // Set month header
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('current-month').textContent = `${monthNames[month]} ${year}`;
  
  // Get first day of month and total days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Get previous month's days to show
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  // Create day cells
  for (let i = 0; i < 42; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    if (i < firstDay) {
      // Previous month
      const prevMonthDay = daysInPrevMonth - firstDay + i + 1;
      dayCell.textContent = prevMonthDay;
      dayCell.classList.add('other-month');
    } else if (i >= firstDay + daysInMonth) {
      // Next month
      const nextMonthDay = i - firstDay - daysInMonth + 1;
      dayCell.textContent = nextMonthDay;
      dayCell.classList.add('other-month');
    } else {
      // Current month
      const currentDay = i - firstDay + 1;
      dayCell.textContent = currentDay;
      
      // Format date string for comparison
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
      
      // Check if this is a period day
      const periodHistory = JSON.parse(localStorage.getItem('periodHistory') || '[]');
      if (periodHistory.includes(dateStr)) {
        dayCell.classList.add('period');
      }
      
      // Check for logged symptoms
      const dailyLog = JSON.parse(localStorage.getItem('dailyLog-' + dateStr) || '{}');
      if (dailyLog.symptoms && dailyLog.symptoms.length > 0) {
        dayCell.innerHTML += `<div class="symptom-dots">${'<span></span>'.repeat(Math.min(dailyLog.symptoms.length, 3))}</div>`;
      }
      
      // Check if today
      const today = new Date();
      if (currentDay === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayCell.classList.add('today');
      }
    }
    
    calendarGrid.appendChild(dayCell);
  }
}

// ======================
// DATA VISUALIZATION
// ======================
function renderCharts() {
  renderBBTChart();
  renderSymptomChart();
  renderWeightChart();
}

function renderBBTChart() {
  const tempData = JSON.parse(localStorage.getItem('temperatureData'));
  const periodHistory = JSON.parse(localStorage.getItem('periodHistory'));
  
  if (!tempData || Object.keys(tempData).length === 0) return;
  
  // Sort dates chronologically
  const sortedDates = Object.keys(tempData).sort((a, b) => new Date(a) - new Date(b));
  
  // Get last period date
  const lastPeriod = periodHistory.length > 0 ? 
    new Date(periodHistory[periodHistory.length - 1]) : 
    new Date(sortedDates[0]);
  
  // Prepare data for chart
  const labels = [];
  const data = [];
  const backgroundColors = [];
  
  sortedDates.forEach(dateStr => {
    const date = new Date(dateStr);
    const cycleDay = Math.floor((date - lastPeriod) / (1000 * 60 * 60 * 24)) + 1;
    
    labels.push(`Day ${cycleDay}`);
    data.push(tempData[dateStr]);
    
    // Color based on cycle phase (simplified)
    if (cycleDay <= 5) {
      backgroundColors.push('#dc143c'); // Menstrual
    } else if (cycleDay <= 13) {
      backgroundColors.push('#4e9efd'); // Follicular
    } else if (cycleDay === 14) {
      backgroundColors.push('#ff8c00'); // Ovulation
    } else {
      backgroundColors.push('#8a2be2'); // Luteal
    }
  });
  
  const ctx = document.getElementById('bbt-chart').getContext('2d');
  
  // Destroy previous chart if exists
  if (window.bbtChart) {
    window.bbtChart.destroy();
  }
  
  window.bbtChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Basal Body Temperature (°C)',
        data: data,
        backgroundColor: backgroundColors,
        borderColor: '#888',
        borderWidth: 1,
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          min: 35,
          max: 39
        }
      }
    }
  });
}

function renderSymptomChart() {
  // Get all logged symptoms
  const allLogs = [];
  const symptomCount = {};
  
  // Loop through localStorage to find all daily logs
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('dailyLog-')) {
      const log = JSON.parse(localStorage.getItem(key));
      allLogs.push(log);
      
      // Count symptoms
      if (log.symptoms) {
        log.symptoms.forEach(symptom => {
          symptomCount[symptom] = (symptomCount[symptom] || 0) + 1;
        });
      }
    }
  }
  
  if (Object.keys(symptomCount).length === 0) return;
  
  // Prepare data for chart
  const labels = Object.keys(symptomCount);
  const data = Object.values(symptomCount);
  
  const ctx = document.getElementById('symptom-chart').getContext('2d');
  
  // Destroy previous chart if exists
  if (window.symptomChart) {
    window.symptomChart.destroy();
  }
  
  window.symptomChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Symptom Frequency',
        data: data,
        backgroundColor: 'rgba(220, 20, 60, 0.7)',
        borderColor: 'rgba(220, 20, 60, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

function renderWeightChart() {
  const weightData = JSON.parse(localStorage.getItem('weightData') || '[]');
  
  if (weightData.length === 0) return;
  
  // Prepare data for chart
  const labels = weightData.map(entry => 
    new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );
  const data = weightData.map(entry => entry.weight);
  
  const ctx = document.getElementById('weight-chart').getContext('2d');
  
  // Destroy previous chart if exists
  if (window.weightChart) {
    window.weightChart.destroy();
  }
  
  window.weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Weight (kg)',
        data: data,
        backgroundColor: 'rgba(138, 43, 226, 0.2)',
        borderColor: 'rgba(138, 43, 226, 1)',
        borderWidth: 2,
        tension: 0.1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });
}

// ======================
// UTILITY FUNCTIONS
// ======================
function setupDarkMode() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  
  // Check for saved preference
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  darkModeToggle.addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('darkMode', 'enabled');
      darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      localStorage.setItem('darkMode', 'disabled');
      darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  });
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting;
  
  if (hour < 12) {
    greeting = 'Good morning';
  } else if (hour < 18) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }
  
  document.getElementById('greeting').textContent = `${greeting}, `;
}

// Initialize the app
if (localStorage.getItem('userData')) {
  initializeApp();
}