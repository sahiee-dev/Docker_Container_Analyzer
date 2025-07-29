#!/usr/bin/env python3
"""
Container Security Analyzer - Scan Comparison Tool
Compares vulnerability scans between two Docker images
"""

import sys
from vulnerability_parser import load_scan_results, analyze_vulnerabilities

def compare_scans(file1, file2):
    """Compare vulnerabilities between two scan files"""
    print("🔍 CONTAINER SECURITY COMPARISON")
    print("=" * 50)
    
    # Load both scans
    scan1_data = load_scan_results(file1)
    scan2_data = load_scan_results(file2)
    
    # Analyze both
    counts1, vulns1 = analyze_vulnerabilities(scan1_data)
    counts2, vulns2 = analyze_vulnerabilities(scan2_data)
    
    print(f"\n📊 COMPARISON RESULTS:")
    print(f"{'Severity':<12} {'Image 1':<10} {'Image 2':<10} {'Difference':<12}")
    print("-" * 50)
    
    severity_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    
    for severity in severity_order:
        count1 = counts1.get(severity, 0)
        count2 = counts2.get(severity, 0)
        diff = count1 - count2
        diff_str = f"+{diff}" if diff > 0 else str(diff)
        
        print(f"{severity:<12} {count1:<10} {count2:<10} {diff_str:<12}")
    
    total1 = len(vulns1)
    total2 = len(vulns2)
    total_diff = total1 - total2
    
    print("-" * 50)
    print(f"{'TOTAL':<12} {total1:<10} {total2:<10} {'+' + str(total_diff) if total_diff > 0 else str(total_diff):<12}")
    
    # Security recommendation
    if total1 > total2:
        print(f"\n✅ RECOMMENDATION: Image 2 is more secure ({total_diff} fewer vulnerabilities)")
    elif total2 > total1:
        print(f"\n⚠️  RECOMMENDATION: Image 1 is more secure ({abs(total_diff)} fewer vulnerabilities)")
    else:
        print(f"\n🤔 Both images have the same number of vulnerabilities")

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 compare_scans.py <json_file1> <json_file2>")
        print("Example: python3 compare_scans.py ../scan-results/nginx-scan.json ../scan-results/nginx-secure.json")
        sys.exit(1)
    
    compare_scans(sys.argv[1], sys.argv[2])

if __name__ == "__main__":
    main()
