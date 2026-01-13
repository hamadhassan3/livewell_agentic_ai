from langchain_core.tools import BaseTool
from typing import Dict, Any, Optional, Type, Literal # Added Literal for stricter typing
from pydantic import BaseModel, Field
from .services import ToolExecutionService


class WeatherInput(BaseModel):
    location: str = Field(default="Adelaide, Australia", description="Location to get weather for")
    units: str = Field(default="metric", description="Temperature units (metric, imperial, kelvin)")


class CalculatorInput(BaseModel):
    expression: str = Field(description="Mathematical expression to evaluate")


class LocationInput(BaseModel):
    precision: str = Field(default="medium", description="GPS precision level (high, medium, low)")


class NotificationInput(BaseModel):
    title: str = Field(description="Notification title")
    message: str = Field(description="Notification message")
    delay: int = Field(default=0, description="Delay in seconds")


class CurrentTimeInput(BaseModel):
    timezone: str = Field(default="local", description="Timezone (e.g., 'UTC', 'America/New_York', 'local')")
    format: str = Field(default="readable", description="Time format (iso, unix, readable)")


class UpdateUserProfileInput(BaseModel):
    user_id: int = Field(description="The ID of the user to update")
    name: Optional[str] = Field(default=None, description="The user's full name")
    gender: Optional[str] = Field(default=None, description="Gender (M: Male, F: Female, O: Other)")
    date_of_birth: Optional[str] = Field(default=None, description="Date of birth in YYYY-MM-DD format")
    height: Optional[float] = Field(default=None, description="Height in centimeters")
    weight: Optional[float] = Field(default=None, description="Weight in kilograms")


class RecordMedicationTakenInput(BaseModel):
    user_id: int = Field(description="The ID of the user recording the medication")
    medication_id: int = Field(description="The ID of the medication that was taken")
    scheduled_time: Optional[str] = Field(default=None, description="The scheduled time (morning, noon, evening, bedtime)")
    notes: Optional[str] = Field(default=None, description="Optional notes about taking this medication")


class GetMedicationHistoryInput(BaseModel):
    user_id: int = Field(description="The ID of the user to get medication history for")
    medication_id: Optional[int] = Field(default=None, description="Optional: Filter by specific medication ID")
    days: int = Field(default=7, description="Number of days of history to retrieve (1-30)")


class RecordGoalCompletedInput(BaseModel):
    user_id: int = Field(description="The ID of the user completing the goal")
    goal_id: int = Field(description="The ID of the goal that was completed")
    notes: Optional[str] = Field(default=None, description="Optional notes about completing this goal")


class GetGoalProgressInput(BaseModel):
    user_id: int = Field(description="The ID of the user to get goal progress for")
    goal_id: Optional[int] = Field(default=None, description="Optional: Filter by specific goal ID")
    days: int = Field(default=7, description="Number of days of progress to retrieve (1-30)")


class CreateGoalInput(BaseModel):
    user_id: int = Field(description="The ID of the user to create the goal for")
    title: str = Field(description="The title of the goal")
    is_active: bool = Field(default=True, description="Active status of the goal")
    category: str = Field(description="The category of the goal (mind, social, nutrition, activity)")
    frequency: str = Field(description="How often the goal should be completed (daily, weekly, fortnightly, monthly)")


class UpdateGoalInput(BaseModel):
    user_id: int = Field(description="The ID of the user updating the goal")
    goal_id: int = Field(description="The ID of the goal to update")
    title: Optional[str] = Field(default=None, description="The updated title of the goal")
    is_active: Optional[bool] = Field(default=None, description="Updated active status of the goal")
    category: Optional[str] = Field(default=None, description="The updated category of the goal (mind, social, nutrition, activity)")
    frequency: Optional[str] = Field(default=None, description="Updated frequency (daily, weekly, fortnightly, monthly)")


class WebSearchInput(BaseModel):
    query: str = Field(description="The search query to search for on the web")
    num_results: int = Field(default=5, description="Number of search results to return (max: 10)")
    search_type: str = Field(default="web", description="Type of search to perform (web or image)")


