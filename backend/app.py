from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import glob
import ee
import numpy as np
from datetime import datetime
from functools import lru_cache
import random

app = Flask(__name__)
CORS(app)

# Initialize Earth Engine
EE_INITIALIZED = False
try:
    ee.Initialize()
    EE_INITIALIZED = True
    print("✓ Earth Engine initialized successfully")
except Exception as e:
    print(f"✗ Earth Engine initialization failed: {e}")
    print("  Run 'earthengine authenticate' in terminal")
    print("  Using estimated values for now")

DATA_DIR = 'precomputed_data'
PRECOMPUTED_DATA = {}

# Load JSON files
for json_file in glob.glob(f'{DATA_DIR}/2024-*.json'):
    with open(json_file, 'r') as f:
        data = json.load(f)
        PRECOMPUTED_DATA[data['value']] = data
        print(f"Loaded {data['value']}")

# Cache for Earth Engine images
@lru_cache(maxsize=12)
def get_monthly_composite(year_month):
    """Get or create Earth Engine monthly composite with caching - DAYTIME ONLY"""
    if not EE_INITIALIZED:
        return None
    
    try:
        year, month = map(int, year_month.split('-'))
        
        # Define date range for the entire month
        start_date = f'{year}-{month:02d}-01'
        if month == 12:
            end_date = f'{year + 1}-01-01'
        else:
            end_date = f'{year}-{month + 1:02d}-01'
        
        print(f"Processing {year_month}: {start_date} to {end_date}")
        
        # Load MODIS LST data - only select daytime data
        collection = ee.ImageCollection('MODIS/061/MOD11A2') \
            .filterDate(start_date, end_date) \
            .select(['LST_Day_1km', 'QC_Day'])  # Only daytime bands
        
        # Check collection size
        collection_size = collection.size()
        print(f"Found {collection_size.getInfo()} images for {year_month}")
        
        # Process images - daytime only
        def process_image(image):
            # Quality mask for daytime (bits 0-1: 00=good, 01=marginal)
            qc_day = image.select('QC_Day')
            
            # Create quality mask - accept good and marginal quality
            day_mask = qc_day.bitwiseAnd(3).lte(1)
            
            # Convert Kelvin to Celsius (scale factor 0.02, then subtract 273.15)
            lst_day_celsius = image.select('LST_Day_1km') \
                .multiply(0.02) \
                .subtract(273.15)
            
            # Apply quality mask
            lst_day_masked = lst_day_celsius.updateMask(day_mask)
            
            # Rename for clarity
            return lst_day_masked.rename('daytime_temperature')
        
        # Process all images in the collection
        processed = collection.map(process_image)
        
        # Calculate the mean of all daily values for the month
        # This gives us the average daytime temperature for the entire month
        monthly_mean = processed.mean()
        
        return monthly_mean
        
    except Exception as e:
        print(f"Error creating composite for {year_month}: {e}")
        return None

def get_pixel_value_from_ee(lat, lng, month):
    """Get actual pixel value from Earth Engine - DAYTIME AVERAGE"""
    if not EE_INITIALIZED:
        return None
    
    try:
        composite = get_monthly_composite(month)
        if composite is None:
            return None
        
        # Create point
        point = ee.Geometry.Point([lng, lat])
        
        # Sample the daytime temperature at the point
        sample = composite.reduceRegion(
            reducer=ee.Reducer.first(),
            geometry=point,
            scale=1000  # MODIS resolution
        ).getInfo()
        
        # Return daytime temperature
        if 'daytime_temperature' in sample and sample['daytime_temperature'] is not None:
            return sample['daytime_temperature']
        
        return None
        
    except Exception as e:
        print(f"Error sampling pixel: {e}")
        return None

