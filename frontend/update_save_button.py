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
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Save as Template
          </button>'''

if old_save_button in content:
    content = content.replace(old_save_button, new_save_button)
    print('Updated Save as Template button')
else:
    print('Could not find Save as Template button code')

with open(file_path, 'w') as f:
    f.write(content)

print('Done!')
