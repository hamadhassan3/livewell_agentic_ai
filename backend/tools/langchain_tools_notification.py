from langchain_core.tools import BaseTool
from typing import Dict, Any, Optional, Type, Literal
from pydantic import BaseModel, Field
from .services import ToolExecutionService


class WeatherInput(BaseModel):
    location: str = Field(default="Adelaide, Australia", description="Location to get weather for")
    units: str = Field(default="metric", description="Temperature units (metric, imperial, kelvin)")


class CalculatorInput(BaseModel):
    expression: str = Field(description="Mathematical expression to evaluate")


class GetMedicationHistoryInput(BaseModel):
    user_id: int = Field(description="The ID of the user to get medication history for")
    medication_id: Optional[int] = Field(default=None, description="Optional: Filter by specific medication ID")
    days: int = Field(default=7, description="Number of days of history to retrieve (1-30)")


class GetGoalProgressInput(BaseModel):
    user_id: int = Field(description="The ID of the user to get goal progress for")
    goal_id: Optional[int] = Field(default=None, description="Optional: Filter by specific goal ID")
    days: int = Field(default=7, description="Number of days of progress to retrieve (1-30)")


class WebSearchInput(BaseModel):
    query: str = Field(description="The search query to search for on the web")
    num_results: int = Field(default=5, description="Number of search results to return (max: 10)")
    search_type: str = Field(default="web", description="Type of search to perform (web or image)")


class GetEventsListInput(BaseModel):
    user_id: int = Field(description="The ID of the user to get events for")


class CreateEventInput(BaseModel):
    user_id: int = Field(description="The ID of the user creating the event")
    title: str = Field(description="The title of the event")
    address: Optional[list[str]] = Field(default=None, description="List of address components for the event location")
    link: Optional[str] = Field(default=None, description="URL link for more information about the event")
    start_date: str = Field(description="Start date of the event (e.g., 'Mar 23' or full date)")
    when: Optional[str] = Field(default=None, description="Additional timing information (e.g., '7:00 PM - 9:00 PM')")
    json_data: Optional[Dict[str, Any]] = Field(default=None, description="Additional JSON data for the event")


class SearchEventsInput(BaseModel):
    query: str = Field(description="The search query for events (e.g., 'Art classes', 'Yoga for seniors', 'Community gatherings')")
    location: str = Field(default="Adelaide", description="The location for the event search (e.g., 'Adelaide', 'Sydney', 'Melbourne')")


class ReverseGeocodeInput(BaseModel):
    latitude: float = Field(description="Latitude coordinate (e.g., -34.9285)")
    longitude: float = Field(description="Longitude coordinate (e.g., 138.6007)")


class UpdateEventInput(BaseModel):
    user_id: int = Field(description="The ID of the user updating the event")
    event_id: str = Field(description="The UUID of the event to update")
    title: Optional[str] = Field(default=None, description="The updated title of the event")
    address: Optional[list[str]] = Field(default=None, description="Updated list of address components")
    link: Optional[str] = Field(default=None, description="Updated URL link for the event")
    start_date: Optional[str] = Field(default=None, description="Updated start date (e.g., 'Mar 23' or full date)")
    when: Optional[str] = Field(default=None, description="Updated timing information (e.g., '7:00 PM - 9:00 PM')")
    is_attended: Optional[bool] = Field(default=None, description="Whether the user attended the event")
    json_data: Optional[Dict[str, Any]] = Field(default=None, description="Updated additional JSON data")


class FetchRecipesInput(BaseModel):
    query: str = Field(default="", description="Search query for recipes (e.g., 'low sodium chicken', 'diabetic friendly desserts', 'heart healthy meals')")
    diet_type: str = Field(default="any", description="Dietary restriction or type (any, vegetarian, vegan, pescatarian, mediterranean, low_sodium, diabetic_friendly, heart_healthy, gluten_free)")
    max_results: int = Field(default=10, description="Maximum number of recipes to return (max: 20)")
    cuisine_type: Optional[str] = Field(default=None, description="Type of cuisine (e.g., 'italian', 'asian', 'mexican', 'indian')")
    meal_type: str = Field(default="any", description="Type of meal (any, breakfast, lunch, dinner, snack, dessert)")
    max_prep_time: Optional[int] = Field(default=None, description="Maximum preparation time in minutes")
    health_labels: Optional[list[str]] = Field(default=None, description="Health labels to filter by (e.g., ['low-fat', 'low-carb', 'high-protein'])")