class ScheduleNotificationInput(BaseModel):
    user_id: int = Field(description="The ID of the user to receive the notification")
    title: str = Field(description="The title of the notification")
    body: str = Field(description="The body/content of the notification")
    scheduled_time: str = Field(description="When to send the notification (ISO 8601 format: YYYY-MM-DDTHH:MM:SS)")
    notification_type: str = Field(default="reminder", description="Type of notification (reminder, alert, info)")
    frequency: str = Field(default="once", description="How often to repeat (once, daily, weekly, monthly)")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Additional data to include with the notification")


class UpdateUserPreferencesInput(BaseModel):
    user_id: int = Field(description="The ID of the user to update preferences for")
    
    # Health conditions
    is_diabetic: Optional[bool] = Field(default=None, description="Whether the user is diabetic")
    is_hypertensive: Optional[bool] = Field(default=None, description="Whether the user has hypertension")
    has_heart_disease: Optional[bool] = Field(default=None, description="Whether the user has heart disease")
    has_arthritis: Optional[bool] = Field(default=None, description="Whether the user has arthritis")
    has_osteoporosis: Optional[bool] = Field(default=None, description="Whether the user has osteoporosis")
    has_vision_impairment: Optional[bool] = Field(default=None, description="Whether the user has vision impairment")
    has_hearing_impairment: Optional[bool] = Field(default=None, description="Whether the user has hearing impairment")
    has_memory_concerns: Optional[bool] = Field(default=None, description="Whether the user has memory concerns")
    other_health_conditions: Optional[str] = Field(default=None, description="Other health conditions")
    
    # Medication
    takes_medications: Optional[bool] = Field(default=None, description="Whether the user takes medications")
    medication_reminder_enabled: Optional[bool] = Field(default=None, description="Whether medication reminders are enabled")
    
    # Activity and exercise
    activity_level: Optional[str] = Field(default=None, description="Activity level (sedentary, lightly_active, moderately_active, very_active, extremely_active)")
    exercise_goal_minutes_per_week: Optional[int] = Field(default=None, description="Weekly exercise goal in minutes")
    mobility_level: Optional[str] = Field(default=None, description="Mobility level (fully_mobile, uses_walking_aid, wheelchair_user, limited_mobility)")
    needs_transportation_assistance: Optional[bool] = Field(default=None, description="Whether user needs transportation assistance")
    
    # Social preferences
    social_preference: Optional[str] = Field(default=None, description="Social preference (very_social, moderately_social, occasionally_social, prefer_solitude)")
    interested_in_group_activities: Optional[bool] = Field(default=None, description="Interest in group activities")
    
    # Mental wellness
    stress_level: Optional[str] = Field(default=None, description="Stress level (low, moderate, high)")
    interested_in_mindfulness: Optional[bool] = Field(default=None, description="Interest in mindfulness activities")
    interested_in_meditation: Optional[bool] = Field(default=None, description="Interest in meditation")
    
    # Sleep
    sleep_quality_rating: Optional[int] = Field(default=None, description="Sleep quality rating (1-10 scale)")
    
    # Nutrition
    diet_type: Optional[str] = Field(default=None, description="Diet type (omnivore, vegetarian, vegan, pescatarian, mediterranean, low_sodium, diabetic_friendly, other)")
    food_allergies: Optional[str] = Field(default=None, description="Food allergies or dietary restrictions")
    water_intake_goal_liters: Optional[float] = Field(default=None, description="Daily water intake goal in liters")
    
    # Technology
    tech_comfort_level: Optional[str] = Field(default=None, description="Technology comfort level (very_comfortable, comfortable, somewhat_comfortable, needs_assistance)")
    
    # Notifications
    notification_frequency: Optional[str] = Field(default=None, description="Notification frequency (none, daily, twice_daily, three_times_daily, hourly)")
    notification_time_preference: Optional[str] = Field(default=None, description="Preferred notification time (morning, afternoon, evening, flexible)")
    
    # Personality and motivation
    personality_type: Optional[str] = Field(default=None, description="Personality type (achiever, explorer, socializer, competitor)")
    motivation_type: Optional[str] = Field(default=None, description="Motivation type (intrinsic, extrinsic, social, competitive)")
    prefers_short_term_goals: Optional[bool] = Field(default=None, description="Preference for short-term goals")
    prefers_long_term_goals: Optional[bool] = Field(default=None, description="Preference for long-term goals")
    goal_reminder_enabled: Optional[bool] = Field(default=None, description="Whether goal reminders are enabled")
    
    # Emergency contacts
    emergency_contact_name: Optional[str] = Field(default=None, description="Emergency contact name")
    emergency_contact_phone: Optional[str] = Field(default=None, description="Emergency contact phone number")
    emergency_contact_relationship: Optional[str] = Field(default=None, description="Emergency contact relationship")


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
    # ADDED TYPE ANNOTATIONS for name and description
    name: Literal["get_weather"] = "get_weather"
    description: str = "Get current weather for Adelaide, Australia"
    args_schema: Type[BaseModel] = WeatherInput

    def _run(self, location: str = "Adelaide, Australia", units: str = "metric") -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("get_weather", {
            "location": location,
            "units": units
        })


