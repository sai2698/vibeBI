#!/usr/bin/env python3
"""Update drawer footer to show both Save and Run buttons when warnings exist"""

import re

file_path = '/home/naveen/NAVYA/frontend/src/features/selfservice/DataMartExplorer.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the drawer footer section
old_footer = '''<div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSqlDrawer(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowSqlDrawer(false);
                    setIsSaveModalOpen(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} /> Save as Template
                </button>
              </div>'''

new_footer = '''<div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSqlDrawer(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Close
                </button>
                {joinWarnings.length > 0 ? (
                  <>
                    <button
                      onClick={() => {
                        setShowSqlDrawer(false);
                        setIsSaveModalOpen(true);
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                    >
                      <Save size={16} /> Save as Template
                    </button>
                    <button
                      onClick={() => {
                        setShowSqlDrawer(false);
                        handleRunQuery();
                      }}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Play size={16} /> Run Query
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowSqlDrawer(false);
                      setIsSaveModalOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save size={16} /> Save as Template
                  </button>
                )}
              </div>'''

if old_footer in content:
    content = content.replace(old_footer, new_footer)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Successfully updated drawer footer")
else:
    print("❌ Could not find exact match for drawer footer")
    # Try to find similar patterns
    if 'Save as Template' in content:
        print("Found 'Save as Template' in file")
    if 'joinWarnings.length' in content:
        print("Found 'joinWarnings.length' in file")