def estimate_pixel_value(lat, lng, statistics):
    """Enhanced estimation with detailed geographic variation"""
    mean = statistics.get('mean', 20)
    std_dev = statistics.get('stdDev', 2)
    min_val = statistics.get('min', mean - 5)
    max_val = statistics.get('max', mean + 5)
    
    # Temperature decreases ~0.6°C per degree latitude northward
    lat_effect = (43.0 - lat) * 0.6
    
    # Lake effect - cooler near Great Lakes
    lake_effect = 0
    if lng < -77 and lat > 43:  # Near Lake Ontario
        lake_effect = -1.0
    elif lng < -79 and lat > 42:  # Near Lake Erie  
        lake_effect = -0.8
    
    # Urban heat islands with actual city locations
    urban_adjustments = [
        (40.7128, -74.0060, 3.0),   # NYC - strongest
        (40.6892, -74.0445, 2.5),   # Jersey City
        (40.7614, -73.9776, 2.8),   # Manhattan
        (40.6782, -73.9442, 2.2),   # Brooklyn
        (40.7282, -73.7949, 2.0),   # Queens
        (40.8448, -73.8648, 1.8),   # Bronx
        (42.8864, -78.8784, 1.5),   # Buffalo
        (43.0481, -76.1474, 1.2),   # Syracuse
        (42.6526, -73.7562, 1.2),   # Albany
        (43.1566, -77.6088, 1.2),   # Rochester
        (42.0987, -75.9180, 0.8),   # Binghamton
        (44.9808, -74.7095, 0.5),   # Massena
        (43.1009, -75.2327, 0.8),   # Utica
    ]
    
    urban_effect = 0
    for city_lat, city_lng, intensity in urban_adjustments:
        distance = ((lat - city_lat)**2 + (lng - city_lng)**2) ** 0.5
        if distance < 0.3:  # Within ~30km
            effect = intensity * (0.3 - distance) / 0.3
            urban_effect = max(urban_effect, effect)
    
    # Elevation effects for major geographic features
    elevation_effect = 0
    if 43.5 < lat < 44.8 and -74.7 < lng < -73.5:  # Adirondacks High Peaks
        elevation_effect = -3.5
    elif 43.0 < lat < 43.5 and -74.5 < lng < -73.8:  # Southern Adirondacks
        elevation_effect = -2.5
    elif 41.9 < lat < 42.3 and -74.5 < lng < -74:  # Catskills
        elevation_effect = -2.0
    elif lat > 43.5 and -76 < lng < -75:  # Tug Hill Plateau
        elevation_effect = -1.8
    elif 42.0 < lat < 42.5 and -77 < lng < -76:  # Finger Lakes region
        elevation_effect = -0.5
    
    # Calculate final temperature
    temperature = mean + lat_effect + lake_effect + urban_effect + elevation_effect
    
    # Add small consistent random variation for realism
    random.seed(int(lat * 10000 + lng * 10000 + hash(str(statistics))))
    temperature += random.uniform(-0.5, 0.5)
    
    # Clamp to realistic range
    return max(min_val, min(max_val, temperature))

@app.route('/api/lst-layer')
def get_lst_layer():
    """Get pre-computed LST layer for a month"""
    month = request.args.get('month', '2024-08')
    if month in PRECOMPUTED_DATA:
        data = PRECOMPUTED_DATA[month].copy()
        # Add note that this is daytime temperature
        data['temperature_type'] = 'daytime_average'
        return jsonify(data)
    return jsonify({'error': 'Month not found'}), 404

@app.route('/api/point')
def get_point():
    """Get pixel value for a specific point - always tries Earth Engine first"""
    month = request.args.get('month')
    lat = float(request.args.get('lat'))
    lng = float(request.args.get('lng'))
    
    if month not in PRECOMPUTED_DATA:
        return jsonify({'error': 'Month not found'}), 404
    
    data = PRECOMPUTED_DATA[month]
    statistics = data.get('statistics', {})
    
    # Always try Earth Engine first if available
    temperature = None
    source = 'estimated'
    
    if EE_INITIALIZED:
        print(f"Attempting Earth Engine query for {lat}, {lng} in {month}")
        ee_value = get_pixel_value_from_ee(lat, lng, month)
        if ee_value is not None:
            temperature = ee_value
            source = 'earth_engine'
            print(f"Got Earth Engine daytime value: {temperature}°C")
        else:
            print("Earth Engine returned no value, using estimation")
    
    # Fallback to estimation if EE didn't work
    if temperature is None:
        temperature = estimate_pixel_value(lat, lng, statistics)
        source = 'estimated'
    
    return jsonify({
        'temperature': round(temperature, 2),
        'temperature_type': 'daytime_average',
        'label': data['label'],
        'source': source,
        'coordinates': {'lat': lat, 'lng': lng}
    })

