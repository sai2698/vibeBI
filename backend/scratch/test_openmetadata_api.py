import asyncio
import httpx
import sys
import os

# Add parent directory to sys.path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

async def run_tests():
    print("Starting integration verification tests...")
    
    # We use httpx.AsyncClient to call our FastAPI app directly in memory
    try:
        transport = httpx.ASGITransport(app=app)
        client_kwargs = {"transport": transport, "base_url": "http://test"}
    except AttributeError:
        client_kwargs = {"app": app, "base_url": "http://test"}

    async with httpx.AsyncClient(**client_kwargs) as client:
        
        # 1. Test GET /api/v1/security/csrf
        print("\n[Test 1] Testing CSRF Endpoint:")
        r = await client.get("/api/v1/security/csrf")
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}")
        assert r.status_code == 200
        assert "result" in r.json()
        
        # 2. Test POST /api/v1/security/login
        print("\n[Test 2] Testing Login Endpoint:")
        login_data = {
            "username": "admin@biplatform.com",
            "password": "admin123",
            "provider": "db"
        }
        r = await client.post("/api/v1/security/login", json=login_data)
        print(f"Status: {r.status_code}")
        login_response = r.json()
        print(f"Response: {login_response}")
        
        if r.status_code != 200:
            print("ERROR: Login failed. Did you seed the database? Please run 'python seed_db.py' or make sure admin credentials are correct.")
            sys.exit(1)
            
        token = login_response["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Test GET /api/v1/dashboard/
        print("\n[Test 3] Testing Dashboard List:")
        r = await client.get("/api/v1/dashboard/", headers=headers)
        print(f"Status: {r.status_code}")
        dashboards = r.json()
        print(f"Count: {dashboards.get('count')}")
        if dashboards.get("result"):
            first_dash = dashboards["result"][0]
            print(f"Sample Dashboard: ID={first_dash.get('id')}, Title='{first_dash.get('dashboard_title')}', Slug='{first_dash.get('slug')}'")
            print(f"Owners: {first_dash.get('owners')}")
            print(f"Position JSON: {first_dash.get('position_json')[:200]}...")
            assert "dashboard_title" in first_dash
            assert "position_json" in first_dash
            assert "owners" in first_dash
            
            # Test GET /api/v1/dashboard/{id}
            dash_id = first_dash["id"]
            print(f"\n[Test 3b] Testing Dashboard Detail (ID={dash_id}):")
            r_detail = await client.get(f"/api/v1/dashboard/{dash_id}", headers=headers)
            print(f"Status: {r_detail.status_code}")
            detail_res = r_detail.json()
            assert detail_res["id"] == dash_id
            assert "result" in detail_res
            
            # Test GET /api/v1/dashboard/{id}/charts
            print(f"\n[Test 3c] Testing Dashboard Charts (ID={dash_id}):")
            r_charts = await client.get(f"/api/v1/dashboard/{dash_id}/charts", headers=headers)
            print(f"Status: {r_charts.status_code}")
            charts_res = r_charts.json()
            print(f"Charts in Dashboard count: {charts_res.get('count')}")
            if charts_res.get("result"):
                print(f"Sample Chart in Dashboard: {charts_res['result'][0]}")
        else:
            print("No dashboards found in seed data.")
            
        # 4. Test GET /api/v1/chart/
        print("\n[Test 4] Testing Chart List:")
        r = await client.get("/api/v1/chart/", headers=headers)
        print(f"Status: {r.status_code}")
        charts = r.json()
        print(f"Count: {charts.get('count')}")
        if charts.get("result"):
            first_chart = charts["result"][0]
            print(f"Sample Chart: ID={first_chart.get('id')}, Name='{first_chart.get('slice_name')}', Type='{first_chart.get('viz_type')}'")
            assert "slice_name" in first_chart
            assert "viz_type" in first_chart
            
            # Test GET /api/v1/chart/{id}
            chart_id = first_chart["id"]
            print(f"\n[Test 4b] Testing Chart Detail (ID={chart_id}):")
            r_detail = await client.get(f"/api/v1/chart/{chart_id}", headers=headers)
            print(f"Status: {r_detail.status_code}")
            assert r_detail.json()["id"] == chart_id
        else:
            print("No charts found in seed data.")
            
        # 5. Test GET /api/v1/dataset/
        print("\n[Test 5] Testing Dataset List:")
        r = await client.get("/api/v1/dataset/", headers=headers)
        print(f"Status: {r.status_code}")
        datasets = r.json()
        print(f"Count: {datasets.get('count')}")
        if datasets.get("result"):
            first_dataset = datasets["result"][0]
            print(f"Sample Dataset: ID={first_dataset.get('id')}, Table='{first_dataset.get('table_name')}', Schema='{first_dataset.get('schema_name')}'")
            print(f"Database Info: {first_dataset.get('database')}")
            assert "table_name" in first_dataset
            assert "database" in first_dataset
            
            # Test GET /api/v1/dataset/{id}
            dataset_id = first_dataset["id"]
            print(f"\n[Test 5b] Testing Dataset Detail (ID={dataset_id}):")
            r_detail = await client.get(f"/api/v1/dataset/{dataset_id}", headers=headers)
            print(f"Status: {r_detail.status_code}")
            ds_detail = r_detail.json()
            assert ds_detail["id"] == dataset_id
            print(f"Columns count: {len(ds_detail['result'].get('columns', []))}")
            if ds_detail['result'].get('columns'):
                print(f"Sample Column: {ds_detail['result']['columns'][0]}")
            assert "columns" in ds_detail["result"]
            assert "metrics" in ds_detail["result"]
        else:
            print("No datasets found in seed data.")
            
        # 6. Test GET /api/v1/database/
        print("\n[Test 6] Testing Database/Datasource List:")
        r = await client.get("/api/v1/database/", headers=headers)
        print(f"Status: {r.status_code}")
        databases = r.json()
        print(f"Count: {databases.get('count')}")
        if databases.get("result"):
            first_db = databases["result"][0]
            print(f"Sample DB: ID={first_db.get('id')}, Name='{first_db.get('database_name')}', Engine='{first_db.get('backend')}'")
            print(f"URI: {first_db.get('sqlalchemy_uri')}")
            assert "database_name" in first_db
            assert "***" in first_db.get("sqlalchemy_uri") or first_db.get("sqlalchemy_uri") == ""
            
            # Test GET /api/v1/database/{id}
            db_id = first_db["id"]
            print(f"\n[Test 6b] Testing Database Detail (ID={db_id}):")
            r_detail = await client.get(f"/api/v1/database/{db_id}", headers=headers)
            print(f"Status: {r_detail.status_code}")
            assert r_detail.json()["id"] == db_id
        else:
            print("No databases found in seed data.")

    print("\nAll integration verification tests passed successfully!")

if __name__ == "__main__":
    asyncio.run(run_tests())
