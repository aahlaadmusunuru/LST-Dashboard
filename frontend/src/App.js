import React, { useEffect, useRef, useState, useCallback } from 'react';

// Constants
const API_URL = 'http://localhost:5000';
const INITIAL_MONTH = '2024-08';
const NY_CENTER = [42.9543, -75.5262];
const INITIAL_ZOOM = 7;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Utility Functions
const getTempColor = (temp) => {
  if (temp === null || temp === undefined) return '#94a3b8';
  if (temp < 0) return '#0ea5e9';
  if (temp < 10) return '#06b6d4';
  if (temp < 20) return '#10b981';
  if (temp < 25) return '#eab308';
  if (temp < 30) return '#f97316';
  return '#ef4444';
};

const formatMonthKey = (index) => `2024-${String(index + 1).padStart(2, '0')}`;

// Chart Component
const TemperatureChart = ({ data, selectedMonth, onMonthClick, pixelStats }) => {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 240 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: width - 40, height: 240 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Force recalculate dimensions when data changes
  useEffect(() => {
    if (containerRef.current && data && data.length > 0) {
      const { width } = containerRef.current.getBoundingClientRect();
      setDimensions({ width: width - 40, height: 240 });
    }
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div style={styles.chart.empty}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
          <path d="M3 13.5L9 7.5L13 11.5L21 3.5M21 3.5H15M21 3.5V9.5" />
        </svg>
        <div style={styles.chart.emptyText}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>No Data Available</div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>Click on the map to view temperature trends</div>
        </div>
      </div>
    );
  }

  const maxTemp = Math.max(...data.map(d => d.temperature));
  const minTemp = Math.min(...data.map(d => d.temperature));
  const range = maxTemp - minTemp || 1;
  const avgTemp = data.reduce((sum, d) => sum + d.temperature, 0) / data.length;

  // Chart dimensions with proper aspect ratio
  const chartWidth = dimensions.width;
  const chartHeight = dimensions.height;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Calculate points
  const points = data.map((item, idx) => {
    const x = (idx / (data.length - 1)) * plotWidth + padding.left;
    const y = padding.top + plotHeight - ((item.temperature - minTemp) / range * plotHeight);
    return { x, y, ...item };
  });

  // Create smooth curve path
  const pathData = points.map((p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `Q ${cpx} ${prev.y} ${p.x} ${p.y}`;
  }).join(' ');

  return (
    <div ref={containerRef} style={styles.chart.container}>
      {/* Header */}
      <div style={styles.chart.header}>
        <div>
          <h4 style={styles.chart.title}>Temperature Trends</h4>
          <p style={styles.chart.subtitle}>Monthly average temperatures for selected location</p>
        </div>
        <div style={styles.chart.statsPanel}>
          {pixelStats?.annual_stats && (
            <div style={styles.chart.annualStats}>
              <div style={styles.chart.statGroup}>
                <span style={styles.chart.statLabel}>ANNUAL AVERAGE</span>
                <span style={{ ...styles.chart.statValue, color: '#10b981', fontSize: '20px' }}>
                  {pixelStats.annual_stats.mean}°C
                </span>
              </div>
              <div style={styles.chart.statDivider}></div>
              <div style={styles.chart.statRow}>
                <div style={styles.chart.statItem}>
                  <span style={styles.chart.statLabel}>MIN</span>
                  <span style={{ ...styles.chart.statValue, color: '#0ea5e9' }}>{minTemp.toFixed(1)}°</span>
                </div>
                <div style={styles.chart.statItem}>
                  <span style={styles.chart.statLabel}>AVG</span>
                  <span style={{ ...styles.chart.statValue, color: '#10b981' }}>{avgTemp.toFixed(1)}°</span>
                </div>
                <div style={styles.chart.statItem}>
                  <span style={styles.chart.statLabel}>MAX</span>
                  <span style={{ ...styles.chart.statValue, color: '#ef4444' }}>{maxTemp.toFixed(1)}°</span>
                </div>
              </div>
              <div style={styles.chart.statRow}>
                <div style={styles.chart.statItem}>
                  <span style={styles.chart.statLabel}>RANGE</span>
                  <span style={{ ...styles.chart.statValue, color: '#6b7280' }}>
                    {pixelStats.annual_stats.range}°C
                  </span>
                </div>
              </div>
            </div>
          )}
          {!pixelStats && (
            <div style={styles.chart.stats}>
              <div style={styles.chart.statItem}>
                <span style={styles.chart.statLabel}>MIN</span>
                <span style={{ ...styles.chart.statValue, color: '#0ea5e9' }}>{minTemp.toFixed(1)}°</span>
              </div>
              <div style={styles.chart.statItem}>
                <span style={styles.chart.statLabel}>AVG</span>
                <span style={{ ...styles.chart.statValue, color: '#10b981' }}>{avgTemp.toFixed(1)}°</span>
              </div>
              <div style={styles.chart.statItem}>
                <span style={styles.chart.statLabel}>MAX</span>
                <span style={{ ...styles.chart.statValue, color: '#ef4444' }}>{maxTemp.toFixed(1)}°</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SVG Chart */}
      <div style={styles.chart.svgWrapper}>
        <svg width={chartWidth} height={chartHeight} style={{ display: 'block', margin: '0 auto' }}>
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
            const y = padding.top + plotHeight * (1 - tick);
            const temp = minTemp + range * tick;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray={i === 0 || i === 4 ? "0" : "2,2"}
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="#6b7280"
                  fontSize="12"
                  textAnchor="end"
                >
                  {temp.toFixed(0)}°C
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={15}
            y={chartHeight / 2}
            fill="#6b7280"
            fontSize="12"
            fontWeight="500"
            textAnchor="middle"
            transform={`rotate(-90, 15, ${chartHeight / 2})`}
          >
            Temperature (°C)
          </text>

          {/* Average line */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight - ((avgTemp - minTemp) / range * plotHeight)}
            x2={padding.left + plotWidth}
            y2={padding.top + plotHeight - ((avgTemp - minTemp) / range * plotHeight)}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity="0.5"
          />

          {/* Area under curve */}
          <path
            d={`${pathData} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${padding.top + plotHeight} Z`}
            fill="url(#areaGradient)"
          />

          {/* Main line */}
          <path
            d={pathData}
            stroke="#3b82f6"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points and labels */}
          {points.map((point, idx) => {
            const isSelected = selectedMonth === point.month;
            const monthNum = parseInt(point.month.split('-')[1]);
            
            return (
              <g key={idx}>
                {/* Month label */}
                <text
                  x={point.x}
                  y={chartHeight - 35}
                  fill={isSelected ? '#3b82f6' : '#6b7280'}
                  fontSize="12"
                  textAnchor="middle"
                  fontWeight={isSelected ? '600' : '400'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onMonthClick(point.month)}
                >
                  {MONTH_ABBR[monthNum - 1]}
                </text>
                
                {/* Temperature value */}
                <text
                  x={point.x}
                  y={chartHeight - 20}
                  fill={isSelected ? '#3b82f6' : '#9ca3af'}
                  fontSize="11"
                  textAnchor="middle"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onMonthClick(point.month)}
                >
                  {point.temperature.toFixed(1)}°
                </text>

                {/* Interactive circle */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isSelected ? 6 : 4}
                  fill="white"
                  stroke={isSelected ? '#3b82f6' : getTempColor(point.temperature)}
                  strokeWidth={isSelected ? 3 : 2}
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => onMonthClick(point.month)}
                />
                
                {isSelected && (
                  <circle 
                    cx={point.x} 
                    cy={point.y} 
                    r="10" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="1.5"
                    opacity="0.3"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  // State Management
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(INITIAL_MONTH);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [layerOpacity, setLayerOpacity] = useState(70);
  const [currentBasemap, setCurrentBasemap] = useState('osm');
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [pixelStats, setPixelStats] = useState(null);
  const currentLayerRef = useRef(null);
  const markerRef = useRef(null);
const [currentMonth, setCurrentMonth] = useState(null);


  // CSV Download Function
 // CSV Download Function
// CSV Download Function
  // CSV Download Function
  const downloadCSV = () => {
    let csvContent = "";
    let filename = "";
    
    // Always start with NY State Overview
    csvContent = "NEW YORK STATE TEMPERATURE ANALYSIS\n";
    csvContent += "=====================================\n\n";
    
    // Add NY State overall statistics from current month
    csvContent += "NEW YORK STATE OVERVIEW\n";
    csvContent += "-----------------------\n";
    csvContent += "Data Source: MODIS Land Surface Temperature (Daytime Average)\n";
    csvContent += `Analysis Month: ${currentMonth?.label || selectedMonth}\n\n`;
    
    if (currentMonth?.statistics) {
      csvContent += "State-wide Statistics\n";
      csvContent += `Mean Temperature,${currentMonth.statistics.mean?.toFixed(2) || 'N/A'}°C\n`;
      csvContent += `Minimum Temperature,${currentMonth.statistics.min?.toFixed(2) || 'N/A'}°C\n`;
      csvContent += `Maximum Temperature,${currentMonth.statistics.max?.toFixed(2) || 'N/A'}°C\n`;
      csvContent += `Standard Deviation,${currentMonth.statistics.stdDev?.toFixed(2) || 'N/A'}°C\n`;
      csvContent += `Temperature Range,${((currentMonth.statistics.max - currentMonth.statistics.min)?.toFixed(2)) || 'N/A'}°C\n`;
    }
    
    csvContent += "\n";
    
    // Add location-specific data if available
    if (timeSeriesData && timeSeriesData.length > 0) {
      csvContent += "LOCATION-SPECIFIC DATA\n";
      csvContent += "----------------------\n";
      
      if (selectedPoint) {
        csvContent += `Latitude,${selectedPoint.lat.toFixed(4)}°\n`;
        csvContent += `Longitude,${selectedPoint.lng.toFixed(4)}°\n`;
        csvContent += `Current Month Temperature,${selectedPoint.temperature?.toFixed(1) || 'N/A'}°C\n\n`;
      }
      
      csvContent += "Monthly Temperature Time Series\n";
      csvContent += "Month,Temperature (°C),Label\n";
      timeSeriesData.forEach(item => {
        csvContent += `${item.month},${item.temperature},${item.label}\n`;
      });
      
      if (pixelStats?.annual_stats) {
        csvContent += "\nLocation Annual Statistics\n";
        csvContent += `Annual Mean,${pixelStats.annual_stats.mean}°C\n`;
        csvContent += `Annual Minimum,${pixelStats.annual_stats.min}°C\n`;
        csvContent += `Annual Maximum,${pixelStats.annual_stats.max}°C\n`;
        csvContent += `Standard Deviation,${pixelStats.annual_stats.std_dev}°C\n`;
        csvContent += `Annual Range,${pixelStats.annual_stats.range}°C\n`;
      }
      
      filename = `ny_temperature_complete_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      csvContent += "Note: Click on map to add location-specific temperature data\n";
      filename = `ny_state_temperature_overview_${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    csvContent += `\nGenerated: ${new Date().toLocaleDateString()}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // PDF Report Generation Function
// PDF Report Generation Function
  const generatePDFReport = async () => {
    try {
      // Show loading state
      console.log('Starting PDF generation...');
      
      // Load jsPDF if not already loaded
      if (!window.jspdf || !window.jspdf.jsPDF) {
        console.log('Loading jsPDF library...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 10000); // 10 second timeout
        });
        
        // Wait a bit for the library to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Load html2canvas if not already loaded
      if (!window.html2canvas) {
        console.log('Loading html2canvas library...');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          setTimeout(reject, 10000); // 10 second timeout
        });
        
        // Wait a bit for the library to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check if libraries loaded successfully
      if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('jsPDF library failed to load');
      }

      console.log('Libraries loaded successfully');
      
      // Get jsPDF from window
      const { jsPDF } = window.jspdf;
      
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      // Title and Header
      pdf.setFontSize(20);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Temperature Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128);
      pdf.text('New York State • 2024', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 20;

      // SECTION 1: Always show NY State Overview
      pdf.setFontSize(16);
      pdf.setTextColor(31, 41, 55);
      pdf.setFont(undefined, 'bold');
      pdf.text('New York State Overview', margin, yPosition);
      pdf.setFont(undefined, 'normal');
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Data Source: MODIS Land Surface Temperature (Daytime Average)', margin, yPosition);
      yPosition += 6;
      pdf.text('Coverage: Entire New York State', margin, yPosition);
      yPosition += 6;
      pdf.text(`Current Analysis Month: ${currentMonth?.label || selectedMonth}`, margin, yPosition);
      yPosition += 12;

      // NY State Statistics Table
      if (currentMonth?.statistics) {
        pdf.setFontSize(14);
        pdf.setTextColor(55, 65, 81);
        pdf.text('State-wide Temperature Statistics', margin, yPosition);
        yPosition += 8;

        const stateStatsTable = [
          ['Metric', 'Value'],
          ['Mean Temperature', `${currentMonth.statistics.mean?.toFixed(2) || 'N/A'}°C`],
          ['Minimum', `${currentMonth.statistics.min?.toFixed(2) || 'N/A'}°C`],
          ['Maximum', `${currentMonth.statistics.max?.toFixed(2) || 'N/A'}°C`],
          ['Standard Deviation', `${currentMonth.statistics.stdDev?.toFixed(2) || 'N/A'}°C`],
          ['Temperature Range', `${((currentMonth.statistics.max - currentMonth.statistics.min)?.toFixed(2)) || 'N/A'}°C`]
        ];

        pdf.setFontSize(10);
        let tableY = yPosition;
        const cellHeight = 8;
        const col1Width = 50;
        const col2Width = 40;

        stateStatsTable.forEach((row, index) => {
          if (index === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, tableY, col1Width + col2Width, cellHeight, 'F');
            pdf.setTextColor(55, 65, 81);
            pdf.setFont(undefined, 'bold');
          } else {
            pdf.setTextColor(107, 114, 128);
            pdf.setFont(undefined, 'normal');
          }
          
          pdf.text(row[0], margin + 2, tableY + 5);
          pdf.text(row[1], margin + col1Width + 2, tableY + 5);
          
          pdf.setDrawColor(229, 231, 235);
          pdf.line(margin, tableY, margin + col1Width + col2Width, tableY);
          if (index === stateStatsTable.length - 1) {
            pdf.line(margin, tableY + cellHeight, margin + col1Width + col2Width, tableY + cellHeight);
          }
          
          tableY += cellHeight;
        });

        yPosition = tableY + 15;
      }

      // SECTION 2: Location-specific data (if available)
      if (timeSeriesData && timeSeriesData.length > 0) {
        // Add separator line
        pdf.setDrawColor(229, 231, 235);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(16);
        pdf.setTextColor(31, 41, 55);
        pdf.setFont(undefined, 'bold');
        pdf.text('Location-Specific Analysis', margin, yPosition);
        pdf.setFont(undefined, 'normal');
        yPosition += 10;

        if (selectedPoint) {
          pdf.setFontSize(11);
          pdf.setTextColor(107, 114, 128);
          pdf.text(`Latitude: ${selectedPoint.lat.toFixed(4)}°`, margin, yPosition);
          yPosition += 6;
          pdf.text(`Longitude: ${selectedPoint.lng.toFixed(4)}°`, margin, yPosition);
          yPosition += 6;
          if (selectedPoint.temperature) {
            pdf.text(`Current Month Temperature: ${selectedPoint.temperature.toFixed(1)}°C`, margin, yPosition);
            yPosition += 6;
          }
          yPosition += 8;
        }

        // Location Annual Statistics
        if (pixelStats?.annual_stats) {
          pdf.setFontSize(14);
          pdf.setTextColor(55, 65, 81);
          pdf.text('Location Annual Statistics', margin, yPosition);
          yPosition += 8;

          const locationStatsTable = [
            ['Metric', 'Value'],
            ['Annual Mean', `${pixelStats.annual_stats.mean}°C`],
            ['Minimum', `${pixelStats.annual_stats.min}°C`],
            ['Maximum', `${pixelStats.annual_stats.max}°C`],
            ['Standard Deviation', `${pixelStats.annual_stats.std_dev}°C`],
            ['Temperature Range', `${pixelStats.annual_stats.range}°C`]
          ];

          pdf.setFontSize(10);
          let tableY = yPosition;
          const cellHeight = 8;
          const col1Width = 50;
          const col2Width = 40;

          locationStatsTable.forEach((row, index) => {
            if (index === 0) {
              pdf.setFillColor(249, 250, 251);
              pdf.rect(margin, tableY, col1Width + col2Width, cellHeight, 'F');
              pdf.setTextColor(55, 65, 81);
              pdf.setFont(undefined, 'bold');
            } else {
              pdf.setTextColor(107, 114, 128);
              pdf.setFont(undefined, 'normal');
            }
            
            pdf.text(row[0], margin + 2, tableY + 5);
            pdf.text(row[1], margin + col1Width + 2, tableY + 5);
            
            pdf.setDrawColor(229, 231, 235);
            pdf.line(margin, tableY, margin + col1Width + col2Width, tableY);
            if (index === locationStatsTable.length - 1) {
              pdf.line(margin, tableY + cellHeight, margin + col1Width + col2Width, tableY + cellHeight);
            }
            
            tableY += cellHeight;
          });

          yPosition = tableY + 10;
        }

        // Check if need new page for monthly data
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = margin;
        }

        // Monthly Temperature Data
        pdf.setFontSize(14);
        pdf.setTextColor(55, 65, 81);
        pdf.text('Monthly Temperature Time Series', margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(10);
        const monthsPerRow = 3;
        const cellWidth = contentWidth / monthsPerRow;
        
        timeSeriesData.forEach((item, index) => {
          const col = index % monthsPerRow;
          const row = Math.floor(index / monthsPerRow);
          
          if (col === 0 && yPosition + (row * 6) > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          
          const x = margin + (col * cellWidth);
          const y = yPosition + (row * 6);
          
          pdf.setTextColor(107, 114, 128);
          pdf.text(`${item.label}: `, x, y);
          pdf.setTextColor(55, 65, 81);
          pdf.setFont(undefined, 'bold');
          pdf.text(`${item.temperature.toFixed(1)}°C`, x + 25, y);
          pdf.setFont(undefined, 'normal');
        });

        yPosition += Math.ceil(timeSeriesData.length / monthsPerRow) * 6 + 10;
      } else {
        // If no location selected, add note
        pdf.setFontSize(10);
        pdf.setTextColor(156, 163, 175);
        pdf.setFont(undefined, 'italic');
        pdf.text('Note: Click on any location on the map to add location-specific analysis', margin, yPosition);
        pdf.setFont(undefined, 'normal');
        yPosition += 10;
      }

      // Try to capture and add map (but don't fail if it doesn't work)
      if (mapRef.current && mapInstance && window.html2canvas) {
        try {
          pdf.addPage();
          yPosition = margin;
          
          pdf.setFontSize(14);
          pdf.setTextColor(55, 65, 81);
          pdf.text('Map View', margin, yPosition);
          yPosition += 10;

          console.log('Capturing map...');
          const mapCanvas = await window.html2canvas(mapRef.current, {
            useCORS: true,
            allowTaint: true,
            scale: 1, // Reduced scale for faster processing
            logging: false
          });
          
          const mapImgData = mapCanvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (mapCanvas.height * imgWidth) / mapCanvas.width;
          
          pdf.addImage(mapImgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, 150));
          console.log('Map added successfully');
        } catch (err) {
          console.warn('Could not capture map:', err);
          pdf.setFontSize(10);
          pdf.setTextColor(156, 163, 175);
          pdf.text('Map snapshot could not be captured', margin, yPosition);
        }
      }

      // Add footer to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          `Generated on ${new Date().toLocaleDateString()} • Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save the PDF with appropriate filename
      const filename = timeSeriesData && timeSeriesData.length > 0 
        ? `ny_temperature_complete_report_${new Date().toISOString().split('T')[0]}.pdf`
        : `ny_state_temperature_overview_${new Date().toISOString().split('T')[0]}.pdf`;
      
      console.log('Saving PDF as:', filename);
      pdf.save(filename);
      console.log('PDF saved successfully');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF report: ${error.message}\n\nPlease check the console for details.`);
    }
  };
  // API Functions
 // API Functions
  const fetchTimeSeries = async (lat, lng) => {
    try {
      const response = await fetch(`${API_URL}/api/time-series?lat=${lat}&lng=${lng}`);
      const data = await response.json();
      // Remove this line - it's overwriting currentMonth with wrong data
      // setCurrentMonth(data);

      if (data.time_series) {
        setTimeSeriesData(data.time_series);
      }
    } catch (err) {
      console.error('Error fetching time series:', err);
    }
  };

const loadMonth = async (month) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedMonth(month);
      
      const response = await fetch(`${API_URL}/api/lst-layer?month=${month}`);
      if (!response.ok) throw new Error(`Backend returned ${response.status}`);
      
      const data = await response.json();
      
      // Store the complete month data
      setCurrentMonth(data);
      
      if (data.statistics) {
        setStatistics(data.statistics);
      }
      
      if (mapInstance && data.tile_url) {
        if (currentLayerRef.current) {
          mapInstance.removeLayer(currentLayerRef.current);
        }
        
        const tempLayer = window.L.tileLayer(data.tile_url, { 
          opacity: layerOpacity / 100,
          maxZoom: 12,
          minZoom: 5,
          tileSize: 256
        });
        
        tempLayer.addTo(mapInstance);
        currentLayerRef.current = tempLayer;
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading month:', err);
      setError(`Failed to load ${month}: ${err.message}`);
      setLoading(false);
    }
  };

  // Map Click Handler
  const handleMapClick = useCallback(async (e) => {
    if (!mapInstance) return;
    
    const { lat, lng } = e.latlng;
    
    // Update marker
    if (markerRef.current) {
      mapInstance.removeLayer(markerRef.current);
    }
    
    const customIcon = window.L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="${styles.marker}"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    
    const marker = window.L.marker([lat, lng], { icon: customIcon }).addTo(mapInstance);
    markerRef.current = marker;
    
    marker.bindPopup('<div style="padding: 12px;">Loading data...</div>').openPopup();
    
    try {
      // Fetch data
      const [pointResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/api/point?month=${selectedMonth}&lat=${lat}&lng=${lng}`),
        fetch(`${API_URL}/api/pixel-stats?lat=${lat}&lng=${lng}`)
      ]);
      
      const pointData = await pointResponse.json();
      const statsData = statsResponse.ok ? await statsResponse.json() : null;
      
      // Update popup with simplified info (removed Annual Avg and Annual Range)
      const temp = pointData.temperature;
      const popupContent = `
        <div style="${styles.popup.container}">
          <div style="${styles.popup.header}">
            <span style="${styles.popup.title}">Location Details</span>
          </div>
          <div style="${styles.popup.body}">
            <div style="${styles.popup.temperature(getTempColor(temp))}">
              ${temp?.toFixed(1) || 'N/A'}°C
            </div>
            <div style="${styles.popup.label}">
              ${pointData.label || selectedMonth}
            </div>
            <div style="${styles.popup.divider}"></div>
            <div style="${styles.popup.info}">
              <div style="${styles.popup.infoRow}">
                <span style="${styles.popup.infoLabel}">Latitude:</span>
                <span style="${styles.popup.infoValue}">${lat.toFixed(4)}°</span>
              </div>
              <div style="${styles.popup.infoRow}">
                <span style="${styles.popup.infoLabel}">Longitude:</span>
                <span style="${styles.popup.infoValue}">${lng.toFixed(4)}°</span>
              </div>
            </div>
          </div>
        </div>
      `;
      
      marker.setPopupContent(popupContent).openPopup();
      
      setSelectedPoint({ lat, lng, temperature: temp });
      if (statsData) setPixelStats(statsData);
      
      fetchTimeSeries(lat, lng);
      
    } catch (err) {
      console.error('Error:', err);
      marker.setPopupContent('<div style="padding: 12px; color: #ef4444;">Error loading data</div>').openPopup();
    }
  }, [mapInstance, selectedMonth]);

  // Map Initialization
// Map Initialization
  const initMap = useCallback(() => {
    try {
      if (mapRef.current && !mapInstance && window.L) {
        const L = window.L;
        const map = L.map(mapRef.current, {
          center: NY_CENTER,
          zoom: INITIAL_ZOOM,
          zoomControl: true,
          attributionControl: true
        });
        
        // Basemaps
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 18
        });
        
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '© Esri',
          maxZoom: 18
        });
        
        osmLayer.addTo(map);
        
        map.baseLayers = { osm: osmLayer, satellite: satelliteLayer };
        
        // Create custom control for basemap selector
        const BasemapControl = L.Control.extend({
          options: {
            position: 'topleft'
          },
          
          onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
            container.style.marginTop = '10px';
            container.style.background = 'white';
            container.style.padding = '0';
            
            const select = L.DomUtil.create('select', '', container);
            select.style.padding = '8px 12px';
            select.style.border = 'none';
            select.style.borderRadius = '4px';
            select.style.fontSize = '13px';
            select.style.fontWeight = '500';
            select.style.color = '#374151';
            select.style.cursor = 'pointer';
            select.style.minWidth = '130px';
            select.style.outline = 'none';
            
            // Add options
            const streetOption = L.DomUtil.create('option', '', select);
            streetOption.value = 'osm';
            streetOption.text = '🗺️ Street Map';
            
            const satelliteOption = L.DomUtil.create('option', '', select);
            satelliteOption.value = 'satellite';
            satelliteOption.text = '🛰️ Satellite';
            
            // Prevent map interactions when using the control
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);
            
            // Handle basemap change
            L.DomEvent.on(select, 'change', function(e) {
              const newBasemap = e.target.value;
              
              Object.values(map.baseLayers).forEach(layer => {
                if (map.hasLayer(layer)) {
                  map.removeLayer(layer);
                }
              });
              
              map.baseLayers[newBasemap].addTo(map);
              
              if (currentLayerRef.current) {
                currentLayerRef.current.bringToFront();
              }
              
              setCurrentBasemap(newBasemap);
            });
            
            return container;
          }
        });
        
        // Add the custom control to the map
        const basemapControl = new BasemapControl();
        map.addControl(basemapControl);
        
        map.on('click', handleMapClick);
        
        setMapInstance(map);
      }
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
    }
  }, [mapInstance, handleMapClick]);

  // Load Leaflet
  useEffect(() => {
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      script.onerror = () => setError('Failed to load Leaflet');
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [initMap]);

  // Update click handler
  useEffect(() => {
    if (mapInstance) {
      mapInstance.off('click');
      mapInstance.on('click', handleMapClick);
    }
  }, [mapInstance, handleMapClick, selectedMonth]);

  // Load initial month
  useEffect(() => {
    if (mapInstance) {
      loadMonth(INITIAL_MONTH);
    }
  }, [mapInstance]);

  // Map Controls
  const toggleBasemap = () => {
    if (!mapInstance) return;
    
    const newBasemap = currentBasemap === 'osm' ? 'satellite' : 'osm';
    
    Object.values(mapInstance.baseLayers).forEach(layer => {
      if (mapInstance.hasLayer(layer)) {
        mapInstance.removeLayer(layer);
      }
    });
    
    mapInstance.baseLayers[newBasemap].addTo(mapInstance);
    
    if (currentLayerRef.current) {
      currentLayerRef.current.bringToFront();
    }
    
    setCurrentBasemap(newBasemap);
  };

  const updateLayerOpacity = (value) => {
    setLayerOpacity(value);
    if (currentLayerRef.current) {
      currentLayerRef.current.setOpacity(value / 100);
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>Temperature Analysis</h1>
          <p style={styles.subtitle}>New York State • 2024</p>
        </header>
        
        {/* Quick Guide */}
        <div style={styles.guideBox}>
          <div style={styles.guideTitle}>Quick Start</div>
          <div style={styles.guideText}>
            Click anywhere on the map to explore temperature data
          </div>
        </div>
        
        {/* Month Selector - Moved to Top */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Select Month</span>
          </div>
          <div style={styles.monthGrid}>
            {MONTHS.map((month, index) => {
              const monthKey = formatMonthKey(index);
              const isSelected = selectedMonth === monthKey;
              
              return (
                <button
                  key={monthKey}
                  onClick={() => loadMonth(monthKey)}
                  disabled={loading}
                  style={{
                    ...styles.monthButton,
                    ...(isSelected ? styles.monthButtonActive : {})
                  }}
                >
                  {month.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}
        



{/* Legend Card */}
{/* Legend Card */}
  <div style={styles.card}>
    <div style={styles.cardHeader}>
      <span style={styles.cardTitle}>Temperature Legend</span>
    </div>
    <div style={styles.legendContent}>
      <div style={styles.legendGradient}></div>
      <div style={styles.legendScaleLabels}>
        <span style={styles.legendScaleValue}>
          Min: {currentMonth?.statistics?.min ? `${currentMonth.statistics.min.toFixed(1)}°C` : '--'}
        </span>
        <span style={styles.legendScaleValue}>
          Max: {currentMonth?.statistics?.max ? `${currentMonth.statistics.max.toFixed(1)}°C` : '--'}
        </span>
      </div>
      
      {/* Layer Opacity Control */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <label style={styles.controlLabel}>
          Layer Opacity
        </label>
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min="10"
            max="100"
            value={layerOpacity}
            onChange={(e) => updateLayerOpacity(e.target.value)}
            style={styles.slider}
          />
          <span style={styles.sliderValue}>{layerOpacity}%</span>
        </div>
      </div>
    
    </div>
  </div>



        {/* Controls Card */}
   {/* Reports Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Reports</span>
          </div>
          
          <div style={styles.buttonGroup}>
            <button onClick={downloadCSV} style={styles.buttonSecondary}>
              📊 Download CSV
            </button>
            <button onClick={generatePDFReport} style={styles.buttonPrimary}>
              📄 Generate PDF Report
            </button>
          </div>
        </div>



      </aside>
      
     {/* Main Content */}
           {/* Main Content */}
      <main style={styles.main}>
        {/* Map */}
        <div ref={mapRef} style={styles.map}>
          {!mapInstance && (
            <div style={styles.mapLoading}>
              <div style={styles.loadingSpinner}></div>
              <div>Initializing map...</div>
            </div>
          )}
        </div>
        
        {/* Chart - Full Width */}
        <div style={styles.chartPanel}>
          <TemperatureChart 
            data={timeSeriesData} 
            selectedMonth={selectedMonth}
            onMonthClick={loadMonth}
            pixelStats={pixelStats}
          />
        </div>
      </main>
      
      {/* Loading Overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.loadingSpinner}></div>
            <div>Loading data...</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif',
    overflow: 'hidden',
    background: '#f9fafb'
  },
  sidebar: {
    width: '320px',
    padding: '24px',
    background: '#ffffff',
    overflowY: 'auto',
    borderRight: '1px solid #e5e7eb',
    flexShrink: 0
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280'
  },
  guideBox: {
    padding: '16px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  guideTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '4px'
  },
  guideText: {
    fontSize: '13px',
    color: '#3730a3'
  },
  errorBox: {
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#dc2626'
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    marginBottom: '16px',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '12px 16px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  controlGroup: {
    padding: '16px',
    borderBottom: '1px solid #f3f4f6'
  },
  controlLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    display: 'block',
    marginBottom: '8px'
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  slider: {
    flex: 1,
    height: '6px',
    borderRadius: '3px',
    outline: 'none',
    cursor: 'pointer'
  },
  sliderValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    minWidth: '40px'
  },
  buttonGroup: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  button: {
    padding: '10px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
    buttonSecondary: {
    padding: '10px 16px',
    background: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },

    buttonPrimary: {
    padding: '10px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  monthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    padding: '16px'
  },
  monthButton: {
    padding: '10px',
    background: '#ffffff',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  monthButtonActive: {
    background: '#3b82f6',
    color: 'white',
    border: '1px solid #3b82f6'
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden'
  },
 map: {
    flex: 1,
    position: 'relative',
    background: '#e5e7eb'
  },

  basemapSelector: {
    position: 'absolute',
    top: '80px',  // Positioned below default Leaflet zoom controls (which are at ~10px)
    left: '10px',
    zIndex: 1000
  },
 basemapDropdown: {
    padding: '8px 12px',
    background: 'white',
    border: '2px solid rgba(0,0,0,0.2)',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    outline: 'none',
    minWidth: '130px',
    transition: 'border-color 0.2s',
    ':hover': {
      borderColor: 'rgba(0,0,0,0.3)'
    },
    ':focus': {
      borderColor: '#3b82f6'
    }
  },

  mapLoading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#6b7280'
  },
  chartPanel: {
    height: '420px',
    background: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    overflow: 'hidden'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  },
  loadingContent: {
    background: 'white',
    padding: '24px 32px',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  loadingSpinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  marker: `
    background: #3b82f6;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `,
  popup: {
    container: 'min-width: 260px;',
    header: 'padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;',
    title: 'font-size: 14px; font-weight: 600; color: #374151;',
    body: 'padding: 16px;',
    temperature: (color) => `font-size: 36px; font-weight: 700; color: ${color}; margin-bottom: 8px; text-align: center;`,
    label: 'font-size: 14px; color: #6b7280; margin-bottom: 16px; text-align: center;',
    divider: 'height: 1px; background: #e5e7eb; margin: 12px 0;',
    info: 'font-size: 13px;',
    infoRow: 'display: flex; justify-content: space-between; padding: 4px 0;',
    infoLabel: 'color: #6b7280;',
    infoValue: 'color: #111827; font-weight: 600;'
  },
  chart: {
    container: {
      height: '100%',
      padding: '20px',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    },
    empty: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px'
    },
    emptyText: {
      textAlign: 'center',
      color: '#6b7280'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e5e7eb'
    },
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: '#111827'
    },
    subtitle: {
      margin: '4px 0 0 0',
      fontSize: '13px',
      color: '#6b7280'
    },
    statsPanel: {
      display: 'flex',
      alignItems: 'flex-start'
    },
    annualStats: {
      display: 'flex',
      gap: '24px',
      alignItems: 'center'
    },
    statGroup: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    statDivider: {
      width: '1px',
      height: '60px',
      background: '#e5e7eb'
    },
    statRow: {
      display: 'flex',
      gap: '20px'
    },
    stats: {
      display: 'flex',
      gap: '24px'
    },
    statItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    statLabel: {
      fontSize: '10px',
      color: '#9ca3af',
      fontWeight: '600',
      letterSpacing: '0.5px'
    },
    statValue: {
      fontSize: '16px',
      fontWeight: '700',
      marginTop: '2px'
    },
    svgWrapper: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  },
  legendContent: {
    padding: '16px'
  },
  legendGradient: {
    height: '20px',
    borderRadius: '10px',
    background: 'linear-gradient(90deg, #0000ff 0%, #32cd32 25%, #ffff00 50%, #ff8c00 75%, #ff0000 100%)',
    marginBottom: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  legendScaleBar: {
    marginBottom: '16px'
  },
  legendScaleLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '500',
    marginTop: '4px'
  },
  legendScaleValue: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151'
  },
  legendStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  legendStatItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  legendColorBox: (color) => ({
    width: '24px',
    height: '24px',
    backgroundColor: color,
    borderRadius: '4px',
    border: '1px solid rgba(0,0,0,0.1)'
  }),
  legendStatLabel: {
    fontSize: '11px',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  legendStatValue: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827'
  }
};

// Add CSS animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default App;