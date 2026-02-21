"""Auto Shop Voice Agent — entry point.

Powered by smallest.ai Atoms framework.
Adapted from the smallest.ai appointment scheduler cookbook.

Required env vars (copy .env.example to .env and fill in):
    SMALLEST_API_KEY
    OPENAI_API_KEY
    CAL_API_KEY + CAL_EVENT_TYPE_ID
    CONVEX_SITE_URL
"""

from loguru import logger

from calcom_client import CalcomClient
from carsxe_client import CarsXEClient
from convex_client import ConvexClient
from mechanic_agent import MechanicAgent

from smallestai.atoms.agent.events import SDKEvent, SDKSystemUserJoinedEvent
from smallestai.atoms.agent.server import AtomsApp
from smallestai.atoms.agent.session import AgentSession


async def setup_session(session: AgentSession):
    """Configure the auto shop voice agent session."""

    calcom = CalcomClient()
    convex = ConvexClient()
    carsxe = CarsXEClient()

    if not calcom.enabled:
        logger.warning("[App] Cal.com not configured — set CAL_API_KEY and CAL_EVENT_TYPE_ID")
    if not convex.enabled:
        logger.warning("[App] Convex not configured — set CONVEX_SITE_URL")
    if not carsxe.enabled:
        logger.warning("[App] CarsXE not configured — set CARSXE_API_KEY")

    agent = MechanicAgent(calcom=calcom, convex=convex, carsxe=carsxe)
    session.add_node(agent)

    await session.start()

    @session.on_event("on_event_received")
    async def on_event_received(_, event: SDKEvent):
        logger.info(f"Event received: {event.type}")

        if isinstance(event, SDKSystemUserJoinedEvent):
            greeting = (
                "Thank you for calling Precision Auto Shop, this is Alex. "
                "How can I help you today?"
            )
            agent.context.add_message({"role": "assistant", "content": greeting})
            await agent.speak(greeting)

    await session.wait_until_complete()
    logger.success("Session complete")


if __name__ == "__main__":
    app = AtomsApp(setup_handler=setup_session)
    app.run()
