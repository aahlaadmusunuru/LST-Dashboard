# 🌡️ LST Temperature Dashboard

A comprehensive full-stack web application for visualizing and analyzing Land Surface Temperature (LST) data for New York State using MODIS satellite imagery and Google Earth Engine.

## 🚀 Live Demo

- **Frontend Application**: [https://68c4f5883f2e3d78445a639b--mellifluous-pavlova-7b5559.netlify.app/](https://68c4f5883f2e3d78445a639b--mellifluous-pavlova-7b5559.netlify.app/)
- **Backend API**: [https://lst-dashboard-5.onrender.com](https://lst-dashboard-5.onrender.com)
- **GitHub Repository**: [https://github.com/aahlaadmusunuru/LST-Dashboard](https://github.com/aahlaadmusunuru/LST-Dashboard)
  

  ![Temperature Dashboard](images/LST_Dashboard.gif)


## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Backend API](#backend-api)
- [Frontend Application](#frontend-application)
- [Installation](#installation)
- [Deployment](#deployment)
- [Data Processing](#data-processing)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Contact](#contact)

## 🔍 Overview

The LST Temperature Dashboard is a sophisticated data visualization platform that processes and displays land surface temperature patterns across New York State. The system integrates satellite data from NASA's MODIS instruments with real-time processing capabilities through Google Earth Engine, delivering accurate temperature measurements through an intuitive web interface.

### Key Capabilities
- Real-time satellite data processing from MODIS/061/MOD11A2 dataset
- Interactive map visualization with point-and-click temperature queries
- Historical time series analysis for any location in New York State
- Monthly temperature comparisons and comprehensive statistics
- Professional report generation in CSV and PDF formats
- Daytime average temperature measurements at 1km resolution

## ✨ Features

### Interactive Map Interface
- **Click-to-Query**: Click anywhere on the map to get instant temperature data
- **Dual Basemap Options**: Toggle between street map and satellite imagery
   ![Temperature Dashboard](C:/LST-Dashboard/images/Change_BaseMaps.png)

  
- **Temperature Heatmap**: Color-coded overlay showing temperature distribution
- **Adjustable Opacity**: Control layer transparency for optimal visibility
 ![Temperature Dashboard](C:/LST-Dashboard/images/Adjust_Transperencey.png)



- **Custom Markers**: Visual indicators with detailed popup information

  ![Temperature Dashboard](C:/LST-Dashboard/images/Popups.png)


*Interactive map with temperature overlay and location markers*

### Data Visualization
- **Time Series Charts**: Interactive 12-month temperature trend graphs
- **Statistical Analysis**: Real-time calculation of mean, min, max, and standard deviation
- **Monthly Navigation**: Quick selection of any month in 2024
- **Color-Coded Display**: Intuitive temperature visualization (blue=cold, red=hot)
  ![Temperature Dashboard](images/Temperature_Trends.png)

*Time series visualization showing monthly temperature trends*

### Analytics & Reporting
- **Annual Statistics**: Comprehensive yearly temperature analysis
- **Location-Specific Metrics**: Detailed temperature data for exact coordinates
- **Extreme Detection**: Automatic identification of warmest/coolest periods
- **Export Options**: Download data as CSV or generate professional PDF reports

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Netlify)                  │
│                  Interactive Map + Charts + UI               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Flask Backend (Render)                     │
│              REST API + Data Processing + Caching            │
└────────────────────────┬────────────────────────────────────┘
                         │ 
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Earth Engine                        │
│           MODIS Satellite Imagery + Temperature Data         │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **React 18.2.0** - Modern UI framework
- **Leaflet 1.9.4** - Interactive mapping library
- **Chart.js** - Data visualization
- **jsPDF** - PDF report generation
- **Netlify** - Frontend hosting and CDN

### Backend
- **Flask 2.3.3** - Python web framework
- **Google Earth Engine API** - Satellite data processing
- **NumPy** - Statistical computations
- **Gunicorn** - Production WSGI server
- **Render** - Backend hosting platform

### Data Source
- **Dataset**: MODIS/061/MOD11A2 (8-day composite)
- **Resolution**: 1000m spatial resolution
- **Coverage**: New York State
- **Time Period**: January - December 2024
- **Temperature Type**: Daytime average

## 🔧 Backend API

### Core Functionality

The backend performs several critical operations:

1. **Satellite Data Access**: Connects to Google Earth Engine for MODIS thermal imagery
2. **Temperature Conversion**: Transforms raw Kelvin values to Celsius using the formula:
   ```
   Temperature (°C) = (Kelvin Value × 0.02) - 273.15
   ```
3. **Quality Filtering**: Applies bitwise operations to retain only high-quality pixels
4. **Monthly Averaging**: Combines 3-4 eight-day composites into monthly averages
5. **Performance Optimization**: Implements caching and image stacking for faster queries

### Performance Features
- **Coordinate Caching**: Rounds to 4 decimals (~11m precision) for cache efficiency
- **Image Stacking**: Combines 12 months into single query (12x faster)
- **LRU Cache**: Stores 1,000 point queries and 500 time series in memory
- **Optimized Sampling**: Uses `sample()` instead of `reduceRegion()` for 2-3x speed

## 💻 Frontend Application

### Component Architecture

```javascript
App.js
├── State Management
│   ├── Map instance and controls
│   ├── Selected month and location
│   ├── Time series data
│   └── Statistical metrics
│
├── Interactive Components
│   ├── Leaflet Map
│   ├── Temperature Chart (SVG)
│   ├── Month Selector Grid
│   └── Export Functions
│
└── Data Flow
    ├── User interaction
    ├── API requests
    ├── State updates
    └── UI rendering
```

### Key Features
- **Responsive Design**: Optimized for desktop viewing
- **Real-time Updates**: Instant feedback on user interactions
- **Professional Reports**: Automated PDF generation with charts
- **Data Export**: CSV download for further analysis

## 📡 API Documentation

### Base URL
```
https://lst-dashboard-5.onrender.com
```

### Endpoints

#### GET `/api/point`
Returns temperature for specific location and month
```
Parameters: month, lat, lng
Response: { temperature, label, source, coordinates }
```

#### GET `/api/time-series`
Returns 12-month temperature data for location
```
Parameters: lat, lng
Response: { time_series: [...], coordinates }
```

#### GET `/api/pixel-stats`
Returns comprehensive annual statistics
```
Parameters: lat, lng
Response: { annual_stats, warmest_month, coolest_month }
```

#### GET `/api/lst-layer`
Returns pre-computed visualization layer
```
Parameters: month
Response: { tile_url, statistics, label }
```

#### GET `/api/months`
Returns available months with metadata
```
Response: [{ value, label, statistics }]
```

#### GET `/health`
Returns system status and metrics
```
Response: { status, earth_engine, cache_stats }
```

## 💻 Installation

### Prerequisites
- Node.js 18+ (Frontend)
- Python 3.11+ (Backend)
- Google Earth Engine account

### Backend Setup
```bash
# Clone repository
git clone https://github.com/aahlaadmusunuru/LST-Dashboard.git
cd LST-Dashboard/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure Earth Engine
earthengine authenticate

# Run development server
python app.py
```

### Frontend Setup
```bash
# Navigate to frontend
cd LST-Dashboard/frontend

# Install dependencies
npm install

# Configure API endpoint in App.js
const API_URL = 'http://localhost:5000';

# Start development server
npm start
```

## 🚀 Deployment

### Backend Deployment (Render)

1. Create `render.yaml`:
```yaml
services:
  - type: web
    name: lst-api
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
```

2. Set environment variables:
```
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY={"type": "service_account", ...}
```

### Frontend Deployment (Netlify)

1. Build production version:
```bash
cd frontend
npm run build
```

2. Deploy to Netlify:
- Connect GitHub repository
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/build`

## 📊 Data Processing Pipeline

### Preprocessing (One-time setup)
1. **Connect to Earth Engine** with service account
2. **Process MODIS imagery** for each month of 2024
3. **Calculate statistics** (mean, min, max, std deviation)
4. **Generate map tiles** for visualization
5. **Save as JSON files** for deployment

### Runtime Processing
1. **User clicks map** → Extract coordinates
2. **Query Earth Engine** → Retrieve satellite data
3. **Apply conversions** → Kelvin to Celsius
4. **Calculate statistics** → Process temperature metrics
5. **Return JSON** → Send data to frontend

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/NewFeature`)
3. Commit changes (`git commit -m 'Add NewFeature'`)
4. Push to branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

## 📈 Performance Metrics

- **Cache Hit Rate**: 80%+ for repeated queries
- **Response Times**:
  - Cached queries: <100ms
  - New point query: 1-2 seconds
  - Time series (12 months): 2-3 seconds
- **Optimization Impact**: 10-12x faster with stacking

## 🔄 Version History

- **v1.0.0** (December 2024) - Initial release
  - Interactive map for New York State
  - 12 months of 2024 temperature data
  - Time series analysis
  - PDF/CSV export functionality

## 📧 Contact

**Aahlaad Musunuru**
- 📧 Email: [aahlaadmusunuru1995@gmail.com](mailto:aahlaadmusunuru1995@gmail.com)
- 📱 Phone: +91-9849350949
- 📍 Location: Rajamahendravaram, Andhra Pradesh, India
- 💼 GitHub: [https://github.com/aahlaadmusunuru](https://github.com/aahlaadmusunuru)
- 🐛 Issues: [GitHub Issues](https://github.com/aahlaadmusunuru/LST-Dashboard/issues)


## 🙏 Acknowledgments

- Google Earth Engine for satellite data access
- MODIS team for temperature data products
- Leaflet and React communities for excellent libraries
- NASA for providing open access to Earth observation data

---

<div align="center">

**🌐 Live Application**: [LST Temperature Dashboard](https://68c4f5883f2e3d78445a639b--mellifluous-pavlova-7b5559.netlify.app/)

**🔧 API Status**: [Check API Health](https://lst-dashboard-5.onrender.com/health)

**📚 Repository**: [GitHub - LST Dashboard](https://github.com/aahlaadmusunuru/LST-Dashboard)

---

Developed with ❤️ by [Aahlaad Musunuru](https://github.com/aahlaadmusunuru)


</div>
