import re

file_path = '/home/naveen/NAVYA/frontend/src/features/selfservice/DataMartExplorer.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Find and replace the save button onClick handler
old_code = '''                onClick={() => {
                  if (saveQueryName.trim()) {
                    // Build query configuration object
                    const queryConfig = {'''

new_code = '''                onClick={() => {
                  if (saveQueryName.trim()) {
                    // Check if SQL is generated, if not generate it first
                    if (!generatedSql) {
                      handleGenerateSql();
                      toast.info('SQL generated. Please check the SQL drawer for any warnings.');
                      setIsSaveModalOpen(false);
                      setShowSqlDrawer(true);
                      return;
                    }
                    
                    // Build query configuration object
                    const queryConfig = {'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(file_path, 'w') as f:
        f.write(content)
    print('Successfully updated the save modal')
else:
    print('Could not find the target code')
