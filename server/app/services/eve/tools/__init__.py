"""Eve tool catalog — composes per-domain tool lists into EVE_TOOLS."""

from app.services.eve.tools.files import FILES_TOOLS
from app.services.eve.tools.memory import MEMORY_TOOLS
from app.services.eve.tools.navigation import NAVIGATION_TOOLS
from app.services.eve.tools.schedule import SCHEDULE_TOOLS
from app.services.eve.tools.search import SEARCH_TOOLS
from app.services.eve.tools.web import WEB_TOOLS
from app.services.eve.tools.whatsapp import WHATSAPP_TOOLS
from app.services.eve.tools.workspace import WORKSPACE_TOOLS

EVE_TOOLS = (
    WORKSPACE_TOOLS
    + NAVIGATION_TOOLS
    + SEARCH_TOOLS
    + MEMORY_TOOLS
    + SCHEDULE_TOOLS
    + FILES_TOOLS
    + WHATSAPP_TOOLS
    + WEB_TOOLS
)
