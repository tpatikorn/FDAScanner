// static/dashboard_app.js
const { useState, useEffect, useRef } = React;

// Card Component (ไม่เปลี่ยนแปลง)
function StatCard({ title, value, icon, bgColor, textColor }) {
    return (
        <div className={`flex flex-col items-center justify-center p-6 rounded-lg shadow-lg ${bgColor} ${textColor} text-center transform transition-transform hover:scale-105 duration-200`}>
            <div className="text-4xl mb-2">{icon}</div>
            <div className="text-xl font-semibold mb-1">{title}</div>
            <div className="text-3xl font-bold">{value}</div>
        </div>
    );
}

// Chart Component (Bar and Line Chart - ปรับปรุงเพื่อให้รองรับ Line Chart ได้)
function MyChart({ chartId, type, labels, data, chartLabel, borderColor, backgroundColor, fill = true, pointBackgroundColor = null, pointBorderColor = null }) {
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            // ทำลาย Chart instance เก่า ถ้ามี เพื่อป้องกันปัญหา
            if (chartRef.current.chartInstance) {
                chartRef.current.chartInstance.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            const newChart = new Chart(ctx, {
                type: type, // รับ type มาจาก props ('bar' หรือ 'line')
                data: {
                    labels: labels,
                    datasets: [{
                        label: chartLabel,
                        data: data,
                        backgroundColor: backgroundColor,
                        borderColor: borderColor,
                        borderWidth: 1,
                        // สำหรับ Line Chart
                        fill: fill, // กำหนดว่าจะให้เติมสีใต้เส้นกราฟหรือไม่
                        pointBackgroundColor: pointBackgroundColor || borderColor,
                        pointBorderColor: pointBorderColor || borderColor,
                        pointBorderWidth: 1,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        // สำหรับ Bar Chart
                        borderRadius: type === 'bar' ? 5 : 0, // เฉพาะ Bar Chart ที่มีขอบมน
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, 
                    scales: {
                        xAxes: [{
                            gridLines: { display: false } 
                        }],
                        yAxes: [{
                            ticks: {
                                beginAtZero: true,
                                callback: function(value) {
                                    if (Number.isInteger(value)) {
                                        return value;
                                    }
                                }
                            },
                            gridLines: { drawBorder: false } 
                        }]
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            fontColor: '#333'
                        }
                    },
                    tooltips: {
                        mode: 'index',
                        intersect: false,
                    },
                    hover: {
                        mode: 'nearest',
                        intersect: true
                    }
                }
            });
            chartRef.current.chartInstance = newChart;
        }
        // Cleanup function เมื่อ Component ถูก unmount
        return () => {
            if (chartRef.current && chartRef.current.chartInstance) {
                chartRef.current.chartInstance.destroy();
            }
        };
    }, [labels, data, chartLabel, borderColor, backgroundColor, type, fill, pointBackgroundColor, pointBorderColor]); 

    return <canvas id={chartId} ref={chartRef} className="h-64 md:h-80 lg:h-96 w-full"></canvas>;
}

// Pie Chart Component (ใหม่ - สำหรับแสดง % ได้)
function PieChart({ chartId, labels, data, chartLabel, backgroundColors, borderColors }) {
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current.chartInstance) {
                chartRef.current.chartInstance.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            const newChart = new Chart(ctx, {
                type: 'pie', // ชนิดกราฟวงกลม
                data: {
                    labels: labels,
                    datasets: [{
                        label: chartLabel,
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    legend: {
                        position: 'right', // ตำแหน่ง Legend
                        labels: {
                            fontColor: '#333'
                        }
                    },
                    tooltips: {
                        callbacks: {
                            // แสดงชื่อและเปอร์เซ็นต์ใน tooltip
                            label: function(tooltipItem, data) {
                                const dataset = data.datasets[tooltipItem.datasetIndex];
                                const total = dataset.data.reduce((previousValue, currentValue) => previousValue + currentValue);
                                const currentValue = dataset.data[tooltipItem.index];
                                const percentage = parseFloat(((currentValue / total) * 100).toFixed(1)); // คำนวณ %
                                return data.labels[tooltipItem.index] + ': ' + currentValue + ' เรื่อง (' + percentage + '%)';
                            }
                        }
                    },
                    plugins: {
                        datalabels: { // ต้องมี datalabels plugin ถ้าต้องการแสดง % บน Pie Chart โดยตรง
                            formatter: (value, ctx) => {
                                const dataset = ctx.chart.data.datasets[0];
                                const total = dataset.data.reduce((previousValue, currentValue) => previousValue + currentValue);
                                const percentage = parseFloat(((value / total) * 100).toFixed(1));
                                return percentage + '%';
                            },
                            color: '#fff', // สีตัวอักษรบน slice
                        }
                    }
                }
            });
            chartRef.current.chartInstance = newChart;
        }
        return () => {
            if (chartRef.current && chartRef.current.chartInstance) {
                chartRef.current.chartInstance.destroy();
            }
        };
    }, [labels, data, chartLabel, backgroundColors, borderColors]);

    return <canvas id={chartId} ref={chartRef} className="h-64 md:h-80 lg:h-96 w-full"></canvas>;
}