class FindPlacesInput(BaseModel):
    query: str = Field(description="Search query for places (e.g., 'pharmacy', 'hospital', 'park', 'restaurant', 'grocery store')")
    latitude: float = Field(description="Latitude coordinate of the search location")
    longitude: float = Field(description="Longitude coordinate of the search location")
    radius: int = Field(default=5000, description="Search radius in meters (default: 5000, max: 50000)")
    place_type: Optional[str] = Field(default=None, description="Specific place type filter (e.g., 'hospital', 'pharmacy', 'restaurant', 'park')")
    open_now: bool = Field(default=False, description="Only return places that are currently open")
    max_results: int = Field(default=10, description="Maximum number of places to return (default: 10, max: 20)")


class WeatherTool(BaseTool):
    name: Literal["get_weather"] = "get_weather"
    description: str = "Get current weather for Adelaide, Australia"
    args_schema: Type[BaseModel] = WeatherInput

    def _run(self, location: str = "Adelaide, Australia", units: str = "metric") -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("get_weather", {
            "location": location,
            "units": units
        })


class CalculatorTool(BaseTool):
    name: Literal["calculator"] = "calculator"
    description: str = "Perform mathematical calculations safely"
    args_schema: Type[BaseModel] = CalculatorInput

    def _run(self, expression: str) -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("calculator", {"expression": expression})


class GetMedicationHistoryTool(BaseTool):
    name: Literal["get_medication_history"] = "get_medication_history"
    description: str = "Get medication taken history for a user"
    args_schema: Type[BaseModel] = GetMedicationHistoryInput

    def _run(self, user_id: int, medication_id: Optional[int] = None, days: int = 7) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "days": days
        }
        if medication_id is not None:
            kwargs["medication_id"] = medication_id
        
        return ToolExecutionService.execute_tool("get_medication_history", kwargs)


class GetGoalProgressTool(BaseTool):
    name: Literal["get_goal_progress"] = "get_goal_progress"
    description: str = "Get goal completion progress for a user"
    args_schema: Type[BaseModel] = GetGoalProgressInput

    def _run(self, user_id: int, goal_id: Optional[int] = None, days: int = 7) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "days": days
        }
        if goal_id is not None:
            kwargs["goal_id"] = goal_id
        
        return ToolExecutionService.execute_tool("get_goal_progress", kwargs)


class WebSearchTool(BaseTool):
    name: Literal["web_search"] = "web_search"
    description: str = "Search the web using Google Custom Search API for information"
    args_schema: Type[BaseModel] = WebSearchInput

    def _run(self, query: str, num_results: int = 5, search_type: str = "web") -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("web_search", {
            "query": query,
            "num_results": num_results,
            "search_type": search_type
        })


class GetEventsListTool(BaseTool):
    name: Literal["get_events_list"] = "get_events_list"
    description: str = "Get a list of all events for the authenticated user"
    args_schema: Type[BaseModel] = GetEventsListInput

    def _run(self, user_id: int) -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("get_events_list", {"user_id": user_id})


class CreateEventTool(BaseTool):
    name: Literal["create_event"] = "create_event"
    description: str = "Create a new event for the user"
    args_schema: Type[BaseModel] = CreateEventInput

    def _run(self, user_id: int, title: str, start_date: str, 
             address: Optional[list[str]] = None, link: Optional[str] = None,
             when: Optional[str] = None, json_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "title": title,
            "start_date": start_date
        }
        if address is not None:
            kwargs["address"] = address
        if link is not None:
            kwargs["link"] = link
        if when is not None:
            kwargs["when"] = when
        if json_data is not None:
            kwargs["json_data"] = json_data
        
        return ToolExecutionService.execute_tool("create_event", kwargs)


