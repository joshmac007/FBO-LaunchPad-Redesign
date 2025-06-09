#!/usr/bin/env python3
"""
Docker-optimized test runner for critical backend tests
This script runs tests directly without Flask app initialization issues
"""

import os
import sys
import subprocess
import time

def set_test_environment():
    """Set up test environment variables"""
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['TESTING'] = 'true'
    os.environ['WTF_CSRF_ENABLED'] = 'false'
    # Use the Docker database
    os.environ['SQLALCHEMY_DATABASE_URI'] = 'postgresql://fbo_user:fbo_password@db:5432/fbo_launchpad_test'
    
def run_single_test(test_path, timeout=30):
    """Run a single test with timeout"""
    print(f"\n🧪 Running: {test_path}")
    print("=" * 50)
    
    try:
        # Run pytest with minimal configuration
        cmd = [
            'python', '-m', 'pytest', 
            test_path,
            '-v', 
            '--tb=short',
            '--no-header',
            '--disable-warnings'
        ]
        
        result = subprocess.run(
            cmd, 
            timeout=timeout,
            capture_output=True,
            text=True,
            cwd='/app'
        )
        
        if result.returncode == 0:
            print("✅ PASSED")
            print(result.stdout)
            return True
        else:
            print("❌ FAILED")
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print(f"⏰ TIMEOUT after {timeout} seconds")
        return False
    except Exception as e:
        print(f"💥 ERROR: {e}")
        return False

def main():
    """Run critical backend tests from tasks.md section 1.2"""
    print("🐳 DOCKER TEST RUNNER - Critical Backend Tests")
    print("=" * 60)
    
    # Set up environment
    set_test_environment()
    
    # Tests from tasks.md section 1.2
    critical_tests = [
        'tests/test_fueler_integration.py::TestFuelerIntegration::test_atomic_order_claiming_race_condition',
        'tests/test_fueler_integration.py::TestFuelerIntegration::test_order_completion_truck_state_update_atomicity',
        'tests/test_fueler_integration.py::TestFuelerIntegration::test_csr_update_state_machine_data_integrity',
        'tests/test_fueler_integration.py::TestFuelerIntegration::test_server_side_validation_invalid_meter_readings'
    ]
    
    results = []
    passed = 0
    failed = 0
    
    for test in critical_tests:
        success = run_single_test(test)
        results.append((test, success))
        if success:
            passed += 1
        else:
            failed += 1
        
        # Small delay between tests
        time.sleep(1)
    
    # Final summary
    print("\n" + "=" * 60)
    print("📊 FINAL RESULTS")
    print("=" * 60)
    
    for test, success in results:
        status = "✅ PASS" if success else "❌ FAIL" 
        test_name = test.split("::")[-1]
        print(f"{status}: {test_name}")
    
    print(f"\n🎯 Summary: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 ALL CRITICAL TESTS PASSED!")
        return 0
    else:
        print("⚠️  Some tests failed - check output above")
        return 1

if __name__ == '__main__':
    sys.exit(main()) 