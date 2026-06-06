import pandas as pd
import numpy as np

df = pd.DataFrame({"a": [1, np.nan, 3]})
print("Original:")
print(df.to_dict(orient="records"))

df2 = df.where(pd.notnull(df), None)
print("Where notnull None:")
print(df2.to_dict(orient="records"))

df3 = df.replace({np.nan: None})
print("Replace np.nan:")
print(df3.to_dict(orient="records"))