// Main Dashboard Component
function Dashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await fetch('/fda_scan/dashboard_api');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setDashboardData(data);
                console.log("Dashboard Data:", data);
            } catch (err) {
                setError(err);
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                <span className="ml-4 text-lg">กำลังโหลดข้อมูล...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-screen w-full text-red-600">
                <p className="text-xl mb-4">เกิดข้อผิดพลาดในการโหลด Dashboard: {error.message}</p>
                <p>โปรดตรวจสอบการเชื่อมต่อฐานข้อมูลและ Console (F12) ของเบราว์เซอร์</p>
            </div>
        );
    }

    // Prepare data for charts
    const reportsByYearLabels = dashboardData.reports_by_year.map(item => item.year);
    const reportsByYearData = dashboardData.reports_by_year.map(item => item.count);

    const topGeographiesLabels = dashboardData.top_geographies.map(item => item.com_geographies);
    const topGeographiesData = dashboardData.top_geographies.map(item => item.count);

    const topProvincesLabels = dashboardData.top_provinces.map(item => item.com_provide);
    const topProvincesData = dashboardData.top_provinces.map(item => item.count);

    const topCategoriesLabels = dashboardData.top_categories.map(item => item.com_category);
    const topCategoriesData = dashboardData.top_categories.map(item => item.count);

    // สีสำหรับ Pie Chart (คุณสามารถเพิ่มหรือปรับเปลี่ยนได้)
    const pieChartBackgroundColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#A0A0A0', '#C0C0C0', '#808080'
    ];
    const pieChartBorderColors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#A0A0A0', '#C0C0C0', '#808080'
    ];


    return (
        <div className="flex-1 p-6 bg-gray-100 min-h-screen">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Dashboard สถิติการรายงานผลิตภัณฑ์</h1>
                <p className="text-gray-600">ภาพรวมข้อมูลที่สำคัญ</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="จำนวนรายงานทั้งหมด" 
                    value={`${dashboardData.total_reports} เรื่อง`} 
                    icon="📋" 
                    bgColor="bg-blue-500" 
                    textColor="text-white" 
                />
                <StatCard 
                    title="หมวดหมู่สูงสุด" 
                    value={dashboardData.top_categories.length > 0 ? `${dashboardData.top_categories[0].com_category} (${dashboardData.top_categories[0].count} เรื่อง)` : 'ไม่มีข้อมูล'} 
                    icon="🏷️" 
                    bgColor="bg-green-500" 
                    textColor="text-white" 
                />
                <StatCard 
                    title="ภูมิภาคสูงสุด" 
                    value={dashboardData.top_geographies.length > 0 ? `${dashboardData.top_geographies[0].com_geographies} (${dashboardData.top_geographies[0].count} เรื่อง)` : 'ไม่มีข้อมูล'} 
                    icon="🗺️" 
                    bgColor="bg-yellow-500" 
                    textColor="text-white" 
                />
                <StatCard 
                    title="จังหวัดสูงสุด" 
                    value={dashboardData.top_provinces.length > 0 ? `${dashboardData.top_provinces[0].com_provide} (${dashboardData.top_provinces[0].count} เรื่อง)` : 'ไม่มีข้อมูล'} 
                    icon="📍" 
                    bgColor="bg-red-500" 
                    textColor="text-white" 
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart: รายงานภาพรวมแยกตามปี (Line Chart) */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">รายงานภาพรวมแยกตามปี</h2>
                    <MyChart
                        chartId="reportsByYearChart"
                        type="line" // กำหนดเป็น line chart
                        labels={reportsByYearLabels}
                        data={reportsByYearData}
                        chartLabel="จำนวนเรื่องที่รายงาน"
                        borderColor="rgba(75, 192, 192, 1)"
                        backgroundColor="rgba(75, 192, 192, 0.2)" // Background ใต้เส้น
                        fill={true} // เติมสีใต้เส้น
                        pointBackgroundColor="rgba(75, 192, 192, 1)"
                        pointBorderColor="rgba(255, 255, 255, 1)"
                    />
                </div>

                {/* Chart: 10 อันดับภูมิภาค (Bar Chart) */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">10 อันดับภูมิภาคที่มีคนรายงานมากที่สุด</h2>
                    <MyChart
                        chartId="topGeographiesChart"
                        type="bar" // กำหนดเป็น bar chart
                        labels={topGeographiesLabels}
                        data={topGeographiesData}
                        chartLabel="จำนวนเรื่อง"
                        borderColor="rgba(255, 159, 64, 1)"
                        backgroundColor="rgba(255, 159, 64, 0.6)"
                    />
                </div>

                {/* Chart: 10 อันดับจังหวัด (Bar Chart) */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">10 อันดับจังหวัดที่คนรายงานมากที่สุด</h2>
                    <MyChart
                        chartId="topProvincesChart"
                        type="bar" // กำหนดเป็น bar chart
                        labels={topProvincesLabels}
                        data={topProvincesData}
                        chartLabel="จำนวนเรื่อง"
                        borderColor="rgba(54, 162, 235, 1)"
                        backgroundColor="rgba(54, 162, 235, 0.6)"
                    />
                </div>

                {/* Chart: 10 อันดับหมวดหมู่ (Pie Chart) - สำหรับแสดง % */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">สัดส่วนหมวดหมู่ที่คนรายงานมากที่สุด</h2>
                    <PieChart
                        chartId="topCategoriesPieChart"
                        labels={topCategoriesLabels}
                        data={topCategoriesData}
                        chartLabel="สัดส่วนเรื่อง"
                        backgroundColors={pieChartBackgroundColors}
                        borderColors={pieChartBorderColors}
                    />
                </div>
            </div>
        </div>
    );
}

// Main App component
function App() {
    return (
        <div className="min-h-screen bg-gray-100 font-sans antialiased">
            {/* Sidebar Placeholder - Not fully implemented to keep code concise */}
            <div className="hidden md:flex flex-col w-64 bg-gray-800 text-white p-6 shadow-xl fixed left-0 top-0 h-full">
                <div className="text-2xl font-bold mb-8 text-center text-green-400">📊 Dashboard</div>
                <nav className="space-y-4">
                    <a href="/fda_scan/stats" className="flex items-center px-4 py-2 rounded-lg text-lg hover:bg-gray-700 transition-colors duration-200">
                        <span className="mr-3">🏠</span> Dashboard
                    </a>
                    <a href="/fda_scan/admin" className="flex items-center px-4 py-2 rounded-lg text-lg hover:bg-gray-700 transition-colors duration-200">
                        <span className="mr-3">📋</span> รายการรายงาน
                    </a>
                    <a href="/fda_scan/" className="flex items-center px-4 py-2 rounded-lg text-lg hover:bg-gray-700 transition-colors duration-200">
                        <span className="mr-3">✍️</span> สร้างรายงานใหม่
                    </a>
                </nav>
            </div>
            
            {/* Main content area (adjusted for sidebar) */}
            <div className="md:ml-64 flex-1">
                <Dashboard />
            </div>
        </div>
    );
}

// Render the App
ReactDOM.render(<App />, document.getElementById('root'));
