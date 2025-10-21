    document.addEventListener('DOMContentLoaded', function() {
      const dashboardData = {{ dashboard_data|tojson }};

      if (!dashboardData || Object.keys(dashboardData).length === 0 || dashboardData.error_message) {
        document.getElementById('pieChartPlaceholder').textContent = 'ไม่สามารถโหลดข้อมูลได้';
        document.getElementById('areaChartPlaceholder').textContent = 'ไม่สามารถโหลดข้อมูลได้';
        return;
      }

      // ==== PIE CHART ====
      const piePlaceholder = document.getElementById('pieChartPlaceholder');
      if (dashboardData.top_categories_chart?.labels?.length > 0) {
        piePlaceholder.style.display = 'none';
        const pieCtx = document.getElementById('pieChart').getContext('2d');
        new Chart(pieCtx, {
          type: 'doughnut',
          data: {
            labels: dashboardData.top_categories_chart.labels,
            datasets: dashboardData.top_categories_chart.datasets
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom' },
              datalabels: {
                color: '#fff',
                formatter: (value, ctx) => {
                  const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                  return total ? (value * 100 / total).toFixed(1) + \"%\" : '';
                }
              }
            }
          },
          // ## จุดที่ 1: โครงสร้าง Plugins ที่ถูกต้อง ##
          // การลงทะเบียน Plugin (เช่น ChartDataLabels) จะต้องอยู่นอกสุดของ Object การตั้งค่า
          // เพื่อไม่ให้ซ้ำซ้อนกับ options.plugins ที่ใช้สำหรับ 'ตั้งค่า' การทำงานของ Plugin
          plugins: [ChartDataLabels]
        });
      } else {
        piePlaceholder.textContent = 'ไม่มีข้อมูลสำหรับกราฟนี้';
      }

      // ==== STACKED AREA CHART ====
      let areaChartInstance;
      const areaPlaceholder = document.getElementById('areaChartPlaceholder');

      // ## จุดที่ 2: แก้ไขฟังก์ชัน buildStackedDatasets (จุดที่สำคัญที่สุด) ##
      // ฟังก์ชัน Chart.helpers.color ถูกลบออกไปแล้วใน Chart.js เวอร์ชัน 3+
      // เราจึงต้องเขียนฟังก์ชันขึ้นมาใหม่เพื่อแปลงสีเส้นขอบ (borderColor) ให้เป็นสีพื้นหลังโปร่งแสง (backgroundColor) เอง
      function buildStackedDatasets(originalDatasets) {
        if (!originalDatasets || originalDatasets.length === 0) return [];

        return originalDatasets.map(dataset => {
          // 1. ดึงค่าสีเส้นขอบ หรือใช้สีเทาเป็นค่าเริ่มต้นถ้าไม่มี
          const borderColor = dataset.borderColor || '#999999';

          // 2. สร้างสีโปร่งแสง (ประมาณ 60%) โดยการเติม Alpha Hex ('99') ต่อท้ายรหัสสี
          //   - ตรวจสอบก่อนว่าเป็นรหัสสี hex 6 หลักหรือไม่ (เช่น #FFFFFF มีความยาว 7)
          //   - ถ้าใช่: จะได้ผลลัพธ์เป็น #FFFFFF99
          //   - ถ้าไม่ใช่: ให้ใช้ค่าสี rgba แบบโปร่งแสงเป็นค่าสำรอง
          const backgroundColor = borderColor.length === 7 ? `${borderColor}99` : 'rgba(153, 153, 153, 0.6)';

          // 3. คืนค่า object ของ dataset เดิม พร้อมกับ backgroundColor ที่เราสร้างขึ้นใหม่
          return {
            ...dataset,
            fill: true,
            tension: 0.4,
            backgroundColor: backgroundColor, // ใช้ค่าสีใหม่ที่คำนวณได้
            pointRadius: 3,
            pointBackgroundColor: dataset.borderColor,
            pointBorderColor: '#fff'
          };
        });
      }

      // ฟังก์ชันสำหรับวาด Area Chart (ใช้โค้ดเดิมได้)
      function renderAreaChart(labels, datasets) {
        const ctx = document.getElementById('areaChart').getContext('2d');
        if (areaChartInstance) areaChartInstance.destroy();
        areaChartInstance = new Chart(ctx, {
          type: 'line',
          data: { labels, datasets: buildStackedDatasets(datasets) }, // เรียกใช้ฟังก์ชัน buildStackedDatasets ที่แก้ไขแล้ว
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: { legend: { position: 'bottom' } },
            scales: {
              x: { stacked: true },
              y: { stacked: true, beginAtZero: true }
            }
          }
        });
      }

      // แสดงผลกราฟครั้งแรก (ใช้โค้ดเดิมได้)
      if (dashboardData.monthly_trends?.labels?.length > 0) {
        areaPlaceholder.style.display = 'none';
        renderAreaChart(dashboardData.monthly_trends.labels, dashboardData.monthly_trends.datasets);
      } else {
        areaPlaceholder.textContent = 'ไม่มีข้อมูลสำหรับกราฟนี้';
      }

      // ฟังก์ชันสลับมุมมอง (ใช้โค้ดเดิมได้)
      window.switchView = function(view) {
        // เพิ่มการตรวจสอบว่ามีข้อมูล trends นั้นๆ อยู่จริงหรือไม่ เพื่อป้องกัน error
        if (view === 'month' && dashboardData.monthly_trends) {
          renderAreaChart(dashboardData.monthly_trends.labels, dashboardData.monthly_trends.datasets);
        } else if (view === 'year' && dashboardData.yearly_trends) {
          renderAreaChart(dashboardData.yearly_trends.labels, dashboardData.yearly_trends.datasets);
        }
      };
    });
