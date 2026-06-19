// charts.js - Dashboard metrics, daily/weekly booking charts using Chart.js

let occupancyChart = null;
let weeklyChart = null;
let peakHoursChart = null;
let revenueChart = null;

function destroyCharts() {
  if (occupancyChart) occupancyChart.destroy();
  if (weeklyChart) weeklyChart.destroy();
  if (peakHoursChart) peakHoursChart.destroy();
  if (revenueChart) revenueChart.destroy();
}

function initDashboardCharts(occupancyId, weeklyId, peakHoursId, revenueId) {
  destroyCharts();

  const isLightTheme = document.body.classList.contains('light-theme');
  const textColor = isLightTheme ? '#500b14' : '#fffff0'; // Burgundy vs Ivory
  const gridColor = isLightTheme ? 'rgba(80, 11, 20, 0.05)' : 'rgba(255, 255, 255, 0.05)';
  const goldColor = isLightTheme ? '#c5a059' : '#e5c185'; // Champagne Gold
  const goldHover = isLightTheme ? '#b38f4a' : '#d2ac6f';
  const greenColor = isLightTheme ? '#059669' : '#10b981';
  const redColor = isLightTheme ? '#dc2626' : '#ef4444';

  const reservations = db.getReservations();
  const tables = db.getTables();
  
  // 1. Calculate Occupancy (Simulated current evening state)
  const totalTables = tables.length;
  // Let's count active (Approved) bookings for today
  const todayStr = new Date().toISOString().split('T')[0];
  const activeBookingsToday = reservations.filter(r => r.date === todayStr && r.status === 'Approved');
  const occupiedCount = Math.min(totalTables, activeBookingsToday.length + 3); // Seed slightly for visuals
  const availableCount = Math.max(0, totalTables - occupiedCount);

  // Render Occupancy Chart (Donut)
  const occupancyCanvas = document.getElementById(occupancyId);
  if (occupancyCanvas) {
    occupancyChart = new Chart(occupancyCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Available Tables', 'Occupied Tables'],
        datasets: [{
          data: [availableCount, occupiedCount],
          backgroundColor: [greenColor, redColor],
          borderColor: isLightTheme ? '#fff' : '#121216',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: textColor, font: { family: 'Outfit' } }
          }
        }
      }
    });
  }

  // 2. Weekly Reservation Distribution (Simulate weekday data)
  // Let's aggregate bookings by weekday
  const weekdayCounts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
  reservations.forEach(r => {
    const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' });
    if (weekdayCounts[day] !== undefined) {
      weekdayCounts[day]++;
    }
  });

  const weeklyCanvas = document.getElementById(weeklyId);
  if (weeklyCanvas) {
    weeklyChart = new Chart(weeklyCanvas, {
      type: 'bar',
      data: {
        labels: Object.keys(weekdayCounts),
        datasets: [{
          label: 'Total Bookings',
          data: Object.values(weekdayCounts).map(val => val + Math.floor(Math.random() * 3) + 1), // adding visual noise for realism
          backgroundColor: goldColor,
          borderColor: goldHover,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Outfit' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Outfit' }, stepSize: 1 }
          }
        }
      }
    });
  }

  // 3. Peak Hours Occupancy Analysis (Line)
  const timeSlots = ['12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM', '10:00 PM'];
  // Calculate average probabilities from chatbot models
  const peakProbabilities = timeSlots.map(slot => chatbot.getPeakTimeProbability(todayStr, slot));

  const peakCanvas = document.getElementById(peakHoursId);
  if (peakCanvas) {
    peakHoursChart = new Chart(peakCanvas, {
      type: 'line',
      data: {
        labels: timeSlots,
        datasets: [{
          label: 'Peak Hour Probability (%)',
          data: peakProbabilities,
          borderColor: goldColor,
          backgroundColor: 'rgba(229, 193, 133, 0.15)', // Champagne Gold area fill
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointBackgroundColor: goldColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Outfit' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Outfit' } },
            max: 100,
            min: 0
          }
        }
      }
    });
  }

  // 4. Revenue Analysis (Simulated Line/Area Chart)
  // Let's assume average guest fee of $45
  const weeklyRevenue = Object.values(weekdayCounts).map(count => (count + 2) * 180); // base simulated daily earnings

  const revenueCanvas = document.getElementById(revenueId);
  if (revenueCanvas) {
    revenueChart = new Chart(revenueCanvas, {
      type: 'line',
      data: {
        labels: Object.keys(weekdayCounts),
        datasets: [{
          label: 'Simulated Revenue ($)',
          data: weeklyRevenue,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Outfit' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Outfit' } }
          }
        }
      }
    });
  }
}

window.dashboardCharts = {
  init: initDashboardCharts,
  destroy: destroyCharts
};
