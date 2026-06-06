from typing import Dict, Any

class BaseTool:
    name: str = ""
    description: str = ""
    parameters: Dict[str, Any] = {}

    async def execute(self, **kwargs) -> str:
        """Execute the tool and return a string result to feed back to the LLM."""
        raise NotImplementedError

    def get_schema(self) -> Dict[str, Any]:
        """Return the OpenAI-compatible tool schema."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }
