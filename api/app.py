from flask import Flask, jsonify, make_response, request
from flask_cors import CORS, cross_origin
import sys
import os
import threading
import subprocess
import uuid
import time
from datetime import datetime
from collections import defaultdict

# Get the parent directory (Container_security_analyzer/)
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

# Import from the correct path: backend.parser.vulnerability_parser
from backend.parser.vulnerability_parser import load_scan_results, analyze_vulnerabilities

app = Flask(__name__)

# CORS configuration
CORS(app, 
     origins=["http://localhost:5173"],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=False)

# Global dictionary to store scan progress
scan_progress = {}

def get_severity_priority(severity):
    """Get numerical priority for vulnerability severity (lower = more critical)"""
    priority = {'CRITICAL': 1, 'HIGH': 2, 'MEDIUM': 3, 'LOW': 4, 'UNKNOWN': 5}
    return priority.get(severity, 5)

def prioritize_vulnerabilities(vulnerabilities, max_return=200):
    """
    Prioritize vulnerabilities to ensure all critical/high are included
    Returns vulnerabilities sorted by severity with all critical/high included
    """
    if not vulnerabilities:
        return []
    
    # Separate vulnerabilities by severity
    critical_vulns = [v for v in vulnerabilities if v.get('severity') == 'CRITICAL']
    high_vulns = [v for v in vulnerabilities if v.get('severity') == 'HIGH']
    medium_vulns = [v for v in vulnerabilities if v.get('severity') == 'MEDIUM']
    low_vulns = [v for v in vulnerabilities if v.get('severity') == 'LOW']
    unknown_vulns = [v for v in vulnerabilities if v.get('severity') not in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']]
    
    # Always include ALL critical and high vulnerabilities
    priority_vulnerabilities = critical_vulns + high_vulns
    
    # Calculate remaining slots
    remaining_slots = max(0, max_return - len(priority_vulnerabilities))
    
    # Fill remaining slots with medium, low, unknown
    other_vulns = (medium_vulns + low_vulns + unknown_vulns)[:remaining_slots]
    
    # Combine and return
    final_vulnerabilities = priority_vulnerabilities + other_vulns
    
    print(f"Vulnerability prioritization:")
    print(f"   - Critical: {len(critical_vulns)} (all included)")
    print(f"   - High: {len(high_vulns)} (all included)")
    print(f"   - Medium: {len(medium_vulns)} ({min(len(medium_vulns), remaining_slots)} included)")
    print(f"   - Low: {len(low_vulns)}")
    print(f"   - Total returned: {len(final_vulnerabilities)} / {len(vulnerabilities)}")
    
    return final_vulnerabilities

@app.route('/')
def home():
    return jsonify({
        'message': 'Container Security Analyzer API',
        'status': 'running',
        'version': '1.0.0',
        'port': 5001
    })

@app.route('/api/health')
def health_check():
    scan_dir = os.path.join(parent_dir, 'scan-results')
    scan_files = []
    if os.path.exists(scan_dir):
        scan_files = [f for f in os.listdir(scan_dir) if f.endswith('.json')]
    
    return jsonify({
        'status': 'healthy',
        'message': 'Container Security Analyzer API running on port 5001',
        'available_scan_files': scan_files
    })

# FIXED: Original static scan endpoints with vulnerability prioritization
@app.route('/api/scan/<scan_name>')
def get_scan_results(scan_name):
    try:
        json_file = os.path.join(parent_dir, 'scan-results', f'{scan_name}.json')
        
        print(f" API Request: GET /api/scan/{scan_name}")
        print(f"Looking for file: {json_file}")
        
        if not os.path.exists(json_file):
            return jsonify({'error': f'Scan file not found: {scan_name}.json'}), 404
        
        scan_data = load_scan_results(json_file)
        severity_counts, vulnerabilities = analyze_vulnerabilities(scan_data)
        
        print(f"Successfully processed {len(vulnerabilities)} total vulnerabilities")
        print(f"Severity breakdown: {severity_counts}")
        
        
        prioritized_vulnerabilities = prioritize_vulnerabilities(vulnerabilities, max_return=200)
        critical_returned = len([v for v in prioritized_vulnerabilities if v.get('severity') == 'CRITICAL'])
        critical_expected = severity_counts.get('CRITICAL', 0)
        
        if critical_returned != critical_expected:
            print(f"  Critical vulnerability mismatch: Expected {critical_expected}, Returning {critical_returned}")
        else:
            print(f" All {critical_expected} critical vulnerabilities included")
        
        return jsonify({
            'scan_name': scan_name,
            'severity_counts': severity_counts,
            'total_vulnerabilities': len(vulnerabilities),
            'vulnerabilities': prioritized_vulnerabilities,  
            'vulnerability_breakdown': {
                'critical_returned': critical_returned,
                'critical_expected': critical_expected,
                'high_returned': len([v for v in prioritized_vulnerabilities if v.get('severity') == 'HIGH']),
                'total_returned': len(prioritized_vulnerabilities),
                'total_available': len(vulnerabilities)
            }
        })
        
    except Exception as e:
        print(f" Error processing scan {scan_name}: {str(e)}")
        return jsonify({'error': str(e)}), 400

@app.route('/api/compare/<scan1>/<scan2>')
def compare_scans(scan1, scan2):
    try:
        scan1_file = os.path.join(parent_dir, 'scan-results', f'{scan1}.json')
        scan2_file = os.path.join(parent_dir, 'scan-results', f'{scan2}.json')
        
        print(f"🔍 API Request: GET /api/compare/{scan1}/{scan2}")
        
        if not os.path.exists(scan1_file) or not os.path.exists(scan2_file):
            return jsonify({'error': 'One or both scan files not found'}), 404
        
        scan1_data = load_scan_results(scan1_file)
        scan2_data = load_scan_results(scan2_file)
        
        counts1, vulns1 = analyze_vulnerabilities(scan1_data)
        counts2, vulns2 = analyze_vulnerabilities(scan2_data)
        
        total_improvement = len(vulns1) - len(vulns2)
        improvement_percentage = 0
        if len(vulns1) > 0:
            improvement_percentage = round((total_improvement / len(vulns1)) * 100, 1)
        
        # Calculate severity improvements
        severity_improvements = {}
        for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']:
            count1 = counts1.get(severity, 0)
            count2 = counts2.get(severity, 0)
            severity_improvements[severity] = count1 - count2
        
        result = {
            'scan1': {'name': scan1, 'counts': counts1, 'total': len(vulns1)},
            'scan2': {'name': scan2, 'counts': counts2, 'total': len(vulns2)},
            'improvement': {
                'total_vulnerabilities_reduced': total_improvement,
                'improvement_percentage': improvement_percentage,
                'severity_improvements': severity_improvements,
                'is_scan2_better': total_improvement > 0,
                'recommendation': f"{'Scan 2' if total_improvement > 0 else 'Scan 1'} is more secure"
            }
        }
        
        print(f" Successfully compared: {total_improvement} vulnerabilities ({improvement_percentage}%)")
        
        return jsonify(result)
        
    except Exception as e:
        print(f" Error comparing scans: {str(e)}")
        return jsonify({'error': str(e)}), 400

# Dynamic scanning endpoints
@app.route('/api/scan-image', methods=['POST'])
@cross_origin()
def scan_dynamic_image():
    """Dynamically scan any Docker image"""
    try:
        data = request.get_json()
        image_name = data.get('image_name', '').strip()
        
        if not image_name:
            return jsonify({'error': 'Image name is required'}), 400
        
        # Generate unique scan ID
        scan_id = str(uuid.uuid4())[:8]
        
        # Initialize scan progress
        scan_progress[scan_id] = {
            'status': 'starting',
            'progress': 0,
            'message': 'Initializing scan...',
            'image_name': image_name,
            'start_time': datetime.now().isoformat(),
            'vulnerabilities_found': 0
        }
        
        # Start background scan
        thread = threading.Thread(target=background_scan_worker, args=(image_name, scan_id))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'scan_id': scan_id,
            'image_name': image_name,
            'status': 'started',
            'message': 'Scan initiated successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scan-status/<scan_id>')