class SearchEventsTool(BaseTool):
    name: Literal["search_events"] = "search_events"
    description: str = "Search for local events using Google Events (e.g., art classes, yoga, community gatherings)"
    args_schema: Type[BaseModel] = SearchEventsInput

    def _run(self, query: str, location: str = "Adelaide") -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("search_events", {
            "query": query,
            "location": location
        })


class ReverseGeocodeTool(BaseTool):
    name: Literal["reverse_geocode"] = "reverse_geocode"
    description: str = "Convert GPS coordinates (latitude, longitude) to a human-readable address or location name"
    args_schema: Type[BaseModel] = ReverseGeocodeInput

    def _run(self, latitude: float, longitude: float) -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("reverse_geocode", {
            "latitude": latitude,
            "longitude": longitude
        })


class UpdateEventTool(BaseTool):
    name: Literal["update_event"] = "update_event"
    description: str = "Update an existing event for the user (e.g., mark as attended, change details)"
    args_schema: Type[BaseModel] = UpdateEventInput

    def _run(self, user_id: int, event_id: str, title: Optional[str] = None,
             address: Optional[list[str]] = None, link: Optional[str] = None,
             start_date: Optional[str] = None, when: Optional[str] = None,
             is_attended: Optional[bool] = None, json_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "event_id": event_id
        }
        if title is not None:
            kwargs["title"] = title
        if address is not None:
            kwargs["address"] = address
        if link is not None:
            kwargs["link"] = link
        if start_date is not None:
            kwargs["start_date"] = start_date
        if when is not None:
            kwargs["when"] = when
        if is_attended is not None:
            kwargs["is_attended"] = is_attended
        if json_data is not None:
            kwargs["json_data"] = json_data
        
        return ToolExecutionService.execute_tool("update_event", kwargs)


class FetchRecipesTool(BaseTool):
    name: Literal["fetch_recipes"] = "fetch_recipes"
    description: str = "Fetch healthy recipes based on dietary preferences, ingredients, or health conditions"
    args_schema: Type[BaseModel] = FetchRecipesInput

    def _run(self, query: str = "", diet_type: str = "any", max_results: int = 10,
             cuisine_type: Optional[str] = None, meal_type: str = "any",
             max_prep_time: Optional[int] = None, health_labels: Optional[list[str]] = None) -> Dict[str, Any]:
        kwargs = {
            "query": query,
            "diet_type": diet_type,
            "max_results": max_results,
            "meal_type": meal_type
        }
        if cuisine_type is not None:
            kwargs["cuisine_type"] = cuisine_type
        if max_prep_time is not None:
            kwargs["max_prep_time"] = max_prep_time
        if health_labels is not None:
            kwargs["health_labels"] = health_labels
        
        return ToolExecutionService.execute_tool("fetch_recipes", kwargs)


class FindPlacesTool(BaseTool):
    name: Literal["find_places"] = "find_places"
    description: str = "Find nearby places like hospitals, pharmacies, parks, restaurants based on location and search query"
    args_schema: Type[BaseModel] = FindPlacesInput

    def _run(self, query: str, latitude: float, longitude: float, 
             radius: int = 5000, place_type: Optional[str] = None,
             open_now: bool = False, max_results: int = 10) -> Dict[str, Any]:
        kwargs = {
            "query": query,
            "latitude": latitude,
            "longitude": longitude,
            "radius": radius,
            "max_results": max_results,
            "open_now": open_now
        }
        if place_type is not None:
            kwargs["place_type"] = place_type
        
        return ToolExecutionService.execute_tool("find_places", kwargs)


# List of available LangChain tools for notifications (excludes client-side tools and update operations)
LANGCHAIN_TOOLS_NOTIFICATION = [
    WeatherTool(),
    CalculatorTool(),
    GetMedicationHistoryTool(),
    GetGoalProgressTool(),
    WebSearchTool(),
    GetEventsListTool(),
    CreateEventTool(),
    SearchEventsTool(),
    ReverseGeocodeTool(),
    UpdateEventTool(),
    FetchRecipesTool(),
    FindPlacesTool(),
]