class CalculatorTool(BaseTool):
    # ADDED TYPE ANNOTATIONS for name and description
    name: Literal["calculator"] = "calculator"
    description: str = "Perform mathematical calculations safely"
    args_schema: Type[BaseModel] = CalculatorInput

    def _run(self, expression: str) -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("calculator", {"expression": expression})


class LocationTool(BaseTool):
    # ADDED TYPE ANNOTATIONS for name and description
    name: Literal["get_current_location"] = "get_current_location"
    description: str = "Get user's current GPS location (requires client execution)"
    args_schema: Type[BaseModel] = LocationInput

    def _run(self, precision: str = "medium") -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("get_current_location", {"precision": precision})


class NotificationTool(BaseTool):
    # ADDED TYPE ANNOTATIONS for name and description
    name: Literal["send_notification"] = "send_notification"
    description: str = "Send local notification to user (requires client execution)"
    args_schema: Type[BaseModel] = NotificationInput

    def _run(self, title: str, message: str, delay: int = 0) -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("send_notification", {
            "title": title,
            "message": message,
            "delay": delay
        })


class GetCurrentTimeTool(BaseTool):
    # ADDED TYPE ANNOTATIONS for name and description
    name: Literal["get_current_time"] = "get_current_time"
    description: str = "Get current date and time from device (requires client execution)"
    args_schema: Type[BaseModel] = CurrentTimeInput

    def _run(self, timezone: str = "local", format: str = "readable") -> Dict[str, Any]:
        return ToolExecutionService.execute_tool("get_current_time", {
            "timezone": timezone,
            "format": format
        })


class UpdateUserProfileTool(BaseTool):
    name: Literal["update_user_profile"] = "update_user_profile"
    description: str = "Update the current user's profile information"
    args_schema: Type[BaseModel] = UpdateUserProfileInput

    def _run(self, user_id: int, name: Optional[str] = None, gender: Optional[str] = None, 
             date_of_birth: Optional[str] = None, height: Optional[float] = None, 
             weight: Optional[float] = None) -> Dict[str, Any]:
        # Build the kwargs dict with only non-None values
        kwargs = {"user_id": user_id}
        if name is not None:
            kwargs["name"] = name
        if gender is not None:
            kwargs["gender"] = gender
        if date_of_birth is not None:
            kwargs["date_of_birth"] = date_of_birth
        if height is not None:
            kwargs["height"] = height
        if weight is not None:
            kwargs["weight"] = weight
        
        return ToolExecutionService.execute_tool("update_user_profile", kwargs)


class RecordMedicationTakenTool(BaseTool):
    name: Literal["record_medication_taken"] = "record_medication_taken"
    description: str = "Record that a medication has been taken by the user"
    args_schema: Type[BaseModel] = RecordMedicationTakenInput

    def _run(self, user_id: int, medication_id: int, 
             scheduled_time: Optional[str] = None, notes: Optional[str] = None) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "medication_id": medication_id
        }
        if scheduled_time is not None:
            kwargs["scheduled_time"] = scheduled_time
        if notes is not None:
            kwargs["notes"] = notes
        
        return ToolExecutionService.execute_tool("record_medication_taken", kwargs)


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


class RecordGoalCompletedTool(BaseTool):
    name: Literal["record_goal_completed"] = "record_goal_completed"
    description: str = "Record that a goal has been completed by the user"
    args_schema: Type[BaseModel] = RecordGoalCompletedInput

    def _run(self, user_id: int, goal_id: int, notes: Optional[str] = None) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "goal_id": goal_id
        }
        if notes is not None:
            kwargs["notes"] = notes
        
        return ToolExecutionService.execute_tool("record_goal_completed", kwargs)


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