@cross_origin()
def get_scan_status(scan_id):
    """Get real-time scan progress"""
    if scan_id not in scan_progress:
        return jsonify({'error': 'Scan not found'}), 404
    
    return jsonify(scan_progress[scan_id])

@app.route('/api/scan-result/<scan_id>')
@cross_origin()
def get_scan_result(scan_id):
    """Get completed scan results"""
    if scan_id not in scan_progress:
        return jsonify({'error': 'Scan not found'}), 404
    
    progress = scan_progress[scan_id]
    if progress['status'] != 'completed':
        return jsonify({'error': 'Scan not completed yet'}), 400
    
    return jsonify(progress.get('results', {}))

@app.route('/api/popular-images')
@cross_origin()
def get_popular_images():
    """Get list of popular Docker images for testing"""
    popular_images = [
        {'name': 'nginx:latest', 'description': 'Latest NGINX web server'},
        {'name': 'nginx:1.21-alpine', 'description': 'NGINX on Alpine Linux (secure)'},
        {'name': 'python:3.11', 'description': 'Python 3.11 runtime'},
        {'name': 'python:3.11-alpine', 'description': 'Python 3.11 on Alpine (secure)'},
        {'name': 'node:18', 'description': 'Node.js 18 runtime'},
        {'name': 'node:18-alpine', 'description': 'Node.js 18 on Alpine (secure)'},
        {'name': 'ubuntu:22.04', 'description': 'Ubuntu 22.04 LTS'},
        {'name': 'redis:7-alpine', 'description': 'Redis 7 on Alpine'},
        {'name': 'postgres:15', 'description': 'PostgreSQL 15 database'},
        {'name': 'mysql:8', 'description': 'MySQL 8 database'},
    ]
    return jsonify(popular_images)

