#!/usr/bin/env python3
"""Update Run Query button to always show drawer like Save as Template"""

file_path = '/home/naveen/NAVYA/frontend/src/features/selfservice/DataMartExplorer.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update Run Query button to always show drawer
old_run_query_button = '''<button
            onClick={() => {
              // Check if there are warnings
              if (joinWarnings.length > 0) {
                // Show the SQL drawer to let user review and select option
                handleGenerateSql();
                setShowSqlDrawer(true);
              } else {
                // No warnings, run query directly
                handleRunQuery();
              }
            }}
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}
            className="btn-primary flex items-center gap-2"
          >
            {queryMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} 
            Run Query
          </button>'''

new_run_query_button = '''<button
            onClick={() => {
              // Always show the SQL drawer to let user review and select option
              handleGenerateSql();
              setShowSqlDrawer(true);
            }}
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}
            className="btn-primary flex items-center gap-2"
          >
            {queryMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            Run Query
          </button>'''

if old_run_query_button in content:
    content = content.replace(old_run_query_button, new_run_query_button)
    print("✅ Updated Run Query button to always show drawer")
else:
    print("❌ Could not find Run Query button code")

# Update drawer footer to show Run Query as primary action
old_footer = '''<div className="flex items-center gap-2">
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

new_footer = '''<div className="flex items-center gap-2">
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
              </div>'''

if old_footer in content:
    content = content.replace(old_footer, new_footer)
    print("✅ Updated drawer footer to always show both buttons")
else:
    print("❌ Could not find drawer footer code")

# Write the updated content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ File updated successfully")
