import asyncio
import sys
from app.database import get_db
from app.query_builder.flow_compiler import compile_flow_to_sql

async def test():
    async for db in get_db():
        flow = {
            'nodes': [
                {'id': '1', 'type': 'sourceNode', 'data': {'dataset_id': 1}},
                {'id': '2', 'type': 'outputNode'}
            ],
            'edges': [
                {'source': '1', 'target': '2'}
            ]
        }
        try:
            sql = await compile_flow_to_sql(db, flow)
            print('SQL:')
            print(sql)
        except Exception as e:
            print('Error:', e)
        break

asyncio.run(test())