@app.route('/api/time-series')
def get_time_series():
    """Get time series for all months at a specific point"""
    lat = float(request.args.get('lat'))
    lng = float(request.args.get('lng'))
    
    series = []
    
    for month_key, data in sorted(PRECOMPUTED_DATA.items()):
        temperature = None
        
        # Try Earth Engine first
        if EE_INITIALIZED:
            temperature = get_pixel_value_from_ee(lat, lng, month_key)
        
        # Fallback to estimation
        if temperature is None:
            temperature = estimate_pixel_value(lat, lng, data.get('statistics', {}))
        
        if temperature is not None:
            series.append({
                'month': month_key,
                'label': data['label'],
                'temperature': round(temperature, 2),
                'temperature_type': 'daytime_average'
            })
    
    return jsonify({
        'time_series': series,
        'temperature_type': 'daytime_average',
        'coordinates': {'lat': lat, 'lng': lng}
    })

@app.route('/api/pixel-stats')
def get_pixel_stats():
    """Get detailed statistics for a pixel across all months"""
    lat = float(request.args.get('lat'))
    lng = float(request.args.get('lng'))
    
    temperatures = []
    monthly_data = []
    
    for month_key, data in sorted(PRECOMPUTED_DATA.items()):
        temperature = None
        
        # Try Earth Engine first
        if EE_INITIALIZED:
            temperature = get_pixel_value_from_ee(lat, lng, month_key)
        
        # Fallback to estimation
        if temperature is None:
            temperature = estimate_pixel_value(lat, lng, data.get('statistics', {}))
        
        if temperature is not None:
            temperatures.append(temperature)
            monthly_data.append({
                'month': month_key,
                'temperature': round(temperature, 2),
                'label': data['label']
            })
    
    if temperatures:
        temps_array = np.array(temperatures)
        
        # Find warmest and coolest months
        warmest_idx = np.argmax(temps_array)
        coolest_idx = np.argmin(temps_array)
        
        return jsonify({
            'coordinates': {'lat': lat, 'lng': lng},
            'temperature_type': 'daytime_average',
            'annual_stats': {
                'mean': round(float(np.mean(temps_array)), 2),
                'min': round(float(np.min(temps_array)), 2),
                'max': round(float(np.max(temps_array)), 2),
                'std_dev': round(float(np.std(temps_array)), 2),
                'range': round(float(np.max(temps_array) - np.min(temps_array)), 2)
            },
            'monthly_data': monthly_data,
            'warmest_month': monthly_data[warmest_idx] if warmest_idx < len(monthly_data) else None,
            'coolest_month': monthly_data[coolest_idx] if coolest_idx < len(monthly_data) else None
        })
    
    return jsonify({'error': 'No data available'}), 404

@app.route('/api/months')
def get_months():
    """Get list of available months"""
    return jsonify([{
        'value': k,
        'label': v['label'],
        'statistics': v['statistics'],
        'temperature_type': 'daytime_average'
    } for k, v in sorted(PRECOMPUTED_DATA.items())])

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'months_loaded': len(PRECOMPUTED_DATA),
        'earth_engine': 'initialized' if EE_INITIALIZED else 'not available',
        'temperature_type': 'daytime_average',
        'months': list(PRECOMPUTED_DATA.keys())
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("LST PIXEL VALUE SERVER - DAYTIME TEMPERATURES ONLY")
    print("="*60)
    print(f"✓ Loaded {len(PRECOMPUTED_DATA)} months of data")
    print(f"{'✓' if EE_INITIALIZED else '✗'} Earth Engine: {'Ready' if EE_INITIALIZED else 'Not initialized'}")
    print("✓ Using DAYTIME temperatures only (LST_Day_1km)")
    print("✓ Calculating monthly average from all days in month")
    
    if not EE_INITIALIZED:
        print("\nTo enable Earth Engine (for accurate pixel values):")
        print("1. Run: earthengine authenticate")
        print("2. Restart this server")
        print("\nCurrently using estimated values based on location")
    
    print("\nEndpoints:")
    print("  GET /api/point?month=2024-08&lat=42.5&lng=-75.5")
    print("  GET /api/time-series?lat=42.5&lng=-75.5")
    print("  GET /api/pixel-stats?lat=42.5&lng=-75.5")
    print("  GET /health")
    print("="*60 + "\n")
    
    app.run(debug=True, port=5000, host='0.0.0.0')