import os
import re

base_path = "/home/naveen/BI/frontend/src/features/ai"
main_file = os.path.join(base_path, "AIWorkspacePage.tsx")
components_path = os.path.join(base_path, "components")

with open(main_file, "r") as f:
    content = f.read()

# --- Extract CreateBotModal ---
modal_start = content.find("const CreateBotModal: React.FC")
modal_end = content.find("const AIWorkspacePage: React.FC") - 1
modal_content = content[modal_start:modal_end]

with open(os.path.join(components_path, "CreateBotModal.tsx"), "w") as f:
    f.write("import React, { useState } from 'react';\n")
    f.write("import { Sparkles, X, Settings, Globe, Database, Zap, Shield, Check, Plus, Trash2, Loader2 } from 'lucide-react';\n")
    f.write("import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\n")
    f.write("import api from '../../../../api';\n")
    f.write("import { toast } from 'react-hot-toast';\n")
    f.write("import { AIBot, ICON_MAP } from './types';\n\n")
    f.write(modal_content)

print("Created CreateBotModal.tsx")
