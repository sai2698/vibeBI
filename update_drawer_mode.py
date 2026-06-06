#!/usr/bin/env python3
"""Update drawer to show different buttons based on which action opened it"""

file_path = '/home/naveen/NAVYA/frontend/src/features/selfservice/DataMartExplorer.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add new state variable after showTemplatesSidebar
old_state = '  const [showTemplatesSidebar, setShowTemplatesSidebar] = useState(false);'
new_state = '''  const [showTemplatesSidebar, setShowTemplatesSidebar] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'save' | 'run'>('save');'''

if old_state in content:
    content = content.replace(old_state, new_state)
    print("✅ Added drawerMode state variable")
else:
    print("❌ Could not find showTemplatesSidebar state")

# Update Save as Template button to set mode to 'save'
old_save_button = '''<button
            onClick={() => {
              // Always open the drawer and generate SQL if needed
              handleGenerateSql();
              setShowSqlDrawer(true);
            }}
            disabled={queryMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Save as Template
          </button>'''

new_save_button = '''<button
            onClick={() => {
              // Set mode to save and open the drawer
              setDrawerMode('save');
              handleGenerateSql();
              setShowSqlDrawer(true);
            }}
            disabled={queryMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Save as Template
          </button>'''

if old_save_button in content:
    content = content.replace(old_save_button, new_save_button)
    print("✅ Updated Save as Template button to set drawerMode='save'")
else:
    print("❌ Could not find Save as Template button")

# Update Run Query button to set mode to 'run'
old_run_query_button = '''<button
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

new_run_query_button = '''<button
            onClick={() => {
              // Set mode to run and show the SQL drawer
              setDrawerMode('run');
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
    print("✅ Updated Run Query button to set drawerMode='run'")
else:
    print("❌ Could not find Run Query button")

# Update drawer footer to show different buttons based on mode
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

new_footer = '''<div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSqlDrawer(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Close
                </button>
                {drawerMode === 'save' ? (
                  <button
                    onClick={() => {
                      setShowSqlDrawer(false);
                      setIsSaveModalOpen(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Save size={16} /> Save as Template
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowSqlDrawer(false);
                      handleRunQuery();
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play size={16} /> Run Query
                  </button>
                )}
              </div>'''

if old_footer in content:
    content = content.replace(old_footer, new_footer)
    print("✅ Updated drawer footer to show mode-specific buttons")
else:
    print("❌ Could not find drawer footer")

# Write the updated content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ File updated successfully")
