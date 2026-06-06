file_path = '/home/naveen/NAVYA/frontend/src/features/selfservice/DataMartExplorer.tsx'

with open(file_path, 'r') as f:
    content = f.read()

old_code = '''            {/* Drawer Footer */}
            <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {generatedSql ? `${generatedSql.split('\\n').length} lines` : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSqlDrawer(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Close
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
              </div>
            </div>'''

new_code = '''            {/* Drawer Footer */}
            <div className="shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {generatedSql ? `${generatedSql.split('\\n').length} lines` : ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSqlDrawer(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                >
                  Close
                </button>
                {joinWarnings.length > 0 ? (
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
              </div>
            </div>'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(file_path, 'w') as f:
        f.write(content)
    print('Successfully updated the drawer footer')
else:
    print('Could not find the target code')
    # Try to find similar patterns
    if 'Drawer Footer' in content:
        print('Found "Drawer Footer" comment')
    if 'Run Query' in content:
        print('Found "Run Query" button')
