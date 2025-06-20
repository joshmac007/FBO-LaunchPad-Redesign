"""
Load Testing Script for Enhanced Authorization System
Phase 4 Step 3: Performance Optimization & Production Features

Stress tests the permission checking system with various load scenarios.
"""

import asyncio
import time
import random
import statistics
import logging
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime
import concurrent.futures
import threading
from queue import Queue

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class LoadTestResult:
    """Result of a load test execution."""
    test_name: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    duration_seconds: float
    requests_per_second: float
    average_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    error_rate_percent: float
    cache_hit_rate_percent: float

@dataclass
class PermissionCheckRequest:
    """A permission check request for load testing."""
    user_id: int
    permission: str
    resource_type: str = None
    resource_id: str = None

class AuthorizationLoadTester:
    """
    Load tester for the enhanced authorization system.
    
    Tests various scenarios:
    - High-volume permission checking
    - Cache performance under load
    - Concurrent user access
    - Resource-specific permission stress
    - Permission group resolution performance
    """
    
    def __init__(self):
        self.test_users = []
        self.test_permissions = []
        self.test_resources = []
        self.response_times = []
        self.cache_hits = 0
        self.cache_misses = 0
        self.lock = threading.Lock()
        
    def setup_test_data(self):
        """Set up test data for load testing."""
        try:
            # Import here to avoid Flask context issues
            from ..models.user import User
            from ..models.permission import Permission
            from ..models.fuel_order import FuelOrder
            
            # Get test users (limit to avoid overwhelming)
            self.test_users = User.query.filter_by(is_active=True).limit(50).all()
            logger.info(f"Found {len(self.test_users)} test users")
            
            # Get test permissions
            self.test_permissions = [p.name for p in Permission.query.all()]
            logger.info(f"Found {len(self.test_permissions)} permissions")
            
            # Get test resources
            fuel_orders = FuelOrder.query.limit(100).all()
            self.test_resources = [
                {'type': 'fuel_order', 'id': str(order.id)} 
                for order in fuel_orders
            ]
            logger.info(f"Found {len(self.test_resources)} test resources")
            
            if not self.test_users or not self.test_permissions:
                raise Exception("Insufficient test data found")
                
        except Exception as e:
            logger.error(f"Failed to setup test data: {e}")
            raise
    
    def create_permission_check_request(self) -> PermissionCheckRequest:
        """Create a random permission check request."""
        user = random.choice(self.test_users)
        permission = random.choice(self.test_permissions)
        
        # 30% chance of resource-specific check
        if random.random() < 0.3 and self.test_resources:
            resource = random.choice(self.test_resources)
            return PermissionCheckRequest(
                user_id=user.id,
                permission=permission,
                resource_type=resource['type'],
                resource_id=resource['id']
            )
        else:
            return PermissionCheckRequest(
                user_id=user.id,
                permission=permission
            )
    
    def execute_permission_check(self, request: PermissionCheckRequest) -> Dict[str, Any]:
        """Execute a single permission check and measure performance."""
        start_time = time.time()
        
        try:
            from ..services.permission_service import enhanced_permission_service
            from ..services.permission_service import ResourceContext
            
            # Create resource context if needed
            resource_context = None
            if request.resource_type and request.resource_id:
                resource_context = ResourceContext(
                    resource_type=request.resource_type,
                    resource_id=request.resource_id,
                    ownership_check=True
                )
            
            # Execute permission check
            result = enhanced_permission_service.user_has_permission(
                user_id=request.user_id,
                permission=request.permission,
                resource_context=resource_context
            )
            
            response_time = (time.time() - start_time) * 1000  # Convert to ms
            
            return {
                'success': True,
                'result': result,
                'response_time_ms': response_time,
                'cache_hit': False,  # This would need to be determined from the service
                'request': request
            }
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            logger.error(f"Permission check failed: {e}")
            
            return {
                'success': False,
                'error': str(e),
                'response_time_ms': response_time,
                'cache_hit': False,
                'request': request
            }
    
    def run_concurrent_test(self, num_requests: int, num_threads: int) -> LoadTestResult:
        """Run concurrent permission checks with multiple threads."""
        logger.info(f"Starting concurrent test: {num_requests} requests, {num_threads} threads")
        
        results = []
        start_time = time.time()
        
        def worker():
            """Worker thread function."""
            while True:
                try:
                    request = request_queue.get_nowait()
                    result = self.execute_permission_check(request)
                    
                    with self.lock:
                        results.append(result)
                        
                    request_queue.task_done()
                    
                except Queue.Empty:
                    break
        
        # Create request queue
        request_queue = Queue()
        for _ in range(num_requests):
            request_queue.put(self.create_permission_check_request())
        
        # Start worker threads
        threads = []
        for _ in range(num_threads):
            thread = threading.Thread(target=worker)
            thread.start()
            threads.append(thread)
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        end_time = time.time()
        duration = end_time - start_time
        
        return self._analyze_results("concurrent_test", results, duration)
    
    def run_burst_test(self, burst_size: int, num_bursts: int, burst_interval: float) -> LoadTestResult:
        """Run burst testing with periods of high activity."""
        logger.info(f"Starting burst test: {num_bursts} bursts of {burst_size} requests")
        
        all_results = []
        start_time = time.time()
        
        for burst_num in range(num_bursts):
            logger.info(f"Executing burst {burst_num + 1}/{num_bursts}")
            
            # Execute burst of requests
            burst_results = []
            for _ in range(burst_size):
                request = self.create_permission_check_request()
                result = self.execute_permission_check(request)
                burst_results.append(result)
            
            all_results.extend(burst_results)
            
            # Wait between bursts (except for the last one)
            if burst_num < num_bursts - 1:
                time.sleep(burst_interval)
        
        end_time = time.time()
        duration = end_time - start_time
        
        return self._analyze_results("burst_test", all_results, duration)
    
    def run_sustained_load_test(self, duration_seconds: int, requests_per_second: int) -> LoadTestResult:
        """Run sustained load test for a specific duration."""
        logger.info(f"Starting sustained load test: {duration_seconds}s at {requests_per_second} RPS")
        
        results = []
        start_time = time.time()
        request_interval = 1.0 / requests_per_second
        
        while time.time() - start_time < duration_seconds:
            request_start = time.time()
            
            request = self.create_permission_check_request()
            result = self.execute_permission_check(request)
            results.append(result)
            
            # Maintain request rate
            elapsed = time.time() - request_start
            if elapsed < request_interval:
                time.sleep(request_interval - elapsed)
        
        end_time = time.time()
        actual_duration = end_time - start_time
        
        return self._analyze_results("sustained_load_test", results, actual_duration)
    
    def run_cache_stress_test(self, num_requests: int) -> LoadTestResult:
        """Test cache performance with repeated requests."""
        logger.info(f"Starting cache stress test: {num_requests} requests")
        
        # Create a smaller set of requests that will be repeated
        unique_requests = []
        for _ in range(min(100, num_requests // 10)):
            unique_requests.append(self.create_permission_check_request())
        
        results = []
        start_time = time.time()
        
        for _ in range(num_requests):
            # Choose a request (biased towards popular ones for cache testing)
            if random.random() < 0.8:  # 80% chance of popular request
                request = random.choice(unique_requests[:10])  # Top 10 most popular
            else:
                request = random.choice(unique_requests)
            
            result = self.execute_permission_check(request)
            results.append(result)
        
        end_time = time.time()
        duration = end_time - start_time
        
        return self._analyze_results("cache_stress_test", results, duration)
    
    def run_resource_specific_test(self, num_requests: int) -> LoadTestResult:
        """Test resource-specific permission checking performance."""
        logger.info(f"Starting resource-specific test: {num_requests} requests")
        
        results = []
        start_time = time.time()
        
        for _ in range(num_requests):
            # Force resource-specific requests
            user = random.choice(self.test_users)
            permission = random.choice(self.test_permissions)
            
            if self.test_resources:
                resource = random.choice(self.test_resources)
                request = PermissionCheckRequest(
                    user_id=user.id,
                    permission=permission,
                    resource_type=resource['type'],
                    resource_id=resource['id']
                )
            else:
                request = PermissionCheckRequest(
                    user_id=user.id,
                    permission=permission
                )
            
            result = self.execute_permission_check(request)
            results.append(result)
        
        end_time = time.time()
        duration = end_time - start_time
        
        return self._analyze_results("resource_specific_test", results, duration)
    
    def _analyze_results(self, test_name: str, results: List[Dict[str, Any]], 
                        duration: float) -> LoadTestResult:
        """Analyze test results and create summary."""
        total_requests = len(results)
        successful_requests = sum(1 for r in results if r['success'])
        failed_requests = total_requests - successful_requests
        
        response_times = [r['response_time_ms'] for r in results]
        cache_hits = sum(1 for r in results if r.get('cache_hit', False))
        
        if response_times:
            sorted_times = sorted(response_times)
            p95_index = int(0.95 * len(sorted_times))
            p99_index = int(0.99 * len(sorted_times))
            
            return LoadTestResult(
                test_name=test_name,
                total_requests=total_requests,
                successful_requests=successful_requests,
                failed_requests=failed_requests,
                duration_seconds=duration,
                requests_per_second=total_requests / duration if duration > 0 else 0,
                average_response_time_ms=statistics.mean(response_times),
                min_response_time_ms=min(response_times),
                max_response_time_ms=max(response_times),
                p95_response_time_ms=sorted_times[p95_index] if p95_index < len(sorted_times) else 0,
                p99_response_time_ms=sorted_times[p99_index] if p99_index < len(sorted_times) else 0,
                error_rate_percent=(failed_requests / total_requests) * 100,
                cache_hit_rate_percent=(cache_hits / total_requests) * 100
            )
        else:
            return LoadTestResult(
                test_name=test_name,
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                duration_seconds=duration,
                requests_per_second=0,
                average_response_time_ms=0,
                min_response_time_ms=0,
                max_response_time_ms=0,
                p95_response_time_ms=0,
                p99_response_time_ms=0,
                error_rate_percent=0,
                cache_hit_rate_percent=0
            )
    
    def run_full_test_suite(self) -> Dict[str, LoadTestResult]:
        """Run the complete load testing suite."""
        logger.info("🚀 STARTING ENHANCED AUTHORIZATION LOAD TEST SUITE")
        logger.info("=" * 60)
        
        self.setup_test_data()
        
        test_results = {}
        
        try:
            # Test 1: Concurrent load test
            logger.info("\n📋 Test 1: Concurrent Load Test")
            test_results['concurrent'] = self.run_concurrent_test(
                num_requests=1000,
                num_threads=10
            )
            
            # Test 2: Burst test
            logger.info("\n📋 Test 2: Burst Load Test")
            test_results['burst'] = self.run_burst_test(
                burst_size=100,
                num_bursts=5,
                burst_interval=2.0
            )
            
            # Test 3: Sustained load test
            logger.info("\n📋 Test 3: Sustained Load Test")
            test_results['sustained'] = self.run_sustained_load_test(
                duration_seconds=30,
                requests_per_second=20
            )
            
            # Test 4: Cache stress test
            logger.info("\n📋 Test 4: Cache Stress Test")
            test_results['cache_stress'] = self.run_cache_stress_test(
                num_requests=2000
            )
            
            # Test 5: Resource-specific test
            logger.info("\n📋 Test 5: Resource-Specific Permission Test")
            test_results['resource_specific'] = self.run_resource_specific_test(
                num_requests=500
            )
            
        except Exception as e:
            logger.error(f"Test suite failed: {e}")
            raise
        
        return test_results
    
    def print_test_results(self, results: Dict[str, LoadTestResult]):
        """Print formatted test results."""
        logger.info("\n" + "=" * 60)
        logger.info("📊 LOAD TEST RESULTS SUMMARY")
        logger.info("=" * 60)
        
        for test_name, result in results.items():
            logger.info(f"\n🔍 {result.test_name.upper().replace('_', ' ')}")
            logger.info(f"   Total Requests: {result.total_requests}")
            logger.info(f"   Successful: {result.successful_requests}")
            logger.info(f"   Failed: {result.failed_requests}")
            logger.info(f"   Duration: {result.duration_seconds:.2f}s")
            logger.info(f"   RPS: {result.requests_per_second:.2f}")
            logger.info(f"   Avg Response Time: {result.average_response_time_ms:.2f}ms")
            logger.info(f"   P95 Response Time: {result.p95_response_time_ms:.2f}ms")
            logger.info(f"   P99 Response Time: {result.p99_response_time_ms:.2f}ms")
            logger.info(f"   Error Rate: {result.error_rate_percent:.2f}%")
            logger.info(f"   Cache Hit Rate: {result.cache_hit_rate_percent:.2f}%")
        
        # Overall assessment
        logger.info(f"\n" + "=" * 60)
        logger.info("🎯 PERFORMANCE ASSESSMENT")
        logger.info("=" * 60)
        
        overall_errors = sum(r.failed_requests for r in results.values())
        overall_requests = sum(r.total_requests for r in results.values())
        overall_error_rate = (overall_errors / overall_requests) * 100 if overall_requests > 0 else 0
        
        avg_response_time = statistics.mean([r.average_response_time_ms for r in results.values()])
        max_p99 = max([r.p99_response_time_ms for r in results.values()])
        
        logger.info(f"   Overall Error Rate: {overall_error_rate:.2f}%")
        logger.info(f"   Average Response Time: {avg_response_time:.2f}ms")
        logger.info(f"   Maximum P99 Response Time: {max_p99:.2f}ms")
        
        # Performance thresholds
        if overall_error_rate < 1.0:
            logger.info("   ✅ Error rate is within acceptable limits (<1%)")
        else:
            logger.warning("   ⚠️  Error rate is above threshold (>1%)")
        
        if avg_response_time < 100:
            logger.info("   ✅ Average response time is excellent (<100ms)")
        elif avg_response_time < 500:
            logger.info("   ✅ Average response time is acceptable (<500ms)")
        else:
            logger.warning("   ⚠️  Average response time is above threshold (>500ms)")
        
        if max_p99 < 1000:
            logger.info("   ✅ P99 response time is within limits (<1000ms)")
        else:
            logger.warning("   ⚠️  P99 response time is above threshold (>1000ms)")

def run_authorization_load_test():
    """Main function to run the authorization load test."""
    tester = AuthorizationLoadTester()
    
    try:
        results = tester.run_full_test_suite()
        tester.print_test_results(results)
        
        logger.info(f"\n🎉 LOAD TEST COMPLETED SUCCESSFULLY!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Load test failed: {e}")
        return False

if __name__ == '__main__':
    # This script should be run with Flask application context
    print("Run this script with: python -m flask shell")
    print("Then execute: exec(open('src/testing/load_test_authorization.py').read())")
    print("Finally run: run_authorization_load_test()") 