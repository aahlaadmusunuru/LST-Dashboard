"""
Pre-compute all LST data locally and save as JSON files
Run this ONCE locally, then deploy the JSON files with your backend
"""

import ee
import json
import os
from datetime import datetime

# Initialize GEE locally
def initialize_gee():
    service_account = "gee-assignment@gee-assignment-471518.iam.gserviceaccount.com"
    credentials_path = r"C:\Users\user\Downloads\gee-assignment-471518-80e756fc787e.json"
    
    credentials = ee.ServiceAccountCredentials(service_account, credentials_path)
    ee.Initialize(credentials, project='gee-assignment-471518')
    print("✅ GEE initialized")

# Initialize
initialize_gee()

# Get NY geometry
NY_GEOM = ee.FeatureCollection('TIGER/2018/States') \
    .filter(ee.Filter.eq('NAME', 'New York')) \
    .geometry()

# Months configuration
MONTHS = [
    {"label": "January 2024", "value": "2024-01", "start": "2024-01-01", "end": "2024-02-01"},
    {"label": "February 2024", "value": "2024-02", "start": "2024-02-01", "end": "2024-03-01"},
    {"label": "March 2024", "value": "2024-03", "start": "2024-03-01", "end": "2024-04-01"},
    {"label": "April 2024", "value": "2024-04", "start": "2024-04-01", "end": "2024-05-01"},
    {"label": "May 2024", "value": "2024-05", "start": "2024-05-01", "end": "2024-06-01"},
    {"label": "June 2024", "value": "2024-06", "start": "2024-06-01", "end": "2024-07-01"},
    {"label": "July 2024", "value": "2024-07", "start": "2024-07-01", "end": "2024-08-01"},
    {"label": "August 2024", "value": "2024-08", "start": "2024-08-01", "end": "2024-09-01"},
    {"label": "September 2024", "value": "2024-09", "start": "2024-09-01", "end": "2024-10-01"},
    {"label": "October 2024", "value": "2024-10", "start": "2024-10-01", "end": "2024-11-01"},
    {"label": "November 2024", "value": "2024-11", "start": "2024-11-01", "end": "2024-12-01"},
    {"label": "December 2024", "value": "2024-12", "start": "2024-12-01", "end": "2025-01-01"}
]

VIS_PARAMS = {
    'min': 0,
    'max': 40,
    'palette': ['blue', 'limegreen', 'yellow', 'darkorange', 'red']
}

def lst_celsius(image):
    """Convert MODIS LST to Celsius"""
    return image.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('LST_C')

def compute_month_data(month_spec):
    """Compute data for a single month"""
    print(f"\n📅 Processing {month_spec['label']}...")
    
    try:
        # Get MODIS collection
        collection = ee.ImageCollection('MODIS/061/MOD11A2') \
            .filterBounds(NY_GEOM) \
            .filterDate(month_spec['start'], month_spec['end'])
        
        collection_size = collection.size().getInfo()
        print(f"  Found {collection_size} images")
        
        if collection_size == 0:
            print(f"  ⚠️ No data available")
            return None
        
        # Convert to Celsius and compute monthly average
        scaled = collection.map(lst_celsius)
        monthly_avg = scaled.mean().clip(NY_GEOM)
        
        # Generate map tiles
        map_id = monthly_avg.getMapId(VIS_PARAMS)
        
        # Calculate statistics
        stats = monthly_avg.select('LST_C').reduceRegion(
            reducer=ee.Reducer.mean().combine(
                ee.Reducer.min(), '', True
            ).combine(
                ee.Reducer.max(), '', True
            ).combine(
                ee.Reducer.stdDev(), '', True
            ),
            geometry=NY_GEOM,
            scale=1000,
            maxPixels=1e9
        ).getInfo()
        
        # Sample points for time series (grid across NY)
        print(f"  Sampling grid points...")
        grid_points = []
        for lat in range(41, 45):  # Simplified grid
            for lng in range(-79, -72):
                point = ee.Geometry.Point([lng, lat])
                try:
                    sample = monthly_avg.sample(
                        region=point,
                        scale=1000,
                        numPixels=1
                    ).first()
                    
                    if sample:
                        value = sample.get('LST_C').getInfo()
                        if value is not None:
                            grid_points.append({
                                'lat': lat,
                                'lng': lng,
                                'temp': round(value, 2)
                            })
                except:
                    pass
        
        print(f"  ✅ Computed successfully")
        print(f"     Stats: Min={stats.get('LST_C_min', 0):.1f}°C, Max={stats.get('LST_C_max', 0):.1f}°C")
        
        return {
            'label': month_spec['label'],
            'value': month_spec['value'],
            'tile_url': map_id['tile_fetcher'].url_format,
            'map_id': map_id['mapid'],
            'token': map_id['token'],
            'statistics': {
                'mean': round(stats.get('LST_C_mean', 0), 2),
                'min': round(stats.get('LST_C_min', 0), 2),
                'max': round(stats.get('LST_C_max', 0), 2),
                'stdDev': round(stats.get('LST_C_stdDev', 0), 2)
            },
            'grid_points': grid_points,
            'image_count': collection_size,
            'computed_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return None

def main():
    """Pre-compute all data and save to files"""
    print("="*60)
    print("PRE-COMPUTING LST DATA FOR DEPLOYMENT")
    print("="*60)
    
    # Create output directory
    output_dir = "precomputed_data"
    os.makedirs(output_dir, exist_ok=True)
    
    all_data = {}
    successful = 0
    
    # Process each month
    for month_spec in MONTHS:
        data = compute_month_data(month_spec)
        if data:
            # Save individual month file
            month_file = os.path.join(output_dir, f"{month_spec['value']}.json")
            with open(month_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            all_data[month_spec['value']] = data
            successful += 1
            print(f"  Saved to {month_file}")
    
    # Save summary file
    summary = {
        'generated_at': datetime.now().isoformat(),
        'total_months': len(MONTHS),
        'successful': successful,
        'months': list(all_data.keys())
    }
    
    summary_file = os.path.join(output_dir, "summary.json")
    with open(summary_file, 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("\n" + "="*60)
    print(f"✅ COMPLETE! Pre-computed {successful}/{len(MONTHS)} months")
    print(f"📁 Data saved to: {output_dir}/")
    print("\nNext steps:")
    print("1. Add the 'precomputed_data' folder to your Flask project")
    print("2. Update your Flask app to load from these JSON files")
    print("3. Deploy to Render - it will serve instantly!")
    print("="*60)

if __name__ == "__main__":
    main()