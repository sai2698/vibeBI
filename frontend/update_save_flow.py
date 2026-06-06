file_path = '/home/naveen/NAVYA/frontend/src/features/selfservice/DataMartExplorer.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Update Save as Template button - always open drawer
old_save_button = '''          <button
            onClick={() => {
              // First generate SQL
              handleGenerateSql();
              
              // Check if there are warnings with multiple paths
              if (joinWarnings.length > 0) {
                // Show the SQL drawer to let user select option
                setShowSqlDrawer(true);
              } else {
                // No warnings, open save modal directly
                setIsSaveModalOpen(true);
              }
            }}
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Save as Template
          </button>'''

new_save_button = '''          <button
            onClick={() => {
              // Always generate SQL and open drawer for save template flow
              handleGenerateSql();
              setShowSqlDrawer(true);
            }}
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Save as Template
          </button>'''

# Update Run Query button - show warnings if any
old_run_button = '''          <button
            onClick={handleRunQuery}
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}'''

new_run_button = '''          <button
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
            disabled={queryMutation.isPending || (dimensions.length === 0 && metrics.length === 0)}'''

# Update drawer footer - always show Save as Template button
old_footer = '''                {joinWarnings.length > 0 ? (
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
                )}'''

new_footer = '''                <button
                  onClick={() => {
                    setShowSqlDrawer(false);
                    setIsSaveModalOpen(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} /> Save as Template
                </button>'''

if old_save_button in content:
    content = content.replace(old_save_button, new_save_button)
    print('Updated Save as Template button')
else:
    print('Could not find Save as Template button code')

if old_run_button in content:
    content = content.replace(old_run_button, new_run_button)
    print('Updated Run Query button')
else:
    print('Could not find Run Query button code')

if old_footer in content:
    content = content.replace(old_footer, new_footer)
    print('Updated drawer footer')
else:
    print('Could not find drawer footer code')

with open(file_path, 'w') as f:
    f.write(content)

print('Done!')