class CreateGoalTool(BaseTool):
    name: Literal["create_goal"] = "create_goal"
    description: str = "Create a new goal for the user"
    args_schema: Type[BaseModel] = CreateGoalInput

    def _run(self, user_id: int, title: str, category: str, frequency: str, is_active: bool = True) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "title": title,
            "category": category,
            "frequency": frequency,
            "is_active": is_active
        }
        
        return ToolExecutionService.execute_tool("create_goal", kwargs)


class UpdateGoalTool(BaseTool):
    name: Literal["update_goal"] = "update_goal"
    description: str = "Update an existing goal for the user"
    args_schema: Type[BaseModel] = UpdateGoalInput

    def _run(self, user_id: int, goal_id: int, title: Optional[str] = None, 
             is_active: Optional[bool] = None, category: Optional[str] = None, 
             frequency: Optional[str] = None) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "goal_id": goal_id
        }
        if title is not None:
            kwargs["title"] = title
        if is_active is not None:
            kwargs["is_active"] = is_active
        if category is not None:
            kwargs["category"] = category
        if frequency is not None:
            kwargs["frequency"] = frequency
        
        return ToolExecutionService.execute_tool("update_goal", kwargs)


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


class ScheduleNotificationTool(BaseTool):
    name: Literal["schedule_notification"] = "schedule_notification"
    description: str = "Schedule a notification to be sent to the user at a specific time"
    args_schema: Type[BaseModel] = ScheduleNotificationInput

    def _run(self, user_id: int, title: str, body: str, scheduled_time: str,
             notification_type: str = "reminder", frequency: str = "once", 
             data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        kwargs = {
            "user_id": user_id,
            "title": title,
            "body": body,
            "scheduled_time": scheduled_time,
            "notification_type": notification_type,
            "frequency": frequency
        }
        if data is not None:
            kwargs["data"] = data
        
        return ToolExecutionService.execute_tool("schedule_notification", kwargs)


class UpdateUserPreferencesTool(BaseTool):
    name: Literal["update_user_preferences"] = "update_user_preferences"
    description: str = "Update the current user's preferences including health conditions, activity levels, notifications, and other wellness settings"
    args_schema: Type[BaseModel] = UpdateUserPreferencesInput

    def _run(self, user_id: int, **kwargs) -> Dict[str, Any]:
        # Build the kwargs dict with only non-None values
        tool_kwargs = {"user_id": user_id}
        
        # Add all non-None preference fields
        preference_fields = [
            'is_diabetic', 'is_hypertensive', 'has_heart_disease', 'has_arthritis',
            'has_osteoporosis', 'has_vision_impairment', 'has_hearing_impairment',
            'has_memory_concerns', 'other_health_conditions', 'takes_medications',
            'medication_reminder_enabled', 'activity_level', 'exercise_goal_minutes_per_week',
            'mobility_level', 'needs_transportation_assistance', 'social_preference',
            'interested_in_group_activities', 'stress_level', 'interested_in_mindfulness',
            'interested_in_meditation', 'sleep_quality_rating', 'diet_type', 'food_allergies',
            'water_intake_goal_liters', 'tech_comfort_level', 'notification_frequency',
            'notification_time_preference', 'personality_type', 'motivation_type',
            'prefers_short_term_goals', 'prefers_long_term_goals', 'goal_reminder_enabled',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
        ]
        
        for field in preference_fields:
            if field in kwargs and kwargs[field] is not None:
                tool_kwargs[field] = kwargs[field]
        
        return ToolExecutionService.execute_tool("update_user_preferences", tool_kwargs)


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


# List of all available LangChain tools
LANGCHAIN_TOOLS = [
    WeatherTool(),
    CalculatorTool(),
    LocationTool(),
    NotificationTool(),
    GetCurrentTimeTool(),
    UpdateUserProfileTool(),
    UpdateUserPreferencesTool(),
    RecordMedicationTakenTool(),
    GetMedicationHistoryTool(),
    RecordGoalCompletedTool(),
    GetGoalProgressTool(),
    CreateGoalTool(),
    UpdateGoalTool(),
    WebSearchTool(),
    ScheduleNotificationTool(),
    GetEventsListTool(),
    CreateEventTool(),
    SearchEventsTool(),
    ReverseGeocodeTool(),
    UpdateEventTool(),
    FetchRecipesTool(),
    FindPlacesTool(),
]