def background_scan_worker(image_name, scan_id):
    """Background worker for scanning Docker images"""
    try:
        # Update: Pulling image
        scan_progress[scan_id].update({
            'status': 'pulling',
            'progress': 10,
            'message': f'Pulling Docker image: {image_name}...'
        })
        
        # Pull the Docker image
        try:
            subprocess.run(['docker', 'pull', image_name], 
                         check=True, capture_output=True, text=True, timeout=300)
        except subprocess.TimeoutExpired:
            scan_progress[scan_id].update({
                'status': 'failed',
                'message': 'Timeout while pulling image (>5 minutes)'
            })
            return
        except subprocess.CalledProcessError as e:
            scan_progress[scan_id].update({
                'status': 'failed',
                'message': f'Failed to pull image: {str(e)}'
            })
            return
        
        # Update: Scanning
        scan_progress[scan_id].update({
            'status': 'scanning',
            'progress': 30,
            'message': 'Analyzing image for vulnerabilities with Trivy...'
        })
        
        # Create output file
        output_file = os.path.join(parent_dir, 'scan-results', f'dynamic_{scan_id}.json')
        os.makedirs(os.path.join(parent_dir, 'scan-results'), exist_ok=True)
        
        # Run Trivy scan
        try:
            subprocess.run([
                'trivy', 'image',
                '--timeout', '10m',
                '--format', 'json',
                '--output', output_file,
                image_name
            ], check=True, capture_output=True, text=True, timeout=600)
        except subprocess.TimeoutExpired:
            scan_progress[scan_id].update({
                'status': 'failed',
                'message': 'Scan timeout - image too large or complex (>10 minutes)'
            })
            return
        except subprocess.CalledProcessError as e:
            scan_progress[scan_id].update({
                'status': 'failed',
                'message': f'Trivy scan failed: {str(e)}'
            })
            return
        
        # Update: Processing
        scan_progress[scan_id].update({
            'status': 'processing',
            'progress': 80,
            'message': 'Processing scan results and prioritizing vulnerabilities...'
        })
        
        # Process results
        scan_data = load_scan_results(output_file)
        severity_counts, vulnerabilities = analyze_vulnerabilities(scan_data)
        
        # FIXED: Prioritize vulnerabilities for dynamic scans too
        prioritized_vulnerabilities = prioritize_vulnerabilities(vulnerabilities, max_return=200)
        
        # Calculate scan duration
        start_time = datetime.fromisoformat(scan_progress[scan_id]['start_time'])
        scan_duration = (datetime.now() - start_time).total_seconds()
        
        # Verify critical vulnerability count
        critical_returned = len([v for v in prioritized_vulnerabilities if v.get('severity') == 'CRITICAL'])
        critical_expected = severity_counts.get('CRITICAL', 0)
        
        # Final results
        results = {
            'scan_id': scan_id,
            'image_name': image_name,
            'scan_date': datetime.now().isoformat(),
            'severity_counts': severity_counts,
            'total_vulnerabilities': len(vulnerabilities),
            'vulnerabilities': prioritized_vulnerabilities,  # FIXED: Prioritized vulnerabilities
            'scan_duration': round(scan_duration, 2),
            'vulnerability_breakdown': {
                'critical_returned': critical_returned,
                'critical_expected': critical_expected,
                'high_returned': len([v for v in prioritized_vulnerabilities if v.get('severity') == 'HIGH']),
                'total_returned': len(prioritized_vulnerabilities),
                'total_available': len(vulnerabilities)
            }
        }
        
        scan_progress[scan_id].update({
            'status': 'completed',
            'progress': 100,
            'message': f'Scan completed! Found {len(vulnerabilities)} vulnerabilities ({critical_returned} critical)',
            'results': results,
            'vulnerabilities_found': len(vulnerabilities)
        })
        
        print(f" Dynamic scan completed for {image_name}:")
        print(f"   - Total vulnerabilities: {len(vulnerabilities)}")
        print(f"   - Critical: {critical_expected} (all {critical_returned} included)")
        print(f"   - Duration: {scan_duration:.1f} seconds")
        
    except Exception as e:
        scan_progress[scan_id].update({
            'status': 'failed',
            'message': f'Unexpected error: {str(e)}'
        })
        print(f" Dynamic scan failed for {image_name}: {str(e)}")

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'message': 'The requested API endpoint does not exist',
        'available_endpoints': [
            'GET /',
            'GET /api/health',
            'GET /api/popular-images',
            'GET /api/scan/<scan_name>',
            'GET /api/compare/<scan1>/<scan2>',
            'POST /api/scan-image',
            'GET /api/scan-status/<scan_id>',
            'GET /api/scan-result/<scan_id>'
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred on the server'
    }), 500

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad request',
        'message': 'The request could not be processed'
    }), 400

if __name__ == '__main__':
    print(" Starting Container Security Analyzer API on PORT 5001...")
    print(" CORS configured for http://localhost:5173 only")
    print(" Dynamic image scanning enabled")
    print(" Vulnerability prioritization: ALL critical/high included")
    print(" Starting server...")
    print("-" * 50)
    
    # Check if scan-results directory exists
    scan_dir = os.path.join(parent_dir, 'scan-results')
    if os.path.exists(scan_dir):
        scan_files = [f for f in os.listdir(scan_dir) if f.endswith('.json')]
        print(f" Found {len(scan_files)} existing scan files")
    else:
        print("  Creating scan-results directory...")
        os.makedirs(scan_dir, exist_ok=True)
    
    app.run(debug=True, port=5001, host='0.0.0.0